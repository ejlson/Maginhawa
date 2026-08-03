/* THE HALF shoot-about-pass.mjs DOESN'T REACH.

   shoot-about-pass.mjs stops at the deck's midpoint, which means the last
   third of the page — the deck's tail, the deck->Awards handover, the Awards
   table itself and the footer — has never been shot, and neither has the
   VERTICAL LIST that replaces the deck below 1200px. That list is the whole
   Our Story section on every phone and tablet, so "the deck at 390" is not a
   thing that exists; this is what a phone reader actually gets.

   Also dumps a measured section map per viewport (tops, heights, and the gap
   between consecutive sections) so the pacing can be argued with numbers
   rather than by eyeballing screenshots.

   usage: node scripts/shoot-about-tail.mjs [port] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const OUT = "/tmp/mgnhw_about";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWS = [
  ["desktop", 1440, 900],
  ["wide", 1920, 1080],
  ["tablet", 820, 1180],
  ["phone", 390, 844],
];

/* [label, selector, fraction through the element's own travel] */
const STOPS = [
  ["8-deck-late", '[class*="railPinWrap"]', 0.82],
  ["9-deck-end", '[class*="railPinWrap"]', 0.97],
  ["a-story-list-1", '[class*="storyList"]', 0.12],
  ["b-story-list-2", '[class*="storyList"]', 0.35],
  ["c-story-list-3", '[class*="storyList"]', 0.62],
  ["d-story-list-4", '[class*="storyList"]', 0.9],
  ["e-awards-in", '[class*="coverage"]', 0.06],
  ["f-awards", '[class*="coverageList"]', 0.4],
  ["g-awards-end", '[class*="coverageList"]', 0.95],
];

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

for (const [name, W, H] of VIEWS) {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H });
  await page.goto(`http://localhost:${PORT}/about`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(3600);

  /* section map — measured with everything at rest at the top */
  const map = await page.evaluate(() => {
    const pick = (sel) => document.querySelector(sel);
    const named = [
      ["hero", '[class*="hero"]:not([class*="heroScrim"]):not([class*="heroLine"]):not([class*="heroKicker"]):not([class*="heroAside"]):not([class*="heroLede"]):not([class*="heroVideo"]):not([class*="heroBottom"])'],
      ["statement", 'section[class*="statement"]'],
      ["chef", 'section[class*="chef"]'],
      ["story", 'section[class*="story"]'],
      ["coverage", 'section[class*="coverage"]'],
    ];
    const rows = [];
    for (const [k, sel] of named) {
      const e = pick(sel);
      if (!e) {
        rows.push({ k, missing: true });
        continue;
      }
      const r = e.getBoundingClientRect();
      rows.push({
        k,
        top: Math.round(r.top + scrollY),
        h: Math.round(r.height),
        bottom: Math.round(r.top + scrollY + r.height),
      });
    }
    /* the chef grid's own columns, which is where the desktop imbalance is */
    const grid = document.querySelector('[class*="chefGrid"]');
    const gi = document.querySelector('[class*="chefImage"]');
    const gt = document.querySelector('[class*="chefText"]');
    const gb = document.querySelector('[class*="chefBody"]');
    const box = (e) => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return {
        l: Math.round(r.left),
        r: Math.round(r.right),
        w: Math.round(r.width),
      };
    };
    return {
      doc: document.documentElement.scrollHeight,
      rows,
      chef: {
        grid: box(grid),
        image: box(gi),
        text: box(gt),
        body: box(gb),
        gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      },
      omar: (() => {
        const img = document.querySelector('[class*="chefImage"] img');
        if (!img) return null;
        return {
          natural: `${img.naturalWidth}x${img.naturalHeight}`,
          css: `${Math.round(img.getBoundingClientRect().width)}x${Math.round(img.getBoundingClientRect().height)}`,
          src: img.currentSrc.split("?")[0].slice(-60),
        };
      })(),
    };
  });

  console.log(`\n=== ${name} ${W}x${H}  doc ${map.doc}px ===`);
  let prev = null;
  for (const r of map.rows) {
    if (r.missing) {
      console.log(`  ${r.k.padEnd(11)} ABSENT`);
      continue;
    }
    const gap = prev === null ? "" : `   gap ${r.top - prev}px`;
    console.log(
      `  ${r.k.padEnd(11)} top ${String(r.top).padStart(6)}  h ${String(r.h).padStart(5)}${gap}`,
    );
    prev = r.bottom;
  }
  console.log(`  chefGrid cols: ${map.chef.gridCols}`);
  console.log(
    `  chef image ${JSON.stringify(map.chef.image)}  text ${JSON.stringify(map.chef.text)}  body ${JSON.stringify(map.chef.body)}`,
  );
  console.log(`  omar img ${JSON.stringify(map.omar)}`);

  for (const [label, sel, f] of STOPS) {
    const y = await page.evaluate(
      (s, frac, vh) => {
        const e = document.querySelector(s);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        const top = r.top + scrollY;
        return Math.max(0, top - vh + frac * (r.height + vh));
      },
      sel,
      f,
      H,
    );
    if (y === null) {
      console.log(`  ${label.padEnd(15)} (absent)`);
      continue;
    }
    await page.evaluate(
      (v) => window.__lenis?.scrollTo(v, { immediate: true }) ?? scrollTo(0, v),
      y,
    );
    await sleep(1400);
    await page.screenshot({ path: `${OUT}/${name}-${label}.png` });
    console.log(`  shot ${label.padEnd(15)} y=${Math.round(y)}`);
  }
  await page.close();
}

console.log(`\n shots -> ${OUT}`);
await b.close();
