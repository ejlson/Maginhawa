/* DOES THE EYEBROW FINISH BEFORE THE SENTENCE STARTS? — the ordering probe.
 *
 * Both gestures in Manifesto.tsx read ONE scroll progress value, so "before"
 * is not a matter of clock time: it is whether the eyebrow's window closes at
 * a lower progress than the first word's window opens. That is invisible to a
 * screenshot and to any probe that samples on a timer, because a fast wheel
 * crosses both windows inside a single frame.
 *
 * So this samples the SECTION'S OWN PROGRESS — the same quantity useScroll
 * hands the transforms — and at each sample reads the eyebrow's computed
 * opacity and the first word's translateY out of the live matrix. The pass
 * condition is a gap: the last progress at which the eyebrow is still inking
 * must come strictly before the first progress at which any word has left its
 * mask.
 *
 * ⚠️ LENIS OVERRIDES window.scrollTo — drive it through window.__lenis or the
 *    page never moves and every sample is the state at the top of the document.
 *
 * Usage: node scripts/probe-manifesto-order.mjs [port] [w] [h]
 */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const VW = +(process.argv[3] || 1440), VH = +(process.argv[4] || 900);

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const p = await b.newPage();
await p.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
await p.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle0", timeout: 120000 });
await p.waitForSelector('[class*="Manifesto_statement__"]', { timeout: 60000 });

/* the section's top in document space, and the two edges of SCRUB_OFFSET:
   progress 0 = section top at window bottom; 1 = section centred. */
const geom = await p.evaluate(() => {
  const st = document.querySelector('[class*="Manifesto_statement__"]');
  const sec = st.closest("section");
  const r = sec.getBoundingClientRect();
  const top = r.top + window.scrollY;
  return { top, h: r.height, vh: innerHeight };
});
const y0 = geom.top - geom.vh;                       // progress 0
const y1 = geom.top + geom.h / 2 - geom.vh / 2;      // progress 1

const samples = [];
for (let i = 0; i <= 60; i++) {
  const prog = i / 60;
  const y = y0 + (y1 - y0) * prog;
  await p.evaluate((v) => {
    const l = window.__lenis;
    if (l) l.scrollTo(v, { immediate: true, force: true });
    else window.scrollTo(0, v);
  }, y);
  await new Promise((r) => setTimeout(r, 60));
  samples.push({ prog, ...(await p.evaluate(() => {
    const eb = document.querySelector('[class*="Manifesto_eyebrow__"]');
    const masks = [...document.querySelectorAll('[class*="Manifesto_wordMask__"]')];
    const ty = (el) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return m.m42;
    };
    const inner = masks.map((m) => m.firstElementChild).filter(Boolean);
    /* ⚠️ NORMALISE BY THE INNER SPAN, NOT BY THE MASK. Framer resolves a
       transform percentage against the ELEMENT'S OWN box, so `y: "110%"` is
       110% of the travelling span — and the mask is a different height (it
       has the line box's leading, and the image masks are taller again).
       Dividing by the mask reports a different rest value per element and
       reads as movement that never happened. 1.1 = untouched, 0 = landed. */
    const rest = inner.map((el) => ty(el) / (el.getBoundingClientRect().height || 1));
    return {
      ebOpacity: +getComputedStyle(eb).opacity,
      ebScale: +new DOMMatrixReadOnly(getComputedStyle(eb).transform).a.toFixed(3),
      firstMoved: +(1.1 - rest[0]).toFixed(3),   // how far word 0 has travelled
      anyMoved: +Math.max(...rest.map((r) => 1.1 - r)).toFixed(3),
      restMin: +Math.min(...rest).toFixed(3),
      landed: rest.filter((r) => r <= 0.01).length,
      total: rest.length,
    };
  })) });
}

await b.close();

const MOVE = 0.02;   // a word has "started" once it clears 2% of its own box
const ebDone = samples.find((s) => s.ebOpacity >= 0.999 && s.ebScale >= 0.999);
const wordStart = samples.find((s) => s.anyMoved > MOVE);

console.log("prog   eyebrow(op/scale)   word0    anyMoved  landed");
for (const s of samples.filter((_, i) => i % 3 === 0))
  console.log(
    s.prog.toFixed(3).padStart(5),
    `${s.ebOpacity.toFixed(3)} / ${s.ebScale.toFixed(3)}`.padStart(18),
    s.firstMoved.toFixed(3).padStart(7),
    s.anyMoved.toFixed(3).padStart(9),
    `${s.landed}/${s.total}`.padStart(8)
  );

console.log("\neyebrow fully set at progress:", ebDone ? ebDone.prog.toFixed(3) : "NEVER");
console.log("first word movement at progress:", wordStart ? wordStart.prog.toFixed(3) : "NEVER");
const ok = ebDone && wordStart && ebDone.prog < wordStart.prog;
console.log(ok
  ? `PASS — eyebrow lands ${(wordStart.prog - ebDone.prog).toFixed(3)} of scroll before the sentence starts`
  : "FAIL — the sentence starts on or before the eyebrow finishes");
process.exit(ok ? 0 : 1);
