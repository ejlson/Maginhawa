/* AC5.4 (no frame over 32ms attributable to the timeline) and AC4.5 (CLS = 0
   for the story section), measured on the PRODUCTION build at 1440px.

   Method. Frame cost is sampled with requestAnimationFrame deltas across a
   full reader-paced sweep of the whole page, with each frame tagged by
   whether the timeline was on screen at the time. Frames recorded while the
   timeline is NOT in the viewport are the control: a long frame that appears
   in both populations is the page's, not the timeline's.

   The hover choreography is swept separately — the shutter, the spotlight
   and the 800ms title reveal all run at once and none of them show up in a
   scroll sweep.

   usage: node scripts/probe-timeline-perf.mjs [port] [width] [height]      */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const W = +(process.argv[3] || 1440);
const H = +(process.argv[4] || 900);
const PAGE = `http://localhost:${PORT}/about`;
const LI = '[class*="timeline"] > li';

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });

/* ---------- CLS, installed before first paint ---------- */
await page.evaluateOnNewDocument(() => {
  window.__cls = { total: 0, story: 0, entries: [] };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__cls.total += e.value;
      const inStory = (e.sources || []).some(
        (s) => s.node && s.node.closest && s.node.closest('section[class*="story"]'),
      );
      if (inStory) {
        window.__cls.story += e.value;
        window.__cls.entries.push({
          v: +e.value.toFixed(5),
          t: Math.round(e.startTime),
          nodes: (e.sources || [])
            .map((s) => (s.node && s.node.tagName ? s.node.tagName + "." + String(s.node.className || "").split(" ")[0] : "?"))
            .join(","),
        });
      }
    }
  }).observe({ type: "layout-shift", buffered: true });
});

await page.goto(PAGE, { waitUntil: "networkidle2" });
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 })
  .catch(() => {});
await new Promise((r) => setTimeout(r, 900));

/* ---------- frame sweep ---------- */
const trace = await page.evaluate(async () => {
  const ol = document.querySelector('[class*="timeline"]');
  const frames = [];
  let last = performance.now();
  let running = true;
  const tick = () => {
    const now = performance.now();
    const r = ol.getBoundingClientRect();
    frames.push({
      d: now - last,
      y: Math.round(scrollY),
      tl: r.bottom > 0 && r.top < innerHeight, // timeline on screen this frame
    });
    last = now;
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // a reader's pace: ~90px every frame-ish, all the way down and part-way back
  const stepDown = async (px, times, gap) => {
    for (let i = 0; i < times; i++) {
      window.scrollBy(0, px);
      await new Promise((r) => setTimeout(r, gap));
    }
  };
  await stepDown(90, 130, 16);
  await stepDown(140, 60, 16);
  await stepDown(-160, 60, 16);
  await new Promise((r) => setTimeout(r, 400));
  running = false;
  return frames.slice(2);
});

const inTl = trace.filter((f) => f.tl);
const outTl = trace.filter((f) => !f.tl);
const pct = (a, p) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) * p)] : 0);
const dIn = inTl.map((f) => f.d), dOut = outTl.map((f) => f.d);

console.log(`\n=== FRAME SWEEP @ ${W}x${H} (production build, port ${PORT}) ===`);
console.log(`  frames total ${trace.length} — timeline on screen ${inTl.length}, off screen ${outTl.length}`);
const row = (label, a) =>
  console.log(
    `  ${label.padEnd(22)} p50 ${pct(a, 0.5).toFixed(1)}ms  p95 ${pct(a, 0.95).toFixed(1)}ms  p99 ${pct(a, 0.99).toFixed(1)}ms  max ${Math.max(...a).toFixed(1)}ms  >32ms: ${a.filter((d) => d > 32).length}  >50ms: ${a.filter((d) => d > 50).length}`,
  );
row("TIMELINE on screen", dIn);
row("control (off screen)", dOut);

