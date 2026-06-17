import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5200);
await p.evaluate(()=>document.getElementById('restaurants').scrollIntoView());await s(900);
await p.screenshot({path:`${OUT}/l2_default.png`});
// real hover on Mamasons (3 paragraphs) to check selection + image size + 3-col text
const btns = await p.$$('nav[aria-label="Our restaurants"] button');
let box = await btns[2].boundingBox();
await p.mouse.move(box.x+box.width-30, box.y+box.height/2);await s(800);
await p.screenshot({path:`${OUT}/l2_mamasons.png`});
await b.close();console.log("done");
