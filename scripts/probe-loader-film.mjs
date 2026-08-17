/* THE INTRO, MEASURED — components/Loader.tsx full path.
 *
 * Two things at once, because neither alone settles the question "does the N
 * BECOME the rectangle":
 *
 *   1. a per-frame numeric trace (rAF) of the reveal's computed clip-path
 *      parsed back into the hole's x/y/w/h/r, plus the painted boxes and
 *      transforms of the two letter groups and the centre N;
 *   2. a real filmstrip of PNGs across the split → full-bleed window.
 *
 * Screenshots cost 30–60ms each, so the run is done TWICE: a clean pass with
 * no captures (that pass owns the timings and the frame-health count) and a
 * capture pass (that pass owns the pictures). Shot times come from
 * Date.now() - performance.timeOrigin, so they live on the same clock as the
 * trace without paying a round-trip per frame; files are named by their
 * measured offset from stage-1 start, not by the offset we asked for.
 *
 * A fresh browser profile per run means sessionStorage "mgnhw:introSeen" is
 * empty and the LONG path plays. Nothing here writes to the app.
 *
 * Usage: node scripts/probe-loader-film.mjs [port] [outDir]
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const OUT =
  process.argv[3] ||
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/24c5190e-f8d8-4351-a2cc-562647de9bac/scratchpad/loader";

const s = (ms) => new Promise((r) => setTimeout(r, ms));
const n1 = (v) => (v == null ? null : +v.toFixed(1));

/* ---------- the in-page recorder ------------------------------------ */
/* mode "lite" records only frame deltas (so the frame-health number isn't
   measuring our own getComputedStyle calls); "full" records geometry. */
