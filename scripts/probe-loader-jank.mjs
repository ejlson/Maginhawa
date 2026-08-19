/* THE INTRO, TIMED HONESTLY — is the stage-1 reveal actually dropping frames?
 *
 * probe-loader-postcard.mjs grades the CHOREOGRAPHY (geometry, veil, hold) and
 * reports one frame-health number off a dev server at deviceScaleFactor 1 with
 * nothing else on the main thread. That number is not what a reader sees.
 *
 * This probe grades only the FRAME RATE, and it varies the things that plausibly
 * decide it:
 *
 *   • dev server vs a production `out/` build
 *   • deviceScaleFactor 1 vs 2 (raster area is 4× at dpr 2, and clip-path is a
 *     main-thread repaint, so this is the first suspect)
 *   • the hero <video> present vs blocked  (decode competing?)
 *   • `will-change: clip-path` on vs off   (does the hint help or hurt?)
 *   • the .veil layer present vs removed   (a second full-viewport layer)
 *
 * and it reports, for the stage-1 window only:
 *   p50 / p95 / p99 / max frame delta, every frame >20ms and >50ms WITH its
 *   offset from stage-1 start, per-phase effective FPS (board fade / window
 *   open / hold / grow-out), and whether the long frames cluster into bursts.
 *
 * A rAF-timestamp delta is what the page's own animation loop experienced.
 * `--screencast` additionally records CDP presented-frame arrivals, which is a
 * lower bound on what reached the screen (the ack round-trip throttles it, so
 * treat the count as a floor and the GAPS as the signal).
 *
 * ⚠️ THE ANIMATION IS NOT IN INLINE STYLE. The reveal is driven by raw
 * `element.animate()` from lib/introWindow.ts, so the browser's animation
 * timeline owns it and the inline `transform` React rendered (the shut state)
 * never changes. Consequences, both of which cost a
 * previous version of this probe a wrong answer:
 *   • el.style.clipPath keeps the value React rendered until Motion commits the
 *     final keyframe, so an inline-style reader sees TWO values in 1.5s and
 *     concludes the reveal is a slideshow. It isn't.
 *   • the board's opacity is accelerated the same way, so an INLINE read of it
 *     leaves 1 only when Motion commits — ~300ms late, a whole phase. (A
 *     getComputedStyle read does see the running animation, which is why
 *     probe-loader-postcard.mjs, which uses one, lands its phases correctly.)
 * So stage-1 time comes from the WAAPI animation's OWN currentTime, which is
 * exact, free to read, and forces no style recalc. --geometry adds a
 * getComputedStyle read per frame to grade what is actually painted; it is off
 * by default because that read forces a recalc the real page never does.
 *
 * Usage:
 *   node scripts/probe-loader-jank.mjs --port 3000 --label dev --runs 3
 *   node scripts/probe-loader-jank.mjs --port 3100 --label prod --runs 3 --dpr 2
 *   node scripts/probe-loader-jank.mjs --port 3100 --scenarios base,novideo,nowc,noveil
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/* ---------- args ------------------------------------------------------ */
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const flag = (k) => argv.includes(`--${k}`);

const PORT = arg("port", "3000");
const LABEL = arg("label", `:${PORT}`);
const RUNS = +arg("runs", 3);
const DPR = +arg("dpr", 1);
const VW = +arg("w", 1440);
const VH = +arg("h", 900);
const HEADLESS = flag("headless");
const SCREENCAST = flag("screencast");
const SCENARIOS = arg("scenarios", "base").split(",");
const CPU = +arg("cpu", 1); // Emulation.setCPUThrottlingRate — 1 = this Mac
const GEOMETRY = flag("geometry");

/* ---------- stage-1 phase map (ms from stage-1 start) ------------------ */
/* REVEAL must match Loader.tsx's REVEAL_MS: it is how a run identifies WHICH
   WAAPI animation is the reveal (the 400ms stage-0/stage-2 settles are not),
   and it is the right edge of every window below. Pass --reveal 1500 to grade
   the pre-2026-08 timeline (closed → 88% → resting → hold → grow) against the
   same report. The phase names below are that timeline's phases only when
   --reveal 1500 is passed; on the current one they are just the four windows
   the boundaries happen to cut, and the VELOCITY block is the honest read. */
