/* The two weight changes that are actually VISIBLE — the Contact submit pill
   (300 -> 500) and the Awards outlet name (700 -> 500). Everything else in
   the weight pass re-pointed a literal at a token of the same value.

   usage: node scripts/shoot-type.mjs [port] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const OUT = "/tmp/mgnhw_type";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });

const shot = async (route, sel, name, pad = 60) => {
  await page.goto(`http://localhost:${PORT}${route}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1200);
  /* Lenis owns the scroll — a bare scrollIntoView is pulled straight back to
     Lenis's own target on the next frame, and the shot lands on whatever was
     already on screen (this cost me two screenshots of the wrong section). */
  const docTop = await page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? scrollY + el.getBoundingClientRect().top : null;
  }, sel);
  if (docTop === null) {
    console.log(`  ${name}: element not found`);
    return;
  }
  await page.evaluate((y) => {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true });
    else scrollTo(0, y);
  }, docTop - 450 + 100);
  await sleep(2000);
  const clip = await page.evaluate(
    (s, p) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      /* PAGE coordinates, not viewport ones. Puppeteer's screenshot `clip` is
         relative to the top-left of the DOCUMENT — passing a viewport rect
         silently shoots the same offset measured from the page top instead,
         which on a 9773px About page meant three screenshots of the hero
         wordmark while the numbers all looked right. */
      return {
        x: Math.max(0, r.left + scrollX - p),
        y: Math.max(0, r.top + scrollY - p),
        width: Math.min(innerWidth, r.width + p * 2),
        height: Math.min(innerHeight, r.height + p * 2),
      };
    },
    sel,
    pad,
  );
  if (!clip) {
    console.log(`  ${name}: element not found`);
    return;
  }
  await page.screenshot({ path: `${OUT}/${name}.png`, clip });
  console.log(`  ${name} → ${OUT}/${name}.png`);
};

await shot("/contact", '[class*="Contact_submitPill"]', "contact-submit", 40);
await shot("/about", '[class*="About_coverageGroup"]', "awards-outlet", 20);

await b.close();
