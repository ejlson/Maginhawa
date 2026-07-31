import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5000);
// menu open (focus fix should remove red)
await (await p.$('button[aria-label="Open menu"]')).click(); await s(800);
await p.screenshot({path:`${OUT}/fin_menu.png`});
// close it (slides back out)
await (await p.$('button[aria-label="Close menu"]')).click(); await s(800);
// reservations film fullscreen — section index 2
await p.evaluate(()=>document.querySelectorAll('section')[2].scrollIntoView());await s(900);
await p.screenshot({path:`${OUT}/fin_book.png`});
await b.close();console.log("done");