function recorder(mode) {
  window.__F = [];
  window.__T = [];
  const sel = (n) => document.querySelector(`[class*="Loader_${n}__"]`);
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [
      +r.x.toFixed(1),
      +r.y.toFixed(1),
      +r.width.toFixed(1),
      +r.height.toFixed(1),
    ];
  };
  /* ── PAINTED, OR ONLY WRITTEN? ──────────────────────────────────────
     This rAF is registered at document-start, so it runs BEFORE framer's
     own rAF callback every frame — it therefore sees React's style-prop
     commit (the literal `style={{clipPath: startClip}}` on .reveal) in the
     frames where framer has not yet written over it. Those reads look like
     one-frame snap-backs and are NOT. __P samples the same values from a
     setTimeout(0) scheduled by this rAF, which lands after every rAF
     callback for the frame — i.e. the value that actually composited.
     Anything present in __T but absent from __P never reached the screen. */
  window.__P = [];
  const peek = () => {
    const r = sel("reveal");
    const c = sel("center");
    if (!r) return null;
    const d = getComputedStyle(r).clipPath.match(/"([^"]+)"/)?.[1] ?? "";
    const nums = (d.slice(d.indexOf("M", 1)).match(/-?\d*\.?\d+/g) || []).map(
      Number,
    );
    return {
      t: +performance.now().toFixed(1),
      w: nums.length > 24 ? +(nums[8] - nums[24]).toFixed(2) : null,
      op: c ? +getComputedStyle(c).opacity : null,
    };
  };
  /* ── THE GLYPH, NOT THE CELL ────────────────────────────────────────
     getBoundingClientRect on the centre cell reports the LINE box, which
     carries line-height air the letter does not paint — comparing THAT to
     the hole flatters or damns the congruence for the wrong reason. Measure
     the N's real ink once, while the cell is still unscaled, the same way
     Loader.tsx's measureNSeed does (canvas TextMetrics on the cell's own
     computed font), and additionally resolve the ink's vertical centre
     against the cell centre — the transform-origin — because that offset is
     precisely the error the seed inherits. Recomputed per frame from the
     live scale, this gives the letter's painted box in viewport pixels. */
  window.__G = null;
  const measureGlyph = () => {
    const c = sel("center");
    if (!c || window.__G) return;
    const m = getComputedStyle(c).transform;
    const p = m === "none" ? [1, 0, 0, 1] : m.match(/-?\d*\.?\d+/g).map(Number);
    if (Math.abs(p[0] - 1) > 0.001 || Math.abs(p[3] - 1) > 0.001) return; // scaled already
    try {
      const box = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const t = ctx.measureText("N");
      const w = t.actualBoundingBoxLeft + t.actualBoundingBoxRight;
      const h = t.actualBoundingBoxAscent + t.actualBoundingBoxDescent;
      if (!(w > 8 && h > 8)) return;
      // baseline inside the line box, from the font's own em-box metrics
      const fa = t.fontBoundingBoxAscent,
        fd = t.fontBoundingBoxDescent;
      const baseline = box.top + (box.height - (fa + fd)) / 2 + fa;
      const inkCy = baseline + (t.actualBoundingBoxDescent - t.actualBoundingBoxAscent) / 2;
      window.__G = {
        w: +w.toFixed(2),
        h: +h.toFixed(2),
        cellCx: +(box.left + box.width / 2).toFixed(2),
        cellCy: +(box.top + box.height / 2).toFixed(2),
        cellH: +box.height.toFixed(2),
        inkCy: +inkCy.toFixed(2),
        dy: +(inkCy - (box.top + box.height / 2)).toFixed(2),
      };
    } catch {
      /* leave __G null; the report says so */
    }
  };
  /* ── PASS A NEEDS ITS OWN STAGE-1 MARKER ────────────────────────────
     The clean pass records no geometry, so it used to be windowed by a
     guess ("first frame + 2800…5600ms"). Measured, that window CLOSED
     about 100ms into the reveal — the clean frame-health number was
     grading the split-flap board and almost none of the animation it was
     quoted for. One getComputedStyle on ONE element per frame, stopped
     the moment it fires, is a few microseconds and buys a real window. */
  window.__S = null;
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    window.__F.push([+now.toFixed(1), +(now - last).toFixed(2)]);
    last = now;
    if (window.__S === null) {
      const c = sel("center");
      const tf = c && getComputedStyle(c).transform;
      if (tf && tf !== "none") {
        const p = tf.match(/-?\d*\.?\d+/g).map(Number);
        const a = p.length === 6 ? p[0] : p[0];
        const b = p.length === 6 ? p[1] : p[1];
        if (Math.abs(b) > 0.001 || Math.abs(a - 1) > 0.001)
          window.__S = +now.toFixed(1);
      }
    }
    if (mode === "full") measureGlyph();
    if (mode === "full")
      setTimeout(() => {
        const s = peek();
        if (s) window.__P.push(s);
      }, 0);
    if (mode === "full") {
      const rev = sel("reveal");
      const c = sel("center");
      const inner = c && c.querySelector('[class*="Loader_flipInner__"]');
      const groups = [...document.querySelectorAll('[class*="Loader_group__"]')];
      const v = document.querySelector("video");
      const count = sel("count");
      window.__T.push({
        t: +now.toFixed(1),
        ov: sel("overlay") ? 1 : 0,
        pct: count ? count.textContent : null,
        clip: rev ? getComputedStyle(rev).clipPath : null,
        cTf: c ? getComputedStyle(c).transform : null,
        cOp: c ? +getComputedStyle(c).opacity : null,
        iOp: inner ? +getComputedStyle(inner).opacity : null,
        cR: rect(c),
        iR: rect(inner),
        gTf: groups.map((g) => getComputedStyle(g).transform),
        gOp: groups.map((g) => +getComputedStyle(g).opacity),
        gR: groups.map(rect),
        vid: v
          ? {
              rs: v.readyState,
              ct: +v.currentTime.toFixed(3),
              p: v.paused,
              r: rect(v),
            }
          : null,
        body: document.body.className,
      });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- clip-path -> hole rect ---------------------------------- */
/* holePath() emits `M0,0 H W V H H0 Z  M x+r,y H x2-r A.. V y2-r A.. H x+r
   A.. V y+r A.. Z`. The inner subpath is everything after the second M. */
/* NB the COMPUTED value re-serialises with spaces ("M 0 0 H 1440 …") and the
   inner subpath carries exactly 34 numbers:
     0:x+r 1:y  2:x2-r  3..9:A(r,r,0,0,1,x2,y+r)  10:y2-r
     11..17:A(r,r,0,0,1,x2-r,y2)  18:x+r  19..25:A(r,r,0,0,1,x,y2-r)
     26:y+r  27..34:A(r,r,0,0,1,x+r,y) */
function parseHole(clip) {
  if (!clip || clip === "none") return null;
  const d = clip.match(/"([^"]+)"/)?.[1] ?? clip;
  const i = d.indexOf("M", 1);
  if (i < 0) return null;
  const nums = (d.slice(i).match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).map(Number);
  if (nums.length < 34) return null;
  const y = nums[1];
  const r = nums[3];
  const x2 = nums[8];
  const y2 = nums[17];
  const x = nums[24];
  return { x: n1(x), y: n1(y), w: n1(x2 - x), h: n1(y2 - y), r: n1(r) };
}

