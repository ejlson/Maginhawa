/* WHERE THE JOURNAL'S BLOCKS ACTUALLY SIT, AND WHEN EACH ONE ARRIVES.

   The chapter is 1.37 screens tall and opens in three separate cascades —
   the voice column, the featured plate, the rail — so "when does it arrive"
   has three answers and they are 787px apart in the document. This prints
   each block's document span and the scroll position at which its top edge
   reaches 85% of the window, which is the arrival line every gate on this
   page is set against.

   IT THEN WALKS THE CHAPTER AND REPORTS WHERE EACH OF THE THREE GATES
   ACTUALLY FIRES, and what the block that gate owns was doing at that
   moment. That is the regression test: a gate must fire while the thing it
   opens is still low in the window, never once it has climbed past the
   middle and never while it is below the fold.

   It is the measurement behind the three-gate block in Blog.module.css and
   behind RAIL_AT in lib/drift.ts.

   usage: node scripts/probe-blog-blocks.mjs [port]                       */
import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",protocolTimeout:300000,
  args:["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1","--autoplay-policy=no-user-gesture-required"]});
const p=await b.newPage(); await p.setViewport({width:1440,height:900});
await p.goto(`http://localhost:${process.argv[2]||3000}/`,{waitUntil:"networkidle2",timeout:90000});
await p.waitForFunction(()=>!document.body.classList.contains("is-loading"),{timeout:40000}).catch(()=>{});
await new Promise(r=>setTimeout(r,1200));
const g=await p.evaluate(()=>{
  const q=(s)=>document.querySelector(s);
  const box=(el,n)=>{if(!el)return null;const r=el.getBoundingClientRect();
    return {n,top:Math.round(r.top+scrollY),bot:Math.round(r.bottom+scrollY),h:Math.round(r.height)}};
  return {vh:innerHeight, rows:[
    box(q("#blog"),"section"),
    box(q('[class*="Blog_intro"]'),"intro/voice"),
    box(q('[class*="Blog_front"]:not([class*="frontP"]):not([class*="frontM"]):not([class*="frontB"]):not([class*="frontT"]):not([class*="frontC"])'),"featured"),
    box(q('[class*="Blog_frontPhoto"]'),"frontPhoto"),
    box(q('[class*="Blog_divider"]:not([class*="dividerL"]):not([class*="dividerR"])'),"divider"),
    box(q('[class*="Blog_strip"]'),"rail"),
    box(q('[class*="PressWall_section"]'),"PressWall"),
  ].filter(Boolean)};
});
console.log("vh",g.vh);
g.rows.forEach(r=>console.log(`  ${r.n.padEnd(12)} ${String(r.top).padStart(5)} → ${String(r.bot).padStart(5)}  h=${r.h}`));
console.log("\n  a block's 'arrival' scrollY (its top reaching 85% down the screen):");
g.rows.forEach(r=>console.log(`  ${r.n.padEnd(12)} y=${Math.round(r.top-0.85*g.vh)}`));
/* ── AND WHEN EACH GATE FIRES ── */
await p.evaluate(() => { try { sessionStorage.removeItem("mgnhw:journal-played"); } catch {} });
await p.reload({ waitUntil: "networkidle2" });
await p.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 40000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 1200));

const fired = {};
for (let y = 2400; y <= 4800; y += 25) {
  await p.evaluate((t) => {
    const l = window.__lenis;
    if (l) l.scrollTo(t, { immediate: true }); else window.scrollTo(0, t);
  }, y);
  await new Promise((r) => setTimeout(r, 55));
  const st = await p.evaluate(() => {
    const s = document.querySelector("#blog");
    const at = (sel) => {
      const e = document.querySelector(sel);
      return e ? Math.round(e.getBoundingClientRect().top) : null;
    };
    return {
      in: s.getAttribute("data-in"),
      plate: s.getAttribute("data-plate"),
      rail: s.getAttribute("data-rail"),
      voice: at('[class*="Blog_intro"]'),
      front: at('[class*="Blog_frontPhoto"]'),
      strip: at('[class*="Blog_strip"]'),
      vh: innerHeight,
    };
  });
  for (const k of ["in", "plate", "rail"]) if (st[k] && !fired[k]) fired[k] = { y, ...st };
}
console.log("\n  GATE          fires at   the block it opens was then …");
const owns = { in: ["voice", "the voice column"], plate: ["front", "the featured plate"], rail: ["strip", "the rail"] };
for (const k of ["in", "plate", "rail"]) {
  const f = fired[k];
  if (!f) { console.log(`  data-${k.padEnd(9)}      never`); continue; }
  const [key, label] = owns[k];
  const pct = Math.round((100 * f[key]) / f.vh);
  const verdict = f[key] > f.vh ? "  ⚠ BELOW THE FOLD" : pct < 35 ? "  ⚠ ALREADY PAST THE MIDDLE" : "";
  console.log(`  data-${k.padEnd(9)} y=${String(f.y).padStart(5)}   ${label} at ${String(f[key]).padStart(4)}px (${String(pct).padStart(3)}% down)${verdict}`);
}

await b.close();
