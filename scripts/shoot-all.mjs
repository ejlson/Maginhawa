import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"});
// loader: capture flip + progress bar mid-load
await s(1200); await p.screenshot({path:`${OUT}/all_loading.png`});
// settle into hero
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"}); await s(5000);
// open small menu (burger center ~ x=1390,y=24)
await p.mouse.click(1390,24); await s(700);
await p.mouse.move(1300,140); await s(500);
await p.screenshot({path:`${OUT}/all_menu.png`});
await p.mouse.click(1390,24); await s(700);
// dark section nav (transparent, no line) + footer
await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight*0.86));await s(400);
await p.evaluate(()=>window.scrollBy(0,150));await s(700);
await p.screenshot({path:`${OUT}/all_dark.png`});
// footer bottom
await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await s(800);
await p.screenshot({path:`${OUT}/all_footer.png`});
await b.close();console.log("done");
