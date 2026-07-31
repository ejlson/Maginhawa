/* The statement's parting. Three things: the line arrives as TEXT ONLY (the
   prints at zero width), the prints then open and genuinely push the words
   aside, and the h2's own height does NOT change while it happens — a
   reflowing headline would shove the whole page below it.
   usage: node scripts/probe-manifesto.mjs [port] */
import puppeteer from "puppeteer-core";
import { ready, sleep } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"] });
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await ready(page, PORT);

const read = () => page.evaluate(() => {
  const h = document.querySelector("[class*='statement']");
  const masks = [...h.querySelectorAll("[class*='imgMask']")];
  const words = [...h.querySelectorAll("[class*='wordMask']")].filter(m => !masks.includes(m));
  /* The word a print actually SHOVES — the one directly after the first
     slot, on the same line. (Not the final word: with three prints it now
     falls on a line of its own, where nothing pushes it, so it reads as
     "never parted" even when the sentence is opening perfectly.) */
  const all = [...h.querySelectorAll("[class*='wordMask']")];
  const firstSlot = all.indexOf(masks[0]);
  const last = all.slice(firstSlot + 1).find((n) => !masks.includes(n));
  return {
    h2Height: Math.round(h.getBoundingClientRect().height),
    h2Top: Math.round(h.getBoundingClientRect().top),
    imgW: masks.map(m => +m.getBoundingClientRect().width.toFixed(1)),
    // every word's line, so a word hopping lines shows up
    wordTops: words.map(w => Math.round(w.getBoundingClientRect().top)),
    cafes: (() => { const w = words.find(w => w.textContent.trim() === "cafés");
      return w ? Math.round(w.getBoundingClientRect().top) : null; })(),
    // where the pushed word sits — if the prints are really parting the
    // sentence this has to travel
    lastWordLeft: last ? Math.round(last.getBoundingClientRect().left) : null,
    lastWordTop: last ? Math.round(last.getBoundingClientRect().top) : null,
    below: Math.round(document.querySelector("#restaurants").getBoundingClientRect().top),
  };
});

await page.evaluate(() => {
  window.__f = []; let l = performance.now();
  const t = (x) => { window.__f.push(Math.round(x - l)); l = x; requestAnimationFrame(t); };
  requestAnimationFrame(t);
});
// bring the statement into view and watch it build
await page.evaluate(() => {
  const h = document.querySelector("[class*='statement']");
  window.__lenis?.scrollTo(window.scrollY + h.getBoundingClientRect().top - innerHeight * 0.55, { immediate: true });
});
console.log("  t(ms)  h2 height  print widths                      last word x,y   #restaurants top");
const t0 = Date.now();
const seen = [];
for (let i = 0; i < 14; i++) {
  const r = await read();
  seen.push(r);
  console.log(`${String(Date.now() - t0).padStart(7)}  ${String(r.h2Height).padStart(9)}  ${JSON.stringify(r.imgW).padEnd(34)} ${String(r.lastWordLeft).padStart(6)},${String(r.lastWordTop).padStart(4)}   ${String(r.below).padStart(6)}`);
  await sleep(190);
}
const f = await page.evaluate(() => window.__f.slice());
const heights = [...new Set(seen.map(s => s.h2Height))];
const moved = Math.max(...seen.map(s => s.lastWordLeft)) - Math.min(...seen.map(s => s.lastWordLeft));
console.log(`\nprints opened from ${JSON.stringify(seen[0].imgW)} to ${JSON.stringify(seen.at(-1).imgW)}`);
console.log(`pushed word travelled: ${moved}px  (0 = the sentence never parted)`);
console.log(`h2 heights seen: ${heights.join(", ")}  (one value = the page below never shifted)`);
const belowSeen = [...new Set(seen.map(s => s.below))];
console.log(`#restaurants top seen: ${belowSeen.join(", ")}  (one value = the section below never moved)`);
const cafesSeen = [...new Set(seen.map(s => s.cafes))];
console.log(`"cafés" line-top seen: ${cafesSeen.join(", ")}  (one value = it never changed line)`);
const lineSets = new Set(seen.map(s => JSON.stringify(s.wordTops)));
console.log(`distinct word layouts: ${lineSets.size}  (1 = the sentence never re-wrapped)`);
console.log(`frames: ${f.length} | worst ${Math.max(...f)}ms | >32ms ${f.filter(d => d > 32).length}`);
await b.close();
