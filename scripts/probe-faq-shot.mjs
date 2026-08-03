/* FAQ SHOT — capture the FAQ section (and the review table under it) at each
 * viewport, opening a row so the answer's box is in frame.
 *
 * `screenshot({clip})` takes PAGE coordinates, and Reveal is whileInView, so
 * the page is read down in reader-sized steps before anything is measured.
 *
 * usage: node scripts/probe-faq-shot.mjs [port] [tag]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3260";
const TAG = process.argv[3] || "before";
const OUT = "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/2023fdca-cd86-4bca-922b-c2f81853e348/scratchpad";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = [
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
  { w: 820, h: 1180 },
  { w: 390, h: 844 },
];

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();

for (const vp of VIEWPORTS) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/contact`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(700);

  const h = await page.evaluate(
    () => document.documentElement.scrollHeight - innerHeight,
  );
  for (let y = 0; y <= h; y += Math.round(vp.h * 0.6)) {
    await page.evaluate((v) => {
      if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
      else window.scrollTo(0, v);
    }, y);
    await sleep(110);
  }
  await sleep(400);

  // open the third question so an answer is on screen
  await page.evaluate(() => {
    const rows = document.querySelectorAll("#faq button");
    rows[2]?.click();
  });
  await sleep(600);

  const rect = await page.evaluate(() => {
    const faq = document.querySelector("#faq");
    const r = faq.getBoundingClientRect();
    const sy = window.scrollY || document.documentElement.scrollTop;
    return { x: 0, y: Math.max(0, r.top + sy), w: innerWidth, h: r.height };
  });

  await page.screenshot({
    path: `${OUT}/faq-${TAG}-${vp.w}.png`,
    clip: { x: rect.x, y: rect.y, width: rect.w, height: Math.min(rect.h, 4000) },
  });
  console.log(`faq-${TAG}-${vp.w}.png  section h=${Math.round(rect.h)}`);
}

await page.close();
b.disconnect();
process.exit(0);
