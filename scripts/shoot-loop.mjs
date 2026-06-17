import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5200);
await p.evaluate(()=>document.getElementById('restaurants').scrollIntoView());await s(1000);
await p.screenshot({path:`${OUT}/loop_0.png`});
// scroll the cards a LOT (past one full set) to test wrap
for(let k=0;k<10;k++){ await p.evaluate(()=>{const sc=document.querySelector('[data-lenis-prevent]'); sc.scrollBy(0, sc.clientHeight*0.6);}); await s(250); }
await s(600);
await p.screenshot({path:`${OUT}/loop_far.png`});
// report scroll position vs scrollHeight to confirm wrap kept it bounded
const info = await p.evaluate(()=>{const sc=document.querySelector('[data-lenis-prevent]'); return {top:Math.round(sc.scrollTop), h:Math.round(sc.scrollHeight), client:Math.round(sc.clientHeight)};});
console.log("scroller", JSON.stringify(info));
await b.close();console.log("done");
