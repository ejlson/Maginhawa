/* THE SEAM BETWEEN THE RESTAURANT GRID AND THE STATEMENT.
 *
 * One number, measured rather than read off two stylesheets: the vertical
 * distance from the LAST CARD's bottom edge to the statement's FIRST INK.
 * That is the gap a reader actually sees, and it is the sum of four things
 * that live in three files — Discover's `.section` bottom padding, the
 * statement's own `.section` top padding, whatever `min-height` centring is
 * doing to the sentence inside it, and (before this pass) ChapterPin's
 * 60vh runway. Adding the declared values up gets the wrong answer.
 *
 * It also reports whether anything on the page is PINNED: the statement's
 * offset from the document top is sampled across a scroll sweep, and a
 * chapter that is being held still on screen shows up as an offset that
 * stops tracking the scroll. See the pass description that used to be in
 * ChapterPin.tsx.
 *
 * usage: node scripts/probe-home-seam.mjs [port] [width] [height]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "65366";
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

/* NEVER networkidle0 on this site — the hover clips and the hero film loop,
   so the network never goes quiet. The loader's own class is the signal. */
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await new Promise((r) => setTimeout(r, 1200));

/* Scroll in ~500px steps: teleporting past a section does NOT fire its
   IntersectionObservers, and half this page's type is behind one. Lenis
   overrides window.scrollTo, so drive it through the handle it publishes. */
const travel = async (to) => {
  await page.evaluate((y) => {
    const l = window.__lenis;
    if (l) l.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, to);
  await new Promise((r) => setTimeout(r, 120));
};

const docH = await page.evaluate(() => document.documentElement.scrollHeight);
const samples = [];
for (let y = 0; y < docH; y += 500) {
  await travel(y);
  const s = await page.evaluate(() => {
    const st = document.querySelector('[class*="Manifesto_section"]');
    return {
      y: Math.round(window.scrollY),
      // the statement's own top in DOCUMENT coordinates. On an unpinned
      // page this is a constant; a held chapter's grows with the scroll.
      docTop: st
        ? Math.round(st.getBoundingClientRect().top + window.scrollY)
        : null,
      viewTop: st ? Math.round(st.getBoundingClientRect().top) : null,
    };
  });
  samples.push(s);
}
await travel(0);
await new Promise((r) => setTimeout(r, 900));

const seam = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("[data-plate]")];
  const last = cards[cards.length - 1];
  const st = document.querySelector('[class*="Manifesto_section"]');
  const line = st?.querySelector("h2");
  const grid = document.querySelector('[class*="Discover_grid"]');
  const sec = document.querySelector("#restaurants");
  const abs = (el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, h: r.height };
  };
  const g = abs(grid), s = abs(sec), c = abs(last), b = abs(st), l = abs(line);
  return {
    cards: cards.length,
    gridBottom: Math.round(g.bottom),
    sectionBottom: Math.round(s.bottom),
    lastCardBottom: Math.round(c.bottom),
    statementTop: Math.round(b.top),
    statementInk: Math.round(l.top),
    statementH: Math.round(b.h),
    // what the reader sees: last photograph's edge → the sentence's ink
    inkGap: Math.round(l.top - c.bottom),
    // the structural gap: grid box → statement box
    boxGap: Math.round(b.top - g.bottom),
    docHeight: document.documentElement.scrollHeight,
  };
});

console.log(`\n=== HOME SEAM @ ${W}x${H} (port ${PORT}) ===`);
console.log(`  cards in grid          ${seam.cards}`);
console.log(`  grid bottom            ${seam.gridBottom}`);
console.log(`  Discover section end   ${seam.sectionBottom}   (bottom padding ${seam.sectionBottom - seam.gridBottom}px)`);
console.log(`  statement box top      ${seam.statementTop}`);
console.log(`  statement first ink    ${seam.statementInk}   (top padding + centring ${seam.statementInk - seam.statementTop}px)`);
console.log(`  statement box height   ${seam.statementH}`);
console.log(`  ── BOX GAP  grid→statement      ${seam.boxGap}px`);
console.log(`  ── INK GAP  last card→sentence  ${seam.inkGap}px`);
console.log(`  document height        ${seam.docHeight}`);

/* PINNED? A held chapter is one whose document-space top MOVES as the page
   scrolls (ChapterPin pushed it down at very nearly the scroll rate). An
   ordinary section's docTop is the same number at every scroll position. */
const tops = samples.map((s) => s.docTop).filter((v) => v !== null);
const spread = Math.max(...tops) - Math.min(...tops);
console.log(`\n=== PIN CHECK (statement's top in document space) ===`);
console.log(`  samples ${tops.length}  min ${Math.min(...tops)}  max ${Math.max(...tops)}  spread ${spread}px`);
console.log(`  UNPINNED (spread <= 2px): ${spread <= 2 ? "PASS" : "FAIL — the statement is being held"}`);

await b.close();
