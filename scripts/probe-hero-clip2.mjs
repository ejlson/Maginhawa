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
// jump the first clip to its last half-second so `ended` fires and the hero advances
await p.evaluate(() => { const v = document.querySelector("video"); v.currentTime = v.duration - 0.4; });
await new Promise(r => setTimeout(r, 2500));
const readAll = () => p.evaluate(() => [...document.querySelectorAll("video")].map((v,i) => ({
  i, src:(v.currentSrc||"").split("/").pop(), ct:+v.currentTime.toFixed(2),
  dur:+(v.duration||0).toFixed(2), paused:v.paused,
  visible:getComputedStyle(v).visibility })));
const s1 = await readAll();
console.log("just after the switch:", JSON.stringify(s1));
await p.screenshot({ path: `${OUT}/hero-clip2-early.png` });
await new Promise(r => setTimeout(r, 5000));
const s2 = await readAll();
console.log("5s into clip 2:      ", JSON.stringify(s2));
await p.screenshot({ path: `${OUT}/hero-clip2-later.png` });
await b.close();
