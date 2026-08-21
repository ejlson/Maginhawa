/* DOES THE VENUE GRID OPEN IN THE ORDER THE READER READS IT?

   Each card's window is scrubbed against its own arrival (Discover.tsx,
   WIPE_FROM), which is a claim that has to hold at EVERY breakpoint, because
   the stylesheet renders the same eight cards at one, two, three and four
   columns. This walks the chapter and prints every card's --wipe at each
   step, plus where the first still-shut card is sitting on screen.

   WHAT A PASS LOOKS LIKE: the wipe values never increase left to right in
   DOM order, and the first unopened card is always somewhere in the lower
   half of the window.

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
console.log("\n  scrollY | --wipe per cell (DOM order) | first UNOPENED cell's top on screen");
for(let y=g.top-g.vh;y<=g.top+g.h;y+=Math.round((g.h+g.vh)/18)){
  await p.evaluate(t=>{const l=window.__lenis;l?l.scrollTo(t,{immediate:true}):scrollTo(0,t)},y);
  await new Promise(r=>setTimeout(r,170));
  const r=await p.evaluate(()=>{
    const cells=[...document.querySelectorAll('[class*="Discover_cell"]')];
    const w=cells.map(c=>{const v=getComputedStyle(c).getPropertyValue("--wipe").trim();return v?Math.round(parseFloat(v)):0});
    const i=w.findIndex(v=>v>2);
    return {w, t:i<0?null:Math.round(cells[i].getBoundingClientRect().top), i};
  });
  console.log(`  ${String(y).padStart(6)}  | ${r.w.map(v=>String(v).padStart(4)).join("")} | ${r.i<0?"— all open":`cell ${r.i} at ${r.t}px`}`);
}
await b.close();
