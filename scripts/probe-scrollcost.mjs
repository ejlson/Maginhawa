/* AMBIENT SCROLL COST — what a real wheel scroll costs the main thread,
   region by region, with suspects toggleable at RUNTIME.

   The point of the runtime toggle: it isolates a suspect's cost WITHOUT
   editing code, so the before/after is measured on one page load, one
   build, one thermal state. Editing CSS and rebuilding between samples
   invites the run-to-run variance documented in
   [[reference-probe-run-variance]] to masquerade as the fix.

   Scroll is driven with REAL WHEEL EVENTS through CDP, not
   `lenis.scrollTo(immediate)` — the wheel is the path the reader uses and
   the only one that runs Lenis's damping loop (see the wheel-path note in
   lib/SmoothScroll.tsx). A teleport measures paint but skips the loop.

   usage: node scripts/probe-scrollcost.mjs [port] [w] [h]              */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900);
const THROTTLE = +(process.argv[5] || 1);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
const cdp = await page.target().createCDPSession();
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2", timeout: 90000 });

/* ⚠️ the loader holds the viewport for 7-8s. Gate on the overlay LEAVING
   the DOM, not on a sleep and not on `is-loading` — see the probe-harness
   note. Both gates are cheap, so wait on both. */
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading") &&
        !document.querySelector('[class*="Loader_overlay__"]'),
  { timeout: 45000 },
).catch(() => console.warn("! loader gate timed out — numbers may include the intro"));
await sleep(1200);

/* the once-per-session intro pins the page until it is scrolled past */
await page.evaluate(() => window.__lenis?.scrollTo(document.body.scrollHeight, { immediate: true }));
await sleep(1500);

if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
await sleep(500);

const map = await page.evaluate(() => ({
  docH: document.documentElement.scrollHeight,
  hasBlur: !!document.querySelector(".scrollBlur"),
}));

/* Suspects, toggled by injecting a stylesheet / flag into the live page. */
const SUSPECTS = {
  none: () => {},
  "no-scrollBlur": () => {
    const s = document.createElement("style");
    s.id = "__probe";
    s.textContent = ".scrollBlur, .scrollBlur::before, .scrollBlur::after { display: none !important; }";
    document.head.appendChild(s);
  },
  "no-cursor": () => {
    const s = document.createElement("style");
    s.id = "__probe";
    s.textContent = '[class*="CustomCursor_"] { display: none !important; }';
    document.head.appendChild(s);
  },
  "no-pressDrift": () => {
    const s = document.createElement("style");
    s.id = "__probe";
    s.textContent = '[class*="PressWall_track"] { animation: none !important; }';
    document.head.appendChild(s);
  },
  /* CAN THE BROWSER BE TOLD TO SKIP THE OFF-SCREEN WORK, rather than the
     work being removed by hand? `content-visibility: auto` makes the engine
     skip style, layout and paint for a subtree it judges off-screen. If this
     lands near the no-below-fold floor it is worth pursuing properly; if it
     does not, the cost is not skippable and the fix has to be in the code. */
  "cv-auto-below-fold": () => {
    const s = document.createElement("style");
    s.id = "__probe";
    s.textContent =
      "main .afterHero > * { content-visibility: auto; contain-intrinsic-size: auto 900px; }";
    document.head.appendChild(s);
  },
  /* THE OFF-SCREEN QUESTION. Everything below the first screen removed
     outright — not a shippable change, but it puts a NUMBER on how much of
     a hero scroll is spent on sections the reader cannot see. */
  "no-below-fold": () => {
    const s = document.createElement("style");
    s.id = "__probe";
    s.textContent = "main .afterHero { display: none !important; }";
    document.head.appendChild(s);
  },
};
const clearSuspect = () => document.getElementById("__probe")?.remove();

/* One sample: park at a fraction of the page, then send NOTCHES real wheel
   events at a human cadence and record every rAF delta while they land. */
const run = async (frac) => {
  await page.evaluate((f) => window.__lenis?.scrollTo(document.body.scrollHeight * f, { immediate: true }), frac);
  await sleep(900); // let lazy media and observers settle before recording

  await page.evaluate(() => {
    window.__f = [];
    let l = performance.now();
    const t = (x) => { window.__f.push(x - l); l = x; window.__raf = requestAnimationFrame(t); };
    window.__raf = requestAnimationFrame(t);
  });

  // a pointer parked ON the page and jiggling — the global cursor handler
  // is half the ambient load and never runs if the pointer never moves
  for (let i = 0; i < 26; i++) {
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseMoved", x: 700 + (i % 5) * 7, y: 440 + (i % 3) * 6,
    });
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseWheel", x: 700, y: 450, deltaX: 0, deltaY: 100,
    });
    await sleep(60); // ~16 notches/sec, an ordinary continuous scroll
  }
  await sleep(500); // capture the damping tail too — it is still animation

  const f = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    return window.__f.slice(1);
  });
  const long = (ms) => f.filter((d) => d > ms).length;
  const sorted = [...f].sort((a, b) => a - b);
  return {
    n: f.length,
    p50: sorted[Math.floor(f.length * 0.5)] || 0,
    p95: sorted[Math.floor(f.length * 0.95)] || 0,
    worst: Math.max(...f),
    o16: long(16.7), o32: long(32),
    pct16: Math.round((long(16.7) / f.length) * 100),
    pct32: Math.round((long(32) / f.length) * 100),
  };
};

const REGIONS = [
  ["hero", 0.02],
  ["Discover -> About seam", 0.30],
  ["As Seen In / interlude", 0.42],
  ["plain cream journal", 0.72],
  ["footer approach", 0.92],
];

console.log(`\ndoc ${map.docH}px @ ${W}x${H} | throttle ${THROTTLE}x | .scrollBlur in DOM: ${map.hasBlur}`);
console.log(`\n${"".padEnd(26)} frames   p50    p95   worst   >16.7ms      >32ms`);

for (const [name, fn] of Object.entries(SUSPECTS)) {
  console.log(`\n── suspect disabled: ${name} ──`);
  await page.evaluate(clearSuspect);
  await page.evaluate(fn);
  await sleep(400);
  for (const [label, frac] of REGIONS) {
    const r = await run(frac);
    console.log(
      `${label.padEnd(26)} ${String(r.n).padStart(5)}` +
      ` ${r.p50.toFixed(1).padStart(6)} ${r.p95.toFixed(1).padStart(6)}` +
      ` ${r.worst.toFixed(0).padStart(6)}ms` +
      ` ${String(r.o16).padStart(5)} (${String(r.pct16).padStart(3)}%)` +
      ` ${String(r.o32).padStart(5)} (${String(r.pct32).padStart(3)}%)`,
    );
  }
}

await b.close();
