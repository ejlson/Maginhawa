import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
for (const [w, h] of [[360,780],[390,844]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise(r => setTimeout(r, 8000));
  // walk the whole page so lazy sections mount
  await p.evaluate(async () => {
    const step = innerHeight * 0.8;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120));
    }
    window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 400));
  });
  const r = await p.evaluate((vw) => {
    const out = [];
    for (const el of document.querySelectorAll("*")) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) continue;
      if (b.right > vw + 1 || b.left < -1) {
        const cs = getComputedStyle(el);
        if (cs.position === "fixed") continue;
        out.push({ tag: el.tagName.toLowerCase(), cls: (el.className.baseVal ?? el.className ?? "").toString().slice(0, 70),
          left: +b.left.toFixed(1), right: +b.right.toFixed(1), w: +b.width.toFixed(1),
          overflowX: cs.overflowX, pos: cs.position, tf: cs.transform === "none" ? "" : "tf" });
      }
    }
    return { scrollW: document.documentElement.scrollWidth, vw: innerWidth, offenders: out };
  }, w);
  console.log(`\n════ ${w} ════ scrollW ${r.scrollW} vs ${r.vw}  (${r.offenders.length} boxes past the edge)`);
  // only report ones whose nearest clipping ancestor doesn't hide them: just print top 25
  for (const o of r.offenders.slice(0, 30)) console.log(" ", JSON.stringify(o));
  await p.close();
}
await b.close();
