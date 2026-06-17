import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5200);
// position so the end of the statement + start of discover are both visible
const top = await p.evaluate(()=>{ const el=document.getElementById('restaurants'); return el.getBoundingClientRect().top + window.scrollY; });
await p.evaluate((t)=>window.scrollTo(0, t-520), top);await s(900);
await p.screenshot({path:`${OUT}/gap.png`});
await b.close();console.log("done");
