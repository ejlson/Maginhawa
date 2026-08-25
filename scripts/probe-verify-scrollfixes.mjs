/* DID THE THREE SCROLL FIXES CHANGE WHAT THE READER SEES? They must not.

   1. Discover's pan still pans. The loop now skips plates far outside the
      viewport, so the test is that a VISIBLE plate's `--photo-translate`
      still tracks scroll — and that it is a real spread of values, not a
      single frozen one.
   2. The depth-of-field bands still blur. `will-change` came off all three;
      the blur is supposed to be byte-identical.
   3. The glass cursor still adopts a zone. Its scroll re-resolve is
      throttled to 20Hz with a trailing call, so a settled scroll must end
      with the correct zone, not a stale one.

   usage: node scripts/probe-verify-scrollfixes.mjs <port> [label]        */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3202";
const LABEL = process.argv[3] || `:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
const cdp = await page.target().createCDPSession();
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2", timeout: 90000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading") &&
        !document.querySelector('[class*="Loader_overlay__"]'),
  { timeout: 45000 },
).catch(() => console.warn("! loader gate timed out"));
await sleep(1200);

console.log(`\n══ ${LABEL} ══`);

/* ── 1. the pan ── park where the plates are actually on screen, then
   sample one plate's variable across a slow scroll */
const grid = await page.evaluate(() => {
  const el = document.querySelector("#restaurants");
  return el ? el.getBoundingClientRect().top + scrollY : null;
});
await page.evaluate((y) => window.__lenis?.scrollTo(y, { immediate: true }), (grid || 0) + 200);
await sleep(1000);

const samples = [];
for (let i = 0; i < 14; i++) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 700, y: 450, deltaX: 0, deltaY: 100 });
  await sleep(90);
  samples.push(await page.evaluate(() => {
    const seats = [...document.querySelectorAll("[data-plate]")];
    const vh = innerHeight;
    // the plate nearest the middle of the screen is the one being watched
    const on = seats
      .map((s) => ({ s, r: s.getBoundingClientRect() }))
      .filter(({ r }) => r.bottom > 0 && r.top < vh)
      .sort((a, b) => Math.abs(a.r.top + a.r.height / 2 - vh / 2) - Math.abs(b.r.top + b.r.height / 2 - vh / 2))[0];
    if (!on) return null;
    return {
      v: on.s.style.getPropertyValue("--photo-translate").trim(),
      applied: getComputedStyle(on.s.querySelector('[class*="photo"]') || on.s).translate,
    };
  }));
}
const vals = samples.filter(Boolean).map((s) => parseFloat((s.v.match(/(-?[\d.]+)px/) || [])[1] ?? "NaN")).filter((n) => !Number.isNaN(n));
const uniq = [...new Set(vals.map((v) => v.toFixed(2)))];
console.log(`  1. pan       ${vals.length} samples, ${uniq.length} distinct values` +
  `  range ${vals.length ? `${Math.min(...vals).toFixed(1)} … ${Math.max(...vals).toFixed(1)}px` : "n/a"}`);
console.log(`     applied to .photo: ${samples.find(Boolean)?.applied ?? "n/a"}`);
console.log(`     ${uniq.length > 4 ? "PASS — the plate is still panning" : "FAIL — value is frozen"}`);

/* ── 2. the bands ── present, blurring, and not marked will-change */
const bands = await page.evaluate(() => {
  const el = document.querySelector(".scrollBlur");
  if (!el) return null;
  const read = (t) => {
    const s = getComputedStyle(el, t);
    return { filter: s.backdropFilter || s.webkitBackdropFilter, wc: s.willChange };
  };
  return { base: read(null), before: read("::before"), after: read("::after") };
});
console.log(`  2. bands     base   ${bands?.base.filter}   will-change: ${bands?.base.wc}`);
console.log(`               ::before ${bands?.before.filter}  ::after ${bands?.after.filter}`);
console.log(`     ${bands && /blur/.test(bands.base.filter) && bands.base.wc === "auto" ? "PASS — blur intact, hint gone" : "CHECK"}`);

/* ── 3. the cursor ── park over a plate, scroll, stop, and read the zone
   AFTER the scroll has settled: the trailing resolve is what makes this
   correct rather than stale */
await page.evaluate(() => window.__lenis?.scrollTo(document.body.scrollHeight * 0.02, { immediate: true }));
await sleep(900);
await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 720, y: 450 });
await sleep(400);
const before = await page.evaluate(() => document.documentElement.classList.contains("glass-cursor"));
for (let i = 0; i < 10; i++) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 450, deltaX: 0, deltaY: 100 });
  await sleep(50);
}
await sleep(1400); // well past the 50ms trailing window + Lenis settle
const after = await page.evaluate(() => ({
  glass: document.documentElement.classList.contains("glass-cursor"),
  /* ⚠️ THIS MUST MIRROR `visibleMediaAt` IN CustomCursor.tsx, NOT just ask
     whether media is anywhere in the hit stack. The component stops at the
     first OPAQUE layer, because media buried under a solid section must not
     light the glass. A probe that skips that rule reports a correct cursor
     as stale — which is exactly what it did on the baseline build too, and
     is how this assertion was caught rather than believed. */
  overMedia: (() => {
    for (const n of document.elementsFromPoint(720, 450)) {
      if (n.tagName === "IMG" || n.tagName === "VIDEO") {
        const r = n.getBoundingClientRect();
        if (r.width >= 180 && r.height >= 120) return true;
        continue;
      }
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && bg !== "transparent") {
        const a = bg.startsWith("rgba") ? parseFloat(bg.split(",")[3]) : 1;
        if (a >= 0.99) return false;
      }
    }
    return false;
  })(),
}));
console.log(`  3. cursor    glass before scroll: ${before} | after settle: ${after.glass} | media under pointer: ${after.overMedia}`);
console.log(`     ${after.glass === after.overMedia ? "PASS — resolved state matches what is under the pointer" : "FAIL — stale after scroll"}`);

await b.close();
