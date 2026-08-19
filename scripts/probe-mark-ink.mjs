import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 7000));
console.log(JSON.stringify(await p.evaluate(() => {
  const mark = document.querySelector('[class*="Hero_mark__"]');
  const cs = getComputedStyle(mark);
  const rng = document.createRange();
  rng.selectNodeContents(mark);
  const ink = rng.getBoundingClientRect();
  return {
    family: cs.fontFamily, fontSize: cs.fontSize, tracking: cs.letterSpacing,
    inkW: +ink.width.toFixed(2), inkH: +ink.height.toFixed(2),
    ratio: +(ink.width / parseFloat(cs.fontSize)).toFixed(4),
    fontsReady: document.fonts.check(`${cs.fontSize} ${cs.fontFamily}`),
    loaded: [...document.fonts].filter(f=>f.status==="loaded").map(f=>f.family).filter((v,i,a)=>a.indexOf(v)===i),
  };
}), null, 1));
await b.close();
