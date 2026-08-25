/* ⚠️ STALE — DO NOT TRUST THIS PROBE'S VERDICTS.
 * It grades a timeline that no longer exists: it samples 560/760/1500 and calls
 * 560‥760 "the hold", but REVEAL_MS is 1300 and the hard hold was replaced by a
 * slow LINEAR pass. Four of its claims fail by construction. Its seek/ct column
 * and its board-drift check are still valid.
 *
 * Current probes: scripts/probe-loader-jank.mjs (per-phase FPS, velocity and
 * stall profile), scripts/probe-reveal-seam.mjs (join derivatives),
 * scripts/probe-present.mjs + present-analyse.mjs (PRESENTED frames via CDP
 * tracing — the only ones that can see a dropped frame at all; rAF deltas
 * cannot, which is how three rounds of "locked 120fps" missed a reveal that
 * ran a full main-thread frame every displayed frame).
 */
/* THE INTRO, MEASURED — components/home/Loader.tsx, postcard choreography.
 *
 * The reveal no longer turns a letter into a window. Its predecessor
 * (probe-loader-film.mjs, since deleted) graded letter/hole congruence off
 * Loader_center__ and Loader_group__ — elements this loader stopped
 * rendering, and a claim it no longer makes. This one grades the four
 * claims the timeline DOES make:
 *
 *   1. the board leaves in place — opacity falls, and nothing translates;
 *   2. the window is CLOSED until ~220ms, near-size by ~420, resting by
 *      ~560, still through the hold, full bleed at ~1500;
 *   3. THE FILM DOES NOT APPEAR FROM NOTHING — on the first frame where any
 *      film is visible through the veil, the window is already most of a
 *      postcard, not a point;
 *   4. it holds 60fps — the grow-out is one clip-path, but clip-path: path()
 *      is not a cheap interpolation and this is the frame to check it on.
 *
 * A fresh browser profile per run means sessionStorage "mgnhw:introSeen" is
 * empty and the LONG path plays. Nothing here writes to the app.
 *
 * Usage: node scripts/probe-loader-postcard.mjs [port] [outDir]
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const OUT =
  process.argv[3] ||
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/aa802098-0b1f-49b7-999a-be50025d0648/scratchpad/loader";

const n1 = (v) => (v == null ? null : +v.toFixed(1));
const n2 = (v) => (v == null ? null : +v.toFixed(3));

/* ---------- the in-page recorder ------------------------------------ */
function recorder() {
  window.__T = [];
  window.__F = [];
  const sel = (n) => document.querySelector(`[class*="Loader_${n}__"]`);
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    window.__F.push(+(now - last).toFixed(2));
    last = now;
    const rev = sel("reveal");
    const veil = sel("veil");
    const letters = sel("letters");
    const v = document.querySelector("video");
    window.__T.push({
      t: +now.toFixed(1),
      ov: sel("overlay") ? 1 : 0,
      clip: rev ? getComputedStyle(rev).clipPath : null,
      veil: veil ? +getComputedStyle(veil).opacity : null,
      lOp: letters ? +getComputedStyle(letters).opacity : null,
      lTf: letters ? getComputedStyle(letters).transform : null,
      ct: v ? +v.currentTime.toFixed(3) : null,
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* holePath() emits `M0,0 H W V H H0 Z  M x+r,y H x2-r A.. V y2-r A.. H x+r
   A.. V y+r A.. Z`. The inner subpath is everything after the second M.
   NB the COMPUTED value re-serialises with spaces ("M 0 0 H 1440 …") and the
   inner subpath carries exactly 34 numbers — which is where the otherwise
   unreadable indices below come from:
     0:x+r  1:y  2:x2-r  3..9:A(r,r,0,0,1,x2,y+r)  10:y2-r
     11..17:A(r,r,0,0,1,x2-r,y2)  18:x+r  19..25:A(r,r,0,0,1,x,y2-r)
     26:y+r  27..33:A(r,r,0,0,1,x+r,y) */
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

function matrix(tf) {
  if (!tf || tf === "none") return { a: 1, e: 0, f: 0 };
  const p = tf.match(/-?\d*\.?\d+(?:e-?\d+)?/g).map(Number);
  return p.length === 6
    ? { a: p[0], e: p[4], f: p[5] }
    : { a: p[0], e: p[12], f: p[13] };
}

/* stage 1 begins the first frame the board's opacity leaves 1 */
function stageIndex(T) {
  for (let i = 0; i < T.length; i++) if (T[i].lOp != null && T[i].lOp < 0.999) return i;
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
  await page.evaluateOnNewDocument(recorder);

  const shots = [];
  let cdp = null;
  if (capture) {
    cdp = await page.createCDPSession();
    cdp.on("Page.screencastFrame", async (f) => {
      shots.push({
        ts: f.metadata.timestamp * 1000,
        buf: Buffer.from(f.data, "base64"),
      });
      try {
        await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId });
      } catch {
        /* session closed */
      }
    });
  }

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  if (capture)
    await cdp.send("Page.startScreencast", {
      format: "png",
      everyNthFrame: 1,
      maxWidth: 720,
      maxHeight: 450,
    });

  /* the whole intro: 2.6s floor + settle + 1.5s reveal, plus headroom */
  await new Promise((r) => setTimeout(r, 8000));
  if (capture) await cdp.send("Page.stopScreencast").catch(() => {});

  const T = await page.evaluate(() => window.__T);
  const F = await page.evaluate(() => window.__F);
  const origin = await page.evaluate(() => performance.timeOrigin);
  await browser.close();
  return { T, F, origin, shots };
}

/* ---------- report --------------------------------------------------- */
const clean = await run({ capture: false });
const shot = await run({ capture: true });

const T = shot.T;
const s0 = stageIndex(T);
if (s0 < 0) {
  console.log("FAIL — stage 1 never started (board opacity stayed at 1).");
  process.exit(1);
}
const t0 = T[s0].t;

/* the seed the component should have computed at 1440 wide */
const SEED_W = Math.min(Math.max(260, 1440 * 0.24), 1440 * 0.56);
const SEED_H = SEED_W / (16 / 9);

const rows = T.slice(s0).map((f) => {
  const h = parseHole(f.clip);
  return {
    ms: n1(f.t - t0),
    w: h?.w ?? null,
    h: h?.h ?? null,
    pct: h ? n1((h.w / SEED_W) * 100) : null,
    veil: n2(f.veil),
    lOp: n2(f.lOp),
    lx: n1(matrix(f.lTf).e),
    ct: f.ct,
    ov: f.ov,
  };
});

const at = (ms) => rows.reduce((b, r) => (Math.abs(r.ms - ms) < Math.abs(b.ms - ms) ? r : b), rows[0]);
/* the first frame where ANY film is visible through the veil */
const firstFilm = rows.find((r) => r.veil != null && r.veil < 0.98 && r.w > 0);
const fullBleed = rows.find((r) => r.w >= 1439);
const boardGone = rows.find((r) => r.lOp != null && r.lOp <= 0.01);
const maxDrift = Math.max(...rows.map((r) => Math.abs(r.lx || 0)));

const frames = clean.F.filter((d) => d > 0 && d < 400);
const long = frames.filter((d) => d > 20).length;

console.log("\n══ LOADER · postcard reveal @1440×900 ══");
console.log(`seed box the component should build: ${SEED_W.toFixed(1)} × ${SEED_H.toFixed(1)}\n`);
console.log("  ms     hole w×h        % of seed   veil   board   boardΔx  video ct");
for (const ms of [0, 120, 220, 300, 420, 560, 660, 760, 1000, 1250, 1500, 1600]) {
  const r = at(ms);
  console.log(
    `${String(ms).padStart(5)}  ${String(r.w).padStart(7)}×${String(r.h).padEnd(6)} ` +
      `${String(r.pct).padStart(8)}%  ${String(r.veil).padStart(6)}  ${String(r.lOp).padStart(6)}  ` +
      `${String(r.lx).padStart(7)}  ${String(r.ct).padStart(7)}   [t=${r.ms}]`,
  );
}

console.log("\n── claims ──");
const claim = (ok, txt) => console.log(`${ok ? "  PASS" : "  FAIL"}  ${txt}`);
claim(maxDrift < 0.5, `board leaves in place — max |Δx| = ${maxDrift.toFixed(2)}px (want <0.5)`);
claim(
  at(120).w === 0,
  `window still closed at 120ms — w = ${at(120).w} (want 0)`,
);
claim(
  firstFilm && firstFilm.pct >= 60,
  `film first visible at ${firstFilm?.pct}% of the postcard, t=${firstFilm?.ms}ms (want ≥60%: not a point)`,
);
claim(
  Math.abs(at(660).pct - 100) < 4,
  `holds at full postcard through the hold — ${at(660).pct}% at 660ms (want ~100)`,
);
/* SAMPLE INSIDE THE HOLD, NOT ON ITS EDGE. 760ms is the frame the grow-out
   STARTS on, and EASE_DRAWER leaves the gate hard — measured, it is already
   11% of the way to full bleed 6ms later. Asserting stillness at 760 grades
   the first frame of the next segment. */
claim(
  Math.abs(at(600).w - at(720).w) < 3,
  `the hold is actually still — ${at(600).w}px at 600 vs ${at(720).w}px at 720 (want <3px)`,
);
claim(
  fullBleed && fullBleed.ms > 1350 && fullBleed.ms < 1650,
  `full bleed at ${fullBleed?.ms}ms (want 1350–1650)`,
);
claim(boardGone && boardGone.ms < 420, `board gone by ${boardGone?.ms}ms (want <420)`);
claim(long / frames.length < 0.06, `frame health — ${long}/${frames.length} frames >20ms (${((long / frames.length) * 100).toFixed(1)}%, want <6%)`);

/* ---------- filmstrip ------------------------------------------------ */
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.startsWith("pc-")) fs.unlinkSync(path.join(OUT, f));
const wall0 = shot.origin + t0;
let kept = 0;
for (const want of [0, 220, 320, 420, 560, 660, 760, 900, 1100, 1300, 1500, 1650]) {
  const target = wall0 + want;
  let best = null;
  for (const s of shot.shots)
    if (!best || Math.abs(s.ts - target) < Math.abs(best.ts - target)) best = s;
  if (!best || Math.abs(best.ts - target) > 90) continue;
  const off = Math.round(best.ts - wall0);
  fs.writeFileSync(path.join(OUT, `pc-${String(off).padStart(4, "0")}.png`), best.buf);
  kept++;
}
console.log(`\n  ${kept} filmstrip frames → ${OUT}/pc-*.png\n`);
