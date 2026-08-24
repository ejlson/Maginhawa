/* Cream type on the pinned film, measured on the GLYPH CORE.

   The redesign moved every line on this page, so the scrim that was tuned for
   the retired layout has to be re-checked against the new positions: OUR STORY
   at display scale, the chapter year/title/body at 13-52px, and the founder's
   name and columns. The film is stepped through its own duration so the worst
   frame is found rather than assumed.

   Method is probe-timeline-contrast.mjs's, unchanged: hide the type, diff the
   two frames, keep the pixels whose change is in the top decile (full glyph
   coverage, no anti-aliased rim dragging the ratio down).

   usage: node scripts/probe-about-onfilm.mjs [port]                        */
import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT=process.argv[2]||"3000";
const TARGETS=[
  ["dateline","storyDateline",4.5],
  ["OUR STORY","storyTitle",3.0],
  ["standfirst","storyStandfirst",4.5],
  ["chapter year","chapterYear",3.0],
  ["chapter title","chapterTitle",3.0],
  ["chapter body","chapterBody",4.5],
  ["founder name","ownerName",3.0],
  ["founder copy","ownerCols",4.5],
];
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",protocolTimeout:240000,
  args:["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1","--autoplay-policy=no-user-gesture-required"]});
const sb=await puppeteer.launch({executablePath:CHROME,headless:"new",protocolTimeout:240000,args:["--no-sandbox"]});
const scratch=await sb.newPage(); await scratch.setContent("<canvas>");
const page=await b.newPage(); await page.setViewport({width:1440,height:900});
const lum=(r,g,bl)=>{const f=v=>((v/=255),v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));return .2126*f(r)+.7152*f(g)+.0722*f(bl)};
const ratio=(a,c)=>{const[h,l]=a>c?[a,c]:[c,a];return (h+.05)/(l+.05)};
async function sample(clip,css){
  const A=await page.screenshot({clip,captureBeyondViewport:false,encoding:"base64"});
  await page.addStyleTag({content:css}); await new Promise(r=>setTimeout(r,220));
  const B=await page.screenshot({clip,captureBeyondViewport:false,encoding:"base64"});
  await page.evaluate(c=>document.querySelectorAll("style").forEach(s=>{if(s.textContent===c)s.remove()}),css);
  await new Promise(r=>setTimeout(r,220));
  const out=await scratch.evaluate(async(a,bb)=>{
    const draw=async b64=>{const i=new Image();i.src="data:image/png;base64,"+b64;await i.decode();
      const c=document.createElement("canvas");c.width=i.width;c.height=i.height;
      const g=c.getContext("2d",{willReadFrequently:true});g.drawImage(i,0,0);
      return g.getImageData(0,0,i.width,i.height).data};
    const A=await draw(a),B=await draw(bb);const px=[];
    for(let i=0;i<A.length;i+=4){const d=Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2]);
      if(d>14)px.push([d,A[i],A[i+1],A[i+2],B[i],B[i+1],B[i+2]])}
    if(!px.length)return null;px.sort((x,y)=>y[0]-x[0]);
    const core=px.slice(0,Math.max(1,Math.round(px.length*0.1)));
    const mean=(r,o)=>r.reduce((s,x)=>s+x[o],0)/r.length;
    return{coreInk:[mean(core,1),mean(core,2),mean(core,3)].map(Math.round),
           coreGnd:[mean(core,4),mean(core,5),mean(core,6)].map(Math.round)}},A,B);
  await page.bringToFront(); return out;
}
await page.goto(`http://localhost:${PORT}/about`,{waitUntil:"networkidle2"});
await page.waitForFunction(()=>!document.body.classList.contains("is-loading"),{timeout:30000}).catch(()=>{});
/* THE BACKDROP, NOT WHATEVER <video> IS FIRST IN THE DOM. The hero gained its
   own portrait clip, so `document.querySelector("video")` started returning
   that one — the probe then seeked a film nobody was measuring against while
   the backdrop ran free, and every sample diffed two frames of MOVING footage
   rather than type against a held frame. The ink it reported was a motion
   blend, not a glyph. Address the backdrop by its class, and pause every video
   on the page so nothing else moves between the two screenshots. */
const FILM = '[class*=heroVideo]';
await page.waitForFunction((sel)=>{const v=document.querySelector(sel);return v&&v.readyState>=2&&isFinite(v.duration)},{timeout:45000},FILM).catch(()=>{});
await page.evaluate(()=>document.querySelectorAll("video").forEach(v=>v.pause()));
const dur=await page.evaluate((sel)=>document.querySelector(sel).duration, FILM);
const TIMES=[0.02,0.25,0.5,0.75,0.97].map(f=>+(f*dur).toFixed(2));
const rows=[];
for(const [label,cls,bar] of TARGETS){
  await page.evaluate(c=>{const e=document.querySelector(`[class*=${c}]`);
    if(e) window.scrollTo(0, e.getBoundingClientRect().top+scrollY-320);},cls);
  await new Promise(r=>setTimeout(r,1300));
  for(const t of TIMES){
    await page.evaluate(`(()=>{document.querySelectorAll('video').forEach(x=>x.pause());
      const v=document.querySelector('${FILM}');v.currentTime=${t};
      return new Promise(r=>{const d=()=>r(1);v.addEventListener('seeked',d,{once:true});setTimeout(d,2500)})})()`);
    await new Promise(r=>setTimeout(r,380));
    const clip=await page.evaluate(c=>{const e=document.querySelector(`[class*=${c}]`);if(!e)return null;
      const b=e.getBoundingClientRect();
      if(b.top<0||b.bottom>innerHeight||b.left<0||b.right>innerWidth||b.width<8||b.height<8)return null;
      return{x:Math.round(b.x+scrollX),y:Math.round(b.y+scrollY),width:Math.round(b.width),height:Math.round(b.height)};},cls);
    if(!clip)continue;
    const s=await sample(clip,`[class*=${cls}]{visibility:hidden !important}`);
    if(!s)continue;
    rows.push({label,bar,t,core:ratio(lum(...s.coreInk),lum(...s.coreGnd)),ink:s.coreInk,gnd:s.coreGnd});
  }
}
await page.evaluate(()=>document.querySelectorAll("video").forEach(v=>v.play().catch(()=>{})));
console.log("\n═══ CREAM TYPE ON THE FILM ═══");
let fails=0;
for(const [label,,bar] of TARGETS){
  const R=rows.filter(r=>r.label===label);
  if(!R.length){console.log(`  ----  ${label} — no samples in view`);continue}
  const w=R.slice().sort((a,c)=>a.core-c.core)[0];
  const ok=w.core>=bar; if(!ok)fails++;
  console.log(`  ${ok?"PASS":"FAIL"}  ${label.padEnd(14)} bar ${bar}  worst ${w.core.toFixed(2)}:1  (t=${w.t}s, ink rgb(${w.ink}) on rgb(${w.gnd}), ${R.length} samples)`);
}
console.log(fails?`\n${fails} FAILING`:"\nAll lines clear their bar at every sampled frame.");
await b.close(); await sb.close();
