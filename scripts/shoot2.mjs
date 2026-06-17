import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/tmp/mgnhw_render";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars"],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });

// --- intro overlap check ---
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
for (const m of [1600, 2000, 2400]) {
  await sleep(m - (p.__last || 0));
  p.__last = m;
  await p.screenshot({ path: `${OUT}/v2_intro_${m}.png` });
}

// settle into hero
await sleep(2200);
await p.screenshot({ path: `${OUT}/v2_hero.png` });

// scroll down to Discover
await p.evaluate(() => window.scrollTo(0, window.innerHeight * 1.15));
await sleep(1100);
await p.screenshot({ path: `${OUT}/v2_discover.png` });

// nav behaviour: scroll DOWN should show nav
await p.evaluate(() => window.scrollBy(0, 500));
await sleep(700);
await p.screenshot({ path: `${OUT}/v2_nav_scrolldown.png` });

// then scroll UP should hide nav
await p.evaluate(() => window.scrollBy(0, -260));
await sleep(700);
await p.screenshot({ path: `${OUT}/v2_nav_scrollup.png` });

console.log("v2 shots done");
await b.close();
