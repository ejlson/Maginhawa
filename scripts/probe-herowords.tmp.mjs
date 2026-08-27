import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE || "http://localhost:3001";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1"] });
const page = await b.newPage();
await page.setViewport({ width:390, height:844, deviceScaleFactor:2 });

await page.goto(BASE + "/contact", { waitUntil:"networkidle2" });
await page.evaluate(()=>document.fonts.ready);
await new Promise(r=>setTimeout(r,3000));
const rev = await page.evaluate(() => {
  const sec = document.querySelector('#leave-a-review');
  const q = s => sec.querySelector(s);
  const box = e => { if(!e) return null; const r=e.getBoundingClientRect(); return {y:Math.round(r.y),h:Math.round(r.height),x:Math.round(r.x),w:Math.round(r.width)}; };
  const cs = (e,p) => e?getComputedStyle(e)[p]:null;
  const items=[...sec.querySelectorAll('li')];
  const first=items[0]?.querySelector('a');
  return {
    sectionPadTop: cs(sec,'paddingTop'), sectionPadBot: cs(sec,'paddingBottom'),
    title: box(sec.querySelector('h2')), titleFs: cs(sec.querySelector('h2'),'fontSize'),
    headMarginBottom: cs(sec.querySelector('[class*="head"]'),'marginBottom'),
    grid: box(sec.querySelector('ul')),
    itemCount: items.length,
    itemPad: cs(first,'padding'), itemGap: cs(first,'gap'),
    itemH: items.map(li=>Math.round(li.getBoundingClientRect().height)),
    nameFs: cs(first?.querySelector('[class*="itemName"]'),'fontSize'),
    tagFs: cs(first?.querySelector('[class*="itemTag"]'),'fontSize'),
    ctaFs: cs(first?.querySelector('[class*="itemCta"]'),'fontSize'),
    mainGap: cs(first?.querySelector('[class*="itemMain"]'),'gap'),
    gridCols: cs(sec.querySelector('ul'),'gridTemplateColumns'),
  };
});
console.log("REVIEW", JSON.stringify(rev,null,1));

await page.goto(BASE + "/careers", { waitUntil:"networkidle2" });
await page.evaluate(()=>document.fonts.ready);
await new Promise(r=>setTimeout(r,5000));
await page.evaluate(()=>{ const el=document.querySelector('[class*="reasons"]'); el.scrollIntoView({block:'center'}); });
await new Promise(r=>setTimeout(r,2000));
const pill = await page.evaluate(() => {
  const ul = document.querySelector('[class*="reasons"]');
  const cs = (e,p)=>e?getComputedStyle(e)[p]:null;
  const li = [...ul.querySelectorAll('li')];
  const r0 = li[0];
  return {
    cols: cs(ul,'gridTemplateColumns'), gap: cs(ul,'gap'), pad: cs(ul,'padding'),
    ulH: Math.round(ul.getBoundingClientRect().height), ulW: Math.round(ul.getBoundingClientRect().width),
    colW: li.map(x=>Math.round(x.getBoundingClientRect().width)),
    colH: li.map(x=>Math.round(x.getBoundingClientRect().height)),
    markFs: cs(r0.querySelector('[class*="reasonMark"]'),'fontSize'),
    titleFs: cs(r0.querySelector('[class*="reasonTitle"]'),'fontSize'),
    bodyFs: cs(r0.querySelector('[class*="reasonBody"]'),'fontSize'),
    bodyLh: cs(r0.querySelector('[class*="reasonBody"]'),'lineHeight'),
    bodyLines: li.map(x=>{const p=x.querySelector('[class*="reasonBody"]'); return Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight));}),
    hyphens: cs(r0.querySelector('[class*="reasonBody"]'),'hyphens'),
  };
});
console.log("PILLARS", JSON.stringify(pill,null,1));
await b.close();
