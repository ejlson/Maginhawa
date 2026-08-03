// Reservations (#book) — eyes on the render, because this section is mostly a
// judgement call and no assertion can tell you whether it LOOKS better.
//
// Desktop: the closing frame at full view, the pill at full magnetic pull
// (pointer parked off-centre on it, which is also its hover state), the pill
// focused (the ring has to read against saffron AND against the scrim), and
// three stations down the departure — the last two exist because the scrim now
// RELEASES toward the frame edges, so the bottom edge of the film meets the
// maroon DarkZone as photograph rather than as a wash, and that seam has to be
// looked at rather than assumed. Then the phone layout, where the copy block is
// four elements tall in a column 390 wide.
//
// usage: node scripts/shoot-book.mjs [port]
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
  // the clock renders a placeholder on the server and the real value in an
  // effect; fonts have to be down before the mono line measures anything
  await p.evaluate(() => document.fonts.ready);
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

  // The focus ring on a saffron pill: cream at 3px offset (which lands on the
  // scrim) plus an inset maroon ring (which lands on the fill). Park the
  // pointer far away first so the magnet is at rest and the ring is where the
  // button's layout box says it is.
  await p.mouse.move(20, 20);
  await s(700);
  await p.evaluate(() => {
    // :focus-visible needs a keyboard-ish focus; focusVisible:true is the
    // supported way to ask for it without synthesising a Tab chain
    document.querySelector('[class*="Reservations_action"]').focus({ focusVisible: true });
  });
  await s(500);
  await p.screenshot({ path: `${OUT}/desk_focus.png` });
  await p.evaluate(() => document.activeElement.blur());

  // the departure: the plate forming, then the film's bottom edge arriving at
  // the maroon DarkZone
  for (const f of [0.32, 0.55, 0.78]) {
    await park(p, f); await s(1300);
    await p.screenshot({ path: `${OUT}/desk_settle_${String(f).replace(".", "")}.png` });
  }
  await p.close();
}

{
  const p = await open(390, 844);
  await park(p, 0); await s(1200);
  await p.screenshot({ path: `${OUT}/phone_top.png` });
  await park(p, 0.22); await s(1200);
  await p.screenshot({ path: `${OUT}/phone_mid.png` });
  await park(p, 0.7); await s(1200);
  await p.screenshot({ path: `${OUT}/phone_seam.png` });
  await p.close();
}

await b.close();
console.log(`shot → ${OUT}`);
