/* ROW-INK PROFILE per press logo — how the ink is distributed down the box.

   probe-press-ink.mjs answers "how much of the box is ink"; this answers
   "where, and in how many lines". It prints one bar per 1/48th of the box,
   length proportional to the inked pixels in that slice, so a two-line
   lockup shows as two clusters with a notch between them and a wordmark with
   a superscript shows as a long tail above the mass.

   That distinction decides the `scale` rule: a single line is normalised on
   its whole ink extent, a lockup on its DOMINANT line, and the dominant
   line's extent cannot be found without seeing where the lines are.

   The band split uses a floor RELATIVE TO THE HEAVIEST ROW (2%), not to the
   image width — the first version used width and merged The Guardian's two
   lines, because "The" sits close enough to "Guardian" that the rows between
   them are thin rather than empty.

   Usage: node scripts/probe-press-profile.mjs [port]  */
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const OUT =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/082df041-cd16-47f8-81ae-892042eaee11/scratchpad";
const ink = JSON.parse(readFileSync(`${OUT}/press-ink.json`, "utf8"));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});

const rows = await page.evaluate(async (files) => {
  const BOX = 480;
  const out = [];
  for (const f of files) {
    const img = new Image();
    img.src = `/press-logo/${f.file}`;
    await img.decode();
    const w = Math.round(BOX * (img.naturalWidth / img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = BOX;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, BOX);
    const d = ctx.getImageData(0, 0, w, BOX).data;
    const prof = new Array(BOX).fill(0);
    for (let y = 0; y < BOX; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const a = d[i + 3];
        if (a < 24) continue;
        const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        if (lum * (a / 255) + 255 * (1 - a / 255) < 229) prof[y]++;
      }
    const max = Math.max(...prof);
    const floor = max * 0.02;
    const bands = [];
    let run = null;
    for (let y = 0; y <= BOX; y++) {
      const on = y < BOX && prof[y] > floor;
      if (on) run = run ? ((run.bot = y), run) : { top: y, bot: y };
      else if (run) {
        bands.push(run);
        run = null;
      }
    }
    // merge bands separated by less than 1.5% of the box (kerning gaps,
    // a dot over an i) — a real line break is wider than that
    const MERGE = Math.round(BOX * 0.015);
    const merged = [];
    for (const b of bands) {
      const last = merged[merged.length - 1];
      if (last && b.top - last.bot <= MERGE) last.bot = b.bot;
      else merged.push({ ...b });
    }
    out.push({
      name: f.name,
      box: BOX,
      prof,
      bands: merged.map((b) => ({
        top: b.top,
        h: b.bot - b.top + 1,
        r: +((b.bot - b.top + 1) / BOX).toFixed(4),
        // ink mass in the band, as a share of the whole mark's ink
        mass: 0,
      })),
      bandMass: merged.map((b) =>
        prof.slice(b.top, b.bot + 1).reduce((s, n) => s + n, 0),
      ),
      total: prof.reduce((s, n) => s + n, 0),
    });
  }
  return out;
}, ink);

const BUCK = 48;
for (const r of rows) {
  const step = r.box / BUCK;
  const max = Math.max(...r.prof);
  console.log(`\n=== ${r.name}`);
  for (let b = 0; b < BUCK; b++) {
    const slice = r.prof.slice(Math.round(b * step), Math.round((b + 1) * step));
    const v = Math.max(...slice, 0);
    const n = Math.round((v / max) * 46);
    console.log(
      String(b).padStart(2) + " " + "#".repeat(n) + (n === 0 ? "." : ""),
    );
  }
  r.bands.forEach((b, i) =>
    console.log(
      `   band ${i}: top=${b.top} h=${b.h} r=${b.r.toFixed(4)} ` +
        `mass=${((r.bandMass[i] / r.total) * 100).toFixed(1)}%`,
    ),
  );
}
writeFileSync(
  `${OUT}/press-bands.json`,
  JSON.stringify(
    rows.map(({ prof, ...k }) => k),
    null,
    2,
  ),
);
console.log(`\nwrote ${OUT}/press-bands.json`);
await browser.close();
