/* The 1920 run flagged +212.9px on the FIRST sampled frame only. A spring
   that has not settled after an immediate scroll jump looks exactly like
   that, so this re-checks with a real settle and reports the plate's opacity
   and the split progress alongside the geometry — an invisible plate cannot
   clip anything.

   usage: node scripts/probe-plate-1920.mjs [port]   (run from the repo root) */
import puppeteer from "puppeteer-core";

const PORT = process.argv[2] || "3300";

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1920, height: 900 });
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "no-preference" },
]);
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 3000));

const range = await page.evaluate(() => {
  const sec = document.querySelector("[class*='Discover_section']");
  const r = sec.getBoundingClientRect();
  return { top: scrollY + r.top, h: sec.offsetHeight };
});

/* approach the section by SCROLLING THROUGH it rather than teleporting, so
   every spring is where a reader's would be */
const step = async (y, settle) => {
  await page.evaluate((t) => {
    const l = window.__lenis || window.lenis;
    if (l && typeof l.scrollTo === "function") l.scrollTo(t, { immediate: true });
    else window.scrollTo(0, t);
  }, y);
  await new Promise((r) => setTimeout(r, settle));
};

/* walk in from well above the section first */
await step(range.top - 900, 600);
for (let k = 0; k < 6; k++) await step(range.top - 900 + k * 150, 220);

const rows = [];
const N = 60;
for (let i = 0; i <= N; i++) {
  const y = range.top + (range.h * i) / N;
  await step(y, i < 4 ? 700 : 220); // generous settle on the opening frames
  const m = await page.evaluate(() => {
    const plate = document.querySelector("[class*='introPlate']");
    const words = [...document.querySelectorAll("[class*='introWord']")];
    if (!plate || words.length < 2) return null;
    const cs = getComputedStyle(plate);
    const p = plate.getBoundingClientRect();
    const bs = words.map((w) => w.getBoundingClientRect()).sort((a, z) => a.left - z.left);
    const L = bs[0],
      R = bs[bs.length - 1];
    return {
      op: +(+cs.opacity).toFixed(3),
      plateW: Math.round(p.width),
      gap: Math.round(R.left - L.right),
      intoLeft: +(L.right - p.left).toFixed(1),
      intoRight: +(p.right - R.left).toFixed(1),
    };
  });
  if (m) rows.push({ pct: Math.round((i / N) * 100), ...m });
}

const visible = rows.filter((r) => r.op > 0.02);
const clipping = visible.filter((r) => r.intoLeft > 0 || r.intoRight > 0);
console.log(`\n1920px — ${rows.length} samples, ${visible.length} with the plate visible`);
console.log(`clipping frames among VISIBLE plates: ${clipping.length}`);
if (clipping.length) {
  console.log("  worst offenders:");
  clipping
    .sort((a, z) => Math.max(z.intoLeft, z.intoRight) - Math.max(a.intoLeft, a.intoRight))
    .slice(0, 6)
    .forEach((r) =>
      console.log(
        `   ${r.pct}%  op=${r.op}  plateW=${r.plateW}  gap=${r.gap}  ` +
          `intoL=${r.intoLeft}  intoR=${r.intoRight}`,
      ),
    );
}
console.log("\n  first eight samples (where the earlier run flagged):");
rows
  .slice(0, 8)
  .forEach((r) =>
    console.log(
      `   ${r.pct}%  op=${r.op}  plateW=${r.plateW}  gap=${r.gap}  intoL=${r.intoLeft}  intoR=${r.intoRight}`,
    ),
  );
console.log(
  `\nVERDICT: ${clipping.length === 0 ? "CLEAN — no visible plate ever crosses a word" : "OVERLAP remains"}`,
);

setTimeout(() => process.exit(0), 1200);
await b.close().catch(() => {});
process.exit(0);