const REVEAL = +arg("reveal", 1480);
const PHASES = [
  ["board fade  ", 0, 300],
  ["window open ", T_WIN_OPEN(), T_POST_IN()],
  ["postcard    ", T_POST_IN(), T_POST_OUT()],
  ["GROW-OUT    ", T_POST_OUT(), REVEAL],
  ["── whole ──", 0, REVEAL],
];
/* the loader's own timeline constants, scaled if --reveal says this is the
   old 1500ms build */
function T_WIN_OPEN() { return REVEAL === 1500 ? 220 : 200; }
function T_POST_IN() { return REVEAL === 1500 ? 560 : 400; }
function T_POST_OUT() { return REVEAL === 1500 ? 760 : 600; }

/* ---------- the in-page recorder -------------------------------------- */
function recorder(GEOMETRY) {
  window.__F = [];
  let rev = null;
  const q = (n) => document.querySelector(`[class*="Loader_${n}__"]`);
  // THE APERTURE IS FOUR PANELS NOW, NOT A CLIP-PATH. `Loader_reveal__` was
  // the single cream sheet with a `path(evenodd, …)` hole in it; the reveal is
  // four cream shutters plus the hero's film, all on one clock, so the top
  // shutter carries both the timing and — via its scaleY — the geometry.
  const holeWidth = (el) => {
    const m = getComputedStyle(el).transform.match(/matrix\(([^,]+),[^,]+,[^,]+,([^,]+)/);
    // scaleY is (1 - k) / 2, so k = 1 - 2·scaleY and the hole is k·vw wide.
    // Same number the clip-path parse used to return, so every bucket, stall
    // and velocity figure in this file's history stays comparable.
    return m ? +((1 - 2 * +m[2]) * window.innerWidth).toFixed(1) : null;
  };
  const tick = (t) => {
    if (!rev || !rev.isConnected) rev = q("shutterTop");
    // The WAAPI animation's own clock. Reading currentTime touches no style,
    // and it is the only honest zero for the phase map.
    let ct = null;
    let dur = null;
    if (rev) {
      const a = rev.getAnimations();
      if (a.length) {
        ct = a[0].currentTime;
        dur = a[0].effect.getTiming().duration;
      }
    }
    window.__F.push([t, ct, dur, GEOMETRY && rev ? holeWidth(rev) : null]);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* The hole's width. The recorder now computes it in-page from the shutter's
 * own scaleY (the clip-path string it used to parse no longer exists), so this
 * is a pass-through — kept as a named function because every call site below
 * reads better as `holeW(sample)` than as an array index. */
function holeW(v) {
  return typeof v === "number" ? v : null;
}

const pct = (sorted, p) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : null;

/* ---------- one run ---------------------------------------------------- */
async function once(scenario) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: HEADLESS ? "new" : false,
    args: [
      "--no-sandbox",
      "--autoplay-policy=no-user-gesture-required",
      "--window-position=0,0",
      `--window-size=${VW},${VH + 90}`,
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DPR });
  await page.evaluateOnNewDocument(recorder, GEOMETRY);

  if (scenario === "novideo") {
    await page.setRequestInterception(true);
    page.on("request", (r) =>
      /\.mp4($|\?)/.test(r.url()) ? r.abort().catch(() => {}) : r.continue().catch(() => {}),
    );
  }
  if (scenario === "nowc" || scenario === "noveil") {
    const css =
      scenario === "nowc"
        ? `[class*="Loader_reveal__"]{will-change:auto !important}`
        : `[class*="Loader_veil__"]{display:none !important}`;
    await page.evaluateOnNewDocument((c) => {
      document.addEventListener("DOMContentLoaded", () => {
        const s = document.createElement("style");
        s.textContent = c;
        document.head.appendChild(s);
      });
    }, css);
  }

  const cdp = await page.createCDPSession();
  const cast = [];
  if (SCREENCAST) {
    cdp.on("Page.screencastFrame", async (f) => {
      cast.push(f.metadata.timestamp * 1000);
      cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    });
  }

  const metrics = [];
  const snap = async () => {
    try {
      const { metrics: m } = await cdp.send("Performance.getMetrics");
      const o = { wall: Date.now() };
      for (const { name, value } of m) o[name] = value;
      metrics.push(o);
    } catch {
      /* session gone */
    }
  };
  await cdp.send("Performance.enable").catch(() => {});
  if (CPU > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU }).catch(() => {});

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  if (SCREENCAST)
    await cdp
      .send("Page.startScreencast", { format: "jpeg", quality: 20, everyNthFrame: 1, maxWidth: 480 })
      .catch(() => {});

  const poll = setInterval(snap, 200);
  await new Promise((r) => setTimeout(r, 8200));
  clearInterval(poll);
  if (SCREENCAST) await cdp.send("Page.stopScreencast").catch(() => {});

  const F = await page.evaluate(() => window.__F);
  const origin = await page.evaluate(() => performance.timeOrigin);
  await browser.close();
  return { F, origin, cast, metrics };
}

