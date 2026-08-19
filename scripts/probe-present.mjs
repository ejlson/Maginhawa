/* DID THE FRAME REACH THE SCREEN?
 *
 * Every earlier loader probe measured one of two things:
 *   (a) requestAnimationFrame callback deltas, or
 *   (b) getComputedStyle / WAAPI currentTime geometry.
 * Neither is evidence of a PRESENTED frame. rAF runs on the main thread and
 * will sit at a flat 120Hz while the compositor drops presents — which is
 * exactly the failure a full-viewport `clip-path: path()` repaint produces,
 * because that cost lands on raster/GPU, not on the main thread.
 *
 * This probe reads the compositor's own ledger. It turns on the frame trace
 * categories, runs the intro, and parses:
 *   • PipelineReporter  — one async event per BeginFrame, terminating in
 *                         STATE_PRESENTED_ALL / STATE_DROPPED / …  This is
 *                         Chrome's ground truth for a dropped frame.
 *   • DrawFrame / ActivateLayerTree / Commit  (devtools.timeline.frame)
 *   • RasterTask / Paint / UpdateLayerTree    (devtools.timeline)  for cost
 *
 * Phase zero comes from the page itself: an in-page rAF loop watches the top
 * shutter's WAAPI animation and emits console.timeStamp("MGNHW_REVEAL_START_<ct>")
 * on the first frame it sees it running. That lands in the trace as a
 * TimeStamp event, so page time and trace time share an origin exactly.
 *
 * Usage:
 *   node scripts/probe-present.mjs --port 3001 --dpr 2 --w 1728 --h 1117
 *   node scripts/probe-present.mjs --port 3001 --dpr 1 --runs 3
 *   node scripts/probe-present.mjs --port 3001 --dpr 2 --nogpuraster
 *   node scripts/probe-present.mjs --names        (dump trace event histogram)
 */
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const flag = (k) => argv.includes(`--${k}`);

const PORT = arg("port", "3001");
const DPR = +arg("dpr", 2);
const VW = +arg("w", 1728);
const VH = +arg("h", 1117);
const RUNS = +arg("runs", 2);
const LABEL = arg("label", `dpr${DPR} ${VW}x${VH}`);
const NOGPURASTER = flag("nogpuraster");
const NAMES = flag("names");
const SAVE = arg("save", "");
const REVEAL = 1480;

/* The reveal is ONE continuous spring now — there is no postcard beat and no
 * separate grow-out. These windows are cuts through a single expansion, kept
 * at the old boundaries so the numbers stay comparable with the clip-path and
 * four-segment eras: "point" is while the aperture is still small, "EXPANSION"
 * is the second half where the layers are largest and raster cost, if there
 * were any, would show up worst. */
const PHASES = [
  ["pre-reveal ", -900, 0],
  ["board fade ", 0, 200],
  ["point      ", 200, 400],
  ["settle     ", 400, 560],
  ["hold       ", 560, 730],
  ["EXPANSION  ", 730, 1480],
  ["post       ", 1480, 2000],
];

/* The phase the per-run detail block dumps. Named off PHASES rather than
 * hard-coded, because renaming a phase used to crash the reporter after the
 * table had already printed — the numbers were fine and the run looked failed. */
const HOT = PHASES.find((p) => p[0].trim() === "EXPANSION")[0];

const FAT = flag("fat");
const CATS = [
  "devtools.timeline",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "disabled-by-default-display.framedisplayed",
  "blink.user_timing",
  "media",
  ...(FAT ? ["cc", "viz", "gpu", "benchmark", "toplevel"] : []),
];

