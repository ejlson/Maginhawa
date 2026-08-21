/* WHAT THE READER ACTUALLY SEES ON THE WAY DOWN.

   The page is scrolled continuously at a realistic rate and filmed. Each
   frame is compared with the one before it AFTER SHIFTING IT BY THE SCROLL
   DELTA — so the pixels that moved only because the page moved cancel, and
   what is left is MOTION THE PAGE ITSELF MADE: reveals, drifts, parallax,
   colour changes, anything scroll-linked or timed.

   That residual is the number this page is being tuned on. A long run near
   zero is a stretch the reader scrolls through while nothing happens; a
   lone spike is a burst that lands in one or two frames and is over.

   ⚠️ IT CATCHES TIME-BASED CASCADES, which the stepped probe in
   probe-home-flow.mjs cannot: that one samples the settled state at each
   position, so an animation that fired at an earlier step and finished
   reads as nothing. Use both — this one for what the scroll FEELS like,
   that one for what is actually coupled to the scroll.

   usage: node scripts/probe-scroll-feel.mjs [port] [px-per-second] [w] [h] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const RATE = +(process.argv[3] || 900);   // px/s — an ordinary trackpad flick
const W = +(process.argv[4] || 1440), H = +(process.argv[5] || 900);
const SHOT = 240;                          // downscaled film width

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
const p = await b.newPage();
await p.setViewport({ width: W, height: H, isMobile: W < 700, hasTouch: W < 700 });
await p.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2", timeout: 90000 });
await p.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 40000 }).catch(() => {});
await new Promise(r => setTimeout(r, 1600));

/* the film is pinned to one frame so the video does not count as motion —
   this is measuring the page's choreography, not its footage */
await p.evaluate(() => document.querySelectorAll("video").forEach(v => { v.pause(); v.currentTime = 1.2; }));

const map = await p.evaluate(() => {
  const rows = [];
  const hero = document.querySelector("main > section");
  if (hero) rows.push({ n: "Hero", t: 0 });
  [...document.querySelector("main .afterHero").children].forEach(el => {
    const m = (el.className || "").toString().match(/([A-Za-z]+)_/);
    rows.push({ n: m ? m[1] : el.tagName, t: Math.round(el.getBoundingClientRect().top + scrollY) });
  });
  return { docH: document.documentElement.scrollHeight, rows };
});
const at = (y) => { let n = map.rows[0].n; for (const r of map.rows) if (y + 450 >= r.t) n = r.n; return n; };

/* a scratch page does the pixel arithmetic — the page under test must not
   run our canvas work on its own main thread */
const sb = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const scratch = await sb.newPage();
await scratch.setContent("<canvas>");

/* ⚠️ THE FILM IS PROCESSED AS IT IS SHOT, NOT COLLECTED AND THEN DIFFED.
   The first version pushed every frame into an array and handed the whole
   reel to the scratch page at the end. At 900px/s that is ~75 full 1440x900
   PNGs and it survives; at 300px/s it is ~223, roughly a gigabyte of base64
   held live, and the browser was killed mid-run — the slow pass, which is
   the one that matters most here, was the one that could not complete.
   Streaming keeps exactly two frames alive at any moment. */
