/* On hover, how far does each tile's blurb climb into its logo?

   `.hoverBlurb` is absolutely seated at the tile's bottom and its height is
   content-driven (RAMO runs four lines, others two), while `.center` holds the
   logo centred in `inset: 0`. So the collision is per-tile, and a shift picked
   without measuring will over-move the short tiles or under-move the tall one.

   Reports, per tile: the logo's bottom, the blurb's top, and the overlap.

   usage: node scripts/probe-tile-hover.mjs [port]   (run from the repo root) */
import puppeteer from "puppeteer-core";

const PORT = process.argv[2] || "3300";

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "no-preference" },
]);
await page.goto(`http://localhost:${PORT}/restaurants`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2500));

/* the grid view is where the tiles live */
await page.evaluate(() => {
  const g = [...document.querySelectorAll("button")].find(
    (x) => /grid/i.test(x.getAttribute("aria-label") || ""),
  );
  if (g) g.click();
});
await new Promise((r) => setTimeout(r, 900));

const n = await page.evaluate(
  () => document.querySelectorAll("[class*='Discover_cell__']").length,
);
console.log(`tiles: ${n}`);

for (let i = 0; i < n; i++) {
  const box = await page.evaluate((k) => {
    const c = document.querySelectorAll("[class*='Discover_cell__']")[k];
    if (!c) return null;
    c.scrollIntoView({ block: "center" });
    const r = c.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, i);
  if (!box) continue;
  await new Promise((r) => setTimeout(r, 350));
  await page.mouse.move(box.x, box.y);
  /* the drawer clock is 700ms — wait past it so the blurb is fully in */
  await new Promise((r) => setTimeout(r, 950));

  const m = await page.evaluate((k) => {
    const c = document.querySelectorAll("[class*='Discover_cell__']")[k];
    const logo =
      c.querySelector("[class*='Discover_logo__']") ||
      c.querySelector("[class*='Discover_wordmark__']");
    const blurb = c.querySelector("[class*='Discover_hoverBlurb__']");
    const name = (c.textContent || "").trim().slice(0, 22).replace(/\s+/g, " ");
    if (!logo || !blurb) return { name, missing: !logo ? "logo" : "blurb" };
    const cr = c.getBoundingClientRect();
    const lr = logo.getBoundingClientRect();
    const br = blurb.getBoundingClientRect();
    return {
      name,
      tileH: Math.round(cr.height),
      blurbOpacity: +getComputedStyle(blurb).opacity,
      blurbLines: Math.round(br.height / parseFloat(getComputedStyle(blurb).lineHeight)),
      logoBottom: +(lr.bottom - cr.top).toFixed(1),
      blurbTop: +(br.top - cr.top).toFixed(1),
      overlap: +(lr.bottom - br.top).toFixed(1),
    };
  }, i);
  console.log(
    `  ${String(i).padStart(2)} ${JSON.stringify(m)}`,
  );
  await page.mouse.move(5, 5);
  await new Promise((r) => setTimeout(r, 400));
}

setTimeout(() => process.exit(0), 1200);
await b.close().catch(() => {});
process.exit(0);
