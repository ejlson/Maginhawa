import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
for (const [w, h] of [[1920,1080],[1440,900],[1728,1117]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 7000));            // let the intro finish
  const r = await p.evaluate(() => {
    const pick = s => document.querySelector(s);
    const box = e => { if (!e) return null; const b = e.getBoundingClientRect();
      return { x:+b.x.toFixed(1), y:+b.y.toFixed(1), w:+b.width.toFixed(1), h:+b.height.toFixed(1),
               bottom:+b.bottom.toFixed(1), right:+b.right.toFixed(1) }; };
    const mark = pick('[class*="Hero_mark__"]');
    const lock = pick('[class*="Hero_lockup__"]');
    const copy = pick('[class*="Hero_copy__"]');
    const cs = mark && getComputedStyle(mark);
    return {
      vh: innerHeight, vw: innerWidth,
      mark: box(mark), lockup: box(lock), copy: box(copy),
      markFont: cs && cs.fontSize, markLH: cs && cs.lineHeight,
      markFamily: cs && cs.fontFamily.split(",")[0],
      lockupDisplay: lock && getComputedStyle(lock).display,
      lockupTransform: lock && getComputedStyle(lock).transform,
      docScrollH: document.documentElement.scrollHeight,
      bodyOverflowX: document.documentElement.scrollWidth > innerWidth,
    };
  });
  const clipped = r.mark ? (r.mark.bottom > r.vh + 0.5 || r.mark.right > r.vw + 0.5 || r.mark.x < -0.5) : null;
  console.log(`\n── ${w}x${h} ──`);
  console.log(`  mark   ${JSON.stringify(r.mark)}`);
  console.log(`  font   ${r.markFont} / lh ${r.markLH} / ${r.markFamily}`);
  console.log(`  lockup ${JSON.stringify(r.lockup)}  display:${r.lockupDisplay} tf:${r.lockupTransform}`);
  console.log(`  copy   ${JSON.stringify(r.copy)}`);
  console.log(`  mark overflows viewport: ${clipped}   horiz page scroll: ${r.bodyOverflowX}`);
  if (r.mark) console.log(`  gap mark.bottom -> viewport bottom: ${(r.vh - r.mark.bottom).toFixed(1)}px`);
  await p.close();
}
await b.close();
