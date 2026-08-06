/* WHERE DOES THE PRESS WALL WRAP, AND AT WHAT SIZE DOES IT WRAP EVENLY?

   The wall is flex-wrap + space-between over fourteen marks of very
   different natural widths (The Independent is ~14x as wide as it is tall),
   so the row counts are emergent. At the first size tried it broke 8/5/1 —
   one mark orphaned on its own row, which reads as a mistake rather than as
   a wall.

   This measures each mark's natural width at a known seat height, then
   simulates the wrap at a range of heights so the base can be chosen from
   the arithmetic rather than by nudging it and re-screenshotting.

   Usage: node scripts/probe-press-wrap.mjs [port] [width] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const W = Number(process.argv[3] || 1440);
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: 900, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 20000,
  })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);
const h = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < h; y += 450) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await s(80);
}
await s(800);

const data = await page.evaluate(() => {
  const wall = document.querySelector('[class*="PressWall_wall"]');
  const cs = getComputedStyle(wall);
  const seats = [...wall.querySelectorAll("li")].map((li) => {
    const img = li.querySelector("img");
    const r = li.getBoundingClientRect();
    return {
      name: img?.alt || "?",
      w: +r.width.toFixed(1),
      h: +r.height.toFixed(1),
      // width per 1px of seat height — the shape, independent of size
      perPx: +(r.width / r.height).toFixed(3),
      cy: Math.round(r.top + r.height / 2),
    };
  });
  // group into rows by vertical CENTRE, not top: items are centre-aligned
  // and have different heights, so their tops legitimately differ in a row
  const rows = [];
  for (const s of seats.sort((a, b) => a.cy - b.cy)) {
    const row = rows.find((r) => Math.abs(r.cy - s.cy) < 20);
    if (row) row.items.push(s.name);
    else rows.push({ cy: s.cy, items: [s.name] });
  }
  return {
    contentWidth: +wall.getBoundingClientRect().width.toFixed(1),
    colGap: parseFloat(cs.columnGap),
    seatHeightBase: (() => {
      const li = wall.querySelector("li");
      return +(parseFloat(getComputedStyle(li).height) / (parseFloat(getComputedStyle(li).getPropertyValue("--s")) || 1)).toFixed(2);
    })(),
    seats,
    rows: rows.map((r) => r.items),
  };
});

console.log(`\ncontent width ${data.contentWidth}  column-gap ${data.colGap}  base seat ${data.seatHeightBase}px`);
console.log("\nCURRENT WRAP:");
data.rows.forEach((r, i) => console.log(`  row ${i + 1} (${r.length}): ${r.join(", ")}`));

// simulate the wrap at other base heights. Width scales linearly with the
// seat height, so each mark's width at base B is perPx * (its own height at B).
const scaleOf = (seat) => seat.h / data.seatHeightBase; // == --s
console.log("\nSIMULATED WRAP BY BASE HEIGHT (gap held at current):");
for (let base = 18; base <= 46; base += 2) {
  const widths = data.seats.map((s) => s.perPx * scaleOf(s) * base);
  const rows = [];
  let cur = [];
  let used = 0;
  for (const w of widths) {
    const add = cur.length ? data.colGap + w : w;
    if (used + add > data.contentWidth && cur.length) {
      rows.push(cur.length);
      cur = [w];
      used = w;
    } else {
      cur.push(w);
      used += add;
    }
  }
  if (cur.length) rows.push(cur.length);
  const orphan = rows[rows.length - 1] === 1 ? "  ← ORPHAN" : "";
  const spread = Math.max(...rows) - Math.min(...rows);
  console.log(
    `  base ${String(base).padStart(2)}px → ${rows.join(" / ")}   rows=${rows.length} spread=${spread}${orphan}`,
  );
}
await browser.close();
