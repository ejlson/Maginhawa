/* THE PHOTOGRAPH NEVER TOUCHES THE TYPE. MEASURED EVERY FRAME.

   The careers hero opens by growing a photograph out of the seam between two
   lines of a headline and pushing them apart. The failure mode is a single
   frame on which the picture's edge crosses a letterform — and a contact
   sheet cannot catch that, because a contact sheet is a handful of stills
   from a beat that runs for ninety of them. This exact defect shipped on the
   home page's "Our Restaurants" split, where the invariant being checked was
   a RATIO ("the plate is never more than 70% of the gap") and the plate was
   nevertheless straight across the "R" for three quarters of the beat,
   because a ratio cannot see position. Measured intrusion there: +168px, on
   a composition that passed its own test.

   So this samples EVERY animation frame of the entrance and reports the
   worst intrusion on each side, in pixels, at each of the four viewports.

   THE BOXES IT COMPARES ARE INK BOXES, NOT LINE BOXES. SplitWords pads its
   clip window out by 0.14em top and bottom and pulls the same back with a
   negative margin, precisely because these display line-heights sit below 1
   and the glyphs overflow the line box. So the line box is ~28px optimistic
   at 100px type — a probe measuring it would report clearance on a frame
   where the picture is already through the ascenders. The union of the word
   masks is the real boundary: `overflow: hidden` means no glyph can render
   outside one.

   A NOTE ON WHAT THE SAMPLER COSTS. Reading four rects per frame forces a
   layout per frame, which is a cost this page does not otherwise pay. That
   is deliberate and it is why this is a separate probe from
   probe-join-frames.mjs: this one answers "is the geometry right", that one
   answers "is it cheap". Do not merge them.

   usage: node scripts/probe-join-split.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3187";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => {
  if (!c) fails++;
  console.log(`    ${c ? "PASS" : "FAIL"}  ${m}`);
};

/* Installed BEFORE the document runs, so the sampler is already ticking when
   the first beat starts. Registering it after `goto` resolves misses the
   opening frames, which are exactly the frames where a seeded photograph is
   at its most dangerous. */
const SAMPLER = () => {
  window.__split = [];
  window.__stopSplit = false;
  const ink = (el) => {
    const masks = el.querySelectorAll('[class*="mask"]');
    if (!masks.length) {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    }
    let top = Infinity;
    let bottom = -Infinity;
    masks.forEach((m) => {
      const r = m.getBoundingClientRect();
      if (r.top < top) top = r.top;
      if (r.bottom > bottom) bottom = r.bottom;
    });
    return { top, bottom };
  };
  const tick = (t) => {
    const lines = document.querySelectorAll('[class*="heroLine"]');
    const frame = document.querySelector('[class*="heroFrame"]');
    if (lines.length === 2 && frame) {
      const a = ink(lines[0]);
      const b = ink(lines[1]);
      const f = frame.getBoundingClientRect();
      window.__split.push({
        t,
        // POSITIVE = the picture is inside the type. This is the number.
        top: +(a.bottom - f.top).toFixed(2),
        bot: +(f.bottom - b.top).toFixed(2),
        h: +f.height.toFixed(1),
        w: +f.width.toFixed(1),
        gap: +(b.top - a.bottom).toFixed(2),
        op: +getComputedStyle(frame).opacity,
      });
    }
    if (!window.__stopSplit) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
    "--use-gl=angle",
  ],
});

// warm the image pipeline: `next start` optimizes on demand, and paying for
// the hero's first resize inside the sampled window is measuring the server
const warm = await b.newPage();
await warm.setViewport({ width: 1440, height: 900 });
await warm.goto(`http://localhost:${PORT}/careers`, { waitUntil: "networkidle0", timeout: 120000 });
await warm.close();

for (const [VW, VH] of [
  [1440, 900],
  [1920, 1080],
  [820, 1180],
  [390, 844],
]) {
  const page = await b.newPage();
  await page.setViewport({ width: VW, height: VH });
  await page.evaluateOnNewDocument(SAMPLER);
  await page.goto(`http://localhost:${PORT}/careers`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 })
    .catch(() => {});
  // the whole sequence is ~2.9s (words 1.17s, split from 0.83s over 1.5s,
  // caption from 1.9s); sample well past it
  await sleep(4200);

  const r = await page.evaluate(() => {
    window.__stopSplit = true;
    const s = window.__split;
    if (!s.length) return null;
    // only the frames on which the picture is actually being drawn — a
    // photograph at opacity 0 cannot cross a letterform
    const lit = s.filter((x) => x.op > 0.01);
    const worst = (k) =>
      lit.reduce((m, x) => (x[k] > m.v ? { v: x[k], at: x } : m), { v: -Infinity, at: null });
    const settled = s[s.length - 1];
    return {
      frames: s.length,
      lit: lit.length,
      worstTop: worst("top"),
      worstBot: worst("bot"),
      settled,
      // the growth actually happened rather than snapping on one frame
      distinctH: new Set(lit.map((x) => x.h)).size,
      minH: Math.min(...lit.map((x) => x.h)),
      maxH: Math.max(...lit.map((x) => x.h)),
    };
  });

  console.log(`\n=== ${VW}x${VH} ===`);
  if (!r) {
    console.log("  no samples — the hero did not render");
    fails++;
    await page.close();
    continue;
  }
  console.log(
    `  ${r.frames} frames sampled, ${r.lit} with the photograph drawn   height ${r.minH} -> ${r.maxH}px over ${r.distinctH} distinct sizes`,
  );
  console.log(
    `  worst intrusion   above the payoff line ${r.worstTop.v.toFixed(2)}px   below the setup line ${r.worstBot.v.toFixed(2)}px   (negative = clearance)`,
  );
  console.log(
    `  settled: frame ${r.settled.w}x${r.settled.h}  seam gap ${r.settled.gap}px  clearances ${(-r.settled.top).toFixed(1)} / ${(-r.settled.bot).toFixed(1)}px`,
  );

  ok(
    r.worstTop.v <= 0,
    `the photograph never crosses the top line (worst ${r.worstTop.v.toFixed(2)}px)`,
  );
  ok(
    r.worstBot.v <= 0,
    `the photograph never crosses the bottom line (worst ${r.worstBot.v.toFixed(2)}px)`,
  );
  ok(r.lit > 25, `the growth is a motion, not a cut (${r.lit} drawn frames)`);
  ok(
    r.distinctH > 15,
    `the photograph genuinely grows (${r.distinctH} distinct heights, ${r.minH} -> ${r.maxH}px)`,
  );
  ok(
    Math.abs(r.settled.top) < 200 && r.settled.top < 0,
    `it settles with real air above it (${(-r.settled.top).toFixed(1)}px)`,
  );
  await page.close();
}

console.log(
  `\n  ${fails === 0 ? "THE SPLIT NEVER TOUCHES THE TYPE, ON ANY FRAME" : `${fails} FAILURE(S)`}\n`,
);
const shutdown = async () => {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    proc?.kill("SIGKILL");
  } catch {}
  process.exit(fails === 0 ? 0 : 1);
};
await shutdown();
