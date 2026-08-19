/* IS THE REVEAL ONE MOVEMENT, OR SEVERAL? — the stage-1 velocity audit.
 *
 * probe-loader-jank.mjs grades the reveal in 50ms and 100ms buckets, which is
 * the right resolution for finding STALLS. It is the wrong resolution for
 * finding SEAMS. A keyframe boundary where one segment's exit velocity does not
 * match the next segment's entry velocity is a discontinuity in the derivative,
 * not in the value: every bucket can sit inside its floor and ceiling while the
 * window still visibly changes gear. A cubic-bezier with y1 = 0 (any ease-IN,
 * including the ease-in half of an ease-in-out) starts at exactly ZERO velocity,
 * so handing a moving segment to one is a guaranteed hesitation whose only
 * question is how long and how deep.
 *
 * So this probe reports the derivative directly: px/ms in 10ms and 25ms windows
 * across each join, and px advanced per 40ms across the whole reveal — 40ms
 * being roughly the cadence the eye integrates, and the same cadence as the
 * filmstrip it writes. It also grades the four things a retiming can silently
 * break: the longest static span once the window is visible, the share of
 * travel in the last 250ms (the asymptotic-tail check), the postcard's width
 * while the reader is meant to read it as a picture, and the film's currentTime
 * at overlay unmount against the shot's out-cut.
 *
 * ⚠️ Serve the production build with `npx serve out -l 3100`, NOT
 * `python3 -m http.server` — the latter ignores Range requests, so the hero
 * video's seek to HERO_SEEK_S silently falls back to 0 and every film number
 * below is wrong while looking plausible.
 *
 * Everything is computed from raw per-frame samples; it shares no analysis code
 * with probe-loader-jank.mjs, on purpose — two independent readings of the same
 * animation are worth more than one reading twice.
 *
 * Usage: node scripts/probe-reveal-seam.mjs [port] [runs] [w] [h] [dpr] [shot]
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs"; import path from "node:path";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT=process.argv[2]||"3100", RUNS=+(process.argv[3]||3);
const VW=+(process.argv[4]||1440), VH=+(process.argv[5]||900), DPR=+(process.argv[6]||1);
const SHOT=process.argv[7]==="shot";
const OUT="/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/aa802098-0b1f-49b7-999a-be50025d0648/scratchpad/strip-final";

function rec(){
  window.__F=[]; let rev=null,v=null;
  const q=n=>document.querySelector(`[class*="Loader_${n}__"]`);
  const tick=t=>{
    if(!rev||!rev.isConnected)rev=q("reveal"); if(!v)v=document.querySelector("video");
    let ct=null,dur=null;
    if(rev){const a=rev.getAnimations(); if(a.length){ct=a[0].currentTime;dur=a[0].effect.getTiming().duration;}}
    window.__F.push([t,ct,dur, rev?getComputedStyle(rev).clipPath:"", v?v.currentTime:null, q("overlay")?1:0]);
    requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
}
const hole=c=>{ if(!c||c==="none")return null; const d=c.match(/"([^"]+)"/)?.[1]??c; const i=d.indexOf("M",1); if(i<0)return null;
  const n=(d.slice(i).match(/-?\d*\.?\d+(?:e-?\d+)?/g)||[]).map(Number); if(n.length<34)return null; return +(n[8]-n[24]).toFixed(2); };
const P=(s,p)=>s[Math.min(s.length-1,Math.floor(p/100*s.length))];

const all=[];
for(let k=0;k<RUNS;k++){
  const b=await puppeteer.launch({executablePath:CHROME,headless:false,args:["--no-sandbox","--autoplay-policy=no-user-gesture-required",`--window-size=${VW},${VH+90}`]});
  const p=await b.newPage(); await p.setViewport({width:VW,height:VH,deviceScaleFactor:DPR});
  await p.evaluateOnNewDocument(rec);
  const cdp=await p.createCDPSession(); const shots=[];
  if(SHOT){ cdp.on("Page.screencastFrame",async f=>{shots.push({ts:f.metadata.timestamp*1000,buf:Buffer.from(f.data,"base64")});cdp.send("Page.screencastFrameAck",{sessionId:f.sessionId}).catch(()=>{});}); }
  await p.goto(`http://localhost:${PORT}/`,{waitUntil:"domcontentloaded"});
  if(SHOT) await cdp.send("Page.startScreencast",{format:"png",everyNthFrame:1,maxWidth:VW,maxHeight:VH});
  await new Promise(r=>setTimeout(r,8600));
  if(SHOT) await cdp.send("Page.stopScreencast").catch(()=>{});
  const F=await p.evaluate(()=>window.__F); const origin=await p.evaluate(()=>performance.timeOrigin);
  await b.close();
  const s0=F.findIndex(f=>f[1]!=null&&f[2]>=1000);
  if(s0<0){console.log(`run ${k+1}: reveal animation never found`);continue;}
  const REV=F[s0][2]; const t0=F[s0][0]-F[s0][1];
  const S=F.map(f=>({ms:+(f[0]-t0).toFixed(2), w:hole(f[3]), ct:f[4], ov:f[5]}));
  all.push({S,REV,t0,origin,shots});
}
if(!all.length) process.exit(1);
const REV=all[0].REV;
console.log(`\n══ AFTER · ${VW}×${VH} dpr${DPR} · reveal ${REV}ms · ${all.length} runs · headful · port ${PORT} ══`);

/* ---- frame health per phase ---- */
const PH=[["board fade",0,300],["window open",200,400],["postcard pass",400,600],["GROW-OUT",600,REV],["whole",0,REV]];
console.log("\n  phase          fps (per run)        p50    p95    max    >20ms  >50ms");
for(const [n,a,b] of PH){
  const c=[];
  for(const r of all){ const w=r.S.filter(x=>x.ms>=a&&x.ms<=b); const d=[]; for(let i=1;i<w.length;i++)d.push(w[i].ms-w[i-1].ms);
    const s=[...d].sort((x,y)=>x-y);
    c.push({fps:+(d.length/(w[w.length-1].ms-w[0].ms)*1000).toFixed(1),p50:+P(s,50).toFixed(1),p95:+P(s,95).toFixed(1),max:+s[s.length-1].toFixed(1),o20:d.filter(v=>v>20).length,o50:d.filter(v=>v>50).length}); }
  const col=k=>c.map(x=>x[k]).join("/");
  console.log(`  ${n.padEnd(13)} ${col("fps").padEnd(20)} ${col("p50").padEnd(6)} ${col("p95").padEnd(6)} ${col("max").padEnd(6)} ${col("o20").padEnd(6)} ${col("o50")}`);
}

