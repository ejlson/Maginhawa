import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5400);
await p.evaluate(()=>document.getElementById('restaurants').scrollIntoView({block:'center'}));await s(900);
await p.screenshot({path:`${OUT}/diag.png`});
const m = await p.evaluate(()=>{
  const big=document.querySelector('#restaurants').querySelectorAll('div');
  const bi=[...document.querySelectorAll('#restaurants *')].find(e=>e.className&&e.className.includes&&getComputedStyle(e).aspectRatio!=='auto');
  const img=document.querySelector('#restaurants img');
  const ov=document.querySelector('#restaurants [class*="overlay"]');
  const r=(el)=>{if(!el)return null;const x=el.getBoundingClientRect();return {top:Math.round(x.top),bottom:Math.round(x.bottom),h:Math.round(x.height)};};
  return {section:r(document.getElementById('restaurants')), image:r(img), overlay:r(ov), vh:window.innerHeight};
});
console.log(JSON.stringify(m,null,1));
await b.close();
