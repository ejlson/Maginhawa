import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
// loader resting word
await p.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"});await s(2000);
await p.screenshot({path:`${OUT}/v9_word.png`});
// statement descenders + open menu (smaller X)
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5200);
await p.evaluate(()=>window.scrollTo(0,window.innerHeight*1.05));await s(900);
await p.screenshot({path:`${OUT}/v9_statement.png`});
await (await p.$('button[aria-label="Open menu"]')).click();await s(800);
await p.screenshot({path:`${OUT}/v9_menu.png`});
// CTA 3-4 lines
await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight-1700));await s(900);
await p.screenshot({path:`${OUT}/v9_cta.png`});
await b.close();console.log("done");
