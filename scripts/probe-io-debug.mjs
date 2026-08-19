import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 7000));
const out = await p.evaluate(async () => {
  const vids = [...document.querySelectorAll("video")];
  const res = vids.find(v => (v.currentSrc||"").includes("mamasons") && !v.paused);
  if (!res) return { note: "no playing mamasons video found" };
  const r = res.getBoundingClientRect();
  // ask a fresh observer, with the same options, what it thinks
  const seen = await new Promise((resolve) => {
    const io = new IntersectionObserver((es) => { resolve({
      isIntersecting: es[0].isIntersecting, ratio: +es[0].intersectionRatio.toFixed(4),
      rootBounds: es[0].rootBounds && { t: es[0].rootBounds.top, b: es[0].rootBounds.bottom },
      target: { t: Math.round(es[0].boundingClientRect.top), b: Math.round(es[0].boundingClientRect.bottom) },
    }); io.disconnect(); }, { rootMargin: "200px 0px" });
    io.observe(res);
    setTimeout(() => resolve({ note: "observer never fired" }), 2500);
  });
  // walk ancestors for transforms, which move an element's rect but can also
  // change what IO computes against
  const chain = [];
  for (let n = res; n && n !== document.body; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.transform !== "none" || cs.position === "fixed" || cs.willChange !== "auto")
      chain.push(`${String(n.className).slice(0,44)} tf:${cs.transform.slice(0,30)} pos:${cs.position}`);
  }
  return { rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) },
           vh: innerHeight, scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight,
           observed: seen, ancestors: chain.slice(0, 6) };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
