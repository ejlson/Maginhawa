import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT="/tmp/mgnhw_render";
const s=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle0"});await s(5400);
await p.evaluate(()=>document.getElementById('restaurants').scrollIntoView());await s(900);
await p.screenshot({path:`${OUT}/img_bintang.png`});
const btns = await p.$$('nav[aria-label="Our restaurants"] button');
// Café Mama (idx3, 3 paras) — record list Y to compare shift
const listY = async ()=> p.evaluate(()=>document.querySelectorAll('nav[aria-label="Our restaurants"] button')[0].getBoundingClientRect().top);
const y1 = await listY();
let box = await btns[3].boundingBox(); await p.mouse.move(box.x+box.width-30, box.y+box.height/2); await s(800);
await p.screenshot({path:`${OUT}/img_cafemama.png`});
const y2 = await listY();
console.log("list top Bintang(2para):", Math.round(y1), " CafeMama(3para):", Math.round(y2), " shift:", Math.round(y2-y1));
await b.close();
