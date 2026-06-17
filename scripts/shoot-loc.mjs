import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5200);
// find the locations section (the one with the heading)
const top = await p.evaluate(()=>{
  const secs=[...document.querySelectorAll('section')];
  const el=secs.find(s=>/RESTAURANT LOCATIONS/i.test(s.textContent||""));
  return el ? el.getBoundingClientRect().top + window.scrollY : 0;
});
// mid-entry (curtain partly open)
await p.evaluate(t=>window.scrollTo(0, t-560), top);await s(700);
await p.screenshot({path:`${OUT}/loc_entering.png`});
// fully in view (curtain open)
await p.evaluate(t=>window.scrollTo(0, t-40), top);await s(700);
await p.screenshot({path:`${OUT}/loc_open.png`});
await b.close();console.log("done");
