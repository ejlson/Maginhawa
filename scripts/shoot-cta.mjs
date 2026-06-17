import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5200);
// scroll the CTA button into view (after discover, before locations)
await p.evaluate(()=>{const a=document.querySelector('a[href="/restaurants"]'); a&&a.scrollIntoView({block:'center'});});await s(800);
await p.screenshot({path:`${OUT}/cta_default.png`});
// hover it
const a = await p.$('a[href="/restaurants"]');
const box = await a.boundingBox();
await p.mouse.move(box.x+box.width*0.35, box.y+box.height/2);
await s(650);
await p.screenshot({path:`${OUT}/cta_hover.png`});
// the restaurants page
const p2 = await b.newPage();await p2.setViewport({width:1440,height:900});
await p2.goto("http://localhost:3000/restaurants",{waitUntil:"networkidle0"});await s(800);
await p2.screenshot({path:`${OUT}/restaurants_page.png`});
await b.close();console.log("done");
