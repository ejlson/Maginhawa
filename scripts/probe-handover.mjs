/* DOES THE DECK ACKNOWLEDGE THAT IT IS FINISHED?
 *
 * Measured before this existed: the pin releases and then ~2,000px pass with
 * nothing in frame moving at all — the deck scrolls away exactly as it was,
 * fully lit and still seated on chapter 9 — and then an opaque cream edge
 * wipes up from the bottom and the section is over. A screenshot at either end
 * of that stretch looks fine; the defect is entirely in the middle.
 *
 * So this walks the scroll from the last chapter's dwell to the point where
 * the Awards sheet has covered the frame, and at each step reports the seat
 * card's projected box, its opacity, the copy column's opacity, and where the
 * cream edge is. Three things have to hold:
 *
 *   1. the deck is at FULL opacity for the whole of chapter 9's dwell — the
 *      release must not start early and dim a chapter that is being read;
 *   2. it is fully released BEFORE the cream edge reaches the seat card, or
 *      the sheet is still cutting across a lit card;
 *   3. it recedes as well as dims — a fade alone is the dissolve this deck
 *      deliberately does not use anywhere else.
 *
 * usage: node scripts/probe-handover.mjs [port] [w] [h]
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [PORT = "3100", W = "1440", H = "900", SHOT = "1"] =
  process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* the numbers say the deck receded and dimmed; only a frame says it looks
   like a departure. Both, every run. */
const SHOTS = SHOT === "0" ? null : "/tmp/mgnhw_handover";
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
  ],
});
const page = await b.newPage();
await page.setViewport({ width: +W, height: +H });
await page.goto(`http://localhost:${PORT}/about`, {
  waitUntil: "domcontentloaded",
});
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);
await sleep(2000);

const geom = await page.evaluate(() => {
  const w = document.querySelector('[class*="railPinWrap"]');
  if (!w) return null;
  const r = w.getBoundingClientRect();
  return { top: r.top + scrollY, height: r.height };
});
if (!geom) {
  console.log(`NO DECK AT ${W}x${H} — the list branch has no handover.`);
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    b.process()?.kill("SIGKILL");
  } catch {}
  process.exit(0);
}

/* pin bottom = the frame the sticky child stops being stuck, which is where
   `release` starts counting */
const pinEnd = geom.top + geom.height - +H;

console.log(
  `\n/about deck handover at ${W}x${H}  (pin ends at scrollY ${Math.round(pinEnd)})\n`,
);
console.log(
  "  offset   seat card box            cardOp  copyOp  creamTop  verdict",
);

const rows = [];
for (const d of [-600, -300, -80, 0, 150, 300, 450, 600, 750, 900, 1200, 1600]) {
  await page.evaluate(
    (y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
    pinEnd + d,
  );
  await sleep(900);
  const m = await page.evaluate(() => {
    const panels = [...document.querySelectorAll('[class*="railPanel"]')];
    const active = panels.findIndex((p) => !p.hasAttribute("inert"));
    const cards = [...document.querySelectorAll('[class*="railCard"]')];
    const seat = cards[active];
    const r = seat.getBoundingClientRect();
    const cream = document.querySelector('[class*="About_coverage__"]');
    const cr = cream?.getBoundingClientRect();
    return {
      x: Math.round(r.left),
      y: Math.round(r.top),
      w: Math.round(r.width),
      h: Math.round(r.height),
      cardOp: +(+getComputedStyle(seat).opacity).toFixed(3),
      copyOp: +(+getComputedStyle(
        document.querySelector('[class*="railCopy"]'),
      ).opacity).toFixed(3),
      creamTop: cr ? Math.round(cr.top) : null,
    };
  });
  rows.push({ d, ...m });
  if (SHOTS)
    await page.screenshot({
      path: `${SHOTS}/handover-${W}-${String(d).padStart(5, "0")}.png`,
    });
  console.log(
    `  ${String(d).padStart(6)}   ` +
      `${String(m.x).padStart(4)},${String(m.y).padStart(5)} ${String(m.w).padStart(4)}x${String(m.h).padStart(4)}   ` +
      `${String(m.cardOp).padStart(5)}   ${String(m.copyOp).padStart(5)}   ` +
      `${String(m.creamTop).padStart(6)}`,
  );
}

const ok = (label, cond) => console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}`);
console.log("\n=== handover ===");

const dwell = rows.filter((r) => r.d <= 0);
ok(
  `deck is fully lit through chapter 9's dwell (min card opacity ${Math.min(
    ...dwell.map((r) => r.cardOp),
  )})`,
  dwell.every((r) => r.cardOp > 0.99),
);

/* the seat card's projected width falls as the deck is pushed away from the
   camera — a dim without this is a dissolve, which is the treatment this deck
   deliberately does not use */
const atRelease = rows.find((r) => r.d === 0);
const mid = rows.find((r) => r.d === 450);
ok(
  `it RECEDES: seat card ${atRelease.w}px wide at release, ${mid.w}px 450px later`,
  mid.w < atRelease.w - 8,
);

const gone = rows.find((r) => r.cardOp < 0.02);
ok(
  `it is fully released (card opacity < 0.02 by +${gone ? gone.d : "never"}px)`,
  !!gone,
);

/* the cream edge must not reach the card while the card is still lit */
const sliced = rows.filter(
  (r) => r.cardOp > 0.05 && r.creamTop !== null && r.creamTop < r.y + r.h,
);
ok(
  `the cream sheet never cuts a lit card (${sliced.length} offending positions)`,
  sliced.length === 0,
);

ok(
  `the copy leaves with the deck (copy opacity ${gone ? gone.copyOp : "n/a"} where the cards are gone)`,
  !gone || gone.copyOp < 0.02,
);

await Promise.race([b.close().catch(() => {}), sleep(3000)]);
try {
  b.process()?.kill("SIGKILL");
} catch {}
process.exit(0);