/* ---- velocity buckets ---- */
for(const B of [100,50]){
  console.log(`\n  TRAVEL per ${B}ms bucket, % of total (· = <0.6%/50ms-equivalent)`);
  for(const r of all.slice(0,3)){
    const g=r.S.filter(x=>x.ms>=0&&x.ms<=REV&&x.w!=null);
    const at=ms=>g.reduce((z,c)=>Math.abs(c.ms-ms)<Math.abs(z.ms-ms)?c:z,g[0]);
    const total=Math.abs(at(REV).w-at(0).w)||1;
    let line="   ", floor=1e9, peak=0;
    for(let ms=0;ms<REV;ms+=B){ const v=Math.abs(at(ms+B).w-at(ms).w)/total*100;
      if(ms>=200){floor=Math.min(floor,v);peak=Math.max(peak,v);}
      line+=String(v<0.6*B/50?"·":v.toFixed(0)).padStart(B===100?5:4); }
    console.log(line+`   peak ${peak.toFixed(1)}%  floor(≥200ms) ${floor.toFixed(1)}%`);
  }
  let ax="   "; for(let ms=0;ms<REV;ms+=B) ax+=String(ms).padStart(B===100?5:4); console.log(ax);
}

/* ---- longest static span once the window is visible ---- */
console.log("\n  STATIC SPANS once the window is visible (w>0), <1px of change:");
for(const r of all){
  const g=r.S.filter(x=>x.ms>=0&&x.ms<=REV&&x.w!=null&&x.w>0);
  let best=0,bestAt=0,st=g[0]?.ms??0,anchor=g[0]?.w??0;
  for(const f of g){ if(Math.abs(f.w-anchor)<1){ if(f.ms-st>best){best=f.ms-st;bestAt=st;} } else {st=f.ms;anchor=f.w;} }
  const first=g[0];
  console.log(`   window first visible at ${first?first.ms.toFixed(0):"?"}ms;  longest static span ${best.toFixed(0)}ms @ ${bestAt.toFixed(0)}ms`);
}

/* ---- tail ---- */
console.log("\n  TAIL — last 250ms of the reveal:");
for(const r of all){
  const g=r.S.filter(x=>x.ms>=0&&x.ms<=REV&&x.w!=null);
  const at=ms=>g.reduce((z,c)=>Math.abs(c.ms-ms)<Math.abs(z.ms-ms)?c:z,g[0]);
  const px=at(REV).w-at(REV-250).w, total=at(REV).w-at(0).w;
  console.log(`   ${(px/total*100).toFixed(1)}% of travel = ${px.toFixed(0)}px in the last 250ms`);
}

