import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
for (const [w, h] of [[360,780],[390,844],[430,932],[768,1024],[900,1200]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 7000));
  const r = await p.evaluate(() => {
    const pick = s => document.querySelector(s);
    const box = e => { if (!e) return null; const b = e.getBoundingClientRect();
      return { x:+b.x.toFixed(1), y:+b.y.toFixed(1), w:+b.width.toFixed(1), h:+b.height.toFixed(1),
               bottom:+b.bottom.toFixed(1), right:+b.right.toFixed(1) }; };
    const ink = e => { const r = document.createRange(); r.selectNodeContents(e);
      const b = r.getBoundingClientRect(); return { x:+b.x.toFixed(1), w:+b.width.toFixed(1), right:+b.right.toFixed(1) }; };
    const mark = pick('[class*="Hero_mark__"]');
    const copy = pick('[class*="Hero_copy__"]');
    const sent = pick('[class*="Hero_sentence__"]');
    const cta  = pick('[class*="Hero_cta__"]');
    const lock = pick('[class*="Hero_lockup__"]');
    return { vw: innerWidth, vh: innerHeight,
      padX: getComputedStyle(pick('[class*="Hero_lockup__"]')).paddingLeft,
      markFont: getComputedStyle(mark).fontSize,
      markBox: box(mark), markInk: ink(mark),
      copy: box(copy), sentence: box(sent), cta: box(cta), lockup: box(lock),
      scrollW: document.documentElement.scrollWidth };
  });
  const pad = parseFloat(r.padX);
  console.log(`\n──── ${w}x${h} ────  padX ${r.padX}  mark ${r.markFont}`);
  console.log(`  mark ink   x${r.markInk.x} w${r.markInk.w} right${r.markInk.right}   (measure ${(r.vw-2*pad).toFixed(1)})  fills ${(100*r.markInk.w/(r.vw-2*pad)).toFixed(1)}%`);
  console.log(`  sentence   x${r.sentence.x} w${r.sentence.w} right${r.sentence.right}`);
  console.log(`  cta        x${r.cta.x} w${r.cta.w} right${r.cta.right}   (gap to right margin ${(r.vw-pad-r.cta.right).toFixed(1)})`);
  console.log(`  lockup bottom ${r.lockup.bottom} / vh ${r.vh}   cta->floor ${(r.vh-r.cta.bottom).toFixed(1)}`);
  console.log(`  horiz overflow: ${r.scrollW > r.vw}  (scrollW ${r.scrollW})`);
  await p.close();
}
await b.close();
