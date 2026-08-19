/* THE INTRO'S SHAPE, GRADED WHERE IT MATTERS: HOW BIG, AND HOW STILL.
 *
 * The reveal is a point that settles out to a held size, stops, then springs to
 * full bleed. Two things decide whether that reads, and neither is a frame
 * counter:
 *
 *   1. HOW LONG THE APERTURE STAYS SMALL. A front-loaded curve is past 100px
 *      within ~50ms of becoming visible and the small phase merely registers.
 *      This probe reports k — and k·vw in px — at fixed points on the reveal's
 *      own clock, so "visibly small" is a measured span rather than a claim.
 *   2. WHETHER THE HOLD IS ACTUALLY STILL. A hold built from two keyframes
 *      carrying the same value cannot drift; a hold built from a slow pass can,
 *      and the last one did — it was a 0.49px/ms crawl wearing a hold's name.
 *      This probe counts DISTINCT transform values across the hold window and
 *      reports the largest step between consecutive samples.
 *
 * It also reads the installed easing back off every animated layer. A rejected
 * `linear()` string would leave one layer on a different curve, and nothing in
 * a frame counter or a paint total would show it.
 *
 * Usage: node scripts/probe-loader-hold.mjs --port 3000 [--runs 2]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const PORT = arg("port", "3000");
const VW = +arg("w", 1440);
const VH = +arg("h", 900);
const RUNS = +arg("runs", 2);
const REVEAL = +arg("reveal", 1480);
const HOLD_IN = +arg("holdin", 560);
const HOLD_OUT = +arg("holdout", 730);
const MARKS = (arg("marks", "250,300,350,400,450,500") || "").split(",").map(Number);

async function once() {
  const b = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: [
      "--no-sandbox",
      "--autoplay-policy=no-user-gesture-required",
      "--window-position=0,0",
      `--window-size=${VW},${VH + 90}`,
    ],
  });
  const p = await b.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
  await p.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });

  await p.evaluateOnNewDocument((REVEAL) => {
    window.__S = [];
    window.__EASE = null;
    const LAYERS = ["shutterTop", "shutterBottom", "shutterLeft", "shutterRight"];
    const tick = () => {
      const sh = document.querySelector('[class*="Loader_shutterTop__"]');
      const zoom = document.querySelector('[class*="Hero_zoom__"]');
      if (sh) {
        const a = sh.getAnimations().filter(
          (x) => x.effect.getTiming().duration === REVEAL,
        );
        if (a.length && a[0].currentTime != null) {
          if (!window.__EASE) {
            const els = LAYERS.map((n) => [
              n,
              document.querySelector(`[class*="Loader_${n}__"]`),
            ]);
            els.push(["film", zoom]);
            window.__EASE = els.map(([n, el]) => {
              if (!el) return [n, "MISSING"];
              const an = el
                .getAnimations()
                .filter((x) => x.effect.getTiming().duration === REVEAL)[0];
              if (!an) return [n, "NO ANIMATION"];
              return [n, an.effect.getKeyframes().map((k) => k.easing)];
            });
          }
          // the RAW computed transform strings, not parsed numbers: two
          // identical strings are proof of stillness that a rounded float is not
          window.__S.push([
            a[0].currentTime,
            getComputedStyle(sh).transform,
            zoom ? getComputedStyle(zoom).transform : null,
          ]);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, REVEAL);

  await p.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 9500));
  const S = await p.evaluate(() => window.__S);
  const E = await p.evaluate(() => window.__EASE);
  const fin = await p.evaluate(() => {
    const z = document.querySelector('[class*="Hero_zoom__"]');
    return z
      ? {
          t: getComputedStyle(z).transform,
          wc: getComputedStyle(z).willChange,
          anims: z.getAnimations().length,
        }
      : null;
  });
  await b.close();
  return { S, E, fin, errs };
}

const sy = (t) => {
  const m = (t || "").match(/matrix\(([^,]+),[^,]+,[^,]+,([^,]+)/);
  return m ? { x: +m[1], y: +m[2] } : null;
};

for (let r = 0; r < RUNS; r++) {
  const { S, E, fin, errs } = await once();
  if (!S.length) {
    console.log(`run ${r + 1}: the reveal never ran`);
    continue;
  }
  console.log(`\n══ run ${r + 1} · ${VW}×${VH} · ${S.length} samples ══`);

  if (r === 0) {
    console.log("\n── installed easing, per layer (one entry per keyframe) ──");
    for (const [n, e] of E || []) {
      const list = Array.isArray(e) ? e : [String(e)];
      console.log(
        `  ${n.padEnd(15)} ${list
          .map((x) => (x.length > 26 ? x.slice(0, 26) + "…" : x))
          .join("  ")}`,
      );
    }
  }

  const at = (t) => S.reduce((a, x) => (Math.abs(x[0] - t) < Math.abs(a[0] - t) ? x : a), S[0]);
  console.log("\n── the small phase ──");
  console.log("     ct        k     aperture px    film scale");
  for (const t of MARKS) {
    const x = at(t);
    const k = 1 - 2 * sy(x[1]).y;
    console.log(
      `${String(Math.round(x[0])).padStart(7)}   ${k.toFixed(4)}   ${(k * VW)
        .toFixed(0)
        .padStart(8)}      ${sy(x[2]) ? sy(x[2]).x.toFixed(4) : "?"}`,
    );
  }
  // when does it cross 100px and 200px?
  const cross = (px) => {
    for (const x of S) if ((1 - 2 * sy(x[1]).y) * VW >= px) return Math.round(x[0]);
    return null;
  };
  console.log(
    `  crosses 100px at ct ${cross(100)}ms · 200px at ct ${cross(200)}ms · 345px at ct ${cross(345)}ms`,
  );

  console.log("\n── the hold, graded for stillness ──");
  const H = S.filter((x) => x[0] >= HOLD_IN && x[0] <= HOLD_OUT);
  const shu = [...new Set(H.map((x) => x[1]))];
  const fil = [...new Set(H.map((x) => x[2]))];
  let maxStep = 0;
  for (let i = 1; i < H.length; i++)
    maxStep = Math.max(maxStep, Math.abs(sy(H[i][1]).y - sy(H[i - 1][1]).y) * VW);
  console.log(
    `  ${HOLD_IN}‥${HOLD_OUT}ms: ${H.length} samples · shutter distinct values ${shu.length} · film distinct ${fil.length}`,
  );
  console.log(
    `  largest step between consecutive samples: ${maxStep.toFixed(4)}px  ${
      shu.length === 1 && fil.length === 1 ? "→ DEAD STILL" : "→ DRIFTING"
    }`,
  );
  console.log(`  held value: shutter ${shu[0]} · film ${fil[0]}`);

  const peak = S.reduce((a, x) => (sy(x[1]).y < sy(a[1]).y ? x : a), S[0]);
  const pk = 1 - 2 * sy(peak[1]).y;
  console.log(
    `\n── overshoot ──\n  peak k ${pk.toFixed(5)} at ct ${Math.round(
      peak[0],
    )}ms · shutter scaleY ${sy(peak[1]).y.toFixed(5)} (${
      sy(peak[1]).y < 0 ? "negative → panel parked off-screen" : "still on-screen"
    }) · film ${sy(peak[2]).x.toFixed(5)} (${
      sy(peak[2]).x >= 1 ? "≥1, viewport covered" : "UNDER 1 — GAP POSSIBLE"
    })`,
  );
  console.log(
    `  resting film ${fin.t} · will-change ${fin.wc} · animations ${fin.anims}`,
  );
  console.log(`  page errors: ${errs.length ? errs[0] : "none"}`);
}