function m41(tf) {
  if (!tf || tf === "none") return 0;
  const p = tf.match(/-?\d*\.?\d+(?:e-?\d+)?/g).map(Number);
  return p.length === 6 ? p[4] : p[12];
}
function matrix(tf) {
  if (!tf || tf === "none") return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const p = tf.match(/-?\d*\.?\d+(?:e-?\d+)?/g).map(Number);
  return p.length === 6
    ? { a: p[0], b: p[1], c: p[2], d: p[3], e: p[4], f: p[5] }
    : { a: p[0], b: p[1], c: p[4], d: p[5], e: p[12], f: p[13] };
}

/* stage 1 begins the frame the centre N's matrix leaves identity */
function splitIndex(T) {
  for (let i = 0; i < T.length; i++) {
    const m = matrix(T[i].cTf);
    if (Math.abs(m.b) > 0.001 || Math.abs(m.a - 1) > 0.001) return i;
  }
  return -1;
}

async function run({ capture }) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(recorder, capture ? "full" : "lite");

  const shots = [];
  /* page.screenshot() costs ~110ms a frame — far too coarse for a 2s reveal.
     Page.startScreencast pushes a frame per COMPOSITED frame with a swap
     timestamp, so the strip is as dense as the animation actually is. */
  let cdp = null;
  if (capture) {
    cdp = await page.createCDPSession();
    cdp.on("Page.screencastFrame", async (f) => {
      shots.push({
        ts: f.metadata.timestamp * 1000, // ms, same epoch as Date.now()
        buf: Buffer.from(f.data, "base64"),
      });
      try {
        await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId });
      } catch {
        /* session closed */
      }
    });
  }

  await page.goto(`http://localhost:${PORT}/`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const origin = await page.evaluate(() => performance.timeOrigin);

  if (capture) {
    await cdp.send("Page.startScreencast", {
      format: "png",
      maxWidth: 1440,
      maxHeight: 900,
      everyNthFrame: 1,
    });
    await s(11500);
    await cdp.send("Page.stopScreencast").catch(() => {});
  } else {
    await s(11500);
  }

  // shot times onto the page clock
  for (const sh of shots) sh.at = sh.ts - origin;
  const T = capture ? await page.evaluate(() => window.__T) : [];
  const P = capture ? await page.evaluate(() => window.__P) : [];
  const G = capture ? await page.evaluate(() => window.__G) : null;
  const F = await page.evaluate(() => window.__F);
  const S = await page.evaluate(() => window.__S);
  await browser.close();
  return { T, P, G, F, S, shots };
}

/* ---------------------------------------------------------------- main */
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT))
  fs.rmSync(path.join(OUT, f), { recursive: true, force: true });

console.log("== pass A: clean timing (no screenshots) ==");
const a = await run({ capture: false });

console.log("== pass B: trace + filmstrip ==");
const b = await run({ capture: true });

const T = b.T;
const si = splitIndex(T);
if (si < 0) {
  console.error("!! never detected stage 1 — the N never left identity");
  process.exit(1);
}
const t0 = T[si].t;
console.log(`stage-1 start at page t=${t0}ms (sample ${si} of ${T.length})`);

/* ---- write the filmstrip with measured offsets ----
   the screencast fires per composited frame, so thin it to a readable strip:
   every ~70ms across -400 → +2600ms, and every frame in the two boundary
   windows where a one-frame pop would live. */
const inWin = b.shots
  .map((sh) => ({ off: Math.round(sh.at - t0), buf: sh.buf }))
  .filter((sh) => sh.off >= -520 && sh.off <= 4700)
  .sort((a, c) => a.off - c.off);
