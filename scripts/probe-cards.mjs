/* THE CARD VIEW'S SCROLL. Below 980px `.cards` becomes its own scroll box,
   but nothing on the page tells Lenis to keep its hands off it — and Lenis
   preventDefaults the wheel for the whole document. This asks whether a real
   wheel notch over the card grid actually reaches the last restaurant.

   usage: node scripts/probe-cards.mjs [port] [w] [h] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

for (const [W, H] of [
  [1440, 900],
  [1200, 800],
  [1024, 768],
  [900, 800],
  [760, 900],
]) {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H });
  await page.goto(`http://localhost:${PORT}/restaurants`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('[class*="RestaurantsShowcase_cards__"]', {
    timeout: 60000,
  });
  await sleep(2200);
  await page.evaluate(() =>
    document.querySelector('[aria-label="Card view"]')?.click(),
  );
  await sleep(900);

  const before = await page.evaluate(() => {
    const cards = document.querySelector('[class*="RestaurantsShowcase_cards__"]');
    const all = [...document.querySelectorAll('[class*="RestaurantsShowcase_card__"]')];
    const r = cards.getBoundingClientRect();
    return {
      overflowY: getComputedStyle(cards).overflowY,
      hidden: cards.scrollHeight - cards.clientHeight,
      scrollTop: cards.scrollTop,
      lastBottom: Math.round(all.at(-1)?.getBoundingClientRect().bottom ?? 0),
      count: all.length,
      cx: Math.round(r.left + r.width / 2),
      cy: Math.round(r.top + r.height / 2),
    };
  });

  await page.mouse.move(before.cx, before.cy);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel({ deltaY: 240 });
    await sleep(70);
  }
  await sleep(1200);

  const after = await page.evaluate(() => {
    const cards = document.querySelector('[class*="RestaurantsShowcase_cards__"]');
    const all = [...document.querySelectorAll('[class*="RestaurantsShowcase_card__"]')];
    return {
      scrollTop: cards.scrollTop,
      lastBottom: Math.round(all.at(-1)?.getBoundingClientRect().bottom ?? 0),
      docY: Math.round(scrollY),
    };
  });

  const cut = before.lastBottom > H + 2;
  const moved = after.scrollTop - before.scrollTop;
  console.log(
    `${String(W).padStart(4)}x${H}  overflow=${String(before.hidden).padStart(4)}px  cards=${before.count}  last card bottom ${before.lastBottom} (viewport ${H}) ${cut ? "BELOW THE FOLD" : "visible"}  ·  wheel moved ${moved}px  ${cut && Math.abs(moved) < 4 ? "*** UNREACHABLE ***" : ""}`,
  );
  await page.close();
}

await b.close();
