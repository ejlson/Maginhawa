import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(2500);
const info = await p.evaluate(async ()=>{
  await document.fonts.ready;
  const loaded = [...document.fonts].map(f=>f.family+":"+f.status);
  const has = document.fonts.check('32px "contralto-medium"');
  const linkOk = !!document.querySelector('link[href*="typekit.net/pev2vne"]');
  return {linkOk, has, loaded};
});
console.log(JSON.stringify(info,null,1));
await b.close();
