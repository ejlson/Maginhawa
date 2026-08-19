import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/4571a3c0-f3ac-4043-8c7b-dff92615811f/scratchpad";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox","--autoplay-policy=no-user-gesture-required"] });
for (const [w,h] of [[360,780],[390,844],[430,932]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise(r => setTimeout(r, 9000));
  const r = await p.evaluate(async () => {
    const sec = document.querySelector('[class*="Blog_section__"]');
    const y = sec.getBoundingClientRect().top + scrollY;
    for (let s = scrollY; s < y; s += innerHeight*0.5) { window.scrollTo(0,s); await new Promise(r=>setTimeout(r,180)); }
    window.scrollTo(0, y - 20); await new Promise(r=>setTimeout(r,2200));
    const q = s => document.querySelector(s);
    const box = e => { const b = e.getBoundingClientRect(); return {x:+b.x.toFixed(1),y:+b.y.toFixed(1),w:+b.width.toFixed(1),h:+b.height.toFixed(1),right:+b.right.toFixed(1),bottom:+b.bottom.toFixed(1)}; };
    const card = q('[class*="Blog_feature__"]');
    const blk  = q('[class*="Blog_featureBlock__"]');
    const cat  = q('[class*="Blog_category__"]');
    const ttl  = q('[class*="Blog_featureTitle__"]');
    const foot = q('[class*="Blog_featureFoot__"]');
    const meta = q('[class*="Blog_featureMeta__"]');
    const cta  = q('[class*="Blog_featureCta__"]');
    const mr = box(meta), cr = box(cta);
    return { card: box(card), block: box(blk), cat: box(cat), title: box(ttl), foot: box(foot),
      meta: mr, cta: cr,
      metaLines: +(mr.h / parseFloat(getComputedStyle(meta).lineHeight)).toFixed(2),
      metaOverlapsCta: +(mr.right - cr.x).toFixed(1),
      titleLines: Math.round(box(ttl).h / parseFloat(getComputedStyle(ttl).lineHeight)),
      blockOverflowsCard: +(blk.getBoundingClientRect().height - card.getBoundingClientRect().height).toFixed(1),
      metaText: meta.textContent };
  });
  console.log(`\n──── ${w}x${h} ────`);
  console.log(JSON.stringify(r, null, 1));
  await p.screenshot({ path: `${OUT}/feature-${w}.png`, clip: { x: r.card.x - 4, y: r.card.y - 4, width: r.card.w + 8, height: r.card.h + 8 } });
  await p.close();
}
await b.close();
