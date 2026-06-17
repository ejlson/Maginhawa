import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/tmp/mgnhw_render";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
// don't wait for the heavy video — capture the intro as it plays
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const marks = [4200];
let i = 0;
for (const m of marks) {
  const prev = i === 0 ? 0 : marks[i - 1];
  await sleep(m - prev);
  await page.screenshot({ path: `${OUT}/hero_fs_${String(i).padStart(2, "0")}_${m}ms.png` });
  i++;
}
console.log("intro frames done");
await browser.close();
