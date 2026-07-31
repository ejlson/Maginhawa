/* THE DISCOVER -> ABOUT SEAM. The maroon arrives as a curtain rising to
   meet the reader. Two things to prove: it is transform-only (so it is
   smooth), and it actually leads the content in rather than trailing it.
   usage: node scripts/probe-seam.mjs [port] */
import puppeteer from "puppeteer-core";
import { ready, sleep } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await ready(page, PORT);

// Get the restaurant chapter's once-per-session intro out of the way FIRST —
// it holds the page for ~9.5s, and a probe that lands in it measures a frozen
// document. Jumping clean past it makes the sequence settle instead of play.
await page.evaluate(() => {
  window.__lenis?.scrollTo(document.body.scrollHeight, { immediate: true });
});
await sleep(1200);

// park a viewport and a half above the About zone, then walk down through it
await page.evaluate(() => {
  const el = document.querySelector("#about");
  window.__lenis?.scrollTo(
    window.scrollY + el.getBoundingClientRect().top - innerHeight * 1.5,
    { immediate: true });
});
await sleep(900);
await page.evaluate(() => {
  window.__frames = [];
  let last = performance.now();
  const tick = (t) => { window.__frames.push(Math.round(t - last)); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});

console.log("zoneTop%   curtainTop%  opacity   covers screen");
for (let i = 0; i < 24; i++) {
  const s = await page.evaluate(() => {
    const c = document.querySelector("[class*='curtain']");
    const zone = document.querySelector("#about")?.closest("div[class*='zone']")
      || document.querySelector("[class*='zone']");
    const zr = zone?.getBoundingClientRect();
    if (!c) return { none: true, zoneTop: zr ? Math.round(zr.top / innerHeight * 100) : null };
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    return {
      zoneTop: Math.round(zr.top / innerHeight * 100),
      curtainTop: Math.round(r.top / innerHeight * 100),
      op: +Number(cs.opacity).toFixed(2),
      // the only properties that should differ from rest
      transform: cs.transform.startsWith("matrix") ? "transform" : cs.transform,
      covers: r.top <= 0 && r.bottom >= innerHeight,
    };
  });
  if (s.none) console.log(`${String(s.zoneTop).padStart(7)}%   (curtain retired)`);
  else console.log(
    `${String(s.zoneTop).padStart(7)}%   ${String(s.curtainTop).padStart(9)}%   ${String(s.op).padStart(6)}   ${s.covers}`);
  if (s.zoneTop !== null && s.zoneTop < -20) break;
  await page.evaluate(() => window.__lenis?.scrollTo(window.scrollY + 90, { immediate: true }));
  await sleep(80);
}
const f = await page.evaluate(() => window.__frames.slice());
console.log(`\nseam frames: ${f.length} | worst ${Math.max(...f)}ms | >32ms: ${f.filter(d => d > 32).length} | >50ms: ${f.filter(d => d > 50).length}`);
await browser.close();
