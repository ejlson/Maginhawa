/* WHAT DOES IT COST TO ZOOM THE FILM?
 *
 * The reveal is being rebuilt so the picture SCALES rather than the aperture
 * merely uncovering a pinned film. Before that lands, this settles the cost
 * question from the trace rather than from folklore:
 *
 *   videoscale  transform: scale() animated on the <video> element itself
 *   wrapscale   the same scale on a wrapper <div> around the video
 *   clip        today's mechanism — a growing clip-path: path() hole, film pinned
 *   both        clip-path AND a wrapper scale together (the likely rebuild)
 *   static      control — the film plays, nothing animates
 *
 * All five run the project's own hero clip full-bleed, at the same viewport,
 * over the same 700ms, on a self-hosted page (the static export cannot be
 * polluted with a fixture). The verdict comes from PipelineReporter — Chrome's
 * own dropped-frame ledger — plus RasterTask/Paint totals attributable to the
 * animating layer.
 *
 * The number that decides "cheap or expensive" is RasterTask count during the
 * animation. A compositor-resampled texture re-rasters NOTHING; a layer that
 * is re-rendered at its new size re-rasters every tile, every frame.
 *
 * Usage:
 *   node scripts/probe-videoscale.mjs --dpr 2 --w 1728 --h 1117
 *   node scripts/probe-videoscale.mjs --dpr 2 --variants videoscale,wrapscale
 */
import puppeteer from "puppeteer-core";
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FILM = join(ROOT, "public/videos/belly-hero.mp4");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const DPR = +arg("dpr", 2);
const VW = +arg("w", 1728);
const VH = +arg("h", 1117);
const PORT = +arg("port", 4177);
const SAVEDIR = arg("savedir", "");
const VARIANTS = arg("variants", "clip,insetclip,videoscale,wrapscale,scalewindow,both").split(",");
const DUR = 700; // matches the loader's grow-out segment exactly

const CATS = [
  "devtools.timeline",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "disabled-by-default-display.framedisplayed",
  "blink.user_timing",
  "media",
];

