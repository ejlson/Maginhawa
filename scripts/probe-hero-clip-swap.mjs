/* the hard cut between the two hero clips, with the second one no longer
   preloaded up front. Two questions: did the deferred fetch actually start
   once the first clip was playing, and does the swap still cut cleanly. */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
const seen = [];
p.on("response", r => { if (r.url().includes("/videos/")) seen.push([Date.now(), r.url().split("/").pop(), r.status()]); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const t0 = Date.now();
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise(r => setTimeout(r, 9000));
const state = async () => p.evaluate(() => [...document.querySelectorAll('[class*="Hero_video__"]')].map(v => ({
  src: v.src.split("/").pop(), preload: v.preload, net: v.networkState, ready: v.readyState,
  buffered: v.buffered.length ? +v.buffered.end(v.buffered.length - 1).toFixed(1) : 0,
  vis: getComputedStyle(v).visibility, t: +v.currentTime.toFixed(1), dur: +(v.duration || 0).toFixed(1),
})));
console.log("at +9s :", JSON.stringify(await state(), null, 0));
await new Promise(r => setTimeout(r, 8000));
console.log("at +17s:", JSON.stringify(await state(), null, 0));
// force the cut: jump the playing clip to just before its end
await p.evaluate(() => { const v = document.querySelectorAll('[class*="Hero_video__"]')[0]; v.currentTime = v.duration - 0.35; });
await new Promise(r => setTimeout(r, 2500));
console.log("after cut:", JSON.stringify(await state(), null, 0));
console.log("video requests:", seen.map(([t, n, s]) => `+${((t - t0) / 1000).toFixed(1)}s ${n} ${s}`).join("  |  "));
await b.close();
