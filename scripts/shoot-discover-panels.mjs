/* Stills of the Phase 2b card: the settled second row (Belly's ink slab
   among the straw panels) and Belly under hover (film + returning mark).
   The grid is plain content now — the assembly intro that used to lock the
   page in front of it was removed, so this just walks the grid into view.
   Usage: node scripts/shoot-discover-panels.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "51365";
const OUT =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/1fc8ec40-c8ba-4c1f-8e2d-89c2ff0d34ec/scratchpad";
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const cdp = await page.createCDPSession();
await cdp.send("Emulation.setEmulatedMedia", {
  media: "screen",
  features: [
    { name: "hover", value: "hover" },
    { name: "pointer", value: "fine" },
  ],
});
await page.goto(`http://localhost:${PORT}/`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 15000,
  })
  .catch(() => {});
await page.evaluate(async () => {
  await document.fonts.ready;
  return true;
});
await s(1800);

// walk down in ~400px steps so every IntersectionObserver on the way arms,
// then wait for the grid itself to be in view
await page.waitForSelector('[data-plate="0"]', { timeout: 20000 });
const gridTop = await page.evaluate(() => {
  const el = document.querySelector('[data-plate="0"]');
  return el.getBoundingClientRect().top + window.scrollY;
});
for (let y = 0; y < gridTop; y += 400) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await s(150);
}
await s(1200);

// row 2 in view, pointer parked off the grid
const top = await page.evaluate(() => {
  const el = document.querySelector('[data-plate="4"]');
  return el ? el.getBoundingClientRect().top + window.scrollY : 0;
});
await page.evaluate((v) => window.scrollTo(0, v - 120), top);
await s(2800);
await page.mouse.move(10, 500);
await s(700);
await page.screenshot({ path: `${OUT}/panels-1440-row2.png` });

// Belly under hover — the mark's return over the film, the shade's bands
const b = await page.evaluate(() => {
  const r = document.querySelector('[data-plate="6"]').getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
});
await page.mouse.move(Math.round(b.x - 40), Math.round(b.y - 40));
await s(150);
await page.mouse.move(
  Math.round(b.x + b.w * 0.4),
  Math.round(b.y + b.h * 0.45),
);
await s(2800);
await page.screenshot({ path: `${OUT}/panels-1440-belly-hover.png` });
await browser.close();
console.log("saved panels-1440-row2.png, panels-1440-belly-hover.png");
