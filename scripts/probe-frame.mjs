/* FRAMING. Where does the composition actually sit on screen at each beat?
   The stage is centred on the chapter's CONTENT (head top → grid bottom),
   not on the section's box — the section carries a big top padding that
   used to push everything low. This reports the offsets that proves it, at
   several viewport heights.
   usage: node scripts/probe-frame.mjs [port] */
import puppeteer from "puppeteer-core";
import { play } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

const read = (page) =>
  page.evaluate(() => {
    const sec = document.querySelector("#restaurants");
    const head = sec.querySelector("[class*='head']");
    const cells = [...sec.querySelectorAll("[data-plate]")];
    const gTop = Math.min(...cells.map((c) => c.getBoundingClientRect().top));
    const gBot = Math.max(...cells.map((c) => c.getBoundingClientRect().bottom));
    const h = head.getBoundingClientRect();
    const stage = sec.querySelector("[class*='stageCenter']");
    const s = stage?.getBoundingClientRect();
    const vh = innerHeight;
    return {
      vh,
      // + = below the middle of the screen
      titleOff: s ? Math.round(s.top + s.height / 2 - vh / 2) : null,
      gridOff: Math.round((gTop + gBot) / 2 - vh / 2),
      headTop: Math.round(h.top),
      gridBottom: Math.round(gBot),
      // does the whole chapter fit on screen?
      fits: h.top >= 0 && gBot <= vh,
    };
  });

for (const vh of [820, 900, 1080]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: vh });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#restaurants [data-plate]", { timeout: 60000 });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  });
  await sleep(1000);
  const { armed } = await play(page);
  // the split (composition parked), then well after everything has landed
  await sleep(1800);
  const split = await read(page);
  await sleep(6000);
  const done = await read(page);
  console.log(
    `vh ${vh}  SPLIT title ${String(split.titleOff).padStart(5)}px off centre` +
      `   |  SETTLED grid ${String(done.gridOff).padStart(5)}px off centre,` +
      ` head top ${String(done.headTop).padStart(5)}, grid bottom ${String(done.gridBottom).padStart(5)},` +
      ` whole chapter on screen: ${done.fits}`,
  );
  await page.close();
}
await browser.close();
