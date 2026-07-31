/* Frame-timing probe for the Discover assembly intro.
   Records every rAF delta while the sequence plays and reports the dropped
   frames per step — screenshot cadence is far too coarse (and too
   expensive) to tell real jank from capture cost.

   usage: node scripts/probe-assembly.mjs [port] */
import puppeteer from "puppeteer-core";
import { play } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "55075";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#restaurants [data-plate]", { timeout: 60000 });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
  timeout: 60000,
});
await sleep(1500);

// record frame deltas AND the step each frame belonged to
await page.evaluate(() => {
  const section = document.querySelector("#restaurants");
  window.__frames = [];
  let last = performance.now();
  const tick = (t) => {
    window.__frames.push([
      Math.round(t - last),
      Number(section?.getAttribute("data-assembly-step") ?? -1),
      Math.round(t),
    ]);
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const r = await play(page);
console.log(r.armed ? (r.scrubbed ? "armed + scrubbed" : "armed, SCRUB DID NOT COMPLETE") : "NEVER ARMED");
await sleep(11000);

const report = await page.evaluate(() => {
  const f = window.__frames.filter((x) => x[1] >= 0);
  const byStep = {};
  for (const [dt, step] of f) {
    (byStep[step] ??= []).push(dt);
  }
  const rows = Object.entries(byStep).map(([step, ds]) => ({
    step: Number(step),
    frames: ds.length,
    span: ds.reduce((a, b) => a + b, 0),
    max: Math.max(...ds),
    over32: ds.filter((d) => d > 32).length,
    over50: ds.filter((d) => d > 50).length,
  }));
  // the worst frames, with when they happened and what was on screen
  const worst = [...f]
    .sort((a, b) => b[0] - a[0])
    .slice(0, 6)
    .map(([dt, step, t]) => ({ dt, step, t }));
  const t0 = f[0]?.[2] ?? 0;
  worst.forEach((w) => (w.at = Math.round(w.t - t0)));
  // where did each plate actually land vs its grid seat?
  const seats = [...document.querySelectorAll("[data-plate]")].map((el) => {
    const r = el.getBoundingClientRect();
    return [Math.round(r.left), Math.round(r.top), Math.round(r.width)];
  });
  const head = document.querySelector("h2");
  return {
    rows,
    worst,
    seats,
    headTop: head ? Math.round(head.getBoundingClientRect().top) : null,
    scrollY: Math.round(window.scrollY),
    docStep: document.querySelector("#restaurants")?.getAttribute("data-assembly-step"),
  };
});

// must track STEP in components/Discover.tsx
const NAME = ["IDLE", "DOLLY", "SPLIT", "DEPART", "FLIGHT", "LAND", "LOGOS", "CAPTIONS", "FURNITURE", "DONE"];
console.log("\nstep        frames   span   maxΔ  >32ms  >50ms");
for (const r of report.rows) {
  console.log(
    `${(NAME[r.step] ?? r.step).padEnd(11)} ${String(r.frames).padStart(5)} ${String(r.span).padStart(6)}ms ${String(r.max).padStart(5)}ms ${String(r.over32).padStart(5)} ${String(r.over50).padStart(6)}`,
  );
}
console.log("\nworst frames:");
for (const w of report.worst) {
  console.log(`  ${String(w.dt).padStart(4)}ms  at +${String(w.at).padStart(5)}ms  during ${NAME[w.step] ?? w.step}`);
}
console.log("\nseats [left, top, width]:", JSON.stringify(report.seats));
console.log("head top:", report.headTop, "| scrollY:", report.scrollY);
await browser.close();