let kept = 0;
let lastOff = -1e9;
for (const sh of inWin) {
  const dense =
    (sh.off > 300 && sh.off < 780) || (sh.off > 1380 && sh.off < 1660);
  if (!dense && sh.off - lastOff < 70) continue;
  lastOff = sh.off;
  const name =
    (sh.off < 0 ? "neg" : "") +
    String(Math.abs(sh.off)).padStart(4, "0") +
    "ms.png";
  fs.writeFileSync(path.join(OUT, name), sh.buf);
  kept++;
}
console.log(
  `filmstrip: ${kept} PNGs written (of ${b.shots.length} screencast frames, ` +
    `${inWin.length} inside the window) -> ${OUT}`,
);

/* ---- the table ---- */
const rows = [];
for (let i = 0; i < T.length; i++) {
  const r = T[i];
  const off = Math.round(r.t - t0);
  if (off < -420 || off > 4700) continue;
  const hole = parseHole(r.clip);
  const m = matrix(r.cTf);
  rows.push({
    ms: off,
    ov: r.ov,
    hx: hole?.x,
    hy: hole?.y,
    hw: hole?.w,
    hh: hole?.h,
    hr: hole?.r,
    // N: painted box of the glyph cell, in viewport coords
    nx: r.iR?.[0],
    ny: r.iR?.[1],
    nw: r.iR?.[2],
    nh: r.iR?.[3],
    nOp: r.cOp,
    iOp: r.iOp,
    rot: n1((Math.atan2(m.b, m.a) * 180) / Math.PI),
    sx: n1(Math.hypot(m.a, m.b)),
    sxr: +Math.hypot(m.a, m.b).toFixed(4),
    syr: +Math.hypot(m.c, m.d).toFixed(4),
    sy: n1(Math.hypot(m.c, m.d)),
    gL: n1(m41(r.gTf?.[0])),
    gR: n1(m41(r.gTf?.[1])),
    gOp: r.gOp?.[0],
    gOpR: r.gOp?.[1],
    // painted boxes of the two departing groups, so a later pass can ask two
    // questions the transform alone can't answer: is any legible letter being
    // sliced by a viewport edge, and does the widening N ever reach them?
    gLbox: r.gR?.[0],
    gRbox: r.gR?.[1],
    cellBox: r.cR,
    vct: r.vid?.ct,
    vrs: r.vid?.rs,
    pct: r.pct,
  });
}
fs.writeFileSync(
  path.join(OUT, "trace.json"),
  JSON.stringify({ t0, glyph: b.G, rows, framesA: a.F, framesB: b.F }, null, 1),
);

const f = (v, w) => String(v == null ? "-" : v).padStart(w);
console.log(
  "   ms ov | hole x,y     w x h      r  | N box x,y     w x h    op   rot  sx  sy | gL     gR    gop | vid ct   rs",
);
let prev = null;
for (const r of rows) {
  const step = Math.abs(r.ms) < 60 || (r.ms > 300 && r.ms < 780) ? 0 : 60;
  if (prev != null && r.ms - prev < step) continue;
  prev = r.ms;
  console.log(
    f(r.ms, 5) +
      f(r.ov, 3) +
      " | " +
      f(r.hx, 6) +
      "," +
      f(r.hy, 6) +
      f(r.hw, 8) +
      " x" +
      f(r.hh, 7) +
      f(r.hr, 5) +
      " | " +
      f(r.nx, 6) +
      "," +
      f(r.ny, 6) +
      f(r.nw, 7) +
      " x" +
      f(r.nh, 6) +
      f(n1(r.nOp * 100) ?? "-", 5) +
      f(r.rot, 6) +
      f(r.sx, 4) +
      f(r.sy, 4) +
      " |" +
      f(r.gL, 8) +
      f(r.gR, 7) +
      f(n1(r.gOp * 100), 5) +
      " |" +
      f(r.vct, 7) +
      f(r.vrs, 3),
  );
}

/* ---- one-frame pops: any sample whose hole/opacity jumps against the trend */
console.log("\n== discontinuities (frame-to-frame jumps) ==");
for (let i = 1; i < rows.length - 1; i++) {
  const p = rows[i - 1],
    c = rows[i],
    q = rows[i + 1];
  const dw = c.hw != null && p.hw != null ? c.hw - p.hw : 0;
  const dw2 = q.hw != null && c.hw != null ? q.hw - c.hw : 0;
  if (Math.sign(dw) * Math.sign(dw2) < 0 && Math.abs(dw) > 40) {
    console.log(
      `  ${c.ms}ms HOLE reversal: w ${p.hw} -> ${c.hw} -> ${q.hw} (h ${p.hh} -> ${c.hh} -> ${q.hh})`,
    );
  }
  if (c.nOp != null && p.nOp != null && q.nOp != null) {
    const d1 = c.nOp - p.nOp,
      d2 = q.nOp - c.nOp;
    if (Math.sign(d1) * Math.sign(d2) < 0 && Math.abs(d1) > 0.25)
      console.log(
        `  ${c.ms}ms N-OPACITY spike: ${p.nOp} -> ${c.nOp} -> ${q.nOp}`,
      );
  }
}

