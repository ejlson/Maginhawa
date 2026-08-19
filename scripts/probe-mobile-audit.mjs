/* ── THE WHOLE HOME PAGE, ON A PHONE ──
   Walks the page top to bottom at a phone viewport, then asks two questions
   the eye asks: did anything fail to arrive, and did the page ever have to
   be dragged sideways.

   STUCK-STATE DETECTION IS THE POINT. Every reveal on this site ends at
   opacity 1 with its clip fully open; an element still at 0 — or still
   carrying `inset(... 100% ...)` — after the reader has scrolled past it is
   a reveal that never fired, which is the single most common mobile-only
   defect here (an IntersectionObserver `amount` that a tall element can
   never satisfy, a `whileInView` inside an overflow mask). */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SIZES = process.argv[2] ? [process.argv[2].split("x").map(Number)]
                              : [[360, 780], [390, 844], [430, 932]];
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });

for (const [w, h] of SIZES) {
  const p = await b.newPage();
  const consoleErrs = [];
  p.on("console", m => { if (m.type() === "error") consoleErrs.push(m.text().slice(0, 160)); });
  p.on("pageerror", e => consoleErrs.push("PAGEERROR " + String(e).slice(0, 160)));
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise(r => setTimeout(r, 9000));   // loader + intro

  const r = await p.evaluate(async () => {
    const frames = [];
    let stop = false;
    let last = performance.now();
    const tick = t => { frames.push(t - last); last = t; if (!stop) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);

    const maxOverflow = { scrollW: document.documentElement.scrollWidth };
    // walk the page the way a reader does
    const H = () => document.documentElement.scrollHeight;
    for (let y = 0; y < H(); y += innerHeight * 0.45) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 260));
      maxOverflow.scrollW = Math.max(maxOverflow.scrollW, document.documentElement.scrollWidth);
    }
    window.scrollTo(0, H());
    await new Promise(r => setTimeout(r, 1200));
    stop = true;

    // ── who never arrived ──
    const stuck = [];
    for (const el of document.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      const cls = (el.className.baseVal ?? el.className ?? "").toString();
      if (!cls) continue;
      const why = [];
      if (+cs.opacity < 0.02 && cs.visibility !== "hidden" && cs.display !== "none") why.push(`opacity ${cs.opacity}`);
      if (/\b(100|9[0-9](\.\d+)?)%/.test(cs.clipPath) && cs.clipPath.startsWith("inset")) why.push(`clip ${cs.clipPath}`);
      if (why.length) stuck.push({ cls: cls.slice(0, 46), why: why.join(" + ") });
    }

    // ── frame budget ──
    const f = frames.filter(x => x > 0).sort((a, b) => a - b);
    const pct = q => f.length ? +f[Math.floor(q * (f.length - 1))].toFixed(1) : null;
    return {
      scrollH: H(), scrollW: maxOverflow.scrollW, vw: innerWidth,
      frames: f.length, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99),
      max: f.length ? +f[f.length - 1].toFixed(1) : null,
      over32: f.filter(x => x > 32).length, over50: f.filter(x => x > 50).length,
      stuck,
    };
  });

  console.log(`\n════════ ${w}x${h} ════════`);
  console.log(`  page ${r.scrollH}px tall | horiz overflow: ${r.scrollW > r.vw} (${r.scrollW} vs ${r.vw})`);
  console.log(`  frames ${r.frames}  p50 ${r.p50}ms  p95 ${r.p95}ms  p99 ${r.p99}ms  max ${r.max}ms`);
  console.log(`  dropped: ${r.over32} frames >32ms, ${r.over50} >50ms`);
  console.log(`  never arrived (${r.stuck.length}):`);
  const seen = new Set();
  for (const s of r.stuck) { const k = s.cls + s.why; if (seen.has(k)) continue; seen.add(k); console.log(`    · ${s.cls}  — ${s.why}`); }
  if (consoleErrs.length) {
    console.log(`  console errors (${consoleErrs.length}):`);
    for (const e of [...new Set(consoleErrs)].slice(0, 8)) console.log(`    ! ${e}`);
  }
  await p.close();
}
await b.close();