/* ---------- analysis --------------------------------------------------- */
function analyse({ F, origin, cast, metrics }) {
  /* Stage 1 starts when the reveal's WAAPI animation starts. Its duration
     pins which animation this is: the REVEAL-ms one is the reveal; the 400ms
     stage-0/stage-2 settles are not. */
  let s0 = -1;
  for (let i = 0; i < F.length; i++) {
    if (F[i][1] != null && F[i][2] === REVEAL) {
      s0 = i;
      break;
    }
  }
  if (s0 < 0) return null;
  // back out the real zero: this frame is already F[s0][1] ms into the reveal
  const t0 = F[s0][0] - F[s0][1];

  const rel = F.map((f) => ({ ms: f[0] - t0, w: holeW(f[3]) }));

  // per-phase stats
  const stats = {};
  for (const [name, a, b] of PHASES) {
    const win = rel.filter((r) => r.ms >= a && r.ms <= b);
    if (win.length < 2) {
      stats[name] = null;
      continue;
    }
    const d = [];
    for (let i = 1; i < win.length; i++) d.push(win[i].ms - win[i - 1].ms);
    const s = [...d].sort((x, y) => x - y);
    const span = win[win.length - 1].ms - win[0].ms;
    stats[name] = {
      n: d.length,
      fps: +((d.length / span) * 1000).toFixed(1),
      p50: +pct(s, 50).toFixed(1),
      p95: +pct(s, 95).toFixed(1),
      p99: +pct(s, 99).toFixed(1),
      max: +s[s.length - 1].toFixed(1),
      over20: d.map((v, i) => [v, win[i + 1].ms]).filter(([v]) => v > 20),
      over50: d.map((v, i) => [v, win[i + 1].ms]).filter(([v]) => v > 50),
    };
  }

  /* ── DID THE PICTURE ACTUALLY MOVE? ──
     A 120Hz rAF loop proves the loop ran, not that the animation advanced.
     If framer-motion is writing the same clip-path on consecutive frames the
     reveal steps rather than slides, which is exactly what "1 frame per
     second" describes — and no frame-delta histogram can see it. So count
     DISTINCT hole widths per phase, and the gaps between changes. */
  const geo = {};
  for (const [name, a, b] of PHASES) {
    const win = rel.filter((r) => r.ms >= a && r.ms <= b && r.w != null);
    if (win.length < 2) continue;
    let changes = 0;
    let lastChange = win[0].ms;
    const gaps = [];
    const steps = [];
    for (let i = 1; i < win.length; i++) {
      if (win[i].w !== win[i - 1].w) {
        changes++;
        gaps.push(win[i].ms - lastChange);
        steps.push(Math.abs(win[i].w - win[i - 1].w));
        lastChange = win[i].ms;
      }
    }
    const span = win[win.length - 1].ms - win[0].ms;
    const gs = [...gaps].sort((x, y) => x - y);
    geo[name] = {
      frames: win.length,
      changes,
      moveHz: +((changes / span) * 1000).toFixed(1),
      gapP50: gs.length ? +pct(gs, 50).toFixed(1) : null,
      gapP95: gs.length ? +pct(gs, 95).toFixed(1) : null,
      gapMax: gs.length ? +gs[gs.length - 1].toFixed(1) : null,
      stepMax: steps.length ? +Math.max(...steps).toFixed(1) : null,
    };
  }

  /* ── WHERE THE PICTURE STANDS STILL ──
     A 120Hz rAF loop and a per-frame clip write can both be perfect while the
     reveal still reads as a slideshow, because what the eye grades is the
     window's VELOCITY. EASE_OUT here is [0.23,1,0.32,1] — near-expo — so each
     segment spends most of its duration already arrived. Bucket the hole width
     by 50ms and report the share of the total travel each bucket carries, then
     collapse the runs of buckets that carry almost none into named stalls. */
  const gw = rel.filter((r) => r.ms >= 0 && r.ms <= REVEAL && r.w != null);
  let vel = null;
  if (gw.length > 20) {
    const at = (ms) => gw.reduce((b, r) => (Math.abs(r.ms - ms) < Math.abs(b.ms - ms) ? r : b), gw[0]);
    const total = Math.abs(at(REVEAL).w - at(0).w) || 1;
    const buckets = [];
    for (let ms = 0; ms < REVEAL; ms += 50)
      buckets.push({ ms, pct: +((Math.abs(at(ms + 50).w - at(ms).w) / total) * 100).toFixed(2) });
    const stalls = [];
    for (const b of buckets) {
      const last = stalls[stalls.length - 1];
      if (b.pct < 0.6) {
        if (last && last.end === b.ms) last.end = b.ms + 50;
        else stalls.push({ start: b.ms, end: b.ms + 50 });
      }
    }
    vel = { buckets, stalls: stalls.filter((x) => x.end - x.start >= 100), total };
  }

  // baseline: the second before stage 1 — same page, same video, no clip-path
  const base = rel.filter((r) => r.ms >= -1200 && r.ms <= -200);
  let baseFps = null,
    baseP95 = null,
    baseMax = null;
  if (base.length > 2) {
    const d = [];
    for (let i = 1; i < base.length; i++) d.push(base[i].ms - base[i - 1].ms);
    const s = [...d].sort((x, y) => x - y);
    baseFps = +((d.length / (base[base.length - 1].ms - base[0].ms)) * 1000).toFixed(1);
    baseP95 = +pct(s, 95).toFixed(1);
    baseMax = +s[s.length - 1].toFixed(1);
  }

  // screencast presented-frame gaps inside stage 1
  let castFps = null,
    castMax = null;
  if (cast.length) {
    const w0 = origin + t0;
    const inWin = cast.filter((ts) => ts >= w0 && ts <= w0 + REVEAL).sort((a, b) => a - b);
    if (inWin.length > 2) {
      const d = [];
      for (let i = 1; i < inWin.length; i++) d.push(inWin[i] - inWin[i - 1]);
      castFps = +((d.length / (inWin[inWin.length - 1] - inWin[0])) * 1000).toFixed(1);
      castMax = +Math.max(...d).toFixed(1);
    }
  }

  // main-thread attribution across the stage-1 window
  const w0 = origin + t0;
  const a = metrics.reduce((b, m) => (Math.abs(m.wall - w0) < Math.abs(b.wall - w0) ? m : b), metrics[0]);
  const bq = w0 + REVEAL;
  const b = metrics.reduce((x, m) => (Math.abs(m.wall - bq) < Math.abs(x.wall - bq) ? m : x), metrics[0]);
  const dm = {};
  for (const k of [
    "TaskDuration",
    "ScriptDuration",
    "LayoutDuration",
    "RecalcStyleDuration",
    "LayoutCount",
    "RecalcStyleCount",
  ])
    dm[k] = a[k] != null && b[k] != null ? +(b[k] - a[k]).toFixed(4) : null;
  dm.span = +((b.wall - a.wall) / 1000).toFixed(3);

  return { stats, geo, vel, baseFps, baseP95, baseMax, castFps, castMax, dm };
}

