/* "the loading animation loads but never takes me to the page i want to."
   Reproduce it. Clicks real nav links and asserts the pathname actually
   changed, across the cases the state machine in PageTransition.tsx is most
   likely to wedge on: repeated navs, a second click while the curtain is up,
   a click made while the home page has scroll locked for its assembly, and —
   the one that caught the real bug — a machine slow enough that the route
   takes longer than any constant this file could have picked.

   Section D is the bar. It is not enough for the pathname to change
   eventually: the reader must never be left looking at the page they asked
   to LEAVE with the curtain already gone. That is the shape the wedge
   actually had, and a pass/fail on pathname alone sails straight past it.

   usage: node scripts/probe-nav.mjs [port] */
import puppeteer from "puppeteer-core";
const PORT = process.argv[2] || "3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1","--enable-gpu"] });
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });

/* Watches the curtain every frame while a navigation is in flight. `covered`
   latches once the curtain has actually sealed; after that, any frame where
   the curtain is not on screen AND the pathname has not moved is the reader
   stranded on the old page. `alive` is a sentinel that a full document load
   would wipe, so the report can tell a client transition from the hard-reload
   escalation. */
const watch = (from) => page.evaluate((f) => {
  const el = document.querySelector('[class*="curtain"]');
  if (!el) return false;
  const st = { covered: false, stranded: 0, frames: 0, run: true };
  /* mirrored into sessionStorage, because one of the outcomes under test is
     a full document load — which wipes `window.__w` and would otherwise make
     a strand that happened BEFORE the reload unreportable */
  sessionStorage.setItem("__strand", "0");
  sessionStorage.setItem("__frames", "0");
  const tick = () => {
    const cs = getComputedStyle(el);
    let y = 0;
    if (cs.transform && cs.transform !== "none") {
      try { y = new DOMMatrixReadOnly(cs.transform).m42; } catch (e) { y = 0; }
    }
    const op = parseFloat(cs.opacity) || 0;
    const gone = op < 0.02 || Math.abs(y) >= window.innerHeight - 2;
    if (!gone && Math.abs(y) < 2 && op > 0.9) st.covered = true;
    if (st.covered && location.pathname === f && gone) {
      st.stranded++;
      sessionStorage.setItem("__strand", String(st.stranded));
    }
    st.frames++;
    if (st.frames % 30 === 0) sessionStorage.setItem("__frames", String(st.frames));
    if (st.run) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__w = st;
  window.__spaAlive = true;
  return true;
}, from);
const stopWatch = () => page.evaluate(() => {
  const w = window.__w;
  const carried = {
    stranded: +(sessionStorage.getItem("__strand") || 0),
    frames: +(sessionStorage.getItem("__frames") || 0),
  };
  if (!w) return { ...carried, covered: false, hardload: !window.__spaAlive };
  w.run = false;
  return { stranded: Math.max(w.stranded, carried.stranded), covered: w.covered, frames: w.frames, hardload: !window.__spaAlive };
}).catch(() => ({ stranded: 0, covered: false, frames: 0, hardload: true }));

const settle = async () => {
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(()=>{});
  await sleep(900);
};
const clickNav = async (label) => {
  const ok = await page.evaluate((l) => {
    const a = [...document.querySelectorAll("nav a, header a")]
      .find((e) => (e.textContent || "").trim().toUpperCase() === l);
    if (!a) return false; a.click(); return true;
  }, label);
  return ok;
};
/* page.url() rather than an evaluate: a hard document load destroys the
   execution context mid-poll, and the escalation path in PageTransition is
   exactly a hard document load. Reading the frame's own URL survives it. */
const pathNow = async () => { try { return new URL(page.url()).pathname; } catch { return ""; } };

let fails = 0;
const go = async (label, expect, waitMs = 4000) => {
  const from = await pathNow();
  await watch(from).catch(()=>{});
  if (!(await clickNav(label))) { console.log(`  ! link "${label}" not found (at ${from})`); fails++; return; }
  const t0 = Date.now();
  let to = from;
  while (Date.now() - t0 < waitMs) { to = await pathNow(); if (to !== from) break; await sleep(80); }
  const ms = Date.now() - t0;
  const w = await stopWatch();
  const good = to === expect;
  if (!good) fails++;
  if (w.stranded > 0) { fails++; }
  const strand = w.stranded > 0 ? `  STRANDED for ${w.stranded} frames on the old page` : "";
  const hard = w.hardload ? "  (hard reload)" : "";
  console.log(`  ${good && !w.stranded ? "ok  " : "FAIL"} ${from} --${label}--> ${to}  ${good ? `(${ms}ms)` : `(expected ${expect}, gave up after ${ms}ms)`}${hard}${strand}`);
  await settle();
};

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await settle();

console.log("\n=== A. straight round-trip, twice ===");
for (let i = 0; i < 2; i++) {
  await go("ABOUT US", "/about");
  await go("RESTAURANTS", "/restaurants");
  await go("CONTACT US", "/contact");
  await go("BLOG", "/blog");
}

console.log("\n=== B. second click while the curtain is still up ===");
for (let i = 0; i < 3; i++) {
  const from = await pathNow();
  await clickNav("ABOUT US");
  await sleep(180);                    // mid-cover
  await clickNav("CONTACT US");        // change your mind
  const t0 = Date.now(); let to = from;
  while (Date.now() - t0 < 5000) { to = await pathNow(); if (to === "/contact") break; await sleep(80); }
  const good = to === "/contact";
  if (!good) fails++;
  console.log(`  ${good ? "ok  " : "FAIL"} ${from} -> (about, then contact) -> ${to}`);
  await settle();
  if (to !== "/") { await go("RESTAURANTS", "/restaurants"); }
}

console.log("\n=== C. click made while the home page has scroll locked ===");
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await settle();
/* drive into the restaurants chapter, which stops Lenis for its assembly */
await page.evaluate(async () => { for (let y = 0; y <= 4200; y += 300) {
  window.__lenis?.scrollTo(y, { immediate: true }) ?? window.scrollTo(0, y);
  await new Promise(r => setTimeout(r, 60)); } });
await sleep(500);
const locked = await page.evaluate(() => ({
  lenisStopped: !!window.__lenis?.isStopped,
  bodyLocked: getComputedStyle(document.body).overflow,
}));
console.log(`  state before clicking: ${JSON.stringify(locked)}`);
await go("CONTACT US", "/contact", 6000);
const after = await page.evaluate(() => ({
  lenisStopped: !!window.__lenis?.isStopped,
  bodyOverflow: getComputedStyle(document.body).overflow,
  canScroll: (() => { const y0 = scrollY; window.scrollTo(0, 400); const moved = scrollY !== y0; window.scrollTo(0, y0); return moved; })(),
}));
console.log(`  state after landing:   ${JSON.stringify(after)}`);
if (after.lenisStopped || !after.canScroll) { console.log("  FAIL — landed on a page that cannot scroll"); fails++; }

/* ---- D. a machine slow enough that the route outruns any constant ----
   This is the section that reproduces the reported bug. At 20x CPU throttle
   /about -> /restaurants took 10.4s to land; the old 2800ms stuck timer put
   the curtain away at 7.6s and left 2.8s of the reader sitting on /about with
   nothing on screen. Pathname alone still said "ok" in the end. */
console.log("\n=== D. slow machine: the route outruns the curtain ===");
const cdp = await page.target().createCDPSession();
for (const rate of [6, 20]) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await settle();
  await go("ABOUT US", "/about", 20000);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await sleep(400);
  console.log(`  --- CPU throttle x${rate} ---`);
  const from = await pathNow();
  await watch(from);
  await clickNav("RESTAURANTS");
  const t0 = Date.now(); let to = from;
  while (Date.now() - t0 < 30000) { to = await pathNow(); if (to === "/restaurants") break; await sleep(100); }
  const ms = Date.now() - t0;
  const w = await stopWatch();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const landed = to === "/restaurants";
  if (!landed) fails++;
  if (w.stranded > 0) fails++;
  console.log(`  ${landed && !w.stranded ? "ok  " : "FAIL"} ${from} --RESTAURANTS--> ${to} (${ms}ms)${w.hardload ? " via hard reload" : ""}` +
    (w.stranded ? `  STRANDED ${w.stranded}/${w.frames} frames under a withdrawn curtain` : `  curtain held the whole way (${w.frames} frames sampled)`));
  await settle();
}

