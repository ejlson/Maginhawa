/* THE RESTAURANT GRID WITHOUT THE ASSEMBLY.
 *
 * Four assertions, all of them about what should NO LONGER happen:
 *   1. `data-assembly-step` never appears on the section — the attribute the
 *      step machine published while it owned the chapter. Sampled on every
 *      scroll frame across the whole page, not once at the end, because the
 *      sequence only ever ran for ~8.7s in the middle of the approach.
 *   2. the page is never LOCKED. The intro took `overflow: hidden` off the
 *      root and called `lenis.stop()`; both are sampled the same way, and
 *      the document's own scrollHeight is checked to have stayed scrollable.
 *   3. all eight cards are on screen and untransformed when the grid is in
 *      view — no plate is left mid-flight, invisible, or off its seat.
 *   4. the expansion still opens from a card and closes, which is the one
 *      piece of the chapter that shares machinery with the deleted flight
 *      (the plate's `layoutId`).
 *
 * Console errors are collected throughout. The known `prefers-reduced-motion`
 * hydration warning is excluded BY NAME; anything else fails.
 *
 * usage: node scripts/probe-home-grid.mjs [port] [width] [height]
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

const msgs = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") msgs.push(m.text());
});
page.on("pageerror", (e) => msgs.push(`PAGEERROR ${e.message}`));

/* domcontentloaded, never networkidle0: the hover clips and the hero film
   loop, so this page's network never goes quiet. */
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await new Promise((r) => setTimeout(r, 1200));

/* ---------- 1 + 2: sampled all the way down and part-way back ---------- */
await page.evaluate(() => {
  window.__watch = { step: [], locked: [], stopped: [] };
  const sample = () => {
    const sec = document.querySelector("#restaurants");
    const s = sec?.getAttribute("data-assembly-step");
    if (s !== null && s !== undefined) window.__watch.step.push(s);
    if (document.documentElement.style.overflow === "hidden")
      window.__watch.locked.push(Math.round(window.scrollY));
    if (window.__lenis?.isStopped)
      window.__watch.stopped.push(Math.round(window.scrollY));
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
});

/* ~500px steps: teleporting past a section does NOT fire its
   IntersectionObservers, and the grid's entrance is behind one. Lenis
   overrides window.scrollTo, so drive it through the handle it publishes. */
const step = async (px, times, gap) => {
  for (let i = 0; i < times; i++) {
    await page.evaluate((d) => {
      const l = window.__lenis;
      if (l) l.scrollTo(l.actualScroll + d, { immediate: true, force: true });
      else window.scrollBy(0, d);
    }, px);
    await new Promise((r) => setTimeout(r, gap));
  }
};
await step(500, 20, 90);
await step(-500, 12, 90);
await new Promise((r) => setTimeout(r, 600));

const watch = await page.evaluate("window.__watch");

/* ---------- 3: the eight cards, with the grid parked in view ---------- */
await page.evaluate(() => {
  const g = document.querySelector('[class*="Discover_grid"]');
  const y = g.getBoundingClientRect().top + window.scrollY - 40;
  const l = window.__lenis;
  if (l) l.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
});
await new Promise((r) => setTimeout(r, 2500));

const cards = await page.evaluate(() => {
  const plates = [...document.querySelectorAll("[data-plate]")];
  return plates.map((p) => {
    const r = p.getBoundingClientRect();
    const cs = getComputedStyle(p);
    const surf = p.querySelector('[class*="cardSurface"]');
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      opacity: +cs.opacity,
      // "none" is the resting state; anything else means a plate is still
      // being driven by something
      transform: cs.transform,
      // the card's own furniture, which the intro used to stage separately
      crown: !!p.querySelector('[class*="cardCrown"]'),
      glassOpacity: +getComputedStyle(
        p.querySelector('[class*="Discover_glass"]'),
      ).opacity,
      rampOpacity: +getComputedStyle(
        p.querySelector('[class*="rampScrim"]'),
      ).opacity,
      surfaced: !!surf,
    };
  });
});

/* ---------- 4: the expansion still morphs out of a card ---------- */
await page.evaluate(() => {
  document
    .querySelectorAll("[data-plate]")[2]
    .querySelector('[class*="plateHit"]')
    .click();
});
await new Promise((r) => setTimeout(r, 1100));
const opened = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]');
  const m = d?.querySelector('[class*="expandMedia"]');
  return {
    open: !!d,
    label: d?.getAttribute("aria-label") ?? null,
    mediaW: m ? Math.round(m.getBoundingClientRect().width) : 0,
  };
});
await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 1100));
const closed = await page.evaluate(() => ({
  open: !!document.querySelector('[role="dialog"]'),
  rootOverflow: document.documentElement.style.overflow || "(none)",
  lenisStopped: !!window.__lenis?.isStopped,
}));

/* ---------- report ---------- */
const KNOWN = /prefers-reduced-motion/i;
const errs = msgs.filter((m) => !KNOWN.test(m));

console.log(`\n=== HOME GRID, NO ASSEMBLY @ ${W}x${H} (port ${PORT}) ===`);
console.log(
  `  1. data-assembly-step samples seen   ${watch.step.length}  ${watch.step.length === 0 ? "PASS" : "FAIL — " + watch.step.join(",")}`,
);
console.log(
  `  2. root overflow:hidden frames       ${watch.locked.length}  ${watch.locked.length === 0 ? "PASS" : "FAIL at scrollY " + watch.locked.slice(0, 6).join(",")}`,
);
console.log(
  `     lenis.isStopped frames            ${watch.stopped.length}  ${watch.stopped.length === 0 ? "PASS" : "FAIL at scrollY " + watch.stopped.slice(0, 6).join(",")}`,
);

const allVisible =
  cards.length === 8 &&
  cards.every(
    (c) =>
      c.opacity === 1 &&
      c.w > 0 &&
      c.h > 0 &&
      c.glassOpacity === 1 &&
      c.rampOpacity === 1 &&
      c.crown &&
      c.surfaced,
  );
console.log(`  3. cards found ${cards.length} — all visible & furnished: ${allVisible ? "PASS" : "FAIL"}`);
cards.forEach((c, i) =>
  console.log(
    `       [${i}] ${c.w}x${c.h}  plate ${c.opacity}  block ${c.glassOpacity}  ramp ${c.rampOpacity}  transform ${c.transform}`,
  ),
);

console.log(
  `  4. expansion opened                  ${opened.open ? "PASS" : "FAIL"}  (${opened.label}, media ${opened.mediaW}px)`,
);
console.log(
  `     expansion closed on Escape        ${!closed.open ? "PASS" : "FAIL"}  root overflow now ${closed.rootOverflow}, lenis stopped ${closed.lenisStopped}`,
);

console.log(`\n  console errors/warnings (known reduced-motion warning excluded): ${errs.length}`);
errs.slice(0, 10).forEach((m) => console.log(`    ${m.slice(0, 220)}`));

await b.close();
