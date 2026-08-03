/* /contact captures — the three regions this pass touches, at four viewports.
 *
 * `fullPage` screenshots never fire IntersectionObserver and this page is
 * built out of `whileInView` Reveals, so a fullPage capture renders whole
 * sections as blank maroon. Every shot here is a `clip` in PAGE coordinates
 * taken AFTER walking the page down like a reader, which is the only way the
 * content is actually on screen when the shutter fires.
 *
 * usage: node scripts/probe-contact-shots.mjs [port] [outdir] [route]
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3210";
const OUT = process.argv[3] || "/tmp/contact-shots";
const ROUTE = process.argv[4] || "/contact";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();

const to = async (y) => {
  await page.evaluate((v) => {
    if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
    else window.scrollTo(0, v);
  }, y);
  await sleep(160);
};

for (const vp of [
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
  { w: 820, h: 1180 },
  { w: 390, h: 844 },
]) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}${ROUTE}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(900);

  // read the page through so every Reveal has entered
  const max = await page.evaluate(
    () => document.documentElement.scrollHeight - innerHeight,
  );
  // half-viewport steps with a real pause: the reveal is a spring plus an
  // 0.8s blur, and a step that outruns it photographs mid-animation
  for (let y = 0; y <= max; y += Math.round(vp.h * 0.5)) {
    await to(y);
    await sleep(220);
  }
  await to(max);
  await sleep(900);

  const regions = await page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: 0, y: Math.max(0, b.y + scrollY - 24), w: 0, h: b.height + 48 };
    };
    return {
      contact: r(document.querySelector("#contact-us")),
      review: r(document.querySelector("#leave-a-review")),
      footer: r(document.querySelector("footer")),
    };
  });

  for (const [name, box] of Object.entries(regions)) {
    if (!box) continue;
    await to(Math.max(0, box.y - 40));
    await sleep(900);
    await page.screenshot({
      path: `${OUT}/${name}-${vp.w}.png`,
      clip: {
        x: 0,
        y: box.y,
        width: vp.w,
        height: Math.min(box.h, 4000),
      },
      captureBeyondViewport: true,
    });
  }
}

await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
