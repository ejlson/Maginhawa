/* Phase 2a AFTER probe.
   Phase 1 (1440): h2 textContent (B5), ink alignment (A, fitted size),
     caption anchoring (B4), then resize sweep 1100 → 981 → 390 → 360 →
     1440 (B1 + B8).
   Phase 2 (reduced motion = clamp size): ink alignment at 1440 / 1280 /
     981 (A at the return-visit size).
   Phase 3 (981): ink alignment at the smallest fitted size.

   Phases 1 and 3 used to ride the intro assembly out first and report its
   lock duration (B3) and step log, read off `data-assembly-step` /
   `data-assembly-armed`. The assembly was removed, so they now just walk
   the chapter into view — the head geometry these phases measure never
   depended on the sequence, only on being past the hero. */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";

const measureScript = () => ({
  // evaluated in page — returns head geometry + h2 facts
  fn: () => {
    const h2 = document.querySelector('#restaurants h2:not([class*="intro"])');
    const cap = document.querySelector('#restaurants [class*="_caption__"]');
    if (!h2 || !cap) return { error: "missing nodes" };

    const inkOf = (el, word) => {
      const cs = getComputedStyle(el);
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = ctx.measureText(word);
      const r = document.createRange();
      r.selectNodeContents(el);
      const rects = [...r.getClientRects()].filter((x) => x.width && x.height);
      const last = rects[rects.length - 1];
      if (!last) return null;
      const baseline = last.top + m.fontBoundingBoxAscent;
      return {
        lastLine: { top: last.top, bottom: last.bottom },
        baseline,
        inkBottom: baseline + m.actualBoundingBoxDescent,
      };
    };

    // heading ink: the "Restaurants." word span (mask); falls back to h2
    const restSpan = [...h2.querySelectorAll("span")].find(
      (s) => s.textContent === "Restaurants.",
    );
    const headingInk = inkOf(restSpan ?? h2, "Restaurants.");

    // caption ink: last word span when SplitWords rendered; else the p
    const wordSpans = [...cap.querySelectorAll("span")].filter(
      (s) => s.childElementCount === 0 && s.textContent.trim(),
    );
    const lastWord = wordSpans[wordSpans.length - 1];
    const capInk = lastWord
      ? inkOf(lastWord, lastWord.textContent)
      : inkOf(cap, "twist.");

    const h2R = h2.getBoundingClientRect();
    const capR = cap.getBoundingClientRect();
    const words = [...h2.querySelectorAll('[class*="titleLine"]')].map((s) => {
      const r = s.getBoundingClientRect();
      return { t: Math.round(r.top), r: Math.round(r.right) };
    });
    return {
      viewport: innerWidth,
      textContent: h2.textContent,
      inlineFontSize: h2.style.fontSize || "(none)",
      computedFontSize: getComputedStyle(h2).fontSize,
      oneLine: words.length === 2 && Math.abs(words[0].t - words[1].t) < 2,
      h2Right: Math.round(h2R.right * 10) / 10,
      bandRight: innerWidth - parseFloat(getComputedStyle(h2.closest("section")).paddingRight),
      capBottom: Math.round(capR.bottom * 10) / 10,
      h2Bottom: Math.round(h2R.bottom * 10) / 10,
      headingInkBottom: headingInk && Math.round(headingInk.inkBottom * 10) / 10,
      captionInkBottom: capInk && Math.round(capInk.inkBottom * 10) / 10,
      inkDelta_capMinusHeading:
        headingInk && capInk
          ? Math.round((capInk.inkBottom - headingInk.inkBottom) * 10) / 10
          : null,
    };
  },
});

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  defaultViewport: { width: 1440, height: 900 },
});

const load = async (page) => {
  const resp = await page.goto(`http://localhost:${PORT}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.waitForFunction(
    () => !document.body.classList.contains("is-loading"),
    { timeout: 30000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 1200));
  return resp.status();
};

/* wheel the chapter into view in ~500px steps, arming every
   IntersectionObserver on the way, then let Lenis settle */
const seatChapter = async (page) => {
  for (let i = 0; i < 30; i++) {
    const onScreen = await page.evaluate(() => {
      const sec = document.getElementById("restaurants");
      if (!sec) return false;
      return sec.getBoundingClientRect().top < window.innerHeight * 0.5;
    });
    if (onScreen) return true;
    await page.mouse.wheel({ deltaY: 500 });
    await new Promise((r) => setTimeout(r, 350));
  }
  console.log("WARN: #restaurants never reached the viewport in 30 steps");
  return false;
};

const { fn: measure } = measureScript();

// ---- Phase 1: 1440, then resize sweep ----
const p1 = await browser.newPage();
const status = await load(p1);
console.log("HTTP", status);
await seatChapter(p1);
await new Promise((r) => setTimeout(r, 2500));
console.log("PHASE1 @1440 fitted:", JSON.stringify(await p1.evaluate(measure)));

// caption anchoring after container-type removal (B4)
console.log(
  "PHASE1 caption-anchor:",
  JSON.stringify(
    await p1.evaluate(() => {
      const cell = document.querySelector('#restaurants [class*="_cell__"]');
      const capt = cell?.querySelector('[class*="cellCaption"]');
      const media = cell?.querySelector('[class*="tileMedia"]');
      if (!cell || !capt || !media) return { error: "missing" };
      const c = cell.getBoundingClientRect();
      const k = capt.getBoundingClientRect();
      const m = media.getBoundingClientRect();
      return {
        cellW: Math.round(c.width),
        capLeftDelta: Math.round((k.left - c.left) * 10) / 10,
        capRightDelta: Math.round((c.right - k.right) * 10) / 10,
        capBottomVsPlateBottom: Math.round((m.bottom - k.bottom) * 10) / 10,
      };
    }),
  ),
);

for (const w of [1100, 981, 390, 360, 1440]) {
  await p1.setViewport({ width: w, height: w < 700 ? 780 : 900 });
  await new Promise((r) => setTimeout(r, 500));
  console.log(`PHASE1 resized->${w}:`, JSON.stringify(await p1.evaluate(measure)));
}
await p1.close();

// ---- Phase 2: reduced motion (clamp size) ----
for (const w of [1440, 1280, 981]) {
  const p2 = await browser.newPage();
  await p2.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await p2.setViewport({ width: w, height: 900 });
  await load(p2);
  await p2.evaluate(() => {
    document.getElementById("restaurants")?.scrollIntoView({ block: "start" });
  });
  await new Promise((r) => setTimeout(r, 2500));
  console.log(`PHASE2 clamp @${w}:`, JSON.stringify(await p2.evaluate(measure)));
  await p2.close();
}

// ---- Phase 3: 981 (smallest fitted size) ----
const p3 = await browser.newPage();
await p3.setViewport({ width: 981, height: 900 });
await load(p3);
await seatChapter(p3);
await new Promise((r) => setTimeout(r, 2500));
console.log("PHASE3 @981 fitted:", JSON.stringify(await p3.evaluate(measure)));
await p3.close();

await browser.close();
