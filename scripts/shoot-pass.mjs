/* ONE PASS OVER EVERY SECTION THIS ROUND TOUCHED.

   The in-app preview pane cannot answer "does it look right?" for this
   project — that document is hidden, so rAF runs 0 frames, whileInView
   never fires and screenshots come back flat cream. This drives a real
   headless Chrome.

   Shoots: the press wall, the blog strip, the Discover grid, and /blog's
   first screen. Prints the measurements each change is meant to satisfy.

   Usage: node scripts/shoot-pass.mjs [port] [tag] [width] [height] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const TAG = process.argv[3] || "now";
const W = Number(process.argv[4] || 1440);
const H = Number(process.argv[5] || 900);
const OUT =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/082df041-cd16-47f8-81ae-892042eaee11/scratchpad";
mkdirSync(OUT, { recursive: true });
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });

const settle = async (url) => {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 20000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 450) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await s(85);
  }
  await s(900);
};

const shotAt = async (name, y) => {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await s(450);
  await page.screenshot({ path: `${OUT}/pass-${TAG}-${name}.png` });
};

// ───────────────────────── home ─────────────────────────
await settle(`http://localhost:${PORT}/`);

const home = await page.evaluate(() => {
  const top = (sel) => {
    const el = document.querySelector(sel);
    return el ? Math.round(el.getBoundingClientRect().top + scrollY) : null;
  };
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      t: Math.round(r.top + scrollY),
      b: Math.round(r.bottom + scrollY),
      l: Math.round(r.left),
      r: Math.round(r.right),
      h: Math.round(r.height),
      w: Math.round(r.width),
    };
  };
  const press = document.querySelector('[class*="PressWall_section"]');
  const label = press.querySelector('[class*="PressWall_label"]');
  const wall = press.querySelector('[class*="PressWall_wall"]');
  const seats = [...wall.querySelectorAll("li")].map((li) => {
    const r = li.getBoundingClientRect();
    return { t: Math.round(r.top), l: Math.round(r.left), w: Math.round(r.width) };
  });
  const rowTops = [...new Set(seats.map((x) => x.t))].sort((a, b) => a - b);
  const aboutVid = document.querySelector(
    '[class*="AboutSplit_section"] video, [class*="AboutSplit_section"] [class*="mediaImg"]',
  );
  const doors = document.querySelector('[class*="AboutSplit_doorFrame"]');

  const blog = document.querySelector('[class*="Blog_section"]');
  const plate = blog.querySelector('[class*="Blog_plate"]');
  const foot = blog.querySelector('[class*="Blog_cardFoot"]');
  const navBtn = blog.querySelector('[class*="Blog_nav"]');
  const lede = blog.querySelector('[class*="Blog_lede"]');
  const cta = blog.querySelector('[class*="Blog_headCta"]');
  const mark = document.querySelector('[class*="Discover_labelMark"]');

  return {
    pressTop: box('[class*="PressWall_section"]'),
    labelCentred: (() => {
      const r = label.getBoundingClientRect();
      return {
        mid: Math.round(r.left + r.width / 2),
        pageMid: Math.round(innerWidth / 2),
      };
    })(),
    wallRows: rowTops.length,
    wallSpread: {
      firstLeft: Math.min(...seats.map((x) => x.l)),
      lastRight: Math.max(...seats.map((x) => x.l + x.w)),
      viewport: innerWidth,
    },
    labelToWall: Math.round(
      wall.getBoundingClientRect().top - label.getBoundingClientRect().bottom,
    ),
    aboutVideoBottom_toPressLabel: Math.round(
      label.getBoundingClientRect().top + scrollY - (box("[class*='AboutSplit_section'] video")?.b ?? 0),
    ),
    doorWidth: doors ? Math.round(doors.getBoundingClientRect().width) : null,
    discoverMark: mark ? Math.round(mark.getBoundingClientRect().height) : null,
    blogPlate: plate
      ? `${Math.round(plate.getBoundingClientRect().width)}x${Math.round(plate.getBoundingClientRect().height)}`
      : null,
    blogFootPresent: !!foot,
    blogNavPresent: !!navBtn,
    blogCtaAlignedToLede: cta && lede
      ? Math.round(
          cta.getBoundingClientRect().bottom - lede.getBoundingClientRect().bottom,
        )
      : null,
    discoverTop: top('[class*="Discover_section"]'),
    blogTop: top('[class*="Blog_section"]'),
    aboutVid: aboutVid ? box("[class*='AboutSplit_section'] video") : null,
  };
});
console.log(`\n══ HOME @ ${W}x${H} ══`);
console.log(JSON.stringify(home, null, 2));

await shotAt("press", home.pressTop.t - 40);
await shotAt("blog", home.blogTop + 10);
await shotAt("discover", home.discoverTop);

// ───────────────────────── /blog ─────────────────────────
await settle(`http://localhost:${PORT}/blog`);
const blogPage = await page.evaluate(() => {
  const el = (sel) => document.querySelector(sel);
  const box = (n) => {
    if (!n) return null;
    const r = n.getBoundingClientRect();
    return { t: Math.round(r.top + scrollY), b: Math.round(r.bottom + scrollY) };
  };
  const grid = el('[class*="BlogIndex_grid"]');
  const cols = grid
    ? getComputedStyle(grid).gridTemplateColumns.split(" ").length
    : null;
  // the "Earlier entries" heading — find by text
  const earlier = [...document.querySelectorAll("h2, h3, p, span")].find((n) =>
    /earlier entries/i.test(n.textContent || ""),
  );
  return {
    viewportH: innerHeight,
    head: box(el('[class*="BlogIndex_head"]')),
    featured: box(el('[class*="BlogIndex_featured"]')),
    earlierLine: box(earlier),
    earlierFitsFirstScreen: earlier
      ? Math.round(earlier.getBoundingClientRect().bottom + scrollY) <= innerHeight
      : null,
    gridColumns: cols,
  };
});
console.log(`\n══ /blog @ ${W}x${H} ══`);
console.log(JSON.stringify(blogPage, null, 2));
await shotAt("blogpage", 0);

console.log(`\nwrote ${OUT}/pass-${TAG}-{press,blog,discover,blogpage}.png\n`);
await browser.close();
