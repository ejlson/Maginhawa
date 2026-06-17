import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5200);
await p.screenshot({path:`${OUT}/v3_hero.png`});
// discover section
await p.evaluate(()=>document.getElementById('restaurants').scrollIntoView());await s(1000);
await p.screenshot({path:`${OUT}/v3_discover1.png`});
// scroll the card column to switch active
await p.evaluate(()=>{const sc=document.querySelector('[data-lenis-prevent]'); sc.scrollBy(0, sc.clientHeight*0.55);});await s(900);
await p.screenshot({path:`${OUT}/v3_discover2.png`});
await b.close();console.log("done");
