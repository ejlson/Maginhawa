import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
// loader resting word (during flip, before split) + split clearance
await p.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"});await s(2000);
await p.screenshot({path:`${OUT}/v7_word.png`});
// mid-split (check no overlap)
await s(2900); // ~4900ms total, during split
await p.screenshot({path:`${OUT}/v7_split.png`});
// footer + red zone
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5200);
await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await s(1000);
await p.screenshot({path:`${OUT}/v7_footer.png`});
// CTA + contact
await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight*0.8));await s(900);
await p.screenshot({path:`${OUT}/v7_contact.png`});
await b.close();console.log("done");
