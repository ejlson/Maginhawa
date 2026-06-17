import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5400);
// scroll so the section top is at viewport top (list near top of image)
const top = await p.evaluate(()=>document.getElementById('restaurants').getBoundingClientRect().top + window.scrollY);
await p.evaluate(t=>window.scrollTo(0,t), top);await s(700);
await p.screenshot({path:`${OUT}/f3_listtop.png`});
// trigger a switch, capture mid-wipe to see title wiping with image
const btns = await p.$$('nav[aria-label="Our restaurants"] button');
let box = await btns[4].boundingBox(); // Guanabana
await p.mouse.click(box.x+box.width-30, box.y+box.height/2); await s(180);
await p.screenshot({path:`${OUT}/f3_titlewipe.png`});
// scroll down within the section → list should drift down
await p.evaluate(t=>window.scrollTo(0,t+500), top);await s(700);
await p.screenshot({path:`${OUT}/f3_listdown.png`});
await b.close();console.log("done");
