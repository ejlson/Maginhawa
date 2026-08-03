/* Deck framing check at several viewport widths: is the three-column block
   centred, is the seat card the widest thing on screen, and does the copy
   still line up with it?

   The three numbers this exists to answer, all of which were wrong at 1920
   before the cap: block centre vs viewport centre, seat-card width vs the
   widest card behind it, and seat-card centre vs copy centre.

   usage: node scripts/shoot-deck.mjs [port] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const OUT = "/tmp/mgnhw_deckframe";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu"],
});

for (const [w, h] of [
  [1440, 900],
  [1920, 1080],
  [2560, 1400],
]) {
  const page = await b.newPage();
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(2000);

  const geom = await page.evaluate(() => {
    const wrap = document.querySelector('[class*="railPinWrap"]');
    if (!wrap) return null;
    const r = wrap.getBoundingClientRect();
    return { top: r.top + scrollY, height: r.height };
  });
  if (!geom) {
    console.log(`\n${w}x${h}: NO DECK (below the gate)`);
    await page.close();
    continue;
  }
  /* four chapters in, so the deck is full and a card has already left */
  const y = geom.top + (geom.height - innerHeightOf(h)) * 0.42;
  await page.evaluate(
    (v) => window.__lenis?.scrollTo(v, { immediate: true }) ?? scrollTo(0, v),
    y,
  );
  /* the spring needs to arrive before anything is measured — it is ~260ms to
     settle and the whole point of these numbers is the resting frame */
  await sleep(1800);

  const m = await page.evaluate(() => {
    const px = (n) => Math.round(n);
    const cards = [...document.querySelectorAll('[class*="railCard"]')]
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.width > 1 && r.bottom > 0 && r.top < innerHeight);
    /* the seat card is the tallest on screen — an upright card at the front
       out-measures every raked one behind it */
    const seat = cards.reduce((a, c) => (c.height > a.height ? c : a), cards[0]);
    const behind = cards.filter((c) => c !== seat);
    const widestBehind = behind.reduce((a, c) => Math.max(a, c.width), 0);
    const shell = document
      .querySelector('[class*="storyShell"]')
      .getBoundingClientRect();
    const copy = document.querySelector('[class*="railCopy"]').getBoundingClientRect();
    /* THE AXIS IS NOT THE SEAT CARD'S CENTRE ANY MORE. It was, and hanging the
       side columns off it is what made them move 15px at every chapter change
       and sit 100-130px below the middle of the frame. They hang off the deck's
       own fixed geometry now — the projected top edge every variant shares,
       plus a constant (see railAxisOffset in About.tsx) — so "seat centre vs
       copy centre" is measuring a difference that is supposed to exist and
       varies by design with the seated card's height.

       What has to hold instead: the wheel and the copy agree with each other,
       and they sit near the middle of the frame. Both are reported. */
    const wheel = document
      .querySelector('[class*="storyCenturyColumn"]')
      .getBoundingClientRect();
    return {
      shell: `${px(shell.left)}..${px(shell.right)}`,
      shellCentre: px(shell.left + shell.width / 2),
      viewportCentre: px(innerWidth / 2),
      cardsOnScreen: cards.length,
      seatW: px(seat.width),
      seatH: px(seat.height),
      widestBehind: px(widestBehind),
      seatCentreY: px(seat.top + seat.height / 2),
      seatTopY: px(seat.top),
      copyCentreY: px(copy.top + copy.height / 2),
      wheelCentreY: px(wheel.top + wheel.height / 2),
      frameCentreY: px(innerHeight / 2),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  console.log(`\n${w}x${h}`);
  console.log(`  shell ${m.shell}  centre ${m.shellCentre} vs viewport ${m.viewportCentre}  -> off by ${m.shellCentre - m.viewportCentre}`);
  console.log(`  seat card ${m.seatW}x${m.seatH}   widest behind ${m.widestBehind}   -> seat is ${m.seatW - m.widestBehind >= 0 ? "+" : ""}${m.seatW - m.widestBehind}`);
  console.log(`  axis: year ${m.wheelCentreY}  copy ${m.copyCentreY}  -> apart ${m.copyCentreY - m.wheelCentreY}px   (frame centre ${m.frameCentreY}, axis is ${m.copyCentreY - m.frameCentreY >= 0 ? "+" : ""}${m.copyCentreY - m.frameCentreY})`);
  console.log(`  seat card top ${m.seatTopY}  centre ${m.seatCentreY}  (its centre moves with the variant; the axis does not)`);
  console.log(`  cards on screen ${m.cardsOnScreen}   horizontal overflow ${m.overflow}`);

  await page.screenshot({ path: `${OUT}/deck-${w}.png` });
  await page.close();
}

function innerHeightOf(h) {
  return h;
}

console.log(`\n  shots -> ${OUT}`);
await b.close();
