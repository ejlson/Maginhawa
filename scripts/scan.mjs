import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5000);
await (await p.$('button[aria-label="Open menu"]')).click(); await s(800);
const reds = await p.evaluate(()=>{
  const out=[];
  document.querySelectorAll('*').forEach(el=>{
    const c=getComputedStyle(el);
    const props=[c.backgroundColor,c.borderTopColor,c.outlineColor,c.color];
    if(props.some(v=>/rgb\(2[0-9][0-9],\s*[0-5]?[0-9],/.test(v) && !v.includes('243'))){
      out.push(el.tagName+'.'+el.className+' => bg:'+c.backgroundColor+' border:'+c.borderTopColor+' outline:'+c.outlineColor);
    }
  });
  return out.slice(0,10);
});
console.log("RED-ish elements:", JSON.stringify(reds,null,1));
await b.close();
