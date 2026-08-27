/* IS EACH FILM BIGGER THAN THE BOX IT PLAYS IN?

   `belly-hero.mp4` is 1920x1080 and it is fully buffered on `/`, `/about`
   and `/careers` — 6.95MB per route on a 390px viewport. Whether that is
   waste or necessary depends entirely on how many DEVICE pixels the element
   actually occupies, and `object-fit: cover` makes that non-obvious: a
   landscape source in a portrait box is cropped to a narrow strip and can be
   UPSCALED even though the file is far larger than the element.

   For each <video> this prints the source resolution, the CSS box, the
   device pixels at the given DPR, and the cover-fit scale factor:

     scale > 1  the source is being STRETCHED — a smaller cut would be
                visibly softer, and shipping one is a downgrade
     scale < 1  the source is being SHRUNK by that factor — a cut at
                (source x scale) would be pixel-identical and smaller

   usage: node scripts/probe-videofit.mjs [port] [w] [h] [dpr]            */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3120";
const W = +(process.argv[3] || 390), H = +(process.argv[4] || 844);
const DPR = +(process.argv[5] || 3);
const ROUTES = ["/", "/about", "/careers", "/restaurants"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"],
});
console.log(`\nVIDEO FIT — ${W}x${H} @ dpr ${DPR}\n`);
console.log("route        source      CSS box     device px    fit    scale  file");
for (const route of ROUTES) {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: DPR });
  await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem("mgnhw:introSeen", "1"); } catch {} });
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForFunction(() => !document.querySelector('[class*="Loader_overlay__"]'),
    { timeout: 45000, polling: "raf" }).catch(() => {});
  await sleep(2500);
  /* walk the page so gated films mount and report a real box */
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.9) {
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true });
      else scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 220));
    }
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    else scrollTo(0, 0);
  });
  await sleep(800);

  const vids = await page.evaluate((dpr) => [...document.querySelectorAll("video")].map((v) => {
    const r = v.getBoundingClientRect();
    const cs = getComputedStyle(v);
    const sw = v.videoWidth, sh = v.videoHeight;
    const bw = r.width * dpr, bh = r.height * dpr;
    const fit = cs.objectFit || "fill";
    let scale = 0;
    if (sw && sh && bw && bh) {
      scale = fit === "contain" ? Math.min(bw / sw, bh / sh)
            : fit === "fill"    ? Math.max(bw / sw, bh / sh)   // both axes stretched
            :                     Math.max(bw / sw, bh / sh);  // cover
    }
    return { sw, sh, cw: Math.round(r.width), ch: Math.round(r.height),
             bw: Math.round(bw), bh: Math.round(bh), fit, scale,
             file: (v.currentSrc || v.src || "").split("/").pop() };
  }), DPR);

  for (const v of vids) {
    if (!v.sw) { console.log(`${route.padEnd(12)} (no metadata yet)                                  ${v.file}`); continue; }
    console.log(
      route.padEnd(12) +
      `${v.sw}x${v.sh}`.padEnd(11) +
      `${v.cw}x${v.ch}`.padEnd(12) +
      `${v.bw}x${v.bh}`.padEnd(13) +
      v.fit.padEnd(7) +
      v.scale.toFixed(2).padStart(5) + "  " + v.file);
  }
  await page.close();
}
await b.close();