/* ---------- in-page: mark the reveal's true zero into the trace --------- */
function recorder(REVEAL) {
  window.__M = { t0: null, ct0: null, frames: [] };
  let rev = null;
  let fired = false;
  let firedEnd = false;
  const q = (n) => document.querySelector(`[class*="Loader_${n}__"]`);
  const tick = (t) => {
    // `Loader_reveal__` was the single clip-path sheet. The reveal is four
    // cream shutters plus the hero's film now, all started from one call site
    // with one explicit startTime, so ANY of them carries the reveal's clock —
    // the top shutter is simply the first one the loader renders.
    if (!rev || !rev.isConnected) rev = q("shutterTop");
    if (rev) {
      for (const an of rev.getAnimations()) {
        let d = an.effect.getTiming().duration;
        if (typeof d !== "number") continue;
        if (Math.round(d) !== REVEAL) continue;
        const ct = typeof an.currentTime === "number" ? an.currentTime : null;
        if (ct == null) continue;
        if (!fired) {
          fired = true;
          window.__M.t0 = t - ct;
          window.__M.ct0 = ct;
          // encoded to hundredths of a ms so the trace mark can be rewound
          console.timeStamp("MGNHW_REVEAL_START_" + Math.round(ct * 100));
        }
        if (!firedEnd && ct >= REVEAL - 2) {
          firedEnd = true;
          console.timeStamp("MGNHW_REVEAL_END");
        }
      }
    }
    if (window.__M.t0 != null) window.__M.frames.push(+(t - window.__M.t0).toFixed(2));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const pct = (s, p) =>
  s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : null;
const f1 = (v) => (v == null ? "  —  " : v.toFixed(1).padStart(5));

/* ---------- one run ---------------------------------------------------- */
async function once() {
  const args = [
    "--no-sandbox",
    "--autoplay-policy=no-user-gesture-required",
    "--window-position=0,0",
    `--window-size=${VW},${VH + 90}`,
  ];
  if (NOGPURASTER) args.push("--disable-gpu-rasterization");

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args,
    defaultViewport: null,
  });

  const bsess = await browser.target().createCDPSession();
  let gpu = null;
  try {
    const info = await bsess.send("SystemInfo.getInfo");
    const fs = info.gpu?.featureStatus || {};
    gpu = {
      gl: info.gpu?.auxAttributes?.glRenderer || info.gpu?.devices?.[0]?.deviceString || "?",
      rasterization: fs.rasterization,
      gpu_compositing: fs.gpu_compositing,
      canvas: fs.canvas,
    };
  } catch {
    /* older build */
  }

  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DPR });
  await page.evaluateOnNewDocument(recorder, REVEAL);
  const cdp = await page.createCDPSession();

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  // let stage 0 settle in; MIN_TIME is 2600ms so the reveal cannot start
  // before then. Start tracing at 1.6s so the trace is small but covers it.
  await new Promise((r) => setTimeout(r, 1600));

  await cdp.send("Tracing.start", {
    transferMode: "ReturnAsStream",
    streamFormat: "json",
    traceConfig: {
      recordMode: "recordAsMuchAsPossible",
      includedCategories: CATS,
    },
  });

  const done = new Promise((res) => cdp.once("Tracing.tracingComplete", res));
  await new Promise((r) => setTimeout(r, 5000));
  await cdp.send("Tracing.end");
  const { stream } = await done;

  let json = "";
  for (;;) {
    const { data, base64Encoded, eof } = await cdp.send("IO.read", {
      handle: stream,
      size: 4 << 20,
    });
    json += base64Encoded ? Buffer.from(data, "base64").toString("utf8") : data;
    if (eof) break;
  }
  await cdp.send("IO.close", { handle: stream }).catch(() => {});

  const M = await page.evaluate(() => window.__M);
  const dpr = await page.evaluate(() => ({ dpr: devicePixelRatio, w: innerWidth, h: innerHeight }));
  if (gpu) gpu.page = dpr;
  await browser.close();
  return { json, M, gpu };
}

/* ---------- parse ------------------------------------------------------ */
function parse(json) {
  let obj;
  try {
    obj = JSON.parse(json);
  } catch {
    // truncated array -> repair
    obj = JSON.parse(json.replace(/,\s*$/, "") + "]");
  }
  return Array.isArray(obj) ? obj : obj.traceEvents;
}