const longIn = inTl.filter((f) => f.d > 32);
if (longIn.length) {
  console.log(`\n  long frames while the timeline is on screen (${longIn.length}):`);
  longIn.slice(0, 20).forEach((f) => console.log(`    ${f.d.toFixed(1)}ms at scrollY ${f.y}`));
}
const AC54 = longIn.length === 0;
console.log(`\n  AC5.4  no frame over 32ms while the timeline is on screen: ${AC54 ? "PASS" : "FAIL"}`);
if (!AC54)
  console.log(
    `         control population also has ${dOut.filter((d) => d > 32).length} frames >32ms — a long frame present in BOTH is the page's, not the timeline's`,
  );

/* ---------- hover choreography, sampled per frame ---------- */
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise((r) => setTimeout(r, 700));
for (let i = 0; i < 90; i++) {
  await page.evaluate(() => window.scrollBy(0, 200));
  await new Promise((r) => setTimeout(r, 20));
}
await new Promise((r) => setTimeout(r, 1200));
const to = await page.evaluate(
  `(() => { const r = document.querySelectorAll('${LI}')[3].getBoundingClientRect();
     return Math.max(0, Math.round(scrollY + r.top + r.height/2 - innerHeight/2)); })()`,
);
let cur = await page.evaluate("Math.round(scrollY)");
const dir = to > cur ? 1 : -1;
let guard = 0;
while (Math.abs(cur - to) > 180 && guard++ < 400) {
  await page.evaluate((d) => window.scrollBy(0, d), dir * 180);
  await new Promise((r) => setTimeout(r, 22));
  cur = await page.evaluate("Math.round(scrollY)");
}
await new Promise((r) => setTimeout(r, 1400));

const pt = await page.evaluate(
  `(() => { const r = document.querySelectorAll('${LI}')[3].querySelector('[class*="frame"]').getBoundingClientRect();
     return { x: Math.round(r.x + r.width/2), y: Math.round(Math.min(Math.max(r.y + 24, 40), innerHeight - 40)) }; })()`,
);
const pt2 = await page.evaluate(
  `(() => { const r = document.querySelectorAll('${LI}')[4].querySelector('[class*="frame"]').getBoundingClientRect();
     return { x: Math.round(r.x + r.width/2), y: Math.round(Math.min(Math.max(r.y + 24, 40), innerHeight - 40)) }; })()`,
);

await page.evaluate(() => {
  window.__hf = [];
  let last = performance.now();
  window.__stop = false;
  const t = () => {
    const n = performance.now();
    window.__hf.push(n - last);
    last = n;
    if (!window.__stop) requestAnimationFrame(t);
  };
  requestAnimationFrame(t);
});
for (let i = 0; i < 4; i++) {
  await page.mouse.move(pt.x, pt.y);
  await new Promise((r) => setTimeout(r, 1100));
  await page.mouse.move(pt2.x, pt2.y);
  await new Promise((r) => setTimeout(r, 1100));
  await page.mouse.move(6, 6);
  await new Promise((r) => setTimeout(r, 900));
}
const hf = (await page.evaluate("(() => { window.__stop = true; return window.__hf; })()")).slice(2);
console.log(`\n=== HOVER CHOREOGRAPHY (4 × enter/switch/leave, ${hf.length} frames) ===`);
row("hover frames", hf);
console.log(`  AC5.4 hover: no frame over 32ms: ${hf.filter((d) => d > 32).length === 0 ? "PASS" : "FAIL — " + hf.filter((d) => d > 32).map((d) => d.toFixed(1)).join(", ")}`);

/* ---------- CLS ---------- */
const cls = await page.evaluate("window.__cls");
console.log(`\n=== LAYOUT SHIFT ===`);
console.log(`  page CLS total        ${cls.total.toFixed(5)}`);
console.log(`  story-section CLS     ${cls.story.toFixed(5)}`);
if (cls.entries.length) cls.entries.forEach((e) => console.log(`    +${e.v} at ${e.t}ms — ${e.nodes}`));
console.log(`  AC4.5  story-section CLS = 0: ${cls.story === 0 ? "PASS" : "FAIL"}`);

await b.close();
