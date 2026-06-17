import puppeteer from "puppeteer-core";

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/tmp/mgnhw_render";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle0" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// capture the intro mid-animation
await sleep(900);
await page.screenshot({ path: `${OUT}/live_00_intro.png` });

// let intro finish + settle
await sleep(2600);
await page.screenshot({ path: `${OUT}/live_01_hero.png` });

// scroll through the page
const total = await page.evaluate(() => document.body.scrollHeight);
const step = 900;
let shot = 2;
for (let y = step; y < total; y += step) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await sleep(700);
  await page.screenshot({ path: `${OUT}/live_${String(shot).padStart(2, "0")}.png` });
  shot++;
  if (shot > 16) break;
}

console.log("done, total height", total);
await browser.close();
