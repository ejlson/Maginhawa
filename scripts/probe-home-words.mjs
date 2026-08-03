/* Is the HOMEPAGE's split copy actually left below its masks, or was that the
   harness sweeping past a step machine faster than it can run?

   probe-routes reported 41/41 words stranded on `/` after a teleport sweep and
   0/201 on /about after a wheel sweep. The difference is the method, so this
   re-reads `/` three ways — a slow trusted wheel with dwell, a stop-and-wait at
   the intro itself, and a plain load-and-sit — and reports the worst offset
   each way. Nothing on `/` was touched by the About work (Discover.tsx is not
   in the diff and SplitWords' new branch is opt-in), so a positive here is
   pre-existing; the point is to say which it is rather than guess.

   usage: node scripts/probe-home-words.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu"],
});

const read = (page) =>
  page.evaluate(() => {
    const words = [...document.querySelectorAll('[class*="SplitWords_word"],[class*="SplitWords_cssWord"]')];
    let worst = 0;
    let stranded = 0;
    const vis = [];
    for (const w of words) {
      const m = new DOMMatrixReadOnly(getComputedStyle(w).transform);
      if (Math.abs(m.m42) > 1.5) {
        stranded++;
        worst = Math.max(worst, Math.abs(m.m42));
        const r = w.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) vis.push(w.textContent.trim());
      }
    }
    return { total: words.length, stranded, worst: Math.round(worst), onScreenNow: vis.slice(0, 8) };
  });

for (const mode of ["slow-wheel", "dwell-at-intro", "sit-still"]) {
  const page = await b.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(2200);
  await page.mouse.move(720, 450);

  if (mode === "slow-wheel") {
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let i = 0; i < Math.ceil(H / 200); i++) {
      await page.mouse.wheel({ deltaY: 200 });
      await sleep(150);
    }
    await sleep(3000);
  } else if (mode === "dwell-at-intro") {
    /* creep down, pausing a full second every 400px, so any step machine or
       whileInView observer has as much time as it could possibly want */
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let i = 0; i < Math.ceil(H / 400); i++) {
      for (let k = 0; k < 4; k++) {
        await page.mouse.wheel({ deltaY: 100 });
        await sleep(90);
      }
      await sleep(1000);
    }
    await sleep(3000);
  } else {
    await sleep(4000);
  }

  const r = await read(page);
  console.log(`\n=== / (${mode}) ===`);
  console.log(`  ${r.stranded}/${r.total} words below their mask, worst offset ${r.worst}px`);
  if (r.onScreenNow.length) console.log(`  stranded AND on screen right now: ${JSON.stringify(r.onScreenNow)}`);
  await page.close();
}
await b.close();
