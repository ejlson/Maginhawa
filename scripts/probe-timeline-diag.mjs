/* Diagnostic: why did hover/focus/entrance not engage in the audit run?
   Dumps the media-query gates, the scroll state, the matched selectors and
   the live computed values, so a probe artefact can be told apart from a
   real defect. usage: node scripts/probe-timeline-diag.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const PAGE = `http://localhost:${PORT}/about`;
const LI = '[class*="timeline"] > li';

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(PAGE, { waitUntil: "networkidle2" });
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 })
  .catch(() => {});
await new Promise((r) => setTimeout(r, 800));

console.log("=== MEDIA GATES ===");
console.log(
  await page.evaluate(() => ({
    w981: matchMedia("(min-width: 981px)").matches,
    hover: matchMedia("(hover: hover)").matches,
    fine: matchMedia("(pointer: fine)").matches,
    noPref: matchMedia("(prefers-reduced-motion: no-preference)").matches,
    reduce: matchMedia("(prefers-reduced-motion: reduce)").matches,
    fullGate: matchMedia(
      "(min-width: 981px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    ).matches,
    hasSupport: CSS.supports("selector(:has(a))"),
    isSupport: CSS.supports("selector(:is(:hover))"),
    focusWithin: CSS.supports("selector(:focus-within)"),
  })),
);

console.log("\n=== SCROLL / GEOMETRY BEFORE ===");
console.log(
  await page.evaluate(`(() => {
    const ol = document.querySelector('[class*="timeline"]');
    const r = ol.getBoundingClientRect();
    return { scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight,
             olTop: Math.round(r.top), olH: Math.round(r.height),
             lenis: typeof window.lenis, html: document.documentElement.className };
  })()`),
);

// walk the page down in real steps so Lenis + observers behave like a reader
for (let i = 0; i < 90; i++) {
  await page.evaluate(() => window.scrollBy(0, 220));
  await new Promise((r) => setTimeout(r, 40));
}
await new Promise((r) => setTimeout(r, 1200));

console.log("\n=== AFTER A REAL SCROLL SWEEP ===");
console.log(
  await page.evaluate(`(() => {
    const items = [...document.querySelectorAll('${LI}')];
    const q=(l,c)=>l.querySelector('[class*="'+c+'"]');
    return {
      scrollY: Math.round(scrollY),
      entered: items.map(li => /entered/.test(li.className) ? 1 : 0).join(''),
      clips: items.map(li => getComputedStyle(q(li,'frame')).clipPath.slice(0,34)),
      parallax: items.map(li => getComputedStyle(q(li,'parallax')).transform),
    };
  })()`),
);

// bring item 3 to the middle by real scrolling, then hover its frame
const to = await page.evaluate(`(() => {
   const li = document.querySelectorAll('${LI}')[3];
   const r = li.getBoundingClientRect();
   return Math.round(scrollY + r.top + r.height/2 - innerHeight/2);
})()`);
let cur = await page.evaluate("Math.round(scrollY)");
const dir = to > cur ? 1 : -1;
while (Math.abs(cur - to) > 200) {
  await page.evaluate((d) => window.scrollBy(0, d), dir * 200);
  await new Promise((r) => setTimeout(r, 30));
  cur = await page.evaluate("Math.round(scrollY)");
}
await new Promise((r) => setTimeout(r, 1400));

const fr = await page.evaluate(`(() => { const r = document.querySelectorAll('${LI}')[3].querySelector('[class*="frame"]').getBoundingClientRect();
  return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), rect: [r.x,r.y,r.width,r.height].map(Math.round) }; })()`);
console.log("\n=== ITEM 3 FRAME CENTRE ===", fr, "viewport 1440x900");

await page.mouse.move(fr.x, fr.y);
await new Promise((r) => setTimeout(r, 1400));
console.log("\n=== HOVER STATE (mouse on item 3 frame) ===");
console.log(
  await page.evaluate(`(() => {
    const items = [...document.querySelectorAll('${LI}')];
    const q=(l,c)=>l.querySelector('[class*="'+c+'"]');
    const el = document.elementFromPoint(${fr.x}, ${fr.y});
    return {
      elementAtPoint: el ? el.tagName + '.' + (el.className||'').toString().slice(0,40) : null,
      inTimeline: el ? !!el.closest('[class*="timeline"]') : false,
      liHover: items.map(li => li.matches(':hover') ? 1 : 0).join(''),
      olHas: document.querySelector('[class*="timeline"]').matches(':has(li:hover)'),
      bodies: items.map(li => getComputedStyle(q(li,'itemBody')).opacity).join(','),
      inner3: getComputedStyle(q(items[3],'titleInner')).transform,
      dur3: getComputedStyle(q(items[3],'titleInner')).transitionDuration,
      clip3: getComputedStyle(q(items[3],'frame')).clipPath,
      entered3: items[3].className,
    };
  })()`),
);

await page.mouse.move(4, 4);
await new Promise((r) => setTimeout(r, 1200));
await page.evaluate(`document.querySelectorAll('${LI}')[3].querySelector('a').focus()`);
await new Promise((r) => setTimeout(r, 1400));
console.log("\n=== FOCUS STATE (a.focus() on item 3) ===");
console.log(
  await page.evaluate(`(() => {
    const items = [...document.querySelectorAll('${LI}')];
    const q=(l,c)=>l.querySelector('[class*="'+c+'"]');
    const a = document.activeElement;
    return {
      active: a.tagName + ' ' + (a.textContent||'').trim().slice(0,24),
      liFocusWithin: items.map(li => li.matches(':focus-within') ? 1 : 0).join(''),
      olHasFocus: document.querySelector('[class*="timeline"]').matches(':has(li:focus-within)'),
      bodies: items.map(li => getComputedStyle(q(li,'itemBody')).opacity).join(','),
      inner3: getComputedStyle(q(items[3],'titleInner')).transform,
      dur3: getComputedStyle(q(items[3],'titleInner')).transitionDuration,
      clip3: getComputedStyle(q(items[3],'frame')).clipPath,
      cls3: items[3].className,
    };
  })()`),
);

await b.close();
