import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise(r => setTimeout(r, 10000));
console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("video")].map(v => ({
  src: v.src.split("/").pop().slice(0,28), attrPreload: v.getAttribute("preload"), prop: v.preload,
  net: v.networkState, ready: v.readyState,
  buf: v.buffered.length ? +v.buffered.end(v.buffered.length-1).toFixed(1) : 0,
  top: +v.getBoundingClientRect().top.toFixed(0),
  cls: (v.className||"").slice(0,40),
}))), null, 1));
await b.close();