/* ---- frame health over the reveal window ---- */
const win = (F, lo, hi) => F.filter(([t]) => t >= lo && t <= hi);
const health = (F, lo, hi, label) => {
  const w = win(F, lo, hi);
  const long = w.filter(([, d]) => d > 32);
  const mid = w.filter(([, d]) => d > 20 && d <= 32);
  const worst = w.reduce((m, x) => (x[1] > m[1] ? x : m), [0, 0]);
  console.log(
    `${label}: ${w.length} frames, ${long.length} >32ms, ${mid.length} 20-32ms, ` +
      `worst ${worst[1]}ms @ t=${worst[0]}, mean ${(
        w.reduce((s, x) => s + x[1], 0) / Math.max(1, w.length)
      ).toFixed(1)}ms`,
  );
  if (long.length) console.log("   long frames:", long.map(([t, d]) => `${Math.round(t - t0)}ms:${d}`).join(" "));
};
console.log("\n== frame health ==");
health(b.F, t0 - 400, t0 + 2400, "pass B (traced + screenshotting)");
/* pass A carries its own stage-1 marker (__S), so its window is the SAME
   -400…+2400 span around the real start rather than a guess. */
if (a.S == null) {
  console.log("pass A: !! stage-1 marker never fired — no clean window to report");
} else {
  const wA = a.F.filter(([t]) => t >= a.S - 400 && t <= a.S + 2400);
  const longA = wA.filter(([, d]) => d > 32);
  const midA = wA.filter(([, d]) => d > 20 && d <= 32);
  const worstA = wA.reduce((m, x) => (x[1] > m[1] ? x : m), [0, 0]);
  console.log(
    `pass A (clean, stage1 -400..+2400ms): ${wA.length} frames, ${longA.length} >32ms, ` +
      `${midA.length} 20-32ms, worst ${worstA[1]}ms @ t+${Math.round(worstA[0] - a.S)}ms, mean ${(
        wA.reduce((s, x) => s + x[1], 0) / Math.max(1, wA.length)
      ).toFixed(1)}ms`,
  );
  if (longA.length)
    console.log("   long frames:", longA.map(([t, d]) => `${Math.round(t - a.S)}ms:${d}`).join(" "));
}

/* ---- N vs hole mismatch ---- */
console.log("\n== N painted box vs hole rect ==");
for (const r of rows) {
  if (r.ms < 0 || r.ms > 1400 || r.ms % 60 > 25) continue;
  if (r.hw == null || r.nw == null) continue;
  console.log(
    `${String(r.ms).padStart(5)}ms  hole ${String(r.hw).padStart(7)}x${String(
      r.hh,
    ).padEnd(7)} @cx ${n1(r.hx + r.hw / 2)},${n1(r.hy + r.hh / 2)}   ` +
      `N ${String(r.nw).padStart(7)}x${String(r.nh).padEnd(7)} @cx ${n1(
        r.nx + r.nw / 2,
      )},${n1(r.ny + r.nh / 2)}   dW ${n1(r.nw - r.hw)} dH ${n1(
        r.nh - r.hh,
      )} nOp ${r.nOp}`,
  );
}

/* ---- overlay lifetime ---- */
const last = T.filter((r) => r.ov === 1).pop();
const gone = T.find((r) => r.ov === 0 && r.t > t0);
console.log(
  `\noverlay present until t+${last ? Math.round(last.t - t0) : "?"}ms; ` +
    `first absent sample t+${gone ? Math.round(gone.t - t0) : "never"}ms`,
);
const v0 = T.find((r) => r.vid);
console.log(
  `video first seen t+${v0 ? Math.round(v0.t - t0) : "never"}ms  ` +
    `readyState ${v0?.vid?.rs} currentTime ${v0?.vid?.ct}`,
);

