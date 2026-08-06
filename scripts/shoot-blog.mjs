/* Shoot the home page's Blog chapter, and the head CTA at rest / hovered.
   Gradual scroll first — teleporting past a section does not fire its
   IntersectionObserver, so a jump photographs an opacity-0 box.
   Usage: node shoot-blog.mjs <port> [outdir] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const OUT = process.argv[3] || new URL(".", import.meta.url).pathname + "blog";
const s = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});

async function walk(page) {
  // arm every reveal on the way down
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 400) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await s(90);
  }
  await s(700);
}

async function shoot(width, height, tag) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${PORT}/`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await s(1200);
  await walk(page);

  const box = await page.evaluate(() => {
    const el = document.querySelector("#blog");
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, height: r.height };
  });
  await page.evaluate((y) => window.scrollTo(0, y), box.top);
  await s(1400);
  await page.screenshot({ path: `${OUT}/blog-${tag}.png` });

  // measurements
  const m = await page.evaluate(() => {
    const sec = document.querySelector("#blog");
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
    };
    const cs = (el, p) => (el ? getComputedStyle(el)[p] : null);
    const feature = sec.querySelector('a[class*="feature"]');
    const rows = [...sec.querySelectorAll('a[class*="row"]')];
    return {
      section: r(sec),
      topRule: r(sec.querySelector('[class*="topRule"]')),
      feature: r(feature),
      featureOpacity: cs(feature?.parentElement, "opacity"),
      ramp: r(sec.querySelector('[class*="rampScrim"]')),
      mark: r(sec.querySelector('[class*="cardLogoMark"]')),
      rows: rows.map(r),
      rowOpacity: cs(sec.querySelector('[class*="rail"]'), "opacity"),
      cta: r(sec.querySelector('[class*="headCta"]')),
      ctaBodyClip: cs(sec.querySelector('[class*="ctaBody"]'), "clipPath"),
    };
  });
  console.log(tag, JSON.stringify(m));
  return page;
}

// desktop + the CTA states
const page = await shoot(1440, 900, "desktop");
{
  const cta = await page.$('[class*="headCta"]');
  const b = await cta.boundingBox();
  // rest: park the pointer far away so the magnet is home
  await page.mouse.move(20, 20);
  await s(900);
  await page.screenshot({
    path: `${OUT}/cta-rest.png`,
    clip: { x: b.x - 40, y: b.y - 30, width: b.width + 80, height: b.height + 60 },
  });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await s(1000);
  const b2 = await cta.boundingBox();
  await page.screenshot({
    path: `${OUT}/cta-hover.png`,
    clip: { x: b2.x - 40, y: b2.y - 30, width: b2.width + 80, height: b2.height + 60 },
  });
  const pulled = await page.evaluate(() => {
    const m = document.querySelector('[class*="ctaMagnet"]');
    return getComputedStyle(m).transform;
  });
  console.log("magnet transform under pointer:", pulled);
  await page.close();
}

const p2 = await shoot(390, 844, "mobile");
await p2.close();
await browser.close();
