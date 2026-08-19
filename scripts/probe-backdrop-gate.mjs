/* The gate must pause what is offscreen AND start it before the reader
   arrives. Checks both ends, plus that it pauses again on the way back up. */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 6500));

const read = () => p.evaluate(() => {
  const v = [...document.querySelectorAll("video")].find(x => String(x.className).includes("locVideo"));
  const r = v.getBoundingClientRect();
  return { paused: v.paused, ct: +v.currentTime.toFixed(2),
           top: Math.round(r.top), onScreen: r.bottom > 0 && r.top < innerHeight };
});
const jump = (y) => p.evaluate((y) => { window.scrollTo(0, y); }, y);

console.log("at the hero:            ", JSON.stringify(await read()));
// land it just above the band, inside the 200px rootMargin
const y = await p.evaluate(() => {
  const v = [...document.querySelectorAll("video")].find(x => String(x.className).includes("locVideo"));
  return v.getBoundingClientRect().top + scrollY - innerHeight - 100;
});
await jump(y); await new Promise(r => setTimeout(r, 1200));
console.log("100px before it arrives:", JSON.stringify(await read()));
await jump(y + 1200); await new Promise(r => setTimeout(r, 1500));
console.log("band in view:           ", JSON.stringify(await read()));
await jump(0); await new Promise(r => setTimeout(r, 1500));
console.log("scrolled back to hero:  ", JSON.stringify(await read()));
await b.close();
