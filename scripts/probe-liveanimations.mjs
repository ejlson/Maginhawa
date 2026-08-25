/* WHAT IS ACTUALLY ANIMATING, AND IS IT ON SCREEN.

   The invalidation trace names elements with an `Animation` reason but not
   whether that animation is one the reader can see. `document.getAnimations()`
   answers both: every running animation, its target, the property it drives,
   and — joined against the target's rect — whether the target is anywhere
   near the viewport.

   An animation running on an element 4000px below the fold is pure cost.
   That is the number this probe exists to produce.

   usage: node scripts/probe-liveanimations.mjs [port] [frac]            */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const FRAC = +(process.argv[3] || 0.02);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
const cdp = await page.target().createCDPSession();
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2", timeout: 90000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading") &&
        !document.querySelector('[class*="Loader_overlay__"]'),
  { timeout: 45000 },
).catch(() => console.warn("! loader gate timed out"));
await sleep(1200);
await page.evaluate(() => window.__lenis?.scrollTo(document.body.scrollHeight, { immediate: true }));
await sleep(1500);
await page.evaluate((f) => window.__lenis?.scrollTo(document.body.scrollHeight * f, { immediate: true }), FRAC);
await sleep(1200);

// sample mid-scroll, which is when the transient ones exist
for (let i = 0; i < 6; i++) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 700, y: 450, deltaX: 0, deltaY: 100 });
  await sleep(60);
}

const out = await page.evaluate(() => {
  const vh = window.innerHeight;
  const rows = [];
  for (const a of document.getAnimations()) {
    if (a.playState !== "running") continue;
    const t = a.effect?.target;
    if (!t) continue;
    const r = t.getBoundingClientRect();
    // distance in viewport-heights from the visible band
    const off = r.bottom < 0 ? -r.bottom : r.top > vh ? r.top - vh : 0;
    let props = [];
    try {
      props = (a.effect.getKeyframes?.() || [])
        .flatMap((k) => Object.keys(k))
        .filter((k) => !["offset", "composite", "computedOffset", "easing"].includes(k));
    } catch {}
    rows.push({
      cls: (t.className || "").toString().slice(0, 46) || t.tagName,
      kind: a.constructor.name,
      anim: a.animationName || a.transitionProperty || "",
      props: [...new Set(props)].join(","),
      offVh: +(off / vh).toFixed(1),
    });
  }
  return { vh, total: document.getAnimations().length, rows };
});

console.log(`\nfrac ${FRAC} | ${out.total} animations total, ${out.rows.length} RUNNING\n`);

const onScreen = out.rows.filter((r) => r.offVh === 0);
const offScreen = out.rows.filter((r) => r.offVh > 0);
console.log(`  on screen : ${onScreen.length}`);
console.log(`  OFF screen: ${offScreen.length}   <-- pure cost\n`);

const group = (rows) => {
  const m = new Map();
  for (const r of rows) {
    const k = `${r.cls} · ${r.kind} · ${r.anim || r.props}`;
    if (!m.has(k)) m.set(k, { n: 0, far: 0 });
    const g = m.get(k);
    g.n++;
    g.far = Math.max(g.far, r.offVh);
  }
  return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
};

console.log("OFF-SCREEN running animations (count · furthest, in viewport-heights):");
for (const [k, g] of group(offScreen).slice(0, 15)) {
  console.log(`  ${String(g.n).padStart(3)}x  ${String(g.far).padStart(5)}vh  ${k}`);
}
console.log("\non-screen running animations:");
for (const [k, g] of group(onScreen).slice(0, 10)) {
  console.log(`  ${String(g.n).padStart(3)}x           ${k}`);
}

await b.close();
