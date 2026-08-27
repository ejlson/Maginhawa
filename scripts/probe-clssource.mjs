/* WHICH ELEMENTS ARE MOVING, AND BY HOW MUCH?

   A CLS number says a page shifts; it does not say what shifted. The
   layout-shift entry carries `sources`, each with the node and its before/
   after rectangles, which turns "CLS 0.227" into a list of elements and the
   distance each one jumped.

   usage: node scripts/probe-clssource.mjs [port] [path] [w] [h] [throttle] */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3120";
const PATH_ = process.argv[3] || "/menus/cafemama";
const W = +(process.argv[4] || 390), H = +(process.argv[5] || 844);
const THROTTLE = +(process.argv[6] || 4);

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
const cdp = await page.target().createCDPSession();
if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });

await page.evaluateOnNewDocument(() => {
  window.__cls = 0; window.__shifts = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__cls += e.value;
      for (const s of e.sources || []) {
        const n = s.node;
        window.__shifts.push({
          v: +e.value.toFixed(4),
          t: Math.round(e.startTime),
          el: n ? (n.tagName || "#" + n.nodeName).toLowerCase() +
                  (n.className ? "." + String(n.className).trim().split(/\s+/).slice(0, 2).join(".") : "")
                : "(no node)",
          from: s.previousRect ? `${Math.round(s.previousRect.y)}` : "?",
          to: s.currentRect ? `${Math.round(s.currentRect.y)}` : "?",
        });
      }
    }
  }).observe({ type: "layout-shift", buffered: true });
});

await page.goto(`http://localhost:${PORT}${PATH_}`, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForFunction(() => !document.querySelector('[class*="Loader_overlay__"]'),
  { timeout: 45000, polling: "raf" }).catch(() => {});
await new Promise((r) => setTimeout(r, 5000));
/* a slow scroll to the foot — lazy sheets only shift when they are reached,
   and a CLS that only appears on scroll is still a CLS */
await page.evaluate(async () => {
  const step = innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true });
    else scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 450));
  }
});
await new Promise((r) => setTimeout(r, 1500));

const { cls, shifts } = await page.evaluate(() => ({ cls: window.__cls, shifts: window.__shifts }));
console.log(`\nCLS SOURCES — ${PATH_} @ ${W}x${H}, CPU ${THROTTLE}x\n`);
console.log(`total CLS ${cls.toFixed(4)}  (good <= 0.1, poor > 0.25)\n`);
console.log("  value      at        y: from -> to   element");
for (const s of shifts.sort((a, b) => b.v - a.v).slice(0, 20))
  console.log(`  ${s.v.toFixed(4).padStart(7)}  ${(s.t + "ms").padStart(7)}  ` +
              `${(s.from + " -> " + s.to).padStart(16)}   ${s.el}`);
if (!shifts.length) console.log("  (no shift sources reported)");
await b.close();