/* ---------- the fixture ------------------------------------------------- */
const html = (variant) => `<!doctype html><html><head><meta charset=utf-8>
<style>
  html,body{margin:0;height:100%;background:#2f0000;overflow:hidden}
  #wrap{position:absolute;inset:0;will-change:transform}
  video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
        ${variant === "videoscale" ? "will-change:transform;" : ""}}
  /* the loader's own overlay: a full-viewport cream sheet with a hole in it */
  #reveal{position:absolute;inset:0;background:#f2ece1;
          ${variant === "clip_nowc" ? "" : "will-change:clip-path"}}
  #win{position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;
       border-radius:0;will-change:transform;display:none}
  #win video{will-change:transform}
</style></head><body>
<div id=wrap><video id=v muted playsinline preload=auto src="/film.mp4"></video></div>
<div id=reveal></div>
<!-- the compositor-only alternative: a real clipping window that SCALES, with
     the film scaling independently inside it. Two transforms, no clip-path. -->
<div id=win><video id=v2 muted playsinline preload=auto src="/film.mp4"></video></div>
<script>
const VARIANT = ${JSON.stringify(variant)};
const DUR = ${DUR};
const W = innerWidth, H = innerHeight;
// the loader's holePath(), verbatim in shape: outer viewport rect + inner
// rounded rect, evenodd, identical command sequence at every geometry
function holePath(x,y,w,h,r){
  r = Math.max(0, Math.min(r, Math.min(w,h)/2));
  const x2=x+w, y2=y+h;
  return 'path(evenodd, "M0,0 H'+W+' V'+H+' H0 Z '+
    'M'+(x+r)+','+y+' H'+(x2-r)+' A'+r+','+r+' 0 0 1 '+x2+','+(y+r)+
    ' V'+(y2-r)+' A'+r+','+r+' 0 0 1 '+(x2-r)+','+y2+
    ' H'+(x+r)+' A'+r+','+r+' 0 0 1 '+x+','+(y2-r)+
    ' V'+(y+r)+' A'+r+','+r+' 0 0 1 '+(x+r)+','+y+' Z");';
}
const seedW = Math.min(Math.max(260, W*0.24), W*0.56)*1.2;
const seedH = seedW/(16/9);
const startHole = holePath((W-seedW)/2,(H-seedH)/2,seedW,seedH,12).slice(0,-1);
const endHole   = holePath(0,0,W,H,0).slice(0,-1);
const reveal = document.getElementById('reveal');
const wrap = document.getElementById('wrap');
const v = document.getElementById('v');
// park the overlay at the grow-out's START geometry so every variant begins
// from the same picture
reveal.style.clipPath = (VARIANT==='static'||VARIANT==='videoscale'||VARIANT==='wrapscale')
  ? endHole : startHole;

// the compositor-only window: non-uniform scale on the frame (so a 16:9
// postcard can become a non-16:9 full bleed) and a UNIFORM scale on the film
// inside it (so the picture zooms without distorting). Both are transforms,
// so both belong to the compositor.
const win = document.getElementById('win');
const v2 = document.getElementById('v2');
const s0x = seedW/W, s0y = seedH/H, z0 = 1/Math.max(s0x,s0y)*0.55;
if (VARIANT==='scalewindow') {
  reveal.style.display='none';
  wrap.style.display='none';
  win.style.display='block';
  win.style.transformOrigin='50% 50%';
  win.style.borderRadius = (12/Math.min(s0x,s0y))+'px';
}
if (VARIANT==='insetclip') reveal.style.clipPath =
  'inset('+((H-seedH)/2)+'px '+((W-seedW)/2)+'px round 12px)';

const EASE = 'cubic-bezier(0.33,0.11,0.72,1)';
window.__run = () => {
  console.timeStamp('VS_START');
  const anims = [];
  if (VARIANT==='clip' || VARIANT==='clip_nowc' || VARIANT==='both')
    anims.push(reveal.animate([{clipPath:startHole},{clipPath:endHole}],
      {duration:DUR, easing:EASE, fill:'forwards'}));
  if (VARIANT==='videoscale')
    anims.push(v.animate([{transform:'scale(1.35)'},{transform:'scale(1)'}],
      {duration:DUR, easing:EASE, fill:'forwards'}));
  if (VARIANT==='insetclip')
    anims.push(reveal.animate([
      {clipPath:'inset('+((H-seedH)/2)+'px '+((W-seedW)/2)+'px round 12px)'},
      {clipPath:'inset(0px 0px round 0px)'}],
      {duration:DUR, easing:EASE, fill:'forwards'}));
  if (VARIANT==='scalewindow') {
    anims.push(win.animate([
      {transform:'scale('+s0x+','+s0y+')'},{transform:'scale(1,1)'}],
      {duration:DUR, easing:EASE, fill:'forwards'}));
    anims.push(v2.animate([{transform:'scale('+z0+')'},{transform:'scale(1)'}],
      {duration:DUR, easing:EASE, fill:'forwards'}));
  }
  if (VARIANT==='wrapscale' || VARIANT==='both')
    anims.push(wrap.animate([{transform:'scale(1.35)'},{transform:'scale(1)'}],
      {duration:DUR, easing:EASE, fill:'forwards'}));
  return Promise.all(anims.map(a=>a.finished)).catch(()=>{})
    .then(()=>console.timeStamp('VS_END'));
};
window.__ready = new Promise(res=>{
  const t = VARIANT==='scalewindow' ? v2 : v;
  const go = () => { try { t.currentTime = 5.84; } catch(e){} t.play().then(res,res); };
  if (t.readyState >= 3) go(); else t.addEventListener('canplay', go, {once:true});
});
</script></body></html>`;

/* ---------- static server ---------------------------------------------- */
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/film.mp4") {
    const size = statSync(FILM).size;
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m[1] ? +m[1] : 0;
      const end = m[2] ? +m[2] : size - 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": "video/mp4",
      });
      createReadStream(FILM, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": size,
        "Accept-Ranges": "bytes",
        "Content-Type": "video/mp4",
      });
      createReadStream(FILM).pipe(res);
    }
    return;
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html(url.searchParams.get("v") || "static"));
});
await new Promise((r) => server.listen(PORT, r));

/* ---------- one variant -------------------------------------------------- */
async function run(variant) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: [
      "--no-sandbox",
      "--autoplay-policy=no-user-gesture-required",
      "--window-position=0,0",
      `--window-size=${VW},${VH + 90}`,
    ],
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DPR });
  const cdp = await page.createCDPSession();
  await page.goto(`http://localhost:${PORT}/?v=${variant}`, { waitUntil: "load" });
  await page.evaluate(() => window.__ready);
  await new Promise((r) => setTimeout(r, 900)); // let decode settle

  await cdp.send("Tracing.start", {
    transferMode: "ReturnAsStream",
    streamFormat: "json",
    traceConfig: { recordMode: "recordAsMuchAsPossible", includedCategories: CATS },
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => window.__run());
  await new Promise((r) => setTimeout(r, 500));

  const doneP = new Promise((res) => cdp.once("Tracing.tracingComplete", res));
  await cdp.send("Tracing.end");
  const { stream } = await doneP;
  let json = "";
  for (;;) {
    const { data, base64Encoded, eof } = await cdp.send("IO.read", { handle: stream, size: 4 << 20 });
    json += base64Encoded ? Buffer.from(data, "base64").toString("utf8") : data;
    if (eof) break;
  }
  await cdp.send("IO.close", { handle: stream }).catch(() => {});
  await browser.close();
  return json;
}

