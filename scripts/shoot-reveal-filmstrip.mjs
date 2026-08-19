/* THE REVEAL, AS A CONTACT SHEET — does the picture actually ZOOM?
 *
 * Every other probe here grades the reveal numerically, and none of them can
 * answer the question the rewrite was for: does the film GROW, or is it merely
 * UNCOVERED? An aperture widening over a film at natural size and an aperture
 * widening over a film scaling with it produce IDENTICAL hole geometry and
 * completely different pictures. Only a dense strip of real frames settles it.
 *
 * ⚠️ DO NOT PACE THIS OFF page.evaluate(). The obvious version polls the
 * animation's currentTime over CDP and screenshots when it crosses each target.
 * A puppeteer round trip is 100‥140ms under load, so that strip came out at
 * NINE frames for a 1300ms reveal — sparser than the thing it is meant to
 * expose. Page.startScreencast pushes every frame the compositor presents, with
 * a timestamp, at no per-frame cost to the page.
 *
 * The mapping back to the reveal's own clock is exact: an in-page rAF loop
 * records (performance.now(), animation.currentTime, shutter scale, film
 * scale), the screencast's metadata.timestamp is epoch seconds, and
 * performance.timeOrigin converts between them. Tiles are therefore labelled
 * with the ct they were actually presented at, not the ct they were asked for.
 *
 * Usage:
 *   node scripts/shoot-reveal-filmstrip.mjs --port 3000
 *   node scripts/shoot-reveal-filmstrip.mjs --out shots/strip-before --w 1440
 */
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const PORT = arg("port", "3000");
const VW = +arg("w", 1440);
const VH = +arg("h", 900);
const REVEAL = +arg("reveal", 1480);
const OUT = arg("out", "shots/reveal-filmstrip");
const PAD = +arg("pad", 120); // ms of clock kept either side of the reveal

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: [
    "--no-sandbox",
    "--autoplay-policy=no-user-gesture-required",
    "--window-position=0,0",
    `--window-size=${VW},${VH + 90}`,
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });

await page.evaluateOnNewDocument((REVEAL) => {
  window.__T = [];
  const m = (el) => {
    const n = getComputedStyle(el).transform.match(/matrix\(([^,]+),[^,]+,[^,]+,([^,]+)/);
    return n ? [+n[1], +n[2]] : null;
  };
  const tick = (t) => {
    const sh = document.querySelector('[class*="Loader_shutterTop__"]');
    const zoom = document.querySelector('[class*="Hero_zoom__"]');
    if (sh) {
      const a = sh.getAnimations();
      if (a.length && a[0].effect.getTiming().duration === REVEAL && a[0].currentTime != null) {
        const s = m(sh);
        const f = zoom ? m(zoom) : null;
        window.__T.push([t, a[0].currentTime, s ? s[1] : null, f ? f[0] : null]);
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, REVEAL);

const cdp = await page.createCDPSession();
const frames = [];
cdp.on("Page.screencastFrame", (f) => {
  frames.push({ ts: f.metadata.timestamp * 1000, data: f.data });
  cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
// stage 0 runs for MIN_TIME (2600ms); start the cast just before it can end so
// the capture buffer stays small but cannot miss the head of the reveal.
await new Promise((r) => setTimeout(r, 2000));
await cdp.send("Page.startScreencast", {
  format: "jpeg",
  quality: 80,
  everyNthFrame: 1,
  maxWidth: Math.round(VW * 0.5),
  maxHeight: Math.round(VH * 0.5),
});
await new Promise((r) => setTimeout(r, 6000));
await cdp.send("Page.stopScreencast").catch(() => {});

const T = await page.evaluate(() => window.__T);
const origin = await page.evaluate(() => performance.timeOrigin);
await browser.close();

if (!T.length) {
  console.log("the reveal never ran — nothing to shoot");
  process.exit(1);
}

/* page-time → reveal clock, by linear interpolation between rAF samples */
const at = (ms) => {
  if (ms <= T[0][0]) return T[0];
  for (let i = 1; i < T.length; i++) {
    if (T[i][0] >= ms) {
      const [t0, c0, s0, f0] = T[i - 1];
      const [t1, c1, s1, f1] = T[i];
      const u = t1 === t0 ? 0 : (ms - t0) / (t1 - t0);
      const lerp = (a, b) => (a == null || b == null ? a ?? b : a + (b - a) * u);
      return [ms, lerp(c0, c1), lerp(s0, s1), lerp(f0, f1)];
    }
  }
  return T[T.length - 1];
};

/* WINDOW IN PAGE TIME, NOT IN ct. `at()` clamps to the sampled range, so every
 * frame before the reveal reads ct≈0 and every frame after it reads ct=REVEAL —
 * filtering on ct therefore keeps the entire 6s capture and buries the 1.3s
 * that matters under hundreds of identical tiles. The rAF samples only exist
 * while the animation is running, so their own span IS the reveal. */
const firstPage = T[0][0];
const lastPage = T[T.length - 1][0];
const tiles = [];
for (const f of frames) {
  const pageMs = f.ts - origin;
  if (pageMs < firstPage - PAD || pageMs > lastPage + PAD) continue;
  const [, ct, shutter, film] = at(pageMs);
  if (ct == null) continue;
  const name = `${String(tiles.length).padStart(3, "0")}-ct${String(Math.round(ct)).padStart(4, "0")}.jpg`;
  writeFileSync(`${OUT}/${name}`, Buffer.from(f.data, "base64"));
  tiles.push({
    name,
    ct: Math.round(ct),
    k: shutter == null ? null : 1 - 2 * shutter,
    film,
  });
}

const cell = 300;
const html = `<!doctype html><meta charset="utf-8"><title>reveal filmstrip</title>
<style>
 body{background:#111;color:#eee;font:12px/1.4 ui-monospace,monospace;margin:16px}
 h1{font:600 14px/1.5 ui-monospace,monospace;margin:0 0 4px}
 p{color:#999;margin:0 0 14px;max-width:70ch}
 .g{display:grid;grid-template-columns:repeat(auto-fill,minmax(${cell}px,1fr));gap:10px}
 figure{margin:0}
 img{width:100%;display:block;border:1px solid #333;background:#000}
 figcaption{padding-top:4px;white-space:pre}
 b{color:#7fd}
</style>
<h1>stage-1 reveal · ${VW}×${VH} · ${tiles.length} presented frames</h1>
<p>k is the aperture's linear scale, recovered from the top shutter's scaleY as
1 − 2·scaleY. <b>film</b> is the hero zoom wrapper's own scale. They track each
other by construction — if the picture were being uncovered rather than zoomed,
film would read 1.000 in every tile.</p>
<div class=g>
${tiles
  .map(
    (t) =>
      `<figure><img src="${t.name}" loading="lazy"><figcaption>ct <b>${t.ct}</b>ms\nk ${
        t.k == null ? "?" : t.k.toFixed(3)
      }   film <b>${t.film == null ? "?" : t.film.toFixed(3)}</b></figcaption></figure>`,
  )
  .join("\n")}
</div>`;
writeFileSync(`${OUT}/index.html`, html);

console.log(`\n${tiles.length} presented frames → ${OUT}/index.html`);
const step = Math.max(1, Math.round(tiles.length / 18));
console.log("     ct   k(aperture)   film scale");
for (let i = 0; i < tiles.length; i += step) {
  const t = tiles[i];
  console.log(
    String(t.ct).padStart(7),
    (t.k == null ? "—" : t.k.toFixed(3)).padStart(12),
    (t.film == null ? "—" : t.film.toFixed(3)).padStart(12),
  );
}
