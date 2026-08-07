/* A 4x CLIP OF ONE CONTROL AT FULL CLOSE.
 *
 * The unify shot is small enough that a glyph and an arrow sharing a pixel
 * column look the same as a compression artefact. This blows one control up
 * on a device scale of 4 and also asks the DOM the question directly: how
 * many pixels are there between the label's last ink and the arrow's first,
 * at rest and at full close? PillCta.module.css's warning puts the ceiling
 * at ~17px of travel each way; this is the check that says where we are.
 *
 * usage: node scripts/shot-cta-zoom.mjs [port] [case] [width] [height]
 *        case = about | blog | reservations
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const CASE = process.argv[3] || "reservations";
const W = +(process.argv[4] || 1440);
const H = +(process.argv[5] || 900);
const DIR = "/tmp/cta-unify";
fs.mkdirSync(DIR, { recursive: true });

const SEL = {
  about: "[class*='AboutSplit_section'] [class*='PillCta_host']",
  blog: "#blog [class*='PillCta_host']",
  reservations: "#book [class*='PillCta_host']",
}[CASE];

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=4"],
});
const p = await b.newPage();
await p.setViewport({ width: W, height: H, deviceScaleFactor: 4 });
await p.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await p
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await new Promise((r) => setTimeout(r, 1500));

const docH = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < docH; y += 500) {
  await p.evaluate((to) => {
    const l = window.__lenis;
    if (l) l.scrollTo(to, { immediate: true, force: true });
    else window.scrollTo(0, to);
  }, y);
  await new Promise((r) => setTimeout(r, 160));
}

await p.evaluate((sel) => {
  document.querySelector(sel).scrollIntoView({ block: "center" });
}, SEL);
await new Promise((r) => setTimeout(r, 700));

/* THE CLEARANCE, measured off the painted glyphs rather than off the boxes.
   A Range around the label's text node gives the ink's real right edge —
   the span's border box includes 1.3em of padding on that side, which is
   exactly the distance the question is about, so measuring the span would
   answer a different question and look fine doing it. */
const clearance = async () =>
  p.evaluate((sel) => {
    const host = document.querySelector(sel);
    const label = host.querySelector("[class*='PillCta_label']");
    const arrow = host.querySelector("[class*='PillCta_arrow']");
    const rng = document.createRange();
    rng.selectNodeContents(label);
    const ink = rng.getBoundingClientRect();
    const a = arrow.getBoundingClientRect();
    return {
      inkRight: +ink.right.toFixed(1),
      arrowLeft: +a.left.toFixed(1),
      gap: +(a.left - ink.right).toFixed(1),
    };
  }, SEL);

const rest = await clearance();
const el = await p.$(SEL);
await el.screenshot({ path: `${DIR}/${CASE}-zoom-rest.png` });

await p.hover(`${SEL} a`);
await new Promise((r) => setTimeout(r, 900));
const hover = await clearance();
await el.screenshot({ path: `${DIR}/${CASE}-zoom-hover.png` });

console.log(`\n${CASE} — label ink to arrow ink`);
console.log(`  rest   ${rest.gap}px   (ink ends ${rest.inkRight}, arrow at ${rest.arrowLeft})`);
console.log(`  closed ${hover.gap}px   (ink ends ${hover.inkRight}, arrow at ${hover.arrowLeft})`);
console.log(
  `  ${hover.gap < 4 ? "⚠ THE ARROW IS ON THE TYPE" : "clear"} — clips in ${DIR}\n`,
);

await b.close();
