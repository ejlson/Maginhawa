import puppeteer from "puppeteer-core";
import fs from "node:fs";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/aa802098-0b1f-49b7-999a-be50025d0648/scratchpad/hero";
fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 6500));
const info = await p.evaluate(() => {
  const nav = document.querySelector("header,nav,[class*='Nav_']");
  const v = document.querySelector("video");
  const vis = el => { const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    return s.opacity !== "0" && s.visibility !== "hidden" && s.display !== "none" && r.width > 0; };
  return {
    navHTML: nav ? nav.outerHTML.replace(/\s+/g," ").slice(0, 700) : "NO NAV FOUND",
    navText: nav ? nav.innerText.replace(/\s+/g," ") : null,
    wordmarkInNav: !!(nav && /maginhawa/i.test(nav.innerText || "")),
    video: v ? { src: (v.currentSrc||"").split("/").pop(), ct:+v.currentTime.toFixed(2),
                 dur:+v.duration.toFixed(2), paused:v.paused, rs:v.readyState } : null,
    ramp: !!document.querySelector("[class*='Hero_ramp__']"),
    grain: !!document.querySelector("[class*='Hero_grain__']"),
    loaderStillMounted: !!document.querySelector("[class*='Loader_overlay__']"),
    heroCopy: (document.querySelector("[class*='Hero_copy__']")||{}).innerText,
  };
});
console.log(JSON.stringify(info, null, 1));
await p.screenshot({ path: `${OUT}/hero-1920.png` });
await b.close();
console.log("\nshot -> " + OUT + "/hero-1920.png");
