/* Visual confirmation of the finished work. Viewport shots only, taken AFTER
   scrolling and settling — `fullPage` never fires IntersectionObserver, so
   every whileInView section captures blank (learned the hard way twice).

   usage: node scripts/shoot-finish.mjs [port]   (run from the repo root) */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const PORT = process.argv[2] || "3300";
const B = `http://localhost:${PORT}`;
const OUT = "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/2023fdca-cd86-4bca-922b-c2f81853e348/scratchpad/shots";
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "no-preference" },
]);

/* Lenis owns the wheel, so drive it through Lenis where it exists and fall
   back to a raw scroll otherwise; then wait for the spring to settle. */
const goTo = async (y) => {
  await page.evaluate((t) => {
    const l = window.__lenis || window.lenis;
    if (l && typeof l.scrollTo === "function") l.scrollTo(t, { immediate: true });
    else window.scrollTo(0, t);
  }, y);
  await new Promise((r) => setTimeout(r, 1400));
};

const shots = [
  { route: "/about", name: "about-deck", find: "[class*='railStage']" },
  { route: "/about", name: "about-awards", find: "[class*='coverageRow']" },
  { route: "/contact", name: "contact-faq", find: "[class*='FAQ_section']" },
  { route: "/restaurants", name: "restaurants-wheel", find: "[class*='wheel']" },
  { route: "/careers", name: "careers-hero", find: null },
];

for (const s of shots) {
  await page.goto(`${B}${s.route}`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2200));
  if (s.find) {
    const y = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return Math.max(0, scrollY + r.top - (innerHeight - r.height) / 2);
    }, s.find);
    if (y !== null) await goTo(y);
    else console.log(`  ${s.name}: selector ${s.find} not found — shot at top`);
  }
  await page.screenshot({ path: `${OUT}/${s.name}.png` });
  console.log(`  ${OUT}/${s.name}.png`);
}

/* the wheel's chevron buttons — do they animate in? */
await page.goto(`${B}/restaurants`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2400));
const btns = await page.evaluate(() => {
  const bs = [...document.querySelectorAll("button")].filter((x) =>
    x.querySelector("svg"),
  );
  return bs.slice(0, 4).map((x) => {
    const cs = getComputedStyle(x);
    const r = x.getBoundingClientRect();
    return {
      cls: String(x.className).slice(0, 44),
      opacity: cs.opacity,
      transform: cs.transform.slice(0, 46),
      transition: cs.transition.slice(0, 60),
      at: `${Math.round(r.left)},${Math.round(r.top)}`,
      label: x.getAttribute("aria-label"),
    };
  });
});
console.log(`\nwheel buttons: ${JSON.stringify(btns, null, 1)}`);

setTimeout(() => process.exit(0), 1200);
await b.close().catch(() => {});
process.exit(0);
