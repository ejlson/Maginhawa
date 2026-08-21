/* DOES THE VENUE GRID OPEN IN THE ORDER THE READER READS IT?

   Each card's window is scrubbed against its own arrival (Discover.tsx,
   WIPE_FROM), which is a claim that has to hold at EVERY breakpoint, because
   the stylesheet renders the same eight cards at one, two, three and four


   WHAT THE FAILURE LOOKED LIKE, on the version this replaced: at 390x844 a
   seat computed from a hard-coded four columns put cell 4 ahead of cell 3,
   so the fifth card down opened while the fourth above it was still shut —
   the column reads 100 with a smaller number to its right.

   usage: node scripts/probe-discover-wave.mjs [port] [width] [height]    */
import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W=+(process.argv[3]||390),H=+(process.argv[4]||844);
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",protocolTimeout:300000,
  args:["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1","--autoplay-policy=no-user-gesture-required"]});
const p=await b.newPage(); await p.setViewport({width:W,height:H,isMobile:W<700,hasTouch:W<700});
await p.goto(`http://localhost:${process.argv[2]||3000}/`,{waitUntil:"networkidle2",timeout:90000});
await p.waitForFunction(()=>!document.body.classList.contains("is-loading"),{timeout:40000}).catch(()=>{});
await new Promise(r=>setTimeout(r,1500));
const g=await p.evaluate(()=>{
  const gr=document.querySelector('[class*="Discover_grid"]').getBoundingClientRect();
  const cells=[...document.querySelectorAll('[class*="Discover_cell"]')].map(c=>{
    const r=c.getBoundingClientRect(); return Math.round(r.top+scrollY)});
  return {top:Math.round(gr.top+scrollY),h:Math.round(gr.height),vh:innerHeight,cols:getComputedStyle(document.querySelector('[class*="Discover_grid"]')).gridTemplateColumns,cells};
});
console.log(`${W}x${H} grid ${g.top} h ${g.h} vh ${g.vh}\n  columns: ${g.cols}\n  cell doc tops: ${g.cells.join(" ")}`);
console.log("\n  scrollY | cell ink %% (DOM order) | first UN-INKED cell's top on screen");
for(let y=g.top-g.vh;y<=g.top+g.h;y+=Math.round((g.h+g.vh)/18)){
  await p.evaluate(t=>{const l=window.__lenis;l?l.scrollTo(t,{immediate:true}):scrollTo(0,t)},y);
  await new Promise(r=>setTimeout(r,170));
  const r=await p.evaluate(()=>{
    const cells=[...document.querySelectorAll('[class*="Discover_cell"]')];
    const seats=[...document.querySelectorAll("[data-plate]")];
    const w=cells.map(c=>Math.round(100*(+getComputedStyle(c).opacity)));
    const st=seats[0]?.style;
    const i=w.findIndex(v=>v<98);
    return {w, pe:(st&&st.getPropertyValue("--photo-enter").slice(0,6))||"-",
      t:i<0?null:Math.round(cells[i].getBoundingClientRect().top), i};
  });
  console.log(`  ${String(y).padStart(6)}  | ${r.w.map(v=>String(v).padStart(4)).join("")} | enter ${r.pe} | ${r.i<0?"— all inked":`cell ${r.i} at ${r.t}px`}`);
}
await b.close();
