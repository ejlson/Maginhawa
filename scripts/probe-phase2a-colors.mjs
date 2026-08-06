/* Phase 2a supplement: resolved color-mix values (B2), the literal
   document.querySelector("h2") check (B5), and screenshot evidence of the
   head band + one plate caption. Reduced motion so the grid is settled
   without riding the intro. */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/1fc8ec40-c8ba-4c1f-8e2d-89c2ff0d34ec/scratchpad";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "reduce" },
]);
await page.goto("http://localhost:51365/", {
  waitUntil: "domcontentloaded",
  timeout: 45000,
});
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 30000 },
);
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() =>
  document.getElementById("restaurants")?.scrollIntoView({ block: "start" }),
);
await new Promise((r) => setTimeout(r, 2500));

const facts = await page.evaluate(() => {
  const firstH2 = document.querySelector("h2");
  const capt = document.querySelector('#restaurants [class*="cellCaption"]');
  const scrim = document.querySelector('#restaurants [class*="_scrim__"]');
  const pill = document.querySelector('#restaurants [class*="_pill__"]');
  const pillBook = document.querySelector('#restaurants [class*="pillBook"]');
  const pillRow = document.querySelector('#restaurants [class*="pillRow"]');
  return {
    firstH2Text: firstH2?.textContent,
    firstH2ContainsTarget: firstH2?.textContent?.includes("Our Restaurants."),
    discoverH2Text: document.querySelector(
      '#restaurants h2:not([class*="intro"])',
    )?.textContent,
    windowFind: window.find
      ? (() => {
          const hit = window.find("Our Restaurants.", false, false, true);
          getSelection()?.removeAllRanges();
          return hit;
        })()
      : "n/a",
    cellCaptionBg: capt && getComputedStyle(capt).backgroundImage,
    scrimBg: scrim && getComputedStyle(scrim).backgroundImage.slice(0, 220),
    pillBg: pill && getComputedStyle(pill).backgroundColor,
    pillBookBorder: pillBook && getComputedStyle(pillBook).borderColor,
    pillRowBorderTop: pillRow && getComputedStyle(pillRow).borderTopColor,
  };
});
console.log(JSON.stringify(facts, null, 2));

// screenshots: the head band, and one plate's caption zone
const rects = await page.evaluate(() => {
  const head = document
    .querySelector('#restaurants [class*="_head__"]')
    .getBoundingClientRect();
  const cell = document
    .querySelector('#restaurants [class*="_cell__"]')
    .getBoundingClientRect();
  return {
    sy: window.scrollY,
    head: { x: head.left, y: head.top, w: head.width, h: head.height },
    cell: { x: cell.left, y: cell.top, w: cell.width, h: cell.height },
  };
});
// clip coords are DOCUMENT-origin, so add scrollY
await page.screenshot({
  path: `${OUT}/head-band.png`,
  clip: {
    x: Math.max(0, rects.head.x - 8),
    y: rects.sy + rects.head.y - 8,
    width: rects.head.w + 16,
    height: rects.head.h + 24,
  },
});
await page.screenshot({
  path: `${OUT}/plate-caption.png`,
  clip: {
    x: rects.cell.x,
    y: rects.sy + rects.cell.y + rects.cell.h * 0.5,
    width: rects.cell.w,
    height: rects.cell.h * 0.5,
  },
});
console.log("saved head-band.png, plate-caption.png");
await browser.close();
