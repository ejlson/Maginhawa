/* IS THE MOBILE HOME PAGE'S FRAME COST THE TYPE CHANGE OR THE FILM?
   probe-type-routes.mjs found 55 frames over 32ms and a 767ms spike on / at
   390x844, and nowhere else. The type collapse REMOVED two downloaded font
   families and added none, so it is a poor suspect — but "poor suspect" is
   not evidence. This runs the same reader-paced scroll twice, once normally
   and once with every video request aborted, and compares.
   usage: node scripts/probe-type-mobilehome.mjs [port]                    */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1","--enable-gpu"] });

const run = async (label, killVideo) => {
  const page = await b.newPage();
  await page.setViewport({ width: 390, height: 844 });
  if (killVideo) await page.setRequestInterception(true);
  if (killVideo) page.on("request", (r) => (/\.(mp4|webm|mov)(\?|$)/i.test(r.url()) ? r.abort() : r.continue()));
  await page.goto("http://localhost:3220/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 }).catch(()=>{});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1800);
  await page.evaluate(() => { window.__f=[]; let l=performance.now();
    const t=(x)=>{window.__f.push({d:x-l,y:window.scrollY}); l=x; window.__r=requestAnimationFrame(t);};
    window.__r=requestAnimationFrame(t); });
  const docH = await page.evaluate(()=>document.documentElement.scrollHeight);
  for (let i=0;i<=40;i++){
    await page.evaluate((v)=>{ if(window.__lenis) window.__lenis.scrollTo(v,{duration:0.35}); else window.scrollTo(0,v); }, Math.round((docH-844)*i/40));
    await sleep(230);
  }
  const r = await page.evaluate(()=>{ cancelAnimationFrame(window.__r);
    const f=window.__f.filter(o=>o.d>0&&o.d<3000);
    const ds=f.map(o=>o.d).sort((a,b)=>a-b);
    const at=(q)=>ds[Math.min(ds.length-1,Math.floor(ds.length*q))];
    return { n:ds.length, p95:+at(0.95).toFixed(1), p99:+at(0.99).toFixed(1), max:+ds[ds.length-1].toFixed(1),
      over32:ds.filter(x=>x>32).length,
      worstSpots: f.filter(o=>o.d>32).slice(0,8).map(o=>({ms:+o.d.toFixed(0),y:o.y})) };
  });
  console.log(label.padEnd(22), JSON.stringify(r));
  await page.close();
};
await run("mobile / WITH video", false);
await run("mobile / NO video", true);
await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
