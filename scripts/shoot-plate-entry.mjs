/* Decisive check: park at the split's opening frames at 1920 and LOOK. The
   numeric probes disagreed because one teleported onto a pin boundary and the
   other never actually scrolled (y moved 92 -> 94 across 150 wheel events, so
   it re-measured an off-screen state 315 times). A picture settles whether the
   plate is sitting on the "R" where a reader can see it.

   usage: node scripts/shoot-plate-entry.mjs [port]   (run from the repo root) */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const PORT = process.argv[2] || "3300";
const OUT = "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/2023fdca-cd86-4bca-922b-c2f81853e348/scratchpad/shots";
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1920, height: 900, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "no-preference" },
]);
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 3000));

const info = await page.evaluate(() => {
  const sec = document.querySelector("[class*='Discover_section']");
  const r = sec.getBoundingClientRect();
  return { top: Math.round(scrollY + r.top), h: sec.offsetHeight, vh: innerHeight };
});
console.log(`section top=${info.top} height=${info.h} viewport=${info.vh}`);

for (const pct of [0, 1, 2, 4, 8]) {
  const y = info.top + (info.h * pct) / 100;
  await page.evaluate((t) => {
    const l = window.__lenis || window.lenis;
    if (l && typeof l.scrollTo === "function") l.scrollTo(t, { immediate: true });
    else window.scrollTo(0, t);
  }, y);
  await new Promise((r) => setTimeout(r, 1800));

  const m = await page.evaluate(() => {
    const plate = document.querySelector("[class*='introPlate']");
    const words = [...document.querySelectorAll("[class*='introWord']")];
    if (!plate || words.length < 2) return null;
    const p = plate.getBoundingClientRect();
    const bs = words.map((w) => w.getBoundingClientRect()).sort((a, z) => a.left - z.left);
    return {
      op: +(+getComputedStyle(plate).opacity).toFixed(2),
      plate: `${Math.round(p.left)}..${Math.round(p.right)} @y${Math.round(p.top)}`,
      onScreen: p.top < innerHeight && p.bottom > 0,
      leftWord: `${Math.round(bs[0].left)}..${Math.round(bs[0].right)}`,
      rightWord: `${Math.round(bs[1].left)}..${Math.round(bs[1].right)}`,
    };
  });
  console.log(`${pct}%  ${JSON.stringify(m)}`);
  await page.screenshot({ path: `${OUT}/plate-${pct}pct.png` });
}
console.log(`\nshots -> ${OUT}/plate-*pct.png`);

setTimeout(() => process.exit(0), 1200);
await b.close().catch(() => {});
process.exit(0);
