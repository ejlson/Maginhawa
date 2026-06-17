import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
// warm
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await p.goto("about:blank");
await p.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"});
// wait for lock+reveal start, then capture the morph closely
let last=0;
for(const m of [4500,4750,5000,5300,5700,6300]){await s(m-last);last=m;await p.screenshot({path:`${OUT}/mo_${m}.png`});}
await b.close();console.log("done");
