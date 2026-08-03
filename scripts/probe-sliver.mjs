/* DOES A CARD BEHIND THE SEAT POKE OUT PAST IT?
 *
 * deck-check's contract A tests cards IN FRONT of the subject (lower index).
 * The complaint this build is answering is the other direction: a card BEHIND
 * the one being read showing at its sides or under its foot. Same sweep, same
 * park(), the opposite half of the stack.
 *
 * usage: node probe-sliver.mjs [port] [w] [h]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [PORT = "3140", W = "1440", H = "900"] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu"],
});
const page = await b.newPage();
await page.setViewport({ width: +W, height: +H });
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
await page.evaluate(() => document.fonts.ready);
await sleep(1800);

const box = await page.evaluate(() => {
  const w = document.querySelector('[class*="railPinWrap"]');
  if (!w) return null;
  const r = w.getBoundingClientRect();
  return { top: r.top + scrollY, h: w.offsetHeight };
});
if (!box) {
  console.log(`NO DECK at ${W}x${H}`);
  await b.close();
  process.exit(0);
}
const travel = box.h - +H;
const park = async (p) => {
  const y = box.top + p * travel;
  await page.evaluate((v) => window.__lenis?.scrollTo(v, { immediate: true }) ?? scrollTo(0, v), y);
  await sleep(240);
};

const col = await page.evaluate(() => {
  const st = document.querySelector('[class*="railStage"]');
  return { stageW: st.getBoundingClientRect().width };
});

const N = 60;
let worstSide = 0;
let worstSideAt = "";
let worstFoot = 0;
let worstFootAt = "";
const perSeat = new Map();

for (let s = 0; s <= N; s++) {
  const p = 0.02 + (s / N) * 0.96;
  await park(p);
  const v = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[class*="railCard"]')];
    const track = document.querySelector('[class*="railTrack"]');
    const tm = new DOMMatrix(getComputedStyle(track).transform);
    const t = (tm.m43 + 480) / 60;
    const seat = Math.min(8, Math.max(0, Math.round(t)));
    const ops = cards.map((c) => +getComputedStyle(c).opacity);
    const rects = cards.map((c) => c.getBoundingClientRect());
    const sr = rects[seat];
    let side = 0;
    let foot = 0;
    let who = -1;
    for (let i = seat + 1; i < cards.length; i++) {
      if (ops[i] <= 0.01) continue;
      const r = rects[i];
      /* only where the two actually share screen rows — a strip far above the
         seat card is the deck, not an intrusion */
      if (r.bottom <= sr.top || r.top >= sr.bottom) continue;
      const l = Math.max(0, sr.left - r.left);
      const rt = Math.max(0, r.right - sr.right);
      const sd = Math.max(l, rt);
      if (sd > side) {
        side = sd;
        who = i;
      }
      foot = Math.max(foot, r.bottom - sr.bottom);
    }
    return { t: +t.toFixed(3), seat, side: +side.toFixed(1), foot: +foot.toFixed(1), who };
  });
  if (v.side > worstSide) {
    worstSide = v.side;
    worstSideAt = `t=${v.t} seat ${v.seat + 1}, card ${v.who + 1} behind`;
  }
  if (v.foot > worstFoot) {
    worstFoot = v.foot;
    worstFootAt = `t=${v.t} seat ${v.seat + 1}`;
  }
  const cur = perSeat.get(v.seat) ?? { side: 0, foot: -1e9 };
  perSeat.set(v.seat, {
    side: Math.max(cur.side, v.side),
    foot: Math.max(cur.foot, v.foot),
  });
}

console.log(`\n${W}x${H}   stage column ${col.stageW.toFixed(1)}px\n`);
console.log("  seat   worst side intrusion   worst foot overhang (negative = clear)");
for (const [k, v] of [...perSeat.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(
    `   ${String(k + 1).padStart(2)}    ${String(v.side.toFixed(1)).padStart(8)}px          ${String(v.foot.toFixed(1)).padStart(8)}px`,
  );
}
console.log(`\n  WORST side intrusion  ${worstSide.toFixed(1)}px   ${worstSideAt}`);
console.log(`  WORST foot overhang   ${worstFoot.toFixed(1)}px   ${worstFootAt}`);

await Promise.race([b.close().catch(() => {}), sleep(3000)]);
try {
  b.process()?.kill("SIGKILL");
} catch {}
process.exit(0);
