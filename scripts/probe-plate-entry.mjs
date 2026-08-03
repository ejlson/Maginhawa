/* Is the 1920 flash real, or an artifact of teleporting onto the pin's entry
   frame? Teleport-scrolling lands a scrubbed pin on a boundary it never
   passes through at reading speed. So this drives the page with REAL WHEEL
   EVENTS through the entry and samples every animation frame, which is the
   only way to tell a genuine one-frame flash from a probe fault.

   usage: node scripts/probe-plate-entry.mjs [port]   (run from the repo root) */
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

const top = await page.evaluate(() => {
  const sec = document.querySelector("[class*='Discover_section']");
  return scrollY + sec.getBoundingClientRect().top;
});

/* park a little way above the section, the honest way */
await page.evaluate((t) => {
  const l = window.__lenis || window.lenis;
  if (l && typeof l.scrollTo === "function") l.scrollTo(t, { immediate: true });
  else window.scrollTo(0, t);
}, top - 1200);
await new Promise((r) => setTimeout(r, 2000));

/* start a per-frame recorder BEFORE the wheel starts moving */
await page.evaluate(() => {
  window.__rec = [];
  const tick = () => {
    const plate = document.querySelector("[class*='introPlate']");
    const words = [...document.querySelectorAll("[class*='introWord']")];
    if (plate && words.length >= 2) {
      const cs = getComputedStyle(plate);
      const op = +cs.opacity;
      if (op > 0.02) {
        const p = plate.getBoundingClientRect();
        if (p.width > 4) {
          const bs = words
            .map((w) => w.getBoundingClientRect())
            .sort((a, z) => a.left - z.left);
          const L = bs[0],
            R = bs[bs.length - 1];
          window.__rec.push({
            y: Math.round(scrollY),
            op: +op.toFixed(2),
            w: Math.round(p.width),
            gap: Math.round(R.left - L.right),
            iL: +(L.right - p.left).toFixed(1),
            iR: +(p.right - R.left).toFixed(1),
          });
        }
      }
    }
    window.__raf = requestAnimationFrame(tick);
  };
  window.__raf = requestAnimationFrame(tick);
});

/* real wheel input, at a human pace, straight through the entry */
await page.mouse.move(960, 450);
for (let i = 0; i < 150; i++) {
  await page.mouse.wheel({ deltaY: 40 });
  await new Promise((r) => setTimeout(r, 16));
}
await new Promise((r) => setTimeout(r, 1500));

const rec = await page.evaluate(() => {
  cancelAnimationFrame(window.__raf);
  return window.__rec;
});

const clip = rec.filter((r) => r.iL > 0 || r.iR > 0);
console.log(`\n1920px, real wheel scroll — ${rec.length} frames with the plate visible`);
console.log(`frames where the plate crosses a word: ${clip.length}`);
if (clip.length) {
  clip
    .sort((a, z) => Math.max(z.iL, z.iR) - Math.max(a.iL, a.iR))
    .slice(0, 8)
    .forEach((r) =>
      console.log(`   y=${r.y} op=${r.op} w=${r.w} gap=${r.gap} intoL=${r.iL} intoR=${r.iR}`),
    );
}
const worst = rec.reduce((m, r) => Math.max(m, r.iL, r.iR), -1e9);
console.log(`worst intrusion over the whole approach: ${worst.toFixed(1)}px`);
console.log(
  `\nVERDICT: ${clip.length === 0 ? "CLEAN at reading speed — the teleport flagged a boundary a reader never lands on" : "REAL — the plate does cross the word at reading speed"}`,
);

setTimeout(() => process.exit(0), 1200);
await b.close().catch(() => {});
process.exit(0);