const scratchInit = async () => {
  await scratch.evaluate((SHOT, SH) => {
    window.__prev = null; window.__prevY = null; window.__out = [];
    /* ⚠️ ONE CANVAS AND ONE IMAGE FOR THE WHOLE RUN, REUSED. Allocating a
       fresh <canvas> and a fresh Image per frame is fine for the 75 frames a
       900px/s pass takes and kills the renderer on the ~300 a slow pass over
       a phone-height document takes — the browser is closed mid-screenshot
       and the run dies with a TargetCloseError that says nothing about why.
       Reusing both keeps the working set flat at any rate or viewport. */
    const c = document.createElement("canvas"); c.width = SHOT; c.height = SH;
    const g = c.getContext("2d", { willReadFrequently: true });
    const img = new Image();
    window.__push = async (b64, y, W) => {
      img.src = "data:image/png;base64," + b64; await img.decode();
      g.drawImage(img, 0, 0, SHOT, SH);
      const cur = g.getImageData(0, 0, SHOT, SH).data;
      if (window.__prev) {
        const dy0 = Math.round((y - window.__prevY) * SHOT / W);
        let best = Infinity;
        for (let dy = dy0 - 3; dy <= dy0 + 3; dy++) {
          let sum = 0, n = 0;
          for (let row = 0; row < SH; row++) {
            const src = row + dy;
            if (src < 0 || src >= SH) continue;
            for (let col = 0; col < SHOT; col += 2) {
              const a = (src * SHOT + col) * 4, c2 = (row * SHOT + col) * 4;
              const d = Math.abs(window.__prev[a] - cur[c2])
                      + Math.abs(window.__prev[a + 1] - cur[c2 + 1])
                      + Math.abs(window.__prev[a + 2] - cur[c2 + 2]);
              sum += d; n++;
            }
          }
          if (n && sum / n < best) best = sum / n;
        }
        window.__out.push({ y, r: isFinite(best) ? +best.toFixed(2) : 0 });
      }
      window.__prev = cur; window.__prevY = y;
    };
  }, SHOT, Math.round(H * SHOT / W));
};
await scratchInit();

const STEP_MS = 100;
let y = 0;
while (y < map.docH - H) {
  const shot = await p.screenshot({ encoding: "base64", captureBeyondViewport: false });
  await scratch.evaluate((b64, yy, ww) => window.__push(b64, yy, ww), shot, y, W);
  const next = Math.min(map.docH - H, y + Math.round(RATE * STEP_MS / 1000));
  await p.evaluate((to) => {
    const l = window.__lenis;
    if (l) l.scrollTo(to, { immediate: true }); else window.scrollTo(0, to);
  }, next);
  await new Promise(r => setTimeout(r, STEP_MS));
  y = await p.evaluate(() => Math.round(scrollY));
}
await p.close();

const resid = await scratch.evaluate(() => window.__out);

await sb.close(); await b.close();

console.log(`\n══ SCROLL FEEL @ ${RATE}px/s — residual motion after cancelling the scroll ══`);
console.log("   (mean per-pixel channel change once the page's own translation is subtracted)\n");
const bands = {};
resid.forEach(s => { const k = Math.floor(s.y / 300) * 300; (bands[k] = bands[k] || []).push(s.r); });
const keys = Object.keys(bands).map(Number).sort((a, c) => a - c);
const all = resid.map(s => s.r).sort((a, c) => a - c);
const med = all[Math.floor(all.length / 2)];
keys.forEach(k => {
  const v = bands[k];
  const mean = v.reduce((a, c) => a + c, 0) / v.length;
  const pk = Math.max(...v);
  const flat = mean < med * 0.45 ? "  ← FLAT" : "";
  const bar = "█".repeat(Math.min(34, Math.round(mean * 34 / Math.max(...keys.map(q => bands[q].reduce((a, c) => a + c, 0) / bands[q].length)))));
  console.log(`  ${String(k).padStart(5)} ${at(k).padEnd(13)} ${bar.padEnd(34)} mean ${mean.toFixed(2).padStart(6)}  peak ${pk.toFixed(2).padStart(6)}${flat}`);
});
console.log(`\n  page median ${med.toFixed(2)} · flat threshold ${(med * 0.45).toFixed(2)}`);
const flatRuns = [];
let run = null;
resid.forEach(s => {
  if (s.r < med * 0.45) { run = run || { from: s.y }; run.to = s.y; }
  else if (run) { flatRuns.push(run); run = null; }
});
if (run) flatRuns.push(run);
console.log("\nFLAT RUNS ≥300px");
const big = flatRuns.filter(r => r.to - r.from >= 300);
big.forEach(r => console.log(`  ${String(r.from).padStart(5)} → ${String(r.to).padStart(5)}   ${String(r.to - r.from).padStart(4)}px (${((r.to - r.from) / 900).toFixed(2)} screens)  ${at(r.from)}`));
if (!big.length) console.log("  none");
console.log(`\n  total flat: ${big.reduce((a, r) => a + r.to - r.from, 0)}px of ${map.docH - H}px scrollable`);
