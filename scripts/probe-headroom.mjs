/* How much vertical headroom does the statement mask actually need?

   `.statementMask` is overflow:hidden with padding-block 0.14em, over type set
   at line-height 0.92 — so the clip window is already shorter than the face's
   natural ink box, and Helvetica ITALIC descends further still ('f' and 'y' in
   "comfortable" / "every"). Rather than guess a number and rebuild per guess,
   this injects candidate paddings into a live page and shoots the same word
   each time, zoomed, so the smallest value that clears can be read off.

   usage: node scripts/probe-headroom.mjs [port]   (run from the repo root) */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const PORT = process.argv[2] || "3300";
const OUT = "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/2023fdca-cd86-4bca-922b-c2f81853e348/scratchpad/shots";
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 3 });
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "no-preference" },
]);
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2500));

/* bring the statement into view and let its scrub settle at rest */
await page.evaluate(() => {
  const el = [...document.querySelectorAll("[class*='statementText']")][0];
  if (el) el.scrollIntoView({ block: "center" });
});
await new Promise((r) => setTimeout(r, 1800));

/* the ink test: with the window opened, how far past the mask's own padding
   box does the glyph run reach? Measured per mask, in px and in em. */
const inkReport = await page.evaluate(() => {
  const masks = [...document.querySelectorAll("[class*='statementMask']")];
  const rows = [];
  for (const m of masks) {
    const w = m.firstElementChild;
    if (!w) continue;
    const text = (m.textContent || "").trim();
    const cs = getComputedStyle(m);
    const fs = parseFloat(cs.fontSize);
    const padB = parseFloat(cs.paddingBottom);
    const before = m.style.overflow;
    m.style.overflow = "visible";
    void m.offsetHeight;
    const mr = m.getBoundingClientRect();
    const wr = w.getBoundingClientRect();
    m.style.overflow = before;
    rows.push({
      text: text.slice(0, 18),
      italic: getComputedStyle(w).fontStyle === "italic",
      fs,
      padB: +padB.toFixed(1),
      /* +ve = the word's box passes the mask's padding box at the bottom */
      pastBottom: +(wr.bottom - mr.bottom).toFixed(2),
    });
  }
  return rows;
});
const worst = inkReport.reduce(
  (m, r) => (r.pastBottom > m.pastBottom ? r : m),
  { pastBottom: -1e9 },
);
console.log(`\nstatement masks: ${inkReport.length}`);
console.log(`current padding-bottom: ${inkReport[0]?.padB}px at ${inkReport[0]?.fs}px type`);
console.log(`worst word box past the window: ${JSON.stringify(worst)}`);
console.log("\nitalic words:");
inkReport.filter((r) => r.italic).forEach((r) =>
  console.log(`  "${r.text}"  pastBottom ${r.pastBottom}px  (pad ${r.padB}px)`),
);

/* shoot the same word at each candidate headroom */
for (const em of [0.14, 0.22, 0.3, 0.38]) {
  await page.evaluate((v) => {
    let s = document.getElementById("probe-headroom");
    if (!s) {
      s = document.createElement("style");
      s.id = "probe-headroom";
      document.head.appendChild(s);
    }
    s.textContent = `
      [class*='statementMask'] {
        padding-block: ${v}em !important;
        margin-block: -${v}em !important;
      }`;
  }, em);
  await new Promise((r) => setTimeout(r, 500));

  const clip = await page.evaluate(() => {
    const m = [...document.querySelectorAll("[class*='statementMask']")].find((x) =>
      /comfortable/i.test(x.textContent || ""),
    );
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return {
      x: Math.max(0, r.left - 20),
      y: scrollY + r.top - 20,
      width: Math.min(560, r.width + 60),
      height: r.height + 60,
    };
  });
  if (!clip) {
    console.log(`  ${em}em — "comfortable" mask not found`);
    continue;
  }
  await page.screenshot({ path: `${OUT}/headroom-${em}.png`, clip });
  console.log(`  ${OUT}/headroom-${em}.png`);
}

setTimeout(() => process.exit(0), 1200);
await b.close().catch(() => {});
process.exit(0);
