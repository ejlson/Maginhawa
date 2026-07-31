/* What a hovered restaurant tile actually LOOKS like, in both views.
   usage: node scripts/shoot-hover.mjs [port] [tag] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { sleep, arm, started } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const TAG = process.argv[3] || "new";
const OUT =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/2023fdca-cd86-4bca-922b-c2f81853e348/scratchpad/hover";
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#restaurants", { timeout: 60000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 60000 },
);
await sleep(1200);
await arm(page);
await started(page);
await page.waitForFunction(
  () =>
    document.documentElement.style.overflow !== "hidden" &&
    !document.querySelector("[data-assembly-step]"),
  { timeout: 60000, polling: 200 },
);
await sleep(1500);
await page.evaluate(() =>
  document.querySelector("#restaurants").scrollIntoView({ block: "center" }),
);
await sleep(800);

const shot = (n) => page.screenshot({ path: `${OUT}/${TAG}-${n}.png` });
const centre = (i) =>
  page.evaluate((i) => {
    const p = document.querySelectorAll("[data-plate]")[i];
    const r = p.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, i);

await shot("00-grid-rest");
let c = await centre(0);
await page.mouse.move(c.x, c.y);
await sleep(900);
await shot("01-grid-hover-early");
await sleep(2600);
await shot("02-grid-hover-late");

// into the reel
await page.mouse.move(6, 6);
await page.evaluate(() => {
  document.querySelectorAll('[class*="Discover_toggleOpt"]')[1]?.click();
});
await sleep(2000);
await page.evaluate(() =>
  document.querySelector("#restaurants").scrollIntoView({ block: "center" }),
);
await sleep(500);
await shot("03-reel-rest");
c = await centre(1);
await page.mouse.move(c.x, c.y);
await sleep(900);
await shot("04-reel-hover-early");
await sleep(2600);
await shot("05-reel-hover-late");

console.log(OUT);
await b.close();
