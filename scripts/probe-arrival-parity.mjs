/* DOES THE ARRIVAL DRIVER PRODUCE FRAMER'S NUMBER?

   Discover's eight tiles no longer each hold a `useScroll`; their arrival
   progress is computed from a document offset measured once (see THE
   ARRIVAL DRIVER in components/Discover.tsx). That is only a legitimate
   swap if the VALUE is unchanged — the arrival line this page shares
   (~87% down the window) was tuned against framer's arithmetic, so a
   driver that is merely "close" retimes eight cards and every constant
   documented around them becomes a lie.

   So: walk both builds down the chapter at the same scroll positions and
   compare the two custom properties the progress actually reaches —
   `--photo-enter` (the whole 0→1 range) and `--card-ink` (INK_SLOT, which
   catches a mis-mapped sub-range that the full range would hide).

   ⚠️ COMPARE PER PLATE, NOT IN AGGREGATE. A column-lead bug moves one
   column and leaves the mean where it was.

   usage: node scripts/probe-arrival-parity.mjs <portBefore> <portAfter>  */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [, , PORT_A, PORT_B] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const walk = async (port) => {
  const b = await puppeteer.launch({
    executablePath: CHROME, headless: "new", protocolTimeout: 600000,
    args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
           "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await b.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForFunction(
    () => !document.body.classList.contains("is-loading") &&
          !document.querySelector('[class*="Loader_overlay__"]'),
    { timeout: 45000 },
  ).catch(() => console.warn("! loader gate timed out"));
  await sleep(1200);

  const top = await page.evaluate(() => {
    const el = document.querySelector("#restaurants");
    return el ? Math.round(el.getBoundingClientRect().top + scrollY) : 0;
  });

  /* ⚠️ THE VIEWPORT IS RESIZED PART-WAY DOWN, AND THAT IS THE POINT.
     The driver caches each cell's document offset instead of re-reading it
     every scroll event, so the one failure this comparison exists to catch
     is a cache that went stale. A resize moves every offset at once — if
     the invalidation does not fire, the second half of this walk diverges
     from framer while the first half agrees, which no static walk would
     ever show. */
  const out = [];
  let resized = false;
  for (let y = top - 1000; y <= top + 3600; y += 100) {
    if (!resized && y > top + 1200) {
      resized = true;
      await page.setViewport({ width: 1280, height: 740 });
      await sleep(600); // let the resize land and the insets re-measure
    }
    await page.evaluate((v) => window.__lenis?.scrollTo(v, { immediate: true }), y);
    await sleep(140); // both paths settle within a frame or two
    const row = await page.evaluate(() => {
      const seats = [...document.querySelectorAll("[data-plate]")];
      return seats.map((s) => ({
        i: s.getAttribute("data-plate"),
        enter: s.style.getPropertyValue("--photo-enter").trim(),
        ink: s.style.getPropertyValue("--card-ink").trim(),
      }));
    });
    out.push({ y, row, resized });
  }
  await b.close();
  return { top, out };
};

console.log(`\nwalking BEFORE (:${PORT_A}) …`);
const A = await walk(PORT_A);
console.log(`walking AFTER  (:${PORT_B}) …`);
const B = await walk(PORT_B);

const num = (s) => (s === "" || s == null ? NaN : parseFloat(s));
let worstEnter = 0, worstInk = 0, compared = 0, missing = 0;
const perPlate = new Map();

for (let i = 0; i < Math.min(A.out.length, B.out.length); i++) {
  const a = A.out[i], b = B.out[i];
  if (a.y !== b.y) continue;
  for (let j = 0; j < Math.min(a.row.length, b.row.length); j++) {
    const ea = num(a.row[j].enter), eb = num(b.row[j].enter);
    const ia = num(a.row[j].ink), ib = num(b.row[j].ink);
    const key = a.row[j].i ?? String(j);
    if (!perPlate.has(key)) perPlate.set(key, { enter: 0, ink: 0, atY: 0 });
    const p = perPlate.get(key);
    if (Number.isNaN(ea) !== Number.isNaN(eb)) { missing++; continue; }
    if (!Number.isNaN(ea)) {
      compared++;
      const de = Math.abs(ea - eb), di = Math.abs(ia - ib);
      if (de > p.enter) { p.enter = de; p.atY = a.y; }
      if (di > p.ink) p.ink = di;
      if (de > worstEnter) worstEnter = de;
      if (di > worstInk) worstInk = di;
    }
  }
}

console.log(`\nchapter top: before ${A.top}px, after ${B.top}px` +
  `${A.top === B.top ? "" : "   ⚠️ LAYOUT MOVED — differences below are not the driver"}`);
const afterResize = A.out.filter((s) => s.resized).length;
console.log(`${compared} plate-samples compared, ${missing} present in one build only`);
console.log(`${afterResize} of ${A.out.length} scroll positions were sampled AFTER a viewport resize\n`);
console.log(`  plate   max |Δ --photo-enter|   max |Δ --card-ink|   worst at y`);
for (const [k, p] of [...perPlate.entries()].sort((a, b) => +a[0] - +b[0])) {
  console.log(`  ${String(k).padStart(5)}   ${p.enter.toExponential(2).padStart(19)}   ${p.ink.toExponential(2).padStart(17)}   ${p.atY}`);
}

/* --photo-enter spans 1.06 → 1, so 1e-4 is well under a thousandth of the
   travel — below anything a screen can show, and below the rounding the
   value goes through on its way to a scale */
const TOL = 1e-4;
/* ⚠️ A VACUOUS PASS IS THE FAILURE MODE OF THIS PROBE. Two builds that
   both hold `--photo-enter` at a constant agree perfectly and prove
   nothing, so the spread of what was actually sampled is part of the
   result: if the driver never moved through its range, the comparison
   above did not test the range. */
const spread = (src) => {
  const vals = src.out.flatMap((s) => s.row.map((r) => num(r.enter))).filter((v) => !Number.isNaN(v));
  return vals.length
    ? { lo: Math.min(...vals), hi: Math.max(...vals), distinct: new Set(vals.map((v) => v.toFixed(4))).size }
    : { lo: NaN, hi: NaN, distinct: 0 };
};
const sa = spread(A), sb = spread(B);
console.log(`\nsampled --photo-enter range   before ${sa.lo.toFixed(4)}…${sa.hi.toFixed(4)} (${sa.distinct} distinct)` +
  `   after ${sb.lo.toFixed(4)}…${sb.hi.toFixed(4)} (${sb.distinct} distinct)`);
if (sa.distinct < 10 || sb.distinct < 10) {
  console.log("  ⚠️ TOO FEW DISTINCT VALUES — the walk did not cross the arrival range; the comparison is vacuous");
}
console.log(`\nworst overall: --photo-enter ${worstEnter.toExponential(3)}, --card-ink ${worstInk.toExponential(3)}`);
console.log(worstEnter <= TOL && worstInk <= TOL
  ? `PASS — the driver reproduces framer's progress within ${TOL}`
  : `FAIL — the driver diverges from framer beyond ${TOL}`);