/* ---- E. is `routing` real? ----
   Net 3 in PageTransition.tsx only holds because React's useTransition flag
   stays true for the whole of a route change. If it ever stopped reporting,
   the net would escalate to a full page load on every ordinary navigation —
   so the assumption is asserted, not assumed. */
console.log("\n=== E. useTransition actually reports the navigation ===");
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
await settle();
await page.evaluate(() => {
  window.__seen = { routing: false, phases: [] };
  const poll = () => {
    const s = window.__pageTransition;
    if (s) {
      if (s.routing) window.__seen.routing = true;
      const last = window.__seen.phases[window.__seen.phases.length - 1];
      if (last !== s.phase) window.__seen.phases.push(s.phase);
    }
    if (window.__seen.run !== false) requestAnimationFrame(poll);
  };
  poll();
});
await clickNav("RESTAURANTS");
await page.waitForFunction(() => location.pathname === "/restaurants", { timeout: 20000 }).catch(()=>{});
await sleep(1400);
const seen = await page.evaluate(() => { window.__seen.run = false; return window.__seen; });
if (!seen.routing) { console.log("  FAIL — `routing` never went true; net 3 would fire on every nav"); fails++; }
else console.log(`  ok   routing observed true; phases ${JSON.stringify(seen.phases)}`);

