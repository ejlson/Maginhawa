import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/tmp/mgnhw_render";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(5000);

await page.evaluate(() => {
  document.querySelector("#restaurants")?.scrollIntoView({ block: "center" });
});
await sleep(1200);
const btns = await page.$$("#restaurants nav button");
if (btns[3]) await btns[3].hover();
await sleep(900);

const nav = await page.$("#restaurants nav");
await nav.screenshot({ path: `${OUT}/mark_crop.png` });
console.log("shot crop");
await browser.close();
