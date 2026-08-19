/* WHO CALLS play()? Patch HTMLMediaElement.prototype.play before any app code
   runs and record a stack for every call, plus every native 'play' event. */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await p.evaluateOnNewDocument(() => {
  window.__PLAYS = [];
  const orig = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if ((this.currentSrc || this.src || "").includes("mamasons"))
      window.__PLAYS.push({ kind: "play() call", cls: String(this.className).slice(0, 50),
        stack: (new Error().stack || "").split("\n").slice(1, 7).join(" | ") });
    return orig.apply(this, arguments);
  };
  addEventListener("play", (e) => {
    const t = e.target;
    if ((t.currentSrc || "").includes("mamasons"))
      window.__PLAYS.push({ kind: "play EVENT", cls: String(t.className).slice(0, 50),
        autoplayAttr: t.hasAttribute("autoplay"), stack: "(native)" });
  }, true);
});
await p.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 7000));
const plays = await p.evaluate(() => window.__PLAYS);
console.log(`${plays.length} play events on mamasons:\n`);
plays.forEach((x, i) => {
  console.log(`  [${i}] ${x.kind}  class="${x.cls}"` + (x.autoplayAttr !== undefined ? ` autoplayAttr=${x.autoplayAttr}` : ""));
  if (x.stack !== "(native)") console.log(`       ${x.stack.replace(/https?:\/\/localhost:3000/g, "")}`);
});
await b.close();
