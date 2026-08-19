/* THE HANDOVER SECTION, MEASURED — <Passage>, between AboutSplit and Blog.
 *
 * Two things this has to prove, and neither can be read off the stylesheet:
 *
 *   1. THE SEAMS. Passage owns both of its gaps because its neighbours own
 *      neither, and the bottom one subtracts Blog's 36px top by hand. This
 *      reports the real ink-to-ink distances so the subtraction can be
 *      checked rather than trusted.
 *
 *   2. THE SCRUB ACTUALLY RUNS. The words are revealed by a scroll-linked
 *      transform, so "it renders" is not the same as "it works". This walks
 *      the section past the viewport and reports each word's translateY at
 *      every step — 110% of its own box at rest, 0 when landed. A column
 *      that never leaves its start value is a dead scrub; a column that is
 *      all zeros at the first sample is a scrub that finished before the
 *      section was on screen.
 *
 * ⚠️ LENIS OVERRIDES window.scrollTo — drive it through window.__lenis, the
 *    same way scripts/probe-about-open.mjs does. A probe that calls
 *    window.scrollTo here reads a page that never moved.
 *
 * usage: node scripts/probe-passage.mjs [port] [width] [height]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const W = +(process.argv[3] || 1440);
const H = +(process.argv[4] || 900);

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
/* NEVER networkidle0 on this site — the hero film and the hover clips loop,
   so the network never goes quiet. The loader's own body class is the signal. */
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 60000 }
);
await new Promise((r) => setTimeout(r, 600));

const seatTo = async (y) => {
  await page.evaluate((v) => {
    const l = window.__lenis;
    if (l) l.scrollTo(v, { immediate: true, force: true });
    else window.scrollTo(0, v);
  }, y);
  /* two frames: one for lenis to write the scroll, one for framer's
     useScroll subscribers to read it back out */
  await page.evaluate(
    () =>
      new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      )
  );
  await new Promise((r) => setTimeout(r, 90));
};

const geom = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const R = (el) => {
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top + scrollY), bot: Math.round(r.bottom + scrollY) };
  };
  const pas = q('[class*="Passage_section"]');
  if (!pas) return null;
  const lines = [...pas.querySelectorAll("p")].map((p) => ({
    text: p.textContent.trim(),
    ...R(p),
  }));
  return {
    about: R(q('[class*="AboutSplit_section"]')),
    passage: R(pas),
    blog: R(q('[class*="Blog_section"]')),
    lines,
    doc: document.documentElement.scrollHeight,
  };
});

if (!geom) {
  console.log("Passage section not found in the DOM.");
  await b.close();
  process.exit(1);
}

console.log(`\nviewport ${W}×${H}   document ${geom.doc}px = ${(geom.doc / H).toFixed(2)} screens\n`);
console.log("── BOXES ──");
console.log(`  AboutSplit  ${geom.about.top} → ${geom.about.bot}`);
console.log(`  Passage     ${geom.passage.top} → ${geom.passage.bot}   h=${geom.passage.bot - geom.passage.top}`);
geom.lines.forEach((l, i) =>
  console.log(`    line ${i + 1}    ${l.top} → ${l.bot}   "${l.text}"`)
);
console.log(`  Blog        ${geom.blog.top} → ${geom.blog.bot}`);

const first = geom.lines[0];
const last = geom.lines[geom.lines.length - 1];
console.log("\n── SEAMS (ink to ink) ──");
console.log(`  AboutSplit box → line 1     ${first.top - geom.about.bot}px`);
console.log(`  line 1 → line 2             ${geom.lines[1] ? geom.lines[1].top - first.bot : "n/a"}px`);
console.log(`  line 2 → Blog box           ${geom.blog.top - last.bot}px  (+36px of Blog's own top before its ink)`);

/* ── the scrub ── */
const start = geom.passage.top - H;
const end = geom.passage.bot - H / 2;
const STEPS = 9;

console.log("\n── SCRUB (translateY per word, px — 0 = landed) ──");
console.log("        " + ["A1", "A2", "A3", "A4", "A5", "A6", "B1", "B2", "B3", "B4", "B5", "B6"].map((s) => s.padStart(4)).join(""));

let moved = false;
let firstRow = null;
for (let i = 0; i <= STEPS; i++) {
  const y = Math.round(start + ((end - start) * i) / STEPS);
  await seatTo(y);
  const t = await page.evaluate(() =>
    [...document.querySelectorAll('[class*="Passage_word"]')].map((w) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(w).transform);
      return Math.round(m.m42);
    })
  );
  if (firstRow === null) firstRow = t.join(",");
  else if (t.join(",") !== firstRow) moved = true;
  console.log(`  ${String(y).padStart(5)} ` + t.map((v) => String(v).padStart(4)).join(""));
}

console.log(
  `\n  ${moved ? "✓ the scrub responds to scroll" : "⚠ DEAD SCRUB — every sample is identical"}`
);

await page.evaluate(() => {
  const l = window.__lenis;
  if (l) l.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
});
await b.close();
