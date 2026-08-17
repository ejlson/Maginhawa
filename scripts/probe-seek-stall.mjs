/* IS SEEKING TO A NON-ZERO OFFSET SAFE?
 *
 * Loader.tsx seeks the hero clip before stage 1 and the comment claims "seeking
 * a playing stream to 0 lands on a keyframe, so it cannot stall a readyState>=2
 * video". Moving that seek to a non-zero S raises two different questions and
 * they are often confused:
 *
 *   1. KEYFRAME  — a non-IDR target makes the decoder start at the preceding
 *                  keyframe and decode forward. Cheap, but not free.
 *   2. BUFFER    — the real hazard. Seeking PAST the buffered end forces a
 *                  network fetch; readyState collapses and the window opens on
 *                  a frozen or blank frame. Nothing about keyframes protects
 *                  against this.
 *
 * This measures both on the live page: what is actually buffered at the moment
 * the loader seeks, and how long the video takes to be presentable again after
 * a seek to 0 vs to S.
 *
 * Usage: node scripts/probe-seek-stall.mjs [port] [S]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const S = +(process.argv[3] || 5.84);

const launch = () =>
  puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });

/* ---- 1. what the loader's own seek sees ---- */
{
  const b = await launch();
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => {
    window.__SEEK = null;
    let prev = null;
    const tick = () => {
      const v = document.querySelector("video");
      if (v) {
        // the loader's rewind shows up as currentTime falling
        if (prev != null && v.currentTime < prev - 0.05 && !window.__SEEK) {
          const r = [];
          for (let i = 0; i < v.buffered.length; i++)
            r.push([+v.buffered.start(i).toFixed(2), +v.buffered.end(i).toFixed(2)]);
          window.__SEEK = {
            at: +performance.now().toFixed(0),
            from: +prev.toFixed(3),
            buffered: r,
            readyState: v.readyState,
            duration: +v.duration.toFixed(2),
          };
        }
        prev = v.currentTime;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 9000));
  const s = await p.evaluate(() => window.__SEEK);
  await b.close();
  console.log("== what the loader's rewind sees, on the real page ==");
  if (!s) console.log("  !! never observed the rewind");
  else {
    const end = s.buffered.length ? s.buffered[s.buffered.length - 1][1] : 0;
    console.log(
      `  seek fires at page t=${s.at}ms with currentTime ${s.from}s, readyState ${s.readyState}\n` +
        `  clip duration ${s.duration}s, buffered ${JSON.stringify(s.buffered)}\n` +
        `  => buffered ahead of the playhead: ${(end - s.from).toFixed(2)}s; ` +
        `target S=${S} is ${end >= S ? "INSIDE" : "*** OUTSIDE ***"} the buffered range`,
    );
  }
}

/* ---- 2. A/B: recovery time after seeking to 0 vs to S ---- */
async function seekTest(target) {
  const b = await launch();
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  // wait until the video has played about as far as it has when stage 1 fires
  await p.waitForFunction(
    () => {
      const v = document.querySelector("video");
      return v && v.readyState >= 3 && v.currentTime > 3.2;
    },
    { timeout: 30000 },
  );
  const out = await p.evaluate(async (t) => {
    const v = document.querySelector("video");
    const before = { ct: v.currentTime, rs: v.readyState };
    const t0 = performance.now();
    let firstPaintedFrame = null;
    // requestVideoFrameCallback fires when a frame is actually presented —
    // the honest measure of "the window would have something to show"
    if (v.requestVideoFrameCallback)
      v.requestVideoFrameCallback(() => (firstPaintedFrame = performance.now() - t0));
    const seeked = new Promise((res) => v.addEventListener("seeked", () => res(performance.now() - t0), { once: true }));
    const stalls = [];
    for (const e of ["waiting", "stalled", "suspend", "emptied"])
      v.addEventListener(e, () => stalls.push(e + "@" + Math.round(performance.now() - t0)), { once: false });
    v.currentTime = t;
    const seekedMs = await Promise.race([seeked, new Promise((r) => setTimeout(() => r(-1), 4000))]);
    // let a few frames present
    await new Promise((r) => setTimeout(r, 400));
    return {
      before,
      target: t,
      seekedMs: seekedMs < 0 ? null : +seekedMs.toFixed(1),
      firstFrameMs: firstPaintedFrame == null ? null : +firstPaintedFrame.toFixed(1),
      rsAfter: v.readyState,
      ctAfter: +v.currentTime.toFixed(3),
      stalls,
    };
  }, target);
  await b.close();
  return out;
}

console.log("\n== A/B: seek recovery, measured with requestVideoFrameCallback ==");
for (const t of [0, S]) {
  const r = await seekTest(t);
  console.log(
    `  seek ${String(t).padEnd(5)} from ct ${r.before.ct.toFixed(2)} (rs ${r.before.rs}) -> ` +
      `'seeked' ${r.seekedMs}ms, first presented frame ${r.firstFrameMs}ms, ` +
      `readyState after ${r.rsAfter}, ct ${r.ctAfter}` +
      (r.stalls.length ? `  STALL EVENTS: ${r.stalls.join(" ")}` : "  no stall events"),
  );
}
