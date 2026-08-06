import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const shots = [
  { url: "http://localhost:3000/", out: "home.png", clip: { x: 0, y: 0, width: 1920, height: 1200 }, wait: 10000 },
];

const OUT_DIR =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/fc04547a-202a-40ea-b67e-b87eb37db283/scratchpad";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  defaultViewport: { width: 1920, height: 1200 },
});
const page = await browser.newPage();

for (const s of shots) {
  await page.goto(s.url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, s.wait ?? 1500));
  await page.screenshot({ path: `${OUT_DIR}/${s.out}`, clip: s.clip });
  console.log("saved", s.out);
}

await browser.close();
