import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
p.on('response',r=>{ if(r.status()===404) console.log("404:", r.url()); });
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(3000);
await b.close();