function analyse(ev, M) {
  /* --- zero --- */
  let t0 = null;
  for (const e of ev) {
    const msg =
      e.args?.data?.message || e.args?.message || (typeof e.name === "string" ? e.name : "");
    if (typeof msg === "string" && msg.startsWith("MGNHW_REVEAL_START_")) {
      const ct = +msg.slice("MGNHW_REVEAL_START_".length) / 100;
      t0 = e.ts - ct * 1000;
      break;
    }
  }
  if (t0 == null) return { err: "no MGNHW_REVEAL_START in trace" };
  const rel = (ts) => (ts - t0) / 1000; // ms from reveal start

  /* --- PipelineReporter: Chrome's own dropped-frame ledger --- */
  // async: ph b/e (or S/F on older). Terminal state lives on the END event's
  // args (sometimes on the begin's args.chrome_frame_reporter).
  const pr = new Map();
  for (const e of ev) {
    if (e.name !== "PipelineReporter") continue;
    const key = `${e.pid}:${e.id2?.local ?? e.id2?.global ?? e.id}`;
    if (e.ph === "b" || e.ph === "S") {
      pr.set(key, { start: e.ts, end: null, state: null, args: {} });
    } else if (e.ph === "e" || e.ph === "F") {
      const r = pr.get(key);
      if (r) {
        r.end = e.ts;
        r.state = e.args?.state ?? e.args?.chrome_frame_reporter?.state ?? null;
        r.args = e.args || {};
      }
    } else if (e.ph === "X") {
      pr.set(key + ":" + e.ts, {
        start: e.ts,
        end: e.ts + (e.dur || 0),
        state: e.args?.state ?? e.args?.chrome_frame_reporter?.state ?? null,
        args: e.args || {},
      });
    }
  }
  const reporters = [...pr.values()].filter((r) => r.end != null);

  /* --- presented frames --- */
  // Primary: PipelineReporter terminating PRESENTED. Fallback: DrawFrame.
  const presented = reporters
    .filter((r) => String(r.state || "").includes("PRESENTED"))
    .map((r) => r.end)
    .sort((a, b) => a - b);
  const dropped = reporters
    .filter((r) => String(r.state || "").includes("DROPPED"))
    .map((r) => r.end)
    .sort((a, b) => a - b);

  const draw = ev
    .filter((e) => e.name === "DrawFrame")
    .map((e) => e.ts)
    .sort((a, b) => a - b);
  const activate = ev.filter((e) => e.name === "ActivateLayerTree").map((e) => e.ts);
  const commit = ev.filter((e) => e.name === "Commit").map((e) => e.ts);
  const beginMain = ev.filter((e) => e.name === "BeginMainThreadFrame").map((e) => e.ts);
  const droppedEv = ev.filter((e) => e.name === "DroppedFrame").map((e) => e.ts);

  /* --- per-phase --- */
  const rows = [];
  for (const [name, a, b] of PHASES) {
    const inWin = (arr) => arr.filter((ts) => rel(ts) >= a && rel(ts) < b);
    const P = inWin(presented);
    const D = inWin(dropped);
    const DF = inWin(draw);
    const span = b - a;

    const d = [];
    for (let i = 1; i < P.length; i++) d.push((P[i] - P[i - 1]) / 1000);
    const s = [...d].sort((x, y) => x - y);

    // raster / paint cost inside the window
    const cost = (nm) =>
      ev
        .filter(
          (e) =>
            e.name === nm &&
            e.ph === "X" &&
            rel(e.ts) >= a &&
            rel(e.ts) < b,
        )
        .reduce((t, e) => t + (e.dur || 0), 0) / 1000;

    rows.push({
      name,
      span,
      presented: P.length,
      dropped: D.length,
      draw: DF.length,
      pFps: +((P.length / span) * 1000).toFixed(1),
      p50: s.length ? +pct(s, 50).toFixed(1) : null,
      p95: s.length ? +pct(s, 95).toFixed(1) : null,
      max: s.length ? +s[s.length - 1].toFixed(1) : null,
      over16: d.filter((v) => v > 16.7).length,
      over25: d.filter((v) => v > 25).length,
      raster: +cost("RasterTask").toFixed(1),
      paint: +cost("Paint").toFixed(1),
      updLayer: +cost("UpdateLayerTree").toFixed(1),
      commit: +cost("Commit").toFixed(1),
      activate: +cost("ActivateLayerTree").toFixed(1),
      rasterN: ev.filter(
        (e) => e.name === "RasterTask" && rel(e.ts) >= a && rel(e.ts) < b,
      ).length,
      gaps: d
        .map((v, i) => [v, +rel(P[i + 1]).toFixed(0)])
        .filter(([v]) => v > 20),
    });
  }

  /* --- paint dimensions during the grow-out --- */
  const paints = ev
    .filter(
      (e) =>
        (e.name === "Paint" || e.name === "PaintSetup") &&
        rel(e.ts) >= 600 &&
        rel(e.ts) < 1300 &&
        e.args?.data?.clip,
    )
    .map((e) => {
      const c = e.args.data.clip;
      return {
        w: Math.abs(c[2] - c[0]),
        h: Math.abs(c[5] - c[1]),
        dur: e.dur,
        layer: e.args.data.layerId,
        node: e.args.data.nodeId,
      };
    });

  /* --- raster task sizes during grow-out --- */
  const rasterGrow = ev.filter(
    (e) => e.name === "RasterTask" && rel(e.ts) >= 600 && rel(e.ts) < 1300,
  );
  const rasterDurs = rasterGrow.map((e) => e.dur / 1000).sort((a, b) => a - b);

  /* --- pipeline breakdown for the grow-out --- */
  const growReporters = reporters.filter(
    (r) => rel(r.start) >= 600 && rel(r.start) < 1300,
  );
  const stateHist = {};
  for (const r of growReporters) {
    const k = r.state || "(none)";
    stateHist[k] = (stateHist[k] || 0) + 1;
  }

  return {
    rows,
    counts: {
      reporters: reporters.length,
      presented: presented.length,
      dropped: dropped.length,
      draw: draw.length,
      activate: activate.length,
      commit: commit.length,
      beginMain: beginMain.length,
      droppedEv: droppedEv.length,
    },
    paints,
    rasterDurs,
    rasterGrowN: rasterGrow.length,
    stateHist,
    pageFrames: M?.frames || [],
  };
}

