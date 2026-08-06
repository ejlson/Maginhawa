/* Walk the home page and capture each major section as the reader meets it,
   then the two big interior routes. Used to review a palette or a type
   change across the whole site rather than one screen at a time.

   THE SCROLL HAS TO BE GRADUAL. Most sections here reveal on an
   IntersectionObserver, and teleporting the scroll position to an element
   does not fire its observer — jump straight to "About" and you photograph
   an opacity-0 box. So this scrolls the whole page in small steps first to
   arm every reveal, and only then returns to each section to shoot it.
   Reveals in this codebase are one-way, so they stay open on the way back.

   KNOWN LIMIT, measured rather than assumed: aiming at a SECTION BOX is
   wrong for the pinned chapters. A pinned section's box starts a viewport
   or more before its content is on screen, so scrolling to section.top
   photographs an empty pinned frame — verified, "Our Restaurants" came back
   as a blank cream field at y=1319 while the same section shot fine at
   y=1693. The scatter-to-grid intro is scroll-scrubbed on top of that, so
   even a correct offset can catch it mid-choreography.

   For those sections, aim at the HEADING and subtract ~90px rather than
   using the section box, and expect to check the frame. This script still
   walks section boxes because that is right for the un-pinned majority;
   treat any blank output as this limit rather than as a broken page.

   Usage: node scripts/shoot-sections.mjs <port> [outdir]  */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const OUT =
  process.argv[3] ||
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/1fc8ec40-c8ba-4c1f-8e2d-89c2ff0d34ec/scratchpad/sections";
const s = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});

async function open(path) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  /* NOT networkidle0 — the hero and showcase run looping video, so the
     network never idles and the navigation times out at 30s */
  await page.goto(`http://localhost:${PORT}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 15000,
    })
    .catch(() => console.log(`  ! ${path}: loader never cleared is-loading`));
  await page.evaluate(async () => {
    await document.fonts.ready;
    return true;
  });
  await s(2500);
  return page;
}

async function armReveals(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await s(130);
  }
  await s(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await s(1200);
  return h;
}

/* ---------- home page, section by section ---------- */
const home = await open("/");
const pageHeight = await armReveals(home);
console.log("home scroll height:", pageHeight);

const marks = await home.evaluate(() => {
  const out = [];
  const seen = new Set();
  document.querySelectorAll("section, footer").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height < 320) return; // skip spacers and thin bands
    const heading = el.querySelector("h1, h2");
    const label = (heading?.textContent || el.id || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 38);
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ label, y: Math.round(r.top + window.scrollY) });
  });
  return out;
});
console.log(`sections found: ${marks.length}`);

const slug = (t, i) =>
  String(i).padStart(2, "0") +
  "-" +
  t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);

for (let i = 0; i < marks.length; i++) {
  const m = marks[i];
  await home.evaluate((v) => window.scrollTo(0, v), m.y);
  await s(1100); // let the pin settle and any parallax land
  await home.screenshot({ path: `${OUT}/${slug(m.label, i + 1)}.png` });
  console.log(`  ${slug(m.label, i + 1)}  (y=${m.y})  "${m.label}"`);
}
await home.close();

/* ---------- interior routes ---------- */
for (const [path, name] of [
  ["/restaurants", "route-restaurants"],
  ["/about", "route-about"],
]) {
  const p = await open(path);
  await armReveals(p);
  await s(800);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ${name}`);
  await p.close();
}

console.log(`\nwrote ${OUT}`);
await browser.close();