/* ---- F. reduced motion has its own path through the same machine ---- */
console.log("\n=== F. prefers-reduced-motion ===");
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await settle();
await go("ABOUT US", "/about", 8000);
await go("CONTACT US", "/contact", 8000);
await go("BLOG", "/blog", 8000);
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);

/* ---- G. a route that is genuinely slow, and one that is genuinely dead ----
   CPU throttling is noisy — it stretches the route by a different amount on
   every run, which is fine for smoke but useless as a regression test. These
   two hold the route still instead.

   G1 delays the RSC payload by five seconds: twice the old 2800ms wall, so it
   fails outright against the previous code, and the assertion is not just
   "landed" but "landed WITHOUT a hard reload" — proof that a merely slow
   route is waited out rather than escalated.

   G2 aborts the RSC payload entirely. The client navigation then cannot
   complete at all, and the only acceptable outcome is that the reader still
   ends up on the page they clicked. A hard reload here is the correct answer,
   not a failure. */
console.log("\n=== G. the route held still ===");
let mode = "off";
await page.setRequestInterception(true);
page.on("request", async (r) => {
  if (mode !== "off" && /[?&]_rsc=/.test(r.url())) {
    if (mode === "abort") return r.abort().catch(()=>{});
    // "hang" never answers at all — the request simply stays in flight. This
    // is the one shape the router cannot detect for itself: no response and
    // no error, so nothing throws and nothing falls back.
    if (mode === "hang") return;
    await sleep(5000);
  }
  r.continue().catch(()=>{});
});

for (const [label, m, expectHard] of [
  ["G1 RSC delayed 5s", "delay", false],
  ["G2 RSC dead      ", "abort", null],
  ["G3 RSC hangs     ", "hang", null],
]) {
  await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
  await settle();
  mode = m;
  const from = await pathNow();
  await watch(from);
  await clickNav("RESTAURANTS");
  const t0 = Date.now(); let to = from;
  while (Date.now() - t0 < 30000) { to = await pathNow(); if (to === "/restaurants") break; await sleep(100); }
  const ms = Date.now() - t0;
  const w = await stopWatch();
  mode = "off";
  const landed = to === "/restaurants";
  const hardWrong = expectHard === false && w.hardload;
  if (!landed || w.stranded > 0 || hardWrong) fails++;
  console.log(`  ${landed && !w.stranded && !hardWrong ? "ok  " : "FAIL"} ${label}: ${from} -> ${to} (${ms}ms)` +
    `${w.hardload ? " via hard reload" : " client-side"}` +
    (w.stranded ? `  STRANDED ${w.stranded}/${w.frames} frames` : `  curtain held (${w.frames} frames)`) +
    (hardWrong ? "  — escalated a route that was only slow" : ""));
  await settle();
}
await page.setRequestInterception(false).catch(()=>{});

console.log(`\n  ${fails ? `${fails} FAILURE(S)` : "all navigations completed"}`);
setTimeout(() => process.exit(fails ? 1 : 0), 2500);
await b.close().catch(()=>{}); process.exit(fails ? 1 : 0);