/* ---------- analyse ------------------------------------------------------ */
function analyse(json, variant) {
  const raw = JSON.parse(json);
  const ev = Array.isArray(raw) ? raw : raw.traceEvents;
  let t0 = null;
  let rpid = null;
  for (const e of ev) {
    if (e.args?.data?.message === "VS_START") {
      t0 = e.ts;
      rpid = e.pid;
      break;
    }
  }
  if (t0 == null) return { variant, err: "no VS_START" };
  const rel = (ts) => (ts - t0) / 1000;

  const openM = new Map();
  const R = [];
  for (const e of ev) {
    if (e.name !== "PipelineReporter" || e.pid !== rpid) continue;
    const key = `${e.id2?.local ?? e.id}`;
    if (e.ph === "b") openM.set(key, { start: e.ts, fr: e.args?.frame_reporter || {} });
    else if (e.ph === "e") {
      const r = openM.get(key);
      if (!r) continue;
      openM.delete(key);
      r.state = r.fr.state || "(none)";
      R.push(r);
    }
  }
  const win = R.filter((r) => rel(r.start) >= 0 && rel(r.start) < DUR);
  const pres = win.filter((r) => r.state.includes("PRESENTED")).length;
  const drop = win.filter((r) => r.state === "STATE_DROPPED").length;
  const compAnim = win.filter((r) => r.fr.has_compositor_animation).length;
  const mainAnim = win.filter((r) => r.fr.has_main_animation).length;

  const inW = (n, pid = null) =>
    ev.filter(
      (e) => e.name === n && rel(e.ts) >= 0 && rel(e.ts) < DUR && (pid == null || e.pid === pid),
    );
  const dur = (n, pid = null) => inW(n, pid).reduce((t, e) => t + (e.dur || 0), 0) / 1000;

  const paints = inW("Paint", rpid).filter((e) => e.args?.data?.clip);
  const clips = {};
  for (const p of paints) {
    const c = p.args.data.clip;
    const k = `${Math.round(Math.abs(c[2] - c[0]))}x${Math.round(Math.abs(c[5] - c[1]))}`;
    clips[k] = (clips[k] || 0) + 1;
  }

  return {
    variant,
    pres,
    drop,
    dropPct: pres + drop ? (100 * drop) / (pres + drop) : 0,
    compAnim,
    mainAnim,
    bmf: inW("BeginMainThreadFrame", rpid).length,
    layerize: inW("Layerize", rpid).length,
    rasterN: inW("RasterTask").length,
    rasterMs: +dur("RasterTask").toFixed(1),
    paintN: paints.length,
    paintMs: +dur("Paint", rpid).toFixed(1),
    commitMs: +dur("Commit", rpid).toFixed(1),
    vsubmit: inW("VideoFrameSubmitter::SubmitFrame").length,
    clips,
  };
}

/* ---------- main --------------------------------------------------------- */
const out = [];
for (const v of VARIANTS) {
  const json = await run(v);
  if (SAVEDIR) writeFileSync(join(SAVEDIR, `vs_${v}.json`), json);
  out.push(analyse(json, v));
}
server.close();

console.log(`\n╔══ VIDEO SCALE COST · dpr ${DPR} · ${VW}×${VH} · ${DUR}ms animation ══`);
console.log(
  "\nvariant     | pres drop %drop | compAnim mainAnim BeginMainFrame Layerize | RasterTask n/ms | Paint n/ms | commit | vidFrames",
);
for (const r of out) {
  if (r.err) {
    console.log(`${r.variant.padEnd(11)} | ${r.err}`);
    continue;
  }
  console.log(
    `${r.variant.padEnd(11)} |${String(r.pres).padStart(5)}${String(r.drop).padStart(
      5,
    )} ${r.dropPct.toFixed(1).padStart(5)} |${String(r.compAnim).padStart(9)}${String(
      r.mainAnim,
    ).padStart(9)}${String(r.bmf).padStart(15)}${String(r.layerize).padStart(9)} |${String(
      r.rasterN,
    ).padStart(7)} /${r.rasterMs.toFixed(1).padStart(6)} |${String(r.paintN).padStart(5)} /${r.paintMs
      .toFixed(1)
      .padStart(5)} |${r.commitMs.toFixed(1).padStart(7)} |${String(r.vsubmit).padStart(6)}`,
  );
}
console.log("\nPaint clip dimensions during the animation (what got re-recorded):");
for (const r of out)
  if (!r.err)
    console.log(
      `  ${r.variant.padEnd(11)} ${
        Object.entries(r.clips)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([k, n]) => `${k}×${n}`)
          .join("  ") || "(nothing repainted)"
      }`,
    );
