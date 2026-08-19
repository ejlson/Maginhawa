/* Offline analyser for the traces probe-present.mjs / probe-videoscale.mjs save.
 *
 * Ground truth, in descending order of authority:
 *   Display::FrameDisplayed  (viz process) — a frame was actually put on screen
 *   PipelineReporter          (renderer cc) — per-BeginFrame verdict, incl. why
 *                                             a frame was DROPPED
 *   DrawFrame / ActivateLayerTree / Commit  — the pipeline stages behind it
 *
 * Usage: node scripts/present-analyse.mjs <trace.json> [--mark MGNHW_REVEAL_START]
 *                                          [--phases "0:200:board,200:400:open,..."]
 */
import { readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const FILE = argv[0];
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const MARK = arg("mark", "MGNHW_REVEAL_START");
const PHASESPEC = arg(
  "phases",
  "-900:0:pre-reveal,0:200:board fade,200:400:window open,400:600:postcard,600:1300:GROW-OUT,1300:1900:post",
);
const PHASES = PHASESPEC.split(",").map((s) => {
  const [a, b, ...n] = s.split(":");
  return [n.join(":").padEnd(11), +a, +b];
});

const raw = JSON.parse(readFileSync(FILE, "utf8"));
const ev = Array.isArray(raw) ? raw : raw.traceEvents;

/* ---- zero, and the renderer pid that owns the animation ---------------- */
let t0 = null;
let rpid = null;
for (const e of ev) {
  const m = e.args?.data?.message;
  if (typeof m === "string" && m.startsWith(MARK)) {
    const tail = m.slice(MARK.length).replace(/^_/, "");
    const ct = tail ? +tail / 100 : 0;
    t0 = e.ts - ct * 1000;
    rpid = e.pid;
    break;
  }
}
if (t0 == null) {
  console.error(`no ${MARK} mark in trace`);
  process.exit(1);
}
const rel = (ts) => (ts - t0) / 1000;

const pct = (s, p) =>
  s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : null;
const num = (v, w = 6, d = 1) => (v == null ? "—".padStart(w) : v.toFixed(d).padStart(w));

/* ---- Display::FrameDisplayed — the literal presents -------------------- */
/* ⚠️ DEDUPE. With two output surfaces attached (a second monitor, or the
   internal panel plus an external one) viz emits one Display::FrameDisplayed
   PER DISPLAY, microseconds apart. Undeduped they read as a ~0ms gap followed
   by a 16.7ms one, which fakes a 50% doubled-vsync rate that is not there. */
const displayed = [];
for (const ts of ev
  .filter((e) => e.name === "Display::FrameDisplayed")
  .map((e) => e.ts)
  .sort((a, b) => a - b))
  if (!displayed.length || ts - displayed[displayed.length - 1] > 1000) displayed.push(ts);

/* ---- PipelineReporter -------------------------------------------------- */
const open = new Map();
const reporters = [];
for (const e of ev) {
  if (e.name !== "PipelineReporter") continue;
  const key = `${e.pid}:${e.id2?.local ?? e.id}`;
  if (e.ph === "b") {
    open.set(key, {
      pid: e.pid,
      start: e.ts,
      fr: e.args?.frame_reporter || {},
    });
  } else if (e.ph === "e") {
    const r = open.get(key);
    if (!r) continue;
    open.delete(key);
    r.end = e.ts;
    r.state = r.fr.state || "(none)";
    r.smooth = r.fr.affects_smoothness;
    r.highLat = r.fr.has_high_latency;
    r.compAnim = r.fr.has_compositor_animation;
    r.mainAnim = r.fr.has_main_animation;
    r.checkerR = r.fr.checkerboarded_needs_raster;
    r.checkerRec = r.fr.checkerboarded_needs_record;
    reporters.push(r);
  }
}
const prPids = {};
for (const r of reporters) prPids[r.pid] = (prPids[r.pid] || 0) + 1;

/* pick the pid that carries the compositor animation, else the renderer pid */
let apid = rpid;
if (!prPids[apid]) {
  let best = 0;
  for (const [p, n] of Object.entries(prPids)) {
    const anim = reporters.filter((r) => r.pid === +p && r.compAnim).length;
    if (anim > best) {
      best = anim;
      apid = +p;
    }
  }
}
const R = reporters.filter((r) => r.pid === apid);

/* ---- named event helpers ---------------------------------------------- */
const pick = (name, pid = null) =>
  ev.filter((e) => e.name === name && (pid == null || e.pid === pid));
const tsIn = (arr, a, b) => arr.filter((ts) => rel(ts) >= a && rel(ts) < b);
const durIn = (name, a, b, pid = null) =>
  pick(name, pid)
    .filter((e) => e.ph === "X" && rel(e.ts) >= a && rel(e.ts) < b)
    .reduce((t, e) => t + (e.dur || 0), 0) / 1000;
const countIn = (name, a, b, pid = null) =>
  pick(name, pid).filter((e) => rel(e.ts) >= a && rel(e.ts) < b).length;

const drawFrame = pick("DrawFrame").map((e) => e.ts).sort((a, b) => a - b);

console.log(`\n════ ${FILE.split("/").pop()} ════`);
console.log(
  `renderer pid ${rpid} · reporter pid ${apid} · viz FrameDisplayed n=${displayed.length} · PipelineReporter n=${R.length}`,
);
console.log(`PipelineReporter pids: ${JSON.stringify(prPids)}`);

/* ---- per-phase --------------------------------------------------------- */
console.log(
  "\nphase        | DISPLAYED frames        | PipelineReporter verdicts        | cost ms (renderer)",
);
console.log(
  "             |  n   fps   p50   p95  max| pres drop noupd %drop hiLat chkr | raster (n)  paint  commit activ",
);
for (const [name, a, b] of PHASES) {
  const D = tsIn(displayed, a, b);
  const d = [];
  for (let i = 1; i < D.length; i++) d.push((D[i] - D[i - 1]) / 1000);
  const s = [...d].sort((x, y) => x - y);
  const span = b - a;

  const win = R.filter((r) => rel(r.start) >= a && rel(r.start) < b);
  const pres = win.filter((r) => r.state.includes("PRESENTED")).length;
  const drop = win.filter((r) => r.state === "STATE_DROPPED").length;
  const noupd = win.filter((r) => r.state === "STATE_NO_UPDATE_DESIRED").length;
  const hi = win.filter((r) => r.highLat).length;
  const chk = win.filter((r) => r.checkerR || r.checkerRec).length;
  const dropPct = pres + drop ? (100 * drop) / (pres + drop) : 0;

  console.log(
    `${name}  |${String(D.length).padStart(4)} ${num((D.length / span) * 1000, 5)} ${num(
      pct(s, 50),
      5,
      1,
    )} ${num(pct(s, 95), 5, 1)} ${num(s[s.length - 1], 4, 1)}|${String(pres).padStart(
      5,
    )}${String(drop).padStart(5)}${String(noupd).padStart(6)} ${num(dropPct, 5, 1)}${String(
      hi,
    ).padStart(6)}${String(chk).padStart(5)} |${num(durIn("RasterTask", a, b), 7, 1)} (${String(
      countIn("RasterTask", a, b),
    ).padStart(4)}) ${num(durIn("Paint", a, b, rpid), 6, 1)} ${num(
      durIn("Commit", a, b, rpid),
      7,
      1,
    )} ${num(durIn("ActivateLayerTree", a, b), 5, 1)}`,
  );
}

/* ---- detail on the phase of interest (the last one before "post") ------ */
const target = PHASES.find((p) => p[0].trim() === "GROW-OUT") || PHASES[PHASES.length - 2];
const [tn, ta, tb] = target;
console.log(`\n──── ${tn.trim()} detail (${ta}‥${tb}ms) ────`);

const D = tsIn(displayed, ta, tb);
const gaps = [];
for (let i = 1; i < D.length; i++) gaps.push([(D[i] - D[i - 1]) / 1000, +rel(D[i]).toFixed(0)]);
const bad = gaps.filter(([v]) => v > 12);
console.log(
  `displayed-frame gaps >12ms: ${bad.length ? bad.map(([v, t]) => `${v.toFixed(1)}@${t}`).join("  ") : "none"}`,
);
const hist = {};
for (const [v] of gaps) {
  const k = v < 8.8 ? "<8.8 (120Hz)" : v < 17.5 ? "8.8-17.5 (60Hz)" : v < 26 ? "17.5-26" : ">26";
  hist[k] = (hist[k] || 0) + 1;
}
console.log(`gap histogram: ${JSON.stringify(hist)}`);

const win = R.filter((r) => rel(r.start) >= ta && rel(r.start) < tb);
const states = {};
for (const r of win) states[r.state] = (states[r.state] || 0) + 1;
console.log(`PipelineReporter states: ${JSON.stringify(states)}`);
const dropped = win.filter((r) => r.state === "STATE_DROPPED");
if (dropped.length)
  console.log(
    `dropped at ms: ${dropped.map((r) => rel(r.start).toFixed(0)).join(",")}\n  flags: ${JSON.stringify(
      dropped.slice(0, 3).map((r) => r.fr),
    ).slice(0, 600)}`,
  );

/* raster + paint anatomy */
const rt = ev.filter(
  (e) => e.name === "RasterTask" && rel(e.ts) >= ta && rel(e.ts) < tb,
);
const rd = rt.map((e) => e.dur / 1000).sort((a, b) => a - b);
if (rd.length)
  console.log(
    `RasterTask n=${rd.length} p50=${pct(rd, 50).toFixed(3)} p95=${pct(rd, 95).toFixed(
      3,
    )} max=${rd[rd.length - 1].toFixed(3)} total=${rd.reduce((a, b) => a + b, 0).toFixed(1)}ms  → ${(
      rd.reduce((a, b) => a + b, 0) /
      Math.max(1, D.length)
    ).toFixed(2)}ms of raster per displayed frame`,
  );

const paints = ev.filter(
  (e) => e.name === "Paint" && rel(e.ts) >= ta && rel(e.ts) < tb && e.args?.data?.clip,
);
const pc = {};
for (const p of paints) {
  const c = p.args.data.clip;
  const w = Math.round(Math.abs(c[2] - c[0]));
  const h = Math.round(Math.abs(c[5] - c[1]));
  const k = `${w}x${h}`;
  pc[k] = pc[k] || { n: 0, dur: 0, nodes: new Set() };
  pc[k].n++;
  pc[k].dur += (p.dur || 0) / 1000;
  if (p.args.data.nodeId) pc[k].nodes.add(p.args.data.nodeId);
}
console.log(
  `Paint clips: ${Object.entries(pc)
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 8)
    .map(([k, v]) => `${k}×${v.n} (${v.dur.toFixed(1)}ms, nodes ${[...v.nodes].join("/") || "?"})`)
    .join("  ")}`,
);

/* GPU-side raster/decode work */
for (const nm of [
  "GpuRasterBuffer::Playback",
  "RasterDecoderImpl::DoRasterCHROMIUM",
  "DirectRenderer::DrawRenderPass",
  "SkiaRenderer::SwapBuffers",
  "Video.FrameSubmitted",
  "VideoFrameSubmitter::SubmitFrame",
  "UpdateLayerTree",
  "PaintImage",
  "Decode Video Frame",
  "DecodeCPU",
]) {
  const n = countIn(nm, ta, tb);
  if (n) console.log(`  ${nm}: n=${n} total=${durIn(nm, ta, tb).toFixed(1)}ms`);
}
