import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5000);
// click the real burger button by selector
const btn = await p.$('button[aria-label="Open menu"]');
const box = await btn.boundingBox();
console.log("burger box", JSON.stringify(box));
await btn.click();
await s(800);
// hover the 2nd item to change image
await p.evaluate(()=>{const a=document.querySelectorAll('aside a'); if(a[1]) a[1].dispatchEvent(new MouseEvent('mouseenter',{bubbles:true}));});
await s(500);
await p.screenshot({path:`${OUT}/menu2_open.png`});
// report panel box
const pb = await p.evaluate(()=>{const el=document.querySelector('aside'); const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height};});
console.log("panel box", JSON.stringify(pb));
await b.close();
