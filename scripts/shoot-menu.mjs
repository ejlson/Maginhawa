import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});
await s(4200); // past intro
await p.screenshot({path:`${OUT}/mn_hero.png`});
// open menu via burger (top-right)
await p.mouse.click(1410,28);
await s(900);
// hover an item (Restaurants is 2nd)
await p.mouse.move(200,430);await s(600);
await p.screenshot({path:`${OUT}/mn_open.png`});
// close menu
await p.mouse.click(1410,28);await s(900);
// scroll to discover (light) - nav over light
await p.evaluate(()=>window.scrollTo(0,window.innerHeight*1.2));await s(400);
await p.evaluate(()=>window.scrollBy(0,300));await s(700);
await p.screenshot({path:`${OUT}/mn_light.png`});
// restaurant locations fullscreen — scroll so it fills viewport
await p.evaluate(()=>{const el=document.querySelectorAll('section')[2]; el&&el.scrollIntoView();});await s(900);
await p.screenshot({path:`${OUT}/mn_locations.png`});
// dark section (contact): scroll near bottom
await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight*0.82));await s(400);
await p.evaluate(()=>window.scrollBy(0,200));await s(700);
await p.screenshot({path:`${OUT}/mn_dark.png`});
await b.close();console.log("done");
