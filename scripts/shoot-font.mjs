import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
// settled loader letters in Contralto
await p.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"});await s(4600);
await p.screenshot({path:`${OUT}/cf_loader.png`});
// hero + discover
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5200);
await p.screenshot({path:`${OUT}/cf_hero.png`});
await p.evaluate(()=>window.scrollTo(0,window.innerHeight*1.25));await s(900);
await p.screenshot({path:`${OUT}/cf_discover.png`});
await b.close();console.log("done");
