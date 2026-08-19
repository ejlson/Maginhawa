import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise(r => setTimeout(r, 8000));
console.log(JSON.stringify(await p.evaluate(async () => {
  const sec = document.querySelector('[class*="AboutSplit_section__"]');
  window.scrollTo(0, sec.getBoundingClientRect().top + scrollY + innerHeight * 0.9);
  await new Promise(r => setTimeout(r, 1500));
  const box = e => { const r = e.getBoundingClientRect(); return {x:+r.x.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1)}; };
  const ul = document.querySelector('[class*="AboutSplit_doors__"]');
  const li = [...ul.children];
  return {
    readingBlock: box(document.querySelector('[class*="AboutSplit_readingBlock__"]')),
    ul: box(ul), ulCS: getComputedStyle(ul).display,
    li: li.map(box),
    a: li.map(e => box(e.querySelector('a'))),
    aCS: (({display,flex,minWidth,width}) => ({display,flex,minWidth,width}))(getComputedStyle(li[0].querySelector('a'))),
    frame: li.map(e => box(e.querySelector('span'))),
    frameCS: (({width,display,aspectRatio,position}) => ({width,display,aspectRatio,position}))(getComputedStyle(li[0].querySelector('span'))),
  };
}, null, 1)));
await b.close();
