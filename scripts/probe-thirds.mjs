/* Are the three thirds actually on one axis, and are the card variants
   actually different widths on screen? Both were reported done; the user
   says neither reads. Measures the year numeral, the seat card and the copy
   block, plus every visible card's projected width.
   usage: node scripts/probe-thirds.mjs [port] [w] [h] */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [PORT = "3100", W = "1920", H = "1080"] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1","--enable-gpu"] });
const page = await b.newPage();
await page.setViewport({ width: +W, height: +H });
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(()=>{});
await page.evaluate(() => document.fonts.ready);
await sleep(1600);
const g = await page.evaluate(() => {
  const w = document.querySelector('[class*="railPinWrap"]');
  const r = w.getBoundingClientRect();
  return { top: r.top + scrollY, height: r.height };
});
/* 0.12 and 0.42 are kept so the numbers stay comparable with the report that
   raised this; the rest are DWELL CENTRES (lead + step*(i + dwell/2)), where
   the deck is at rest on a chapter rather than mid-swap. Alignment has to
   hold at rest, and the three variants have to be sampled to see the width
   spread: chapter 1 is wide, 2 and 4 are tall, 3 is base. */
for (const frac of [0.12, 0.42, 0.0716, 0.1866, 0.3016, 0.4166, 0.8766]) {
  await page.evaluate((y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
    g.top + (g.height - +H) * frac);
  await sleep(1700);
  const m = await page.evaluate(() => {
    const c = (r) => Math.round(r.top + r.height / 2);
    const num = document.querySelector('[class*="storyCenturyColumn"]').getBoundingClientRect();
    const panel = [...document.querySelectorAll('[class*="railPanel"]')]
      .find((p) => !p.hasAttribute("inert"))?.getBoundingClientRect();
    /* THE SEAT CARD IS THE ACTIVE CHAPTER'S, not the tallest on screen.
       Picking by height reads a DEPARTING card mid-swap: it is thrown toward
       the camera at up to 1.67x, so for most of a swap the biggest card on
       screen is the one that has just left. That is what produced the
       "seat centre 888" row — 888 was chapter 1 flying out, not the seat. */
    const active = [...document.querySelectorAll('[class*="railPanel"]')]
      .findIndex((p) => !p.hasAttribute("inert"));
    const all = [...document.querySelectorAll('[class*="railCard"]')];
    const seat = all[active].getBoundingClientRect();
    const cards = all
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.width > 1 && r.bottom > 0 && r.top < innerHeight)
      .sort((a, b) => b.width - a.width);
    return {
      active: active + 1,
      yearCentre: c(num), yearBox: `${Math.round(num.top)}..${Math.round(num.bottom)}`,
      seatCentre: c(seat),
      seatW: Math.round(seat.width),
      copyCentre: panel ? c(panel) : null,
      copyBox: panel ? `${Math.round(panel.top)}..${Math.round(panel.bottom)}` : null,
      widths: cards.map((r) => Math.round(r.width)),
    };
  });
  console.log(`\n@${frac}  (chapter ${m.active} live)`);
  console.log(`  year centre ${m.yearCentre}  (${m.yearBox})`);
  console.log(`  seat centre ${m.seatCentre}   seat width ${m.seatW}`);
  console.log(`  copy centre ${m.copyCentre}  (${m.copyBox})`);
  console.log(`  year -> copy  ${m.copyCentre - m.yearCentre}px      year -> seat  ${m.seatCentre - m.yearCentre}px`);
  console.log(`  card widths on screen (largest first): ${m.widths.join(", ")}`);
}
await b.close();
