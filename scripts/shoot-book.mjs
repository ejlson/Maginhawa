// Reservations (#book) — eyes on the render. Full view, the pill at full
// magnetic pull (pointer parked off-centre on it, which is also its hover
// state), and mid-departure at desktop, plus the phone layout.
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "50853";
const OUT = process.env.OUT || "/tmp/mgnhw_book";
const s = (ms) => new Promise((r) => setTimeout(r, ms));

import { mkdirSync } from "node:fs";
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});

const open = async (W, H) => {
  const p = await b.newPage();
  await p.setViewport({ width: W, height: H });
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 });
  await s(2500);
  return p;
};

// Lenis owns the scroll — scrollIntoView is intercepted
const park = (p, frac) =>
  p.evaluate((f) => {
    const el = document.querySelector("#book");
    const y = el.getBoundingClientRect().top + window.scrollY + f * el.offsetHeight;
    window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
  }, frac);

{
  const p = await open(1440, 900);
  await park(p, 0); await s(1200);
  await p.screenshot({ path: `${OUT}/desk_full.png` });

  // the magnet measures from the never-transformed host, so that is the box
  // to aim at; +110px puts the pointer near the pill's right end, which is
  // where the pull curve peaks (see probe-book-magnet.mjs)
  // getBoundingClientRect, not elementHandle.boundingBox(): the page is
  // scrolled, and only the DOM rect is reliably viewport-relative — which is
  // the space p.mouse.move() works in
  const box = await p.evaluate(() => {
    const r = document
      .querySelector('[class*="Reservations_magnetHost"]')
      .getBoundingClientRect();
    return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
  });
  await p.mouse.move(box.cx + 110, box.cy);
  await s(900);
  await p.screenshot({ path: `${OUT}/desk_hover.png` });

  // mid-departure: the plate forming as the section leaves
  await park(p, 0.32); await s(1200);
  await p.screenshot({ path: `${OUT}/desk_settle.png` });
  await p.close();
}

{
  const p = await open(390, 844);
  await park(p, 0); await s(1200);
  await p.screenshot({ path: `${OUT}/phone_top.png` });
  await park(p, 0.22); await s(1200);
  await p.screenshot({ path: `${OUT}/phone_mid.png` });
  await p.close();
}

await b.close();
console.log(`shot → ${OUT}`);