/* ---- the seams, at 25ms resolution, in px/ms ---- */
console.log(`\n  SEAM VELOCITY px/ms in 25ms windows (run 1). Segment joins at 200 / 400 / 600ms.`);
{ const r=all[0]; const g=r.S.filter(x=>x.ms>=100&&x.ms<=1000&&x.w!=null);
  const at=ms=>g.reduce((z,c)=>Math.abs(c.ms-ms)<Math.abs(z.ms-ms)?c:z,g[0]);
  let l1="   ",l2="   ";
  for(let ms=150;ms<900;ms+=25){ const v=(at(ms+25).w-at(ms).w)/25; l1+=v.toFixed(2).padStart(6); l2+=String(ms).padStart(6);
    if(l1.length>110){console.log(l2);console.log(l1);l1="   ";l2="   ";} }
  if(l1.trim()){console.log(l2);console.log(l1);} }

/* ---- what the eye integrates: edge advance per 40ms, whole reveal ---- */
console.log(`\n  EDGE ADVANCE px per 40ms (the cadence the eye integrates). Joins at 200/400/600.`);
{ let ax="   "; for(let ms=160;ms<REV;ms+=40) ax+=String(ms).padStart(5); console.log(ax);
  for(const r of all){ const g=r.S.filter(x=>x.w!=null);
    const at=ms=>g.reduce((z,c)=>Math.abs(c.ms-ms)<Math.abs(z.ms-ms)?c:z,g[0]);
    let l="   "; for(let ms=160;ms<REV;ms+=40) l+=(at(ms+40).w-at(ms).w).toFixed(0).padStart(5); console.log(l); } }

/* ---- the 600ms seam at 10ms resolution, all runs ---- */
console.log(`\n  SEAM @600ms — px/ms in 10ms windows (LINEAR beat hands to EASE_MORPH):`);
{ let ax="   "; for(let ms=540;ms<720;ms+=10) ax+=String(ms).padStart(6); console.log(ax);
  for(const r of all){ const g=r.S.filter(x=>x.ms>=500&&x.ms<=780&&x.w!=null);
    const at=ms=>g.reduce((z,c)=>Math.abs(c.ms-ms)<Math.abs(z.ms-ms)?c:z,g[0]);
    let l="   "; for(let ms=540;ms<720;ms+=10) l+=((at(ms+10).w-at(ms).w)/10).toFixed(2).padStart(6); console.log(l); } }
console.log(`\n  SEAM @400ms — px/ms in 10ms windows (EASE_WINDOW hands to LINEAR beat):`);
{ let ax="   "; for(let ms=330;ms<510;ms+=10) ax+=String(ms).padStart(6); console.log(ax);
  for(const r of all){ const g=r.S.filter(x=>x.ms>=300&&x.ms<=560&&x.w!=null);
    const at=ms=>g.reduce((z,c)=>Math.abs(c.ms-ms)<Math.abs(z.ms-ms)?c:z,g[0]);
    let l="   "; for(let ms=330;ms<510;ms+=10) l+=((at(ms+10).w-at(ms).w)/10).toFixed(2).padStart(6); console.log(l); } }

/* ---- postcard size window ---- */
console.log("\n  POSTCARD SIZE (hole width px):");
for(const r of all.slice(0,2)){
  const g=r.S.filter(x=>x.w!=null); const at=ms=>g.reduce((z,c)=>Math.abs(c.ms-ms)<Math.abs(z.ms-ms)?c:z,g[0]);
  console.log(`   380ms ${at(380).w}   420ms ${at(420).w}   500ms ${at(500).w}   560ms ${at(560).w}   600ms ${at(600).w}`);
}

/* ---- film coupling at overlay unmount ---- */
console.log("\n  FILM at overlay unmount (out-cut is ct 7.56):");
for(const r of all){
  const g=r.S.filter(x=>x.ct!=null);
  let lastOv=null; for(const f of g) if(f.ov===1) lastOv=f;
  const firstGone=g.find(f=>f.ms>(lastOv?.ms??0)&&f.ov===0);
  console.log(`   overlay last present at ${lastOv?lastOv.ms.toFixed(0):"?"}ms, ct ${lastOv?lastOv.ct.toFixed(3):"?"}` +
    (firstGone?`  →  gone by ${firstGone.ms.toFixed(0)}ms, ct ${firstGone.ct.toFixed(3)}  |  margin to 7.56 = ${(7.56-firstGone.ct).toFixed(3)}s`:""));
}

/* ---- filmstrip ---- */
if(SHOT&&all[0].shots.length){
  fs.mkdirSync(OUT,{recursive:true}); for(const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT,f));
  const r=all[0], wall0=r.origin+r.t0; let kept=0;
  for(let want=0;want<=REV+100;want+=40){ const tgt=wall0+want; let best=null;
    for(const s of r.shots) if(!best||Math.abs(s.ts-tgt)<Math.abs(best.ts-tgt)) best=s;
    if(!best||Math.abs(best.ts-tgt)>30) continue;
    fs.writeFileSync(path.join(OUT,`a-${String(want).padStart(4,"0")}.png`),best.buf); kept++; }
  console.log(`\n  ${kept} filmstrip frames (${r.shots.length} captured) → ${OUT}/a-*.png`);
}
console.log("");
