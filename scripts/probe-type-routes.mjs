/* EVERY ROUTE, BOTH VIEWPORTS, AFTER THE TYPE COLLAPSE.
   The families changed under all seven routes at once, so this is the sweep
   that says whether anything broke: horizontal overflow, text that no longer
   fits its box, console errors, and the frame cost of scrolling each page
   like a reader.

   TWO THINGS THIS DELIBERATELY DOES NOT DO. It never takes a fullPage
   screenshot — fullPage resizes the viewport to the document and never fires
   IntersectionObserver, so every reveal on the site stays at its initial
   state and the measurement is of a page no reader sees. And it never jumps
   the scroll position in one go: it walks down in reader-sized steps so the
   observers, pins and scrubs all run, which is also the only way the frame
   timings mean anything.

   usage: node scripts/probe-type-routes.mjs [port]                        */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3220";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROUTES = ["/", "/about", "/blog", "/contact", "/careers", "/restaurants", "/restaurants/belly"];
const VIEWPORTS = [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
];

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu"],
});

const rows = [];
for (const [vpName, w, h] of VIEWPORTS) {
  for (const route of ROUTES) {
    const page = await b.newPage();
    await page.setViewport({ width: w, height: h });
    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text().slice(0, 200));
    });
    page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 200)));

    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "domcontentloaded" });
    await page
      .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 })
      .catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await sleep(1500);

    // start the frame recorder, then scroll like a reader
    await page.evaluate(() => {
      window.__frames = [];
      let last = performance.now();
      const tick = (t) => {
        window.__frames.push(t - last);
        last = t;
        window.__raf = requestAnimationFrame(tick);
      };
      window.__raf = requestAnimationFrame(tick);
    });

    const docH = await page.evaluate(() => document.documentElement.scrollHeight);
    const vh = h;
    const steps = Math.min(46, Math.max(8, Math.ceil((docH - vh) / (vh * 0.42))));
    const worst = { overflow: 0, clipped: [] };

    for (let i = 0; i <= steps; i++) {
      const y = Math.round(((docH - vh) * i) / steps);
      await page.evaluate((v) => {
        if (window.__lenis) window.__lenis.scrollTo(v, { immediate: false, duration: 0.35 });
        else window.scrollTo({ top: v, behavior: "auto" });
      }, y);
      await sleep(230);

      const snap = await page.evaluate(() => {
        const de = document.documentElement;
        const ov = de.scrollWidth - de.clientWidth;
        const clipped = [];
        for (const el of document.querySelectorAll("body *")) {
          if (el.namespaceURI === "http://www.w3.org/2000/svg") continue;
          if (el.children.length) continue;
          const txt = (el.textContent || "").trim();
          if (!txt) continue;
          const s = getComputedStyle(el);
          if (s.overflowX !== "visible") continue;
          if (s.display === "none" || s.visibility === "hidden") continue;
          // deliberate clamps are not defects
          if (s.webkitLineClamp && s.webkitLineClamp !== "none") continue;
          if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
            clipped.push({
              cls: (el.className || "").toString().split(" ")[0] || el.tagName,
              over: el.scrollWidth - el.clientWidth,
              text: txt.slice(0, 44),
            });
          }
        }
        return { ov, clipped };
      });
      worst.overflow = Math.max(worst.overflow, snap.ov);
      for (const c of snap.clipped)
        if (!worst.clipped.some((x) => x.cls === c.cls && x.text === c.text))
          worst.clipped.push(c);
    }

    const frames = await page.evaluate(() => {
      cancelAnimationFrame(window.__raf);
      const f = window.__frames.filter((x) => x > 0 && x < 2000).sort((a, b) => a - b);
      const at = (q) => f[Math.min(f.length - 1, Math.floor(f.length * q))];
      return {
        n: f.length,
        p50: +at(0.5).toFixed(2),
        p95: +at(0.95).toFixed(2),
        p99: +at(0.99).toFixed(2),
        max: +f[f.length - 1].toFixed(2),
        over32: f.filter((x) => x > 32).length,
        over50: f.filter((x) => x > 50).length,
      };
    });

    rows.push({ vpName, route, ...worst, frames, errors: [...new Set(errors)], docH });
    await page.close();
  }
}

console.log("=== ROUTE SWEEP ===\n");
for (const r of rows) {
  const bad = r.overflow > 0 || r.clipped.length || r.errors.length || r.frames.over32 > 0 || r.frames.p99 >= 20;
  console.log(
    `${bad ? "FAIL" : " ok "}  ${r.vpName.padEnd(8)} ${r.route.padEnd(20)} ` +
      `overflow ${String(r.overflow).padStart(3)}px  clipped ${String(r.clipped.length).padStart(2)}  ` +
      `errors ${String(r.errors.length).padStart(2)}  ` +
      `p50 ${String(r.frames.p50).padStart(6)}  p95 ${String(r.frames.p95).padStart(6)}  p99 ${String(r.frames.p99).padStart(6)}  ` +
      `>32ms ${String(r.frames.over32).padStart(3)}  max ${String(r.frames.max).padStart(7)}  docH ${r.docH}`,
  );
  for (const c of r.clipped.slice(0, 6))
    console.log(`         clipped: .${c.cls} +${c.over}px  "${c.text}"`);
  for (const e of r.errors.slice(0, 4)) console.log(`         error: ${e}`);
}

const fails = rows.filter((r) => r.overflow > 0 || r.clipped.length || r.errors.length);
console.log(
  `\n${rows.length} route×viewport combinations. ` +
    `${fails.length} with overflow / clipped text / console errors.`,
);
const p99 = Math.max(...rows.map((r) => r.frames.p99));
const o32 = rows.reduce((a, r) => a + r.frames.over32, 0);
console.log(`worst p99 across all: ${p99}ms    total frames > 32ms: ${o32}`);

await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
