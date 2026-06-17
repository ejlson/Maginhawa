import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5200);
// footer (full screen at bottom)
await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await s(1000);
await p.screenshot({path:`${OUT}/v8_footer.png`});
// CTA centered 3-4 lines + top line split (scroll up a bit from bottom)
await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight-1700));await s(900);
await p.screenshot({path:`${OUT}/v8_cta.png`});
// burger size (hero) + open menu
await p.evaluate(()=>window.scrollTo(0,0));await s(600);
await p.screenshot({path:`${OUT}/v8_hero.png`});
await b.close();console.log("done");
