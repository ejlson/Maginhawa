import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5400);
await p.evaluate(()=>document.getElementById('restaurants').scrollIntoView());await s(900);
await p.screenshot({path:`${OUT}/gold_default.png`});
// trigger a switch and capture mid-wipe (~250ms into 700ms)
const btns = await p.$$('nav[aria-label="Our restaurants"] button');
let box = await btns[4].boundingBox(); // Guanabana
await p.mouse.move(box.x+box.width-30, box.y+box.height/2); await s(260);
await p.screenshot({path:`${OUT}/gold_wipe.png`});
await s(700);
await p.screenshot({path:`${OUT}/gold_after.png`});
await b.close();console.log("done");
