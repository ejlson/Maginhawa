/* HOVERING A RESTAURANT PLATE.

   Two failures, both of which the reader reports as "the image disappears":

     FLIGHT   the plate is thrown out of position (and scaled) by a layout
              re-measure taken while the reel is scrolled sideways. Every
              plate carries a `layoutId` for the expansion morph, so ANY
              render of the tile is a re-measure — and projection cannot see
              a scroll container's own scrollLeft unless it is told to.
              Measured as the plate's rect moving while nothing but the
              pointer has changed.

     BLIND    the hover film fading up before it has a frame to show, so the
              photograph crossfades into an empty box for the length of the
              fetch (2.5MB on the smallest tile, 25MB on Belly's). Measured
              as film opacity > 0 while readyState < 2.

   Runs in the REEL, scrolled — the view the flight showed in.

   usage: node scripts/probe-hover.mjs [port] */
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

/* into the reel, and scrolled — a plate whose layout box has been carried
   sideways by its container is the whole point of the exercise */
const toStrip = await page.evaluate(() => {
  const opts = document.querySelectorAll('[class*="Discover_toggleOpt"]');
  if (opts.length < 2) return false;
  opts[1].click();
  return true;
});
if (!toStrip) throw new Error("no view toggle found");
await sleep(1600);
await page.evaluate(() => {
  document.querySelector("#restaurants").scrollIntoView({ block: "center" });
  const s = document.querySelector('[class*="Discover_gridStrip"]');
  if (s) s.scrollLeft = 700;
});
await sleep(700);
const scrolledTo = await page.evaluate(() => {
  const s = document.querySelector('[class*="Discover_gridStrip"]');
  return s ? Math.round(s.scrollLeft) : -1;
});

console.log(`\nREEL, scrolled ${scrolledTo}px`);
console.log("  tile   plate moved   plate grew   film shown blind   verdict");

for (let i = 0; i < 8; i++) {
  await page.mouse.move(6, 6);
  await sleep(250);
  const before = await page.evaluate((i) => {
    const p = document.querySelectorAll("[data-plate]")[i];
    if (!p) return null;
    const r = p.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }, i);
  if (!before) continue;
  const cx = before.x + before.w / 2;
  const cy = before.y + before.h / 2;
  // off screen, or under the fixed nav — nothing a pointer could reach
  if (cy < 90 || cy > 870 || cx < 4 || cx > 1436) continue;

  await page.evaluate(
    ({ i, before }) => {
      window.__w = [];
      const plate = document.querySelectorAll("[data-plate]")[i];
      const tick = () => {
        const r = plate.getBoundingClientRect();
        const v = plate.querySelector("video");
        window.__w.push({
          dx: Math.abs(r.left - before.x),
          dy: Math.abs(r.top - before.y),
          k: r.width / before.w,
          o: v ? Number(getComputedStyle(v).opacity) : 0,
          // 0/1 = nothing decoded yet; ≥2 = there is a frame to draw
          rs: v ? v.readyState : 4,
        });
        if (window.__w.length < 200) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    { i, before },
  );
  await page.mouse.move(cx, cy);
  await sleep(2600);
  const w = await page.evaluate(() => window.__w ?? []);

  const moved = Math.max(...w.map((s) => Math.max(s.dx, s.dy)));
  const grew = Math.max(...w.map((s) => s.k));
  const blind = w.filter((s) => s.o > 0.02 && s.rs < 2);
  const played = w.some((s) => s.rs >= 2 && s.o > 0.5);
  console.log(
    `  ${String(i).padStart(4)}   ${(moved.toFixed(1) + "px").padStart(11)}   ${("x" + grew.toFixed(3)).padStart(10)}   ${String(blind.length).padStart(11)} fr   ${
      moved > 2
        ? `THROWN — the plate left its seat by ${moved.toFixed(0)}px`
        : blind.length
          ? `BLANK — an empty box stood in for the photo for ${blind.length} frames`
          : played
            ? "held still; film took over once it had a frame"
            : "held still; still image kept (film never loaded)"
    }`,
  );
}

console.log(
  "\n  plate moved  0 = the plate held its seat. The hover is a zoom INSIDE the",
);
console.log("               clip — the plate's own box must never move or resize.");
console.log("  plate grew   x1.000 = the layout box never changed size");
await b.close();
