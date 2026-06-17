import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"});
await s(4200);
await p.screenshot({path:`${OUT}/nav_hero.png`});
// go past hero, scroll down so nav shows + solid
await p.evaluate(()=>window.scrollTo(0,window.innerHeight*1.4));await s(400);
await p.evaluate(()=>window.scrollBy(0,400));await s(800);
await p.screenshot({path:`${OUT}/nav_solid.png`});
await b.close();console.log("done");
