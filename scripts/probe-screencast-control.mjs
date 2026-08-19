/* IS A SCREENCAST GAP THE PAGE, OR THE HARNESS?
 *
 * An earlier round measured a "96fps floor, worst gap 44ms" off
 * Page.startScreencast during the reveal and dismissed it as ack throttling.
 * That dismissal was never tested. This tests it: the SAME screencast settings
 * are pointed at two pages whose true frame delivery is known independently
 * (from PipelineReporter, which reports zero dropped frames for both):
 *
 *   reveal   the production loader's clip-path grow-out
 *   control  a continuous compositor transform on the same film — the
 *            cheapest possible 120fps animation
 *
 * If the control shows the same gap distribution, the gaps are the screencast
 * pipeline and carry no information about the page.
 *
 * Usage: node scripts/probe-screencast-control.mjs --port 3001 --dpr 2
 */
import puppeteer from "puppeteer-core";
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
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
const PORT = arg("port", "3001");
const DPR = +arg("dpr", 2);
const VW = +arg("w", 1728);
const VH = +arg("h", 1117);
const CTRL_PORT = 4189;

const CAST = { format: "jpeg", quality: 20, everyNthFrame: 1, maxWidth: 480 };

/* control page: a full-bleed film under a permanently 120fps transform */
const CTRL_HTML = `<!doctype html><meta charset=utf-8>
<style>html,body{margin:0;height:100%;overflow:hidden;background:#2f0000}
#w{position:absolute;inset:0;will-change:transform}
video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}</style>
<div id=w><video muted playsinline autoplay loop src="/film.mp4"></video></div>
<script>
document.getElementById('w').animate(
  [{transform:'scale(1)'},{transform:'scale(1.35)'}],
  {duration:1400, iterations:Infinity, direction:'alternate',
   easing:'cubic-bezier(0.33,0.11,0.72,1)'});
</script>`;

const server = createServer((req, res) => {
  if (req.url.startsWith("/film.mp4")) {
    const size = statSync(FILM).size;
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
    if (m) {
      const start = m[1] ? +m[1] : 0;
      const end = m[2] ? +m[2] : size - 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": "video/mp4",
      });
      return createReadStream(FILM, { start, end }).pipe(res);
    }
    res.writeHead(200, { "Content-Length": size, "Accept-Ranges": "bytes", "Content-Type": "video/mp4" });
    return createReadStream(FILM).pipe(res);
  }
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(CTRL_HTML);
});
await new Promise((r) => server.listen(CTRL_PORT, r));

const pct = (s, p) => (s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : 0);

/* the same reveal-clock recorder the trace probe uses, so screencast arrivals
   can be windowed to the GROW-OUT rather than to wall time. Screencast is
   DAMAGE-DRIVEN: a mostly-static stage 0 emits almost nothing, which is what
   made the first, unwindowed version of this comparison meaningless. */
function revRecorder() {
  window.__M = { t0: null, origin: performance.timeOrigin };
  let rev = null;
  const tick = (t) => {
    if (!rev || !rev.isConnected) rev = document.querySelector('[class*="Loader_reveal__"]');
    if (rev && window.__M.t0 == null)
      for (const an of rev.getAnimations()) {
        const d = an.effect.getTiming().duration;
        if (Math.round(d) === 1300 && typeof an.currentTime === "number")
          window.__M.t0 = t - an.currentTime;
      }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function cast(url, waitMs, windowMs) {
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
  await page.evaluateOnNewDocument(revRecorder);
  const cdp = await page.createCDPSession();
  const arr = [];
  cdp.on("Page.screencastFrame", (f) => {
    arr.push(f.metadata.timestamp * 1000);
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, waitMs));
  await cdp.send("Page.startScreencast", CAST);
  await new Promise((r) => setTimeout(r, windowMs));
  await cdp.send("Page.stopScreencast").catch(() => {});
  const M = await page.evaluate(() => window.__M).catch(() => null);
  await browser.close();
  return { ts: arr.sort((a, b) => a - b), M };
}

function report(name, ts, windowMs) {
  const d = [];
  for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
  const s = [...d].sort((a, b) => a - b);
  console.log(
    `${name.padEnd(9)} n=${String(ts.length).padStart(4)}  ${(
      (ts.length / windowMs) *
      1000
    ).toFixed(1).padStart(5)} fps  p50=${pct(s, 50).toFixed(1)}  p95=${pct(s, 95).toFixed(
      1,
    )}  p99=${pct(s, 99).toFixed(1)}  max=${(s[s.length - 1] || 0).toFixed(1)}  >20ms:${
      d.filter((v) => v > 20).length
    }  >40ms:${d.filter((v) => v > 40).length}`,
  );
}

// the loader reveal: MIN_TIME 2600 + settle, so aim the 2.5s window at ~2.8s
const A = await cast(`http://localhost:${PORT}/`, 2200, 4200);
// the control: the same 2.5s of a pure compositor transform
const B = await cast(`http://localhost:${CTRL_PORT}/`, 2200, 4200);
server.close();

console.log(`\n╔══ SCREENCAST GAPS · dpr ${DPR} · ${VW}×${VH} · ${JSON.stringify(CAST)} ══\n`);
console.log("── whole 2.5s window (damage-driven, so NOT comparable across pages) ──");
report("reveal", A.ts, 4200);
report("control", B.ts, 4200);

/* ── the honest comparison: 700ms of continuous motion on each page ── */
console.log("\n── 700ms of CONTINUOUS motion on each page ──");
if (A.M?.t0 != null) {
  const zero = A.M.origin + A.M.t0; // epoch ms of reveal t=0
  const grow = A.ts.filter((t) => t >= zero + 600 && t < zero + 1300);
  console.log(
    `  (reveal t=0 at epoch ${zero.toFixed(0)}; screencast covered ${A.ts[0]?.toFixed(0)}‥${A.ts[A.ts.length - 1]?.toFixed(0)}, i.e. reveal ${(A.ts[0] - zero).toFixed(0)}‥${(A.ts[A.ts.length - 1] - zero).toFixed(0)}ms)`,
  );
  report("reveal↑", grow, 700);
} else console.log("reveal↑   (no reveal clock — the loader did not reach stage 1 in window)");
// the control animates continuously, so any 700ms slice is representative
const mid = B.ts[Math.floor(B.ts.length / 2)];
report("control↑", B.ts.filter((t) => t >= mid && t < mid + 700), 700);
console.log(
  "\nBoth pages present every frame per PipelineReporter. Any gap the CONTROL\nalso shows is the screencast pipeline, not the page.",
);
