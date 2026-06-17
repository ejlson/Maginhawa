import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5200);
await p.screenshot({path:`${OUT}/v5_hero.png`});
// parallax: cream coming over hero
await p.evaluate(()=>window.scrollTo(0,window.innerHeight*0.5));await s(700);
await p.screenshot({path:`${OUT}/v5_parallax.png`});
// statement full view
await p.evaluate(()=>window.scrollTo(0,window.innerHeight*1.05));await s(800);
await p.screenshot({path:`${OUT}/v5_statement.png`});
// glass menu
await p.evaluate(()=>window.scrollTo(0,window.innerHeight*1.05));await s(200);
await (await p.$('button[aria-label="Open menu"]')).click();await s(800);
await p.screenshot({path:`${OUT}/v5_menu.png`});
await b.close();console.log("done");
