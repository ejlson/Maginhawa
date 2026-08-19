/* IS `clip-path: path()` THE THING THAT COSTS THE FRAMES?
 *
 * probe-loader-jank.mjs measures the real loader and finds it clean, which
 * answers "is it janky" but not "how much headroom is left". This probe answers
 * the mechanism question directly: four ways to open the same full-viewport
 * window over the same 1500ms, over the same playing hero film, in the SAME page
 * and the SAME browser run, so nothing but the mechanism differs.
 *
 *   path    — what Loader.tsx does: clip-path: path(evenodd, …), a viewport rect
 *             with a 4-arc rounded hole, 6 keyframes through WAAPI.
 *   inset   — clip-path: inset(t r b l round R). Same visual result, a shape the
 *             engine knows natively instead of a path it has to re-tessellate.
 *   panels  — the compositor-only alternative: four cream panels that TRANSFORM
 *             out of the way. No clip, no repaint — transform only.
 *   control — nothing animates. The floor: film decode + compositing alone.
 *
 * Run it throttled. At 1× on an Apple-silicon Mac every mechanism holds 120fps
 * and the comparison says nothing; the throttle is what exposes the ratio, and
 * the ratio is what tells you whether a slower visitor's machine has margin.
 *
 * Usage: node scripts/probe-clip-mechanism.mjs [port] [cpuRate] [runs]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const CPU = +(process.argv[3] || 20);
const RUNS = +(process.argv[4] || 3);
const VW = 1920,
  VH = 1080,
  DPR = 2;
const MECHS = ["control", "path", "inset", "panels"];

const page_html = (port) => `
<style>
  html,body{margin:0;height:100%;background:#2f0000;overflow:hidden}
  video{position:fixed;inset:0;width:100%;height:100%;object-fit:cover}
  .sheet{position:fixed;inset:0;background:#f4ece0}
  #panels div{position:fixed;background:#f4ece0;will-change:transform}
</style>
<video id="v" muted playsinline autoplay loop src="http://localhost:${port}/videos/belly-hero.mp4"></video>
<div class="sheet" id="clip" style="will-change:clip-path"></div>
<div id="panels" style="display:none">
  <div id="pT"></div><div id="pB"></div><div id="pL"></div><div id="pR"></div>
</div>
<script>
const W = innerWidth, H = innerHeight;
// the loader's own geometry: postcard seed, then full bleed
const seedW = Math.min(Math.max(260, W*0.24), W*0.56), seedH = seedW/(16/9);
const cx = W/2, cy = H/2, R = 10;
const boxes = [
  [0,0,0,0],                                        // closed
  [0,0,0,0],
  [seedW*0.88, seedH*0.88, R*0.88, 0],              // 88%
  [seedW, seedH, R, 0],                             // resting postcard
  [seedW, seedH, R, 0],                             // hold
  [W, H, 0, 0],                                     // full bleed
].map(([w,h,r]) => ({ x: cx-w/2, y: cy-h/2, w, h, r: Math.max(0, Math.min(r, Math.min(w,h)/2)) }));
const TIMES = [0, 220/1500, 420/1500, 560/1500, 760/1500, 1];
const EASE = ["cubic-bezier(0.23,1,0.32,1)","cubic-bezier(0.23,1,0.32,1)","cubic-bezier(0.23,1,0.32,1)","cubic-bezier(0.23,1,0.32,1)","cubic-bezier(0.32,0.72,0,1)"];

// verbatim shape of Loader.tsx's holePath()
const pathOf = (b) => {
  const x2=b.x+b.w, y2=b.y+b.h, r=b.r;
  return 'path(evenodd, "M0,0 H'+W+' V'+H+' H0 Z '+
    'M'+(b.x+r)+','+b.y+' H'+(x2-r)+' A'+r+','+r+' 0 0 1 '+x2+','+(b.y+r)+
    ' V'+(y2-r)+' A'+r+','+r+' 0 0 1 '+(x2-r)+','+y2+
    ' H'+(b.x+r)+' A'+r+','+r+' 0 0 1 '+b.x+','+(y2-r)+
    ' V'+(b.y+r)+' A'+r+','+r+' 0 0 1 '+(b.x+r)+','+b.y+' Z")';
};
const insetOf = (b) =>
  'inset('+b.y+'px '+(W-b.x-b.w)+'px '+(H-b.y-b.h)+'px '+b.x+'px round '+b.r+'px)';

const kf = (fn) => boxes.map((b,i) => ({
  clipPath: fn(b), offset: TIMES[i], easing: EASE[Math.min(i, EASE.length-1)],
}));

window.__F = [];
let rec = false;
const tick = (t) => { if (rec) window.__F.push(t); requestAnimationFrame(tick); };
requestAnimationFrame(tick);

window.__run = (mech) => new Promise((res) => {
  const clip = document.getElementById('clip'), pans = document.getElementById('panels');
  clip.style.display = mech === 'panels' ? 'none' : '';
  pans.style.display = mech === 'panels' ? '' : 'none';
  clip.style.clipPath = 'none';
  window.__F = []; rec = true;
  let anims = [];
  if (mech === 'path')  anims = [clip.animate(kf(pathOf),  { duration: 1500, fill: 'forwards' })];
  if (mech === 'inset') anims = [clip.animate(kf(insetOf), { duration: 1500, fill: 'forwards' })];
  if (mech === 'panels') {
    // four cream panels sized to the closed state, transformed out to reveal.
    // Only translate/scale — nothing here can force a repaint.
    const set = (el, s) => Object.assign(el.style, s);
    set(pT, {left:0, top:0, width:W+'px', height:H+'px', transformOrigin:'50% 0%'});
    set(pB, {left:0, top:0, width:W+'px', height:H+'px', transformOrigin:'50% 100%'});
    set(pL, {left:0, top:0, width:W+'px', height:H+'px', transformOrigin:'0% 50%'});
    set(pR, {left:0, top:0, width:W+'px', height:H+'px', transformOrigin:'100% 50%'});
    const mk = (el, axis, edge) => el.animate(boxes.map((b,i) => {
      const frac = axis === 'y'
        ? (edge === 0 ? b.y / H : (H - b.y - b.h) / H)
        : (edge === 0 ? b.x / W : (W - b.x - b.w) / W);
      return { transform: axis === 'y' ? 'scaleY('+frac+')' : 'scaleX('+frac+')',
               offset: TIMES[i], easing: EASE[Math.min(i, EASE.length-1)] };
    }), { duration: 1500, fill: 'forwards' });
    anims = [mk(pT,'y',0), mk(pB,'y',1), mk(pL,'x',0), mk(pR,'x',1)];
  }
  setTimeout(() => { rec = false; anims.forEach(a => a.cancel()); res(window.__F.slice()); }, 1550);
});
</script>`;

const pct = (s, p) => s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];

const out = {};
for (let run = 0; run < RUNS; run++) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required", `--window-size=${VW},${VH}`],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DPR });
  const cdp = await page.createCDPSession();
  await cdp.send("Performance.enable");
  await page.setContent(page_html(PORT), { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 2500)); // let the film get playing
  if (CPU > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });

  for (const m of MECHS) {
    const before = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
    const F = await page.evaluate((mm) => window.__run(mm), m);
    const after = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
    const d = [];
    for (let i = 1; i < F.length; i++) d.push(F[i] - F[i - 1]);
    const s = [...d].sort((a, b) => a - b);
    (out[m] ||= []).push({
      fps: +((d.length / (F[F.length - 1] - F[0])) * 1000).toFixed(1),
      p50: +pct(s, 50).toFixed(1),
      p95: +pct(s, 95).toFixed(1),
      max: +s[s.length - 1].toFixed(1),
      over20: d.filter((v) => v > 20).length,
      over50: d.filter((v) => v > 50).length,
      task: +(after.TaskDuration - before.TaskDuration).toFixed(3),
      style: +(after.RecalcStyleDuration - before.RecalcStyleDuration).toFixed(3),
      script: +(after.ScriptDuration - before.ScriptDuration).toFixed(3),
    });
    await new Promise((r) => setTimeout(r, 400));
  }
  await browser.close();
}

console.log(`\n══ MECHANISM · ${VW}×${VH} dpr${DPR} · CPU ×${CPU} · ${RUNS} runs · headful ══\n`);
console.log("  mechanism   fps (per run)          p50       p95       max       >20ms  >50ms   main-thread task (s)   style (s)");
for (const m of MECHS) {
  const r = out[m] || [];
  if (!r.length) continue;
  const c = (k) => r.map((x) => x[k]).join("/");
  console.log(
    `  ${m.padEnd(10)}  ${c("fps").padEnd(21)} ${c("p50").padEnd(9)} ${c("p95").padEnd(9)} ${c("max").padEnd(9)} ` +
      `${c("over20").padEnd(6)} ${c("over50").padEnd(6)}  ${c("task").padEnd(21)}  ${c("style")}`,
  );
}
console.log("");
