/* The veil's reason to exist: on a viewport TALLER than the section, the
   neighbouring chapters would otherwise sit on screen either side of the
   title while the sequence plays. Shoots the split moment at three heights.
   usage: node scripts/probe-tall.mjs [port] [outdir] */
import puppeteer from "puppeteer-core";
import { play } from "./lib-intro.mjs";
import { mkdirSync, rmSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const OUT = process.argv[3] || "/tmp/mgnhw_tall";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

for (const h of [900, 1080, 1240]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: h });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#restaurants [data-plate]", { timeout: 60000 });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  });
  await sleep(1200);
  const { armed } = await play(page);
  // the rest state, then the deck fully gathered between the words
  await sleep(600);
  await page.screenshot({ path: `${OUT}/h${h}_field.png` });
  await sleep(2800);
  await page.screenshot({ path: `${OUT}/h${h}_split.png` });
  const r = await page.evaluate(() => {
    const sec = document.querySelector("#restaurants").getBoundingClientRect();
    return { armed: true, sectionTop: Math.round(sec.top), sectionBottom: Math.round(sec.bottom), vh: innerHeight };
  });
  console.log(`h=${h}`, armed ? "armed" : "NOT ARMED", JSON.stringify(r));
  await page.close();
}
await browser.close();