/* ---------- report ----------------------------------------------------- */
function bursts(over20) {
  // long frames within 120ms of each other are one burst
  const g = [];
  for (const [v, ms] of over20) {
    const last = g[g.length - 1];
    if (last && ms - last.end <= 120) {
      last.end = ms;
      last.n++;
      last.worst = Math.max(last.worst, v);
    } else g.push({ start: ms, end: ms, n: 1, worst: v });
  }
  return g;
}

console.log(
  `\n══ LOADER JANK · ${LABEL} · ${VW}×${VH} dpr${DPR} · ${HEADLESS ? "headless" : "HEADFUL"} ══`,
);

for (const sc of SCENARIOS) {
  const results = [];
  for (let i = 0; i < RUNS; i++) {
    const r = analyse(await once(sc));
    if (!r) {
      console.log(`  [${sc}] run ${i + 1}: stage 1 never started`);
      continue;
    }
    results.push(r);
  }
  if (!results.length) continue;

  console.log(`\n── scenario: ${sc} · ${results.length} runs ──`);
  console.log(
    `  baseline (stage 0, 1s before the reveal):  ` +
      results.map((r) => `${r.baseFps}fps/p95 ${r.baseP95}ms`).join("   "),
  );
  console.log(
    `\n  phase           fps (per run)              p50      p95      p99      max      >20ms   >50ms`,
  );
  for (const [name] of PHASES) {
    const rs = results.map((r) => r.stats[name]).filter(Boolean);
    if (!rs.length) continue;
    const col = (k) => rs.map((r) => r[k]).join("/");
    console.log(
      `  ${name}  ${col("fps").padEnd(24)} ${col("p50").padEnd(8)} ${col("p95").padEnd(8)} ` +
        `${col("p99").padEnd(8)} ${col("max").padEnd(8)} ` +
        `${rs.map((r) => r.over20.length).join("/").padEnd(7)} ${rs.map((r) => r.over50.length).join("/")}`,
    );
  }

  console.log(
    `\n  GEOMETRY — did the hole actually move?   moves/s   gap p50   gap p95   gap MAX   biggest jump`,
  );
  for (const [name] of PHASES) {
    const rs = results.map((r) => r.geo[name]).filter(Boolean);
    if (!rs.length) continue;
    const col = (k) => rs.map((r) => r[k]).join("/");
    console.log(
      `  ${name}  ${col("moveHz").padEnd(22)} ${col("gapP50").padEnd(9)} ${col("gapP95").padEnd(9)} ` +
        `${col("gapMax").padEnd(9)} ${col("stepMax")}px`,
    );
  }

  const v0 = results.find((r) => r.vel);
  if (v0) {
    console.log(`\n  VELOCITY — share of the window's total travel per 50ms (run 1)`);
    let line = "   ";
    for (const b of v0.vel.buckets)
      line += String(b.pct >= 10 ? Math.round(b.pct) : b.pct < 0.6 ? "·" : Math.round(b.pct)).padStart(4);
    console.log(line);
    console.log("   " + v0.vel.buckets.map((b) => String(b.ms / 50 % 2 ? "" : b.ms).padStart(4)).join(""));
    console.log(
      `  STALLS (≥100ms carrying <0.6%/50ms of the travel): ` +
        (v0.vel.stalls.length
          ? v0.vel.stalls.map((x) => `${x.start}–${x.end}ms (${x.end - x.start}ms)`).join("  |  ")
          : "none") +
        `\n  total still: ${v0.vel.stalls.reduce((a, x) => a + x.end - x.start, 0)}ms of ${REVEAL}ms`,
    );
  }

  results.forEach((r, i) => {
    const w = r.stats["── whole ──"];
    if (!w) return;
    const bs = bursts(w.over20);
    console.log(
      `\n  run ${i + 1}  long frames (ms@offset): ` +
        (w.over20.length
          ? w.over20.map(([v, ms]) => `${v.toFixed(0)}@${ms.toFixed(0)}`).join("  ")
          : "none"),
    );
    if (bs.length)
      console.log(
        `        bursts: ` +
          bs
            .map((b) => `${b.n}frm ${b.start.toFixed(0)}–${b.end.toFixed(0)}ms (worst ${b.worst.toFixed(0)}ms)`)
            .join(" | "),
      );
    console.log(
      `        main thread over the reveal: task ${r.dm.TaskDuration}s  script ${r.dm.ScriptDuration}s  ` +
        `style ${r.dm.RecalcStyleDuration}s (${r.dm.RecalcStyleCount})  layout ${r.dm.LayoutDuration}s (${r.dm.LayoutCount})` +
        (r.castFps ? `\n        presented (screencast): ${r.castFps}fps, worst gap ${r.castMax}ms` : ""),
    );
  });
}
console.log("");