/* ---- did the discontinuities above actually composite? ---- */
{
  const P = b.P || [];
  const openAt = P.find((x) => x.w > 1400)?.t ?? Infinity;
  const zeros = P.filter((x) => x.w === 0 && x.t > openAt);
  const spikes = P.filter(
    (_, i) =>
      i > 0 && i < P.length - 1 && P[i].op === 1 && P[i - 1].op < 0.5 && P[i + 1].op < 0.5,
  );
  console.log(
    `\n== composited check (post-rAF sampler, ${P.length} samples) ==\n` +
      `  hole collapsed to 0 after full-open: ${zeros.length}` +
      (zeros.length ? ` @ ${zeros.map((z) => Math.round(z.t - t0)).join(",")}ms` : "") +
      `\n  N opacity==1 spikes: ${spikes.length}` +
      (spikes.length ? ` @ ${spikes.map((z) => Math.round(z.t - t0)).join(",")}ms` : "") +
      `\n  (0 and 0 means the jumps listed above are style-commit reads that` +
      ` framer overwrites in the same frame — they never paint.)`,
  );
}

/* ---- CONGRUENCE: the letter's ink vs the window, frame by frame ----
   Loader.tsx seeds the hole from measureNSeed() and centres it on the CELL
   centre; the ink's own centre sits `dy` away from that, and dy is scaled by
   the live scaleY. This measures the residual. */
{
  const G = b.G;
  if (!G) {
    console.log(
      "\n== congruence ==\n  NOT MEASURED — the glyph metrics were never captured " +
        "(no TextMetrics box fields, or the cell was already scaled on first sample).",
    );
  } else {
    console.log(
      `\n== congruence (glyph ink vs hole) ==\n` +
        `  glyph ink unscaled ${G.w} x ${G.h}px | cell line box ${G.cellH}px tall ` +
        `(${(G.cellH - G.h).toFixed(1)}px of line-height air)\n` +
        `  cell centre ${G.cellCx},${G.cellCy} | ink centre y ${G.inkCy} ` +
        `-> dy ${G.dy}px (the seed centres on the CELL, so this is the built-in error)\n`,
    );
    /* the row below prints the INK box first and the HOLE second — the header
       used to claim the opposite order, which made every dW/dH sign read
       backwards to anyone checking a number against a column. */
    const hdr =
      "   ms | ink   w x h          | hole  w x h    @cy      |  dW    dH    dX    dY  | Nop";
    console.log(hdr);
    let hits = 0,
      firstHit = null,
      lastHit = null;
    for (const r of rows) {
      if (r.ms < 200 || r.ms > 900) continue;
      if (r.hw == null || r.sxr == null) continue;
      const iw = G.w * r.sxr,
        ih = G.h * r.syr;
      const icy = G.cellCy + G.dy * r.syr;
      const hcx = r.hx + r.hw / 2,
        hcy = r.hy + r.hh / 2;
      const dW = iw - r.hw,
        dH = ih - r.hh,
        dX = G.cellCx - hcx,
        dY = icy - hcy;
      const match = Math.abs(dW) <= 4 && Math.abs(dH) <= 4;
      if (match && r.nOp >= 0.85) {
        hits++;
        if (firstHit == null) firstHit = r.ms;
        lastHit = r.ms;
      }
      console.log(
        `${String(r.ms).padStart(5)} | ${iw.toFixed(1).padStart(6)}` +
          ` x ${ih.toFixed(1).padStart(5)}`.replace("x", "x") +
          ` ${""}` +
          ` | ` +
          `${r.hw.toFixed(1).padStart(6)} x ${r.hh.toFixed(1).padStart(5)} @${hcy.toFixed(1)} | ` +
          `${dW.toFixed(1).padStart(6)}${dH.toFixed(1).padStart(6)}` +
          `${dX.toFixed(1).padStart(6)}${dY.toFixed(1).padStart(6)} | ` +
          `${(r.nOp * 100).toFixed(0).padStart(3)}%${match ? "  <= MATCH" : ""}`,
      );
    }
    console.log(
      `\n  frames where |dW|<=4 AND |dH|<=4 AND N opacity>=0.85: ${hits}` +
        (hits ? ` (t+${firstHit}ms .. t+${lastHit}ms = ${lastHit - firstHit}ms)` : ""),
    );
  }
}
