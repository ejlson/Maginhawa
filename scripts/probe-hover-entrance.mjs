/* HOVERING A PLATE WHILE THE ROW IS STILL MOVING.

   The cells enter by sliding a whole viewport sideways (cellVariants), and
   each plate inside carries a `layoutId` for the expansion morph. A render
   of a tile is a layout RE-MEASURE, and a re-measure taken while an
   ancestor is mid-transform hands projection a delta it then "corrects" —
   which throws the plate out of the row.

   The pointer does not have to chase anything for this to happen: it just
   has to be sitting where a tile is about to arrive, which is exactly where
   a reader's pointer is after they click the view toggle.

   So: park the pointer on the seat, switch views, and watch that plate's
   rect for the whole entrance and after it settles.

   usage: node scripts/probe-hover-entrance.mjs [port] */
import puppeteer from "puppeteer-core";
import { sleep, arm, started } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#restaurants", { timeout: 60000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 60000 },
);
await sleep(1200);
await arm(page);
await started(page);
await page.waitForFunction(
  () =>
    document.documentElement.style.overflow !== "hidden" &&
    !document.querySelector("[data-assembly-step]"),
  { timeout: 60000, polling: 200 },
);
await sleep(1500);
await page.evaluate(() =>
  document.querySelector("#restaurants").scrollIntoView({ block: "center" }),
);
await sleep(700);

/** where the reel's first on-screen plate sits once everything has settled */
const seatOf = async (i) =>
  page.evaluate((i) => {
    const p = document.querySelectorAll("[data-plate]")[i];
    if (!p) return null;
    const r = p.getBoundingClientRect();
    return {
      x: Math.round(r.left + r.width / 2),
      y: Math.round(r.top + r.height / 2),
      left: r.left,
      top: r.top,
      w: r.width,
    };
  }, i);

/** watch plate `i` for `ms`, reporting how far it strayed from `seat` */
async function watch(i, seat, ms) {
  await page.evaluate(
    ({ i, seat }) => {
      window.__w = [];
      const tick = () => {
        const p = document.querySelectorAll("[data-plate]")[i];
        if (p) {
          const r = p.getBoundingClientRect();
          window.__w.push({
            dx: r.left - seat.left,
            dy: r.top - seat.top,
            k: r.width / seat.w,
          });
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    { i, seat },
  );
  await sleep(ms);
  const w = await page.evaluate(() => {
    const out = window.__w;
    window.__w = [];
    return out;
  });
  return w;
}

const TOGGLE = async (n) =>
  page.evaluate((n) => {
    const opts = document.querySelectorAll('[class*="Discover_toggleOpt"]');
    opts[n]?.click();
  }, n);

// settle in the reel once so the seats are known, then go back to the grid
await TOGGLE(1);
await sleep(1800);
const seat = await seatOf(2);
if (!seat) throw new Error("no plate to watch");
await TOGGLE(0);
await sleep(1800);

console.log(`\nplate 2's reel seat: left ${seat.left.toFixed(0)}, top ${seat.top.toFixed(0)}`);
console.log("pointer parked ON the seat, then the view is switched to the reel\n");

// the pointer is already where the tile is going to land — a reader's hand
// after clicking the toggle
await page.mouse.move(seat.x, seat.y);
await sleep(200);
await TOGGLE(1);
const w = await watch(2, seat, 3200);

const settled = w.slice(-30);
const worst = Math.max(...w.map((f) => Math.hypot(f.dx, f.dy)));
const restX = Math.max(...settled.map((f) => Math.abs(f.dx)));
const restY = Math.max(...settled.map((f) => Math.abs(f.dy)));
const restK = Math.max(...settled.map((f) => f.k));
// where did it ever go? (the entrance itself legitimately covers ~110vw)
const offscreen = w.filter((f) => Math.abs(f.dx) > 1440).length;

console.log(`frames watched:        ${w.length}`);
console.log(`furthest from its seat: ${worst.toFixed(0)}px  (the entrance itself is ~1584px)`);
console.log(`frames past a full screen away: ${offscreen}`);
console.log(
  `AT REST (last 30 frames): off seat by ${restX.toFixed(1)}px x / ${restY.toFixed(1)}px y, scaled x${restK.toFixed(3)}`,
);
console.log(
  restX > 12 || restY > 12
    ? "  THROWN — the plate never came back to its seat"
    : "  seated — the plate is where the row put it (±the 1.01 press affordance)",
);
await b.close();
