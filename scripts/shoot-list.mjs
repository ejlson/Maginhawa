import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5200);
await p.evaluate(()=>document.getElementById('restaurants').scrollIntoView());await s(900);
await p.screenshot({path:`${OUT}/list_default.png`});
// hover the 5th name (Guanabana) to select it
await p.evaluate(()=>{const els=document.querySelectorAll('nav[aria-label="Our restaurants"] button'); if(els[4]) els[4].dispatchEvent(new MouseEvent('mouseenter',{bubbles:true}));});
await s(800);
await p.screenshot({path:`${OUT}/list_selected.png`});
await b.close();console.log("done");
