/* Hovered stills of the two indent rows, for eyes rather than numbers:
   the leading text indented, the tint spanning the full row behind it, and
   the trailing chevron/arrow still inside the row's edge.

   Pairs with scripts/probe-indent-hover.mjs, which does the measuring.

   Usage: node scripts/shoot-indent-hover.mjs [port]   (default 3210) */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3210";
const OUT = process.env.SHOT_DIR || "shots";
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
const cdp = await page.createCDPSession();
await cdp.send("Emulation.setEmulatedMedia", {
  media: "screen",
  features: [
    { name: "hover", value: "hover" },
    { name: "pointer", value: "fine" },
  ],
});

const shoot = async (path, sel, file) => {
  await page.goto(`http://localhost:${PORT}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 20000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await s(1800);
  await page.waitForSelector(sel, { timeout: 20000 });

  await page.evaluate((q) => {
    const el = document.querySelector(q);
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 380);
  }, sel);
  let last = -1;
  for (let i = 0; i < 40; i++) {
    await s(100);
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y === last) break;
    last = y;
  }
  await s(600);

  const box = await page.evaluate((q) => {
    const r = document.querySelector(q).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  await page.mouse.move(box.x, box.y);
  await s(800); // past the longest of the two transitions

  /* Re-read the rect now rather than reusing the one the pointer aimed at:
     the park above only stops the scroll, it does not pin it, and a clip cut
     from the pre-hover rect lands on whatever has drifted into that band.
     The :hover assert catches the other half of the same problem — a row
     that moved out from under the pointer is a row photographed at rest. */
  const shot = await page.evaluate((q) => {
    const el = document.querySelector(q);
    const r = el.getBoundingClientRect();
    return { top: r.top, h: r.height, hovered: el.matches(":hover") };
  }, sel);
  if (!shot.hovered) throw new Error(`${sel} is not hovered — nothing to photograph`);

  /* The whole viewport, with the row parked at ~380 by the scroll above.
     No `clip`: a clip is measured from the top of the DOCUMENT while the
     rect here is measured from the top of the VIEWPORT, and down a page this
     long the two are thousands of pixels apart — the band came back holding
     a hero photograph. Capturing the viewport sidesteps the conversion, and
     the neighbouring rows are the context that was wanted anyway. */
  await page.screenshot({ path: `${OUT}/${file}` });
  console.log(`${OUT}/${file}  (row at y=${Math.round(shot.top)}, ${Math.round(shot.h)}px tall)`);
};

await shoot("/careers", '[class*="roleRow"]', "indent-hover-rolerow.png");
await shoot("/restaurants/belly", '[class*="pressItem"]', "indent-hover-pressitem.png");
await browser.close();
