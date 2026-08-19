import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1"] });
const page = await b.newPage();
await page.evaluateOnNewDocument(() => {
  window.__pass = {
    sec: () => document.querySelector('[class*="Passage_section"]'),
    lineA: () => document.querySelector('[class*="Passage_lineA"]'),
    ink: () => document.querySelector('[class*="Passage_ink"]'),
    band() { const r = this.sec().getBoundingClientRect(); return { top: r.top + scrollY, h: r.height, vh: innerHeight }; },
    yFor(p) { const { top, h, vh } = this.band(); return (top - vh) + p * (h + vh / 2); },
  };
});
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://localhost:50279/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 90000 });
await page.evaluate(() => document.fonts.ready);
await new Promise(r=>setTimeout(r,700));
console.log("before seat:", await page.evaluate(() => ({ pass: !!window.__pass, sec: !!window.__pass?.sec(), line: !!window.__pass?.lineA(), ink: !!window.__pass?.ink(), y: window.__pass?.yFor(0.75) })));
await page.evaluate((v) => { const l = window.__lenis; if (l) l.scrollTo(v, { immediate: true, force: true }); else window.scrollTo(0, v); }, await page.evaluate(()=>window.__pass.yFor(0.75)));
await new Promise(r=>setTimeout(r,1800));
console.log("after seat:", await page.evaluate(() => ({ pass: !!window.__pass, sec: !!window.__pass?.sec(), line: !!window.__pass?.lineA(), ink: !!window.__pass?.ink(), sy: scrollY })));
await b.close();
