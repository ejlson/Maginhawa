/* /about's scrubbed opening, photographed at six points along the scrub.
 *
 * page.screenshot({clip}) measures from the DOCUMENT origin, not the
 * viewport, so these are full-viewport captures taken at scroll positions
 * rather than clips. Scroll goes through Lenis's own handle (window.scrollTo
 * is overridden by it).
 *
 * usage: node scripts/shoot-about-open.mjs [port] [width] [height]
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const W = +(process.argv[3] || 1440);
const H = +(process.argv[4] || 900);
const REDUCE = process.argv[5] === "reduce";
const OUT = "shots/about-open";
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
if (REDUCE) {
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
}

await page.goto(`http://localhost:${PORT}/about`, {
  waitUntil: "domcontentloaded",
});
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await new Promise((r) => setTimeout(r, 1600));

const geo = await page.evaluate(() => {
  const s = document.querySelector('[class*="About_opening"]');
  const r = s.getBoundingClientRect();
  return { top: Math.round(r.top + scrollY), h: Math.round(r.height) };
});
// progress p maps to scrollY = openingTop + p * (height - viewport)
const at = (p) => Math.round(geo.top + p * (geo.h - H));

const to = async (y) => {
  await page.evaluate((v) => {
    const l = window.__lenis;
    if (l) l.scrollTo(v, { immediate: true, force: true });
    else window.scrollTo(0, v);
  }, y);
  // Lenis smooths even a forced write; give it time to settle before reading
  await new Promise((r) => setTimeout(r, 1200));
};

const tag = REDUCE ? `reduce-${W}` : `${W}`;
const marks = REDUCE ? [0, 1] : [0, 0.18, 0.4, 0.62, 0.85, 1];
for (const p of marks) {
  // step in so the observers on the way are armed rather than skipped
  await to(at(p));
  await page.screenshot({ path: `${OUT}/${tag}-p${String(p).replace(".", "")}.png` });
}

/* THE HANDOVER. One viewport past the end of the runway: the opening has
   released, the film is still pinned behind, and the statement — the page's
   existing first prose — is arriving over it. This is the seam the opening
   has to make invisible, so it is photographed rather than asserted. */
await to(at(1) + H);
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: `${OUT}/${tag}-handover.png` });
console.log(
  `opening top ${geo.top}px, height ${geo.h}px, travel ${geo.h - H}px — ${marks.length} shots in ${OUT}/ (${tag})`,
);

await b.close();
