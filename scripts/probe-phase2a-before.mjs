/* Phase 2a BEFORE probe: the Discover head's real geometry at 1440 —
   heading ink bottom vs standfirst last-line bottom (design request A
   baseline).

   It also used to time the intro's scroll lock (B3 baseline), reading
   `data-assembly-step` / `data-assembly-armed` off the section. The
   assembly intro was removed and there is no lock to time, so that half
   is gone; the head geometry is unaffected by it and still measures.

   Run against the dev server on :3000. */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/`, {
  waitUntil: "domcontentloaded",
  timeout: 45000,
});
// never networkidle0 — the looping hero video keeps the network alive
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 30000 },
);
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 1200));

// scroll toward the section in ~500px wheel steps (arms IOs along the way)
// until the head is on screen, then let Lenis settle before measuring
for (let i = 0; i < 30; i++) {
  const onScreen = await page.evaluate(() => {
    const sec = document.getElementById("restaurants");
    if (!sec) return false;
    const t = sec.getBoundingClientRect().top;
    return t < window.innerHeight * 0.5;
  });
  if (onScreen) break;
  await page.mouse.wheel({ deltaY: 500 });
  await new Promise((r) => setTimeout(r, 350));
}
await new Promise((r) => setTimeout(r, 2500));

const result = await page.evaluate(() => {
  const h2 = document.querySelector('#restaurants h2:not([class*="intro"])');
  const cap = document.querySelector('#restaurants [class*="_caption__"]');
  const head = document.querySelector('#restaurants [class*="_head__"]');
  if (!h2 || !cap || !head) return { error: "missing nodes" };

  // ink bottom of a word span: baseline (line-box top + half-leading +
  // font ascent) + the glyphs' actual descent, via canvas TextMetrics
  const inkBottom = (el) => {
    const cs = getComputedStyle(el);
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const text = el.textContent;
    const m = ctx.measureText(text);
    const node = [...el.childNodes].find((n) => n.nodeType === 3);
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()];
    const last = rects[rects.length - 1];
    const lh = parseFloat(cs.lineHeight);
    const fontH = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
    // Chrome range rects are the inline box (ascent+descent); baseline sits
    // fontBoundingBoxAscent below its top
    const baseline = last.top + m.fontBoundingBoxAscent;
    return {
      text,
      rect: { top: last.top, bottom: last.bottom, h: last.height },
      lineHeightPx: lh,
      fontHeightPx: fontH,
      baseline,
      inkBottom: baseline + m.actualBoundingBoxDescent,
      hasTextNode: Boolean(node),
    };
  };

  const rest = [...h2.querySelectorAll("span")].find(
    (s) => s.textContent === "Restaurants.",
  );
  // the caption's words are inside SplitWords masks; take the last word span
  const words = [...cap.querySelectorAll("span")].filter(
    (s) => s.childElementCount === 0 && s.textContent.trim(),
  );
  const lastWord = words[words.length - 1];

  const capR = cap.getBoundingClientRect();
  const h2R = h2.getBoundingClientRect();
  const headR = head.getBoundingClientRect();
  const headCS = getComputedStyle(head);
  return {
    viewport: innerWidth + "x" + innerHeight,
    head: {
      display: headCS.display,
      alignItems: headCS.alignItems,
      rect: { top: headR.top, bottom: headR.bottom },
    },
    h2: {
      rect: { top: h2R.top, bottom: h2R.bottom, right: h2R.right },
      inlineFontSize: h2.style.fontSize,
      computedFontSize: getComputedStyle(h2).fontSize,
      textContent: h2.textContent,
      lineCount: Math.round(
        h2R.height /
          (parseFloat(getComputedStyle(h2).fontSize) *
            parseFloat(getComputedStyle(h2).lineHeight) /
            parseFloat(getComputedStyle(h2).fontSize) || 1),
      ),
    },
    caption: {
      rect: { top: capR.top, bottom: capR.bottom },
      alignSelf: getComputedStyle(cap).alignSelf,
      gridRow: getComputedStyle(cap).gridRow,
    },
    headingInk: rest ? inkBottom(rest) : null,
    captionLastWord: lastWord ? inkBottom(lastWord) : null,
    boxDelta_capBottom_minus_h2Bottom: capR.bottom - h2R.bottom,
  };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