/* ---------- main ------------------------------------------------------- */
const all = [];
for (let i = 0; i < RUNS; i++) {
  const { json, M, gpu } = await once();
  const ev = parse(json);
  if (SAVE && i === 0) writeFileSync(SAVE, json);
  if (NAMES) {
    const h = {};
    for (const e of ev) h[e.name] = (h[e.name] || 0) + 1;
    const top = Object.entries(h).sort((a, b) => b[1] - a[1]).slice(0, 70);
    console.log(`\n=== trace event histogram (${ev.length} events) ===`);
    for (const [n, c] of top) console.log(String(c).padStart(7), n);
    // also: which categories actually came back
    const cats = {};
    for (const e of ev) for (const c of String(e.cat || "").split(",")) cats[c] = (cats[c] || 0) + 1;
    console.log("\n--- categories ---");
    for (const [n, c] of Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 40))
      console.log(String(c).padStart(7), n);
    process.exit(0);
  }
  const r = analyse(ev, M);
  r.gpu = gpu;
  all.push(r);
  if (r.err) {
    console.log(`run ${i + 1}: ${r.err}`);
    continue;
  }
}

const ok = all.filter((r) => !r.err);
if (!ok.length) {
  console.log("no usable runs");
  process.exit(1);
}

console.log(`\n╔══ PRESENTED FRAMES · ${LABEL}${NOGPURASTER ? " · NO GPU RASTER" : ""} ══`);
console.log(`║ gpu: ${JSON.stringify(ok[0].gpu)}`);
console.log(`║ runs: ${ok.length}   trace counters (run 1): ${JSON.stringify(ok[0].counts)}`);
console.log("╚".padEnd(78, "═"));

console.log(
  "\nphase        pres drop  fps  |  p50   p95   max  >16.7 >25 | raster(ms) rTasks paint upd commit",
);
for (let p = 0; p < PHASES.length; p++) {
  const rs = ok.map((r) => r.rows[p]);
  const avg = (k) => rs.reduce((t, r) => t + (r[k] ?? 0), 0) / rs.length;
  const r = rs[0];
  console.log(
    `${r.name}  ${String(Math.round(avg("presented"))).padStart(4)} ${String(
      Math.round(avg("dropped")),
    ).padStart(4)} ${avg("pFps").toFixed(1).padStart(5)} | ${f1(avg("p50"))} ${f1(
      avg("p95"),
    )} ${f1(avg("max"))} ${String(Math.round(avg("over16"))).padStart(5)} ${String(
      Math.round(avg("over25")),
    ).padStart(3)} | ${avg("raster").toFixed(1).padStart(8)} ${String(
      Math.round(avg("rasterN")),
    ).padStart(6)} ${avg("paint").toFixed(1).padStart(6)} ${avg("updLayer")
      .toFixed(1)
      .padStart(4)} ${avg("commit").toFixed(1).padStart(6)}`,
  );
}

for (const [i, r] of ok.entries()) {
  const g = r.rows.find((x) => x.name === HOT);
  console.log(
    `\nrun ${i + 1} ${HOT.trim()} presented gaps >20ms: ${
      g.gaps.length ? g.gaps.map(([v, t]) => `${v.toFixed(1)}ms@${t}`).join("  ") : "none"
    }`,
  );
  console.log(`run ${i + 1} ${HOT.trim()} PipelineReporter states: ${JSON.stringify(r.stateHist)}`);
  if (r.rasterDurs.length) {
    const s = r.rasterDurs;
    console.log(
      `run ${i + 1} ${HOT.trim()} RasterTask: n=${s.length} p50=${pct(s, 50).toFixed(
        2,
      )}ms p95=${pct(s, 95).toFixed(2)}ms max=${s[s.length - 1].toFixed(2)}ms total=${s
        .reduce((a, b) => a + b, 0)
        .toFixed(1)}ms`,
    );
  } else console.log(`run ${i + 1} ${HOT.trim()} RasterTask: none recorded`);
  if (r.paints.length) {
    const uniq = {};
    for (const p of r.paints) {
      const k = `${Math.round(p.w)}x${Math.round(p.h)}`;
      uniq[k] = (uniq[k] || 0) + 1;
    }
    console.log(
      `run ${i + 1} ${HOT.trim()} Paint clips: ${Object.entries(uniq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([k, c]) => `${k}×${c}`)
        .join("  ")}`,
    );
  } else console.log(`run ${i + 1} ${HOT.trim()} Paint: none recorded (nothing repainted)`);
}
