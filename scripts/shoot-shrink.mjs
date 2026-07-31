/* Frames of the interlude → journal flight, plus the hero floor and the
   manifesto's three arrivals. usage: node scripts/shoot-shrink.mjs [port] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const OUT = "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/2023fdca-cd86-4bca-922b-c2f81853e348/scratchpad/shrink";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#blog", { timeout: 60000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 60000 },
);
await sleep(1500);

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

// ---- hero floor: the cue now sits above the wordmark
await shot("00-hero");

// ---- the manifesto, mid-parting and at rest
await page.evaluate(() => {
  const el = document.querySelector('section[class*="Manifesto_section"]');
  window.__lenis?.scrollTo(
    window.scrollY + el.getBoundingClientRect().top - innerHeight * 0.1,
    { immediate: true },
  );
});
await sleep(900);
await shot("01-manifesto-mid");
await sleep(2600);
await shot("02-manifesto-rest");

// ---- the flight, six frames across one viewport of scroll
await page.evaluate(() => {
  const band = document.querySelector('section[class*="Interlude_section"]');
  const r = band.getBoundingClientRect();
  window.__lenis?.scrollTo(window.scrollY + r.bottom - innerHeight, {
    immediate: true,
  });
});
await sleep(1600);
await shot("03-band");

const STEP = 165;
for (let i = 0; i < 6; i++) {
  await page.evaluate(
    (d) => window.__lenis?.scrollTo(window.scrollY + d, { immediate: true }),
    STEP,
  );
  await sleep(230);
  await shot(`0${4 + i}-flight-${i}`);
}
await sleep(1400);
await shot("10-landed");

console.log(OUT);
await b.close();
