import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
// warm up first
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});
await p.goto("about:blank");
// now timed capture from a warm navigation
await p.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"});
let last=0;
for(const m of [300,600,1000,1400]){await s(m-last);last=m;await p.screenshot({path:`${OUT}/flip2_${m}.png`});}
// settled landed state (just before split)
await s(1500-last);last=1500;await p.screenshot({path:`${OUT}/flip2_landed.png`});
await b.close();console.log("done");
