import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/1fc8ec40-c8ba-4c1f-8e2d-89c2ff0d34ec/scratchpad";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"] });
for (const w of [1440, 981]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: 900 });
  await p.goto("http://localhost:51365/", { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 120000 });
  await p.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 800));
  // drive the intro to completion so the screenshot is the SETTLED chapter
  let armed = false;
  for (let i = 0; i < 24 && !armed; i++) {
    await p.evaluate(() => window.scrollBy(0, 500));
    await new Promise(r => setTimeout(r, 350));
    armed = await p.evaluate(() => document.getElementById("restaurants")?.dataset.assemblyArmed === "1");
  }
  if (armed) {
    await p.waitForFunction(() => document.getElementById("restaurants")?.dataset.assemblyStep === undefined, { timeout: 20000 });
    await new Promise(r => setTimeout(r, 2500));
  }
  await p.screenshot({ path: `${OUT}/head-${w}.png` });
  await p.close();
}
await b.close();
console.log("shots saved");
