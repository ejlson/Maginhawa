/* HOW MANY COMPOSITOR LAYERS DOES THIS PAGE HOLD, AND WHO ASKED FOR THEM?

   probe-belowfold-mechanism.mjs split the below-fold cost three ways and the
   answer was none of the two obvious ones:

     bf-cached-offset (framer's per-scroll re-measure removed)   23%  — floor
     bf-no-anim       (CSS animations below the fold stopped)    16%  — floor
     bf-visibility    (`visibility: hidden`, layout intact)       9%  p95 17.2
     below-fold-gone  (`display: none`)                           0%  p95  9.2
     controls                                              29% / 18%  (±11)

   `visibility: hidden` changes NOTHING about script or layout — every
   offsetTop still answers the same number, so framer measures exactly as
   before — and it recovers most of the win. That leaves PAINT AND
   COMPOSITE, which on a page carrying dozens of standing `will-change`
   declarations means RASTER OF PROMOTED LAYERS the reader cannot see.

   This counts them, sizes them, and says which are below the fold, so the
   fix can be aimed at named rules instead of at `will-change` in general.

   ── WHY THIS IS THE INSTRUMENT AND NOT A FRAME-TIMING A/B ──
   Layer count and layer pixels are COUNTS. They do not move between runs on
   identical code, so a 5% change in them is a real 5% — where the hero
   frame-drop ratio needed a repeated null control to establish a ±11 point
   floor before anything could be read off it at all
   ([[reference-probe-run-variance]]).

   Pass a variant name to strip a suspect at runtime and print the delta.

   usage: node scripts/probe-layercensus.mjs [port] [path] [w] [h] [variant]
          variants: none | no-curtain-wc | no-grain | hero-static
                    | no-belowfold-wc | below-fold-gone                  */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3120";
const PATH_ = process.argv[3] || "/";
const W = +(process.argv[4] || 1440), H = +(process.argv[5] || 900);
const VARIANT = process.argv[6] || "none";
const CSS = {
  none: "",
  "no-curtain-wc": '[class*="PageTransition_curtain"], [class*="PageTransition_frame"] { will-change: auto !important; }',
  "no-grain": '[class*="Hero_grain"] { display: none !important; }',
  "hero-static": '[class*="Hero_hero"] { position: relative !important; }',
  "no-belowfold-wc": ".afterHero *, .afterHero *::before, .afterHero *::after { will-change: auto !important; }",
  "bf-visibility": ".afterHero { visibility: hidden !important; }",
  "cv-children": "main .afterHero > * { content-visibility: auto; contain-intrinsic-size: auto 900px; }",
  "cv-sections": "main .afterHero section { content-visibility: auto; contain-intrinsic-size: auto 900px; }",
  "below-fold-gone": ".afterHero { display: none !important; }",
};
if (!(VARIANT in CSS)) { console.error("unknown variant " + VARIANT); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
await page.evaluateOnNewDocument(() => {
  try { sessionStorage.setItem("mgnhw:introSeen", "1"); } catch {}
});
const cdp = await page.target().createCDPSession();
await cdp.send("DOM.enable");

let latest = [];
cdp.on("LayerTree.layerTreeDidChange", (e) => { if (e.layers) latest = e.layers; });

await page.goto(`http://localhost:${PORT}${PATH_}`, { waitUntil: "networkidle2", timeout: 90000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading") &&
        !document.querySelector('[class*="Loader_overlay__"]'),
  { timeout: 45000, polling: "raf" }).catch(() => {});
await sleep(2500);

/* nudge the compositor so the tree is the steady-state one, not the
   mid-entrance one */
if (CSS[VARIANT]) await page.evaluate((css) => {
  const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
}, CSS[VARIANT]);
await page.evaluate(() => window.__lenis?.scrollTo(0, { immediate: true }));
await sleep(800);

/* ⚠️ ENABLE THE DOMAIN HERE, NOT BEFORE THE NAVIGATION. `LayerTree.enable`
   emits the tree it has at the moment it is switched on and then only on
   CHANGE — enabled before `goto` it fires against the blank page, the real
   tree arrives during a navigation the domain does not survive, and the
   probe reports zero layers on a page that plainly has them. */
await cdp.send("LayerTree.enable");
await sleep(1500);

/* ⚠️ WITHOUT THIS EVERY LAYER COMES BACK "(detached)".
   `DOM.pushNodesByBackendIdsToFrontend` translates into the frontend's node
   map, and that map does not exist until `DOM.getDocument` has walked the
   tree once. The push then fails per node and the census prints 116 rows of
   nothing, which reads like a page of anonymous layers rather than like a
   probe that forgot a step. */
await cdp.send("DOM.getDocument", { depth: -1, pierce: true });

const named = [];
for (const l of latest) {
  if (!l.backendNodeId) { named.push({ sel: "(no node)", w: l.width, h: l.height, paints: l.paintCount }); continue; }
  let sel = "(detached)";
  try {
    const { nodeIds } = await cdp.send("DOM.pushNodesByBackendIdsToFrontend", { backendNodeIds: [l.backendNodeId] });
    const { node } = await cdp.send("DOM.describeNode", { nodeId: nodeIds[0] });
    const attrs = {};
    for (let i = 0; i < (node.attributes || []).length; i += 2) attrs[node.attributes[i]] = node.attributes[i + 1];
    sel = node.nodeName.toLowerCase() +
      (attrs.class ? "." + attrs.class.trim().split(/\s+/).slice(0, 2).join(".") : "");
  } catch {}
  named.push({ sel, w: l.width, h: l.height, y: l.offsetY ?? 0, paints: l.paintCount });
}

const docH = await page.evaluate(() => document.documentElement.scrollHeight);
const px = named.reduce((a, l) => a + l.w * l.h, 0);
console.log(`\nLAYER CENSUS — ${PATH_} @ ${W}x${H}, document ${docH}px, variant "${VARIANT}"\n`);
console.log(`${named.length} composited layers, ${(px / 1e6).toFixed(1)}M layer pixels ` +
            `≈ ${(px * 4 / 1048576).toFixed(0)}MB of raster at 1x DPR ` +
            `(${(px * 4 * 4 / 1048576).toFixed(0)}MB at 2x)\n`);
const painted = named.filter((l) => l.paints > 0);
console.log(`${painted.length} of them were actually PAINTED — the rest are layers the ` +
            `compositor holds but never rastered\n`);
console.log("      w x h        px(M)      y  paints  element");
for (const l of [...named].sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 40))
  console.log(
    `${String(l.w).padStart(6)} x${String(l.h).padStart(6)}  ` +
    `${((l.w * l.h) / 1e6).toFixed(2).padStart(7)}  ${String(Math.round(l.y)).padStart(6)}  ` +
    `${String(l.paints).padStart(6)}  ${l.sel}`);
await b.close();
