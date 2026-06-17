import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5400);
await p.evaluate(()=>document.getElementById('restaurants').scrollIntoView());await s(900);
const btns = await p.$$('nav[aria-label="Our restaurants"] button');
// click Hoodwood (idx6) — discrete trigger
let box = await btns[6].boundingBox();
await p.mouse.click(box.x+box.width-30, box.y+box.height/2);
await s(120); await p.screenshot({path:`${OUT}/w_120.png`});
await s(180); await p.screenshot({path:`${OUT}/w_300.png`});
await s(250); await p.screenshot({path:`${OUT}/w_550.png`});
await b.close();console.log("done");
