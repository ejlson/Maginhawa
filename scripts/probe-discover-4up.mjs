import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT_DIR =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/fc04547a-202a-40ea-b67e-b87eb37db283/scratchpad";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  defaultViewport: { width: 1920, height: 1200 },
});
const page = await browser.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 1500));

// scroll the grid into the middle band repeatedly to arm + ride out the intro
await page.evaluate(() => {
  const el = document.querySelector('[aria-label="Our restaurants"]');
  el?.scrollIntoView({ block: "center" });
});
await new Promise((r) => setTimeout(r, 6000));
// nudge scroll a little to make sure any scroll-gated arming has a chance to fire
await page.mouse.wheel({ deltaY: 50 });
await new Promise((r) => setTimeout(r, 16000));

await page.screenshot({ path: `${OUT_DIR}/discover-4up.png` });
console.log("saved discover-4up.png");

await browser.close();
