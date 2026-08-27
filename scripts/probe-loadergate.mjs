/* WHAT IS THE LOADER ACTUALLY WAITING FOR?

   LCP on a 390px phone at 4x CPU is 9088ms on a first visit and 4160ms on a
   repeat one — both in Google's "poor" band, and both are the intro overlay
   holding the viewport rather than anything slow about the page underneath
   it (FCP is 536ms / 300ms). The LCP element is the hero wordmark, i.e. the
   first large thing painted once the overlay leaves.

   The overlay leaves when `ready` && the reveal has played. `ready` is
   whichever comes last of MIN_TIME (2600ms), `document.fonts.ready`, and the
   hero video reaching `canplay` — capped at HARD_CAP (8000ms). This prints
   each of those clocks separately so the fix is aimed at the one that is
   actually last, instead of at the floor that is easiest to lower.

   usage: node scripts/probe-loadergate.mjs [port] [w] [h] [throttle]     */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3120";
const W = +(process.argv[3] || 390), H = +(process.argv[4] || 844);
const THROTTLE = +(process.argv[5] || 4);

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
for (const [label, seen] of [["first visit", false], ["repeat visit", true]]) {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H });
  if (seen) await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem("mgnhw:introSeen", "1"); } catch {} });
  const cdp = await page.target().createCDPSession();
  if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });

  await page.evaluateOnNewDocument(() => {
    window.__m = {};
    const mark = (k) => { if (window.__m[k] === undefined) window.__m[k] = Math.round(performance.now()); };
    document.fonts.ready.then(() => mark("fonts.ready"));
    /* the hero <video> mounts after hydration, so poll for it rather than
       query once — the same reason Loader.tsx polls with VIDEO_WAIT */
    const findVideo = () => {
      const v = document.querySelector("video");
      if (!v) return requestAnimationFrame(findVideo);
      mark("video.mounted");
      if (v.readyState >= 1) mark("video.loadedmetadata");
      else v.addEventListener("loadedmetadata", () => mark("video.loadedmetadata"), { once: true });
      if (v.readyState >= 3) mark("video.canplay");
      else v.addEventListener("canplay", () => mark("video.canplay"), { once: true });
      v.addEventListener("playing", () => mark("video.playing"), { once: true });
    };
    requestAnimationFrame(findVideo);
    new MutationObserver(() => {
      if (!document.querySelector('[class*="Loader_overlay__"]') && document.body.dataset.__seen !== "1") {
        document.body.dataset.__seen = "1"; mark("overlay.gone");
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  });

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(() => window.__m && window.__m["overlay.gone"] !== undefined,
    { timeout: 45000, polling: "raf" }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));

  const m = await page.evaluate(() => ({
    ...window.__m,
    fcp: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0),
  }));
  console.log(`\n── ${label} @ ${W}x${H}, CPU ${THROTTLE}x ──`);
  for (const [k, v] of Object.entries(m).sort((a, b) => a[1] - b[1]))
    console.log(`  ${String(v).padStart(6)}ms  ${k}`);
  await page.close();
}
await b.close();
