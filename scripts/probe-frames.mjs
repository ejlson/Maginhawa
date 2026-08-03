/* THE FRAME BUDGET, REPEATED — because one run cannot tell an intermittent
   long frame from a clean build.

   deck-check.mjs measures the same thing once, at the end of a four-minute
   geometry and contract sweep. That is the right place for the headline
   number and the wrong place to characterise an outlier that shows up in one
   run out of three: by the time you have five samples you have spent twenty
   minutes and changed nothing.

   This is deck-check's timing half on its own, N times, with every over-32
   placed by pin fraction so a pattern can be seen. Everything else about the
   method is deliberately identical — same wheel-driven scrub, same 90px
   steps, same entry from a viewport ABOVE the pin rather than a teleport into
   it, same first-nine-frames discard.

   THE LAST ARGUMENT IS A DIAGNOSTIC, and it is how the outlier gets a name
   rather than a position. `none` measures the page as it ships; `novideo`
   pauses the pinned hero video the whole section sits on; `noimg` blanks the
   nine card photographs; `abovepin` runs the identical harness over the
   stretch of page BEFORE the deck, where nothing of the deck is moving at
   all. Each removes one suspect and nothing else, so a run that goes clean
   under one of them has identified the cost — and a run that does not has
   cleared it. `abovepin` is the control: if the outlier survives it, it is
   not the deck.

   usage: node scripts/probe-frames.mjs [port] [runs] [width] [height] [diag]
          diag = none | novideo | noimg | nolistimg | abovepin
          (default none; `nolistimg` is `noimg` for the phone's list branch) */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const RUNS = +(process.argv[3] || 5);
const VW = +(process.argv[4] || 1440);
const VH = +(process.argv[5] || 900);
const DIAG = process.argv[6] || "none";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const sampleFrames = async (page, steps, dy, g) => {
  await page.evaluate(() => {
    window.__ts = [];
    window.__stop = false;
    const tick = (t) => {
      window.__ts.push([t, scrollY]);
      if (!window.__stop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.mouse.move(VW / 2, VH / 2);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel({ deltaY: dy });
    await page.mouse.move(VW / 2 + (i % 7) * 12, VH / 2 + (i % 5) * 9);
    await sleep(28);
  }
  return page.evaluate((g) => {
    window.__stop = true;
    const raw = window.__ts;
    const d = [];
    for (let i = 9; i < raw.length; i++)
      d.push({ ms: raw[i][0] - raw[i - 1][0], y: raw[i][1] });
    const s = d.map((x) => x.ms).sort((a, b) => a - b);
    const q = (p) => +s[Math.floor(s.length * p)].toFixed(1);
    return {
      median: q(0.5),
      p99: q(0.99),
      worst: +s[s.length - 1].toFixed(1),
      over20: s.filter((x) => x > 20).length,
      over32: s.filter((x) => x > 32).length,
      where: d
        .filter((x) => x.ms > 32)
        .map(
          (x) =>
            `${x.ms.toFixed(0)}ms@pin${((x.y - g.top) / g.travel).toFixed(2)}`,
        ),
    };
  }, g);
};

const page = await b.newPage();
await page.setViewport({ width: VW, height: VH });
await page.goto(`http://localhost:${PORT}/about`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);
await sleep(2500);

/* THE PIN IS NOT ALWAYS THERE, and that is by design rather than a failure:
   below 1200px the deck branch is not mounted at all and the section renders
   as `storyList` (see RAIL_MQ in About.tsx). This harness used to dereference
   .railPinWrap unconditionally and therefore could not be pointed at a phone
   — which meant the one viewport where the hero, the statement and the chef
   block ARE the whole animated experience was the one never measured.

   With no pin, `top` falls back to the story section and `travel` to a
   viewport, purely so the `pin0.42`-style labels below still name a place.
   Nothing else in the method changes. */
const geom = await page.evaluate(() => {
  const w =
    document.querySelector('[class*="railPinWrap"]') ??
    document.querySelector('[class*="About_story"]');
  const r = w.getBoundingClientRect();
  return {
    top: r.top + scrollY,
    height: r.height,
    vh: innerHeight,
    pinned: !!document.querySelector('[class*="railPinWrap"]'),
  };
});
const travel = Math.max(geom.vh, geom.height - geom.vh);
const g = { top: geom.top, travel };
if (!geom.pinned)
  console.log(
    `  (no deck at ${VW}px — list branch; 'abovepin' is the meaningful sweep here)`,
  );

if (DIAG === "novideo") {
  await page.evaluate(() =>
    document.querySelectorAll("video").forEach((v) => {
      v.pause();
      v.removeAttribute("autoplay");
    }),
  );
}
if (DIAG === "novanish") {
  /* pin every card opaque. RAIL_VANISH_* fades a departed card out between
     u = 0.75 and 0.9, and Chrome is free to drop the layer of an
     opacity-0 element — so scrolling BACK UP is the one direction that has to
     re-raster a card at its full 1.67x exit magnification. That asymmetry is
     the shape of the outlier being chased: the `up` leg fails far more often
     than `down`. `!important` because Motion writes style.opacity inline. */
  await page.addStyleTag({
    content: '[class*="railCard"] { opacity: 1 !important; }',
  });
}
if (DIAG === "noimg") {
  /* visibility, not display — removing the images would change layout and
     therefore the geometry being measured. This leaves every box exactly
     where it is and only stops Chrome rastering nine photographs. */
  await page.evaluate(() =>
    document
      .querySelectorAll('[class*="railCard"] img')
      .forEach((i) => (i.style.visibility = "hidden")),
  );
}
if (DIAG === "nolistimg") {
  /* `noimg` FOR THE PHONE. It aims at `.railCard img`, which below 1200px
     does not exist — so on the branch every phone actually gets, the one
     suspect this file was written to isolate could not be removed at all and
     `noimg` and `none` were the same run.

     The list branch's nine chapter photographs are the same nine files
     through the same next/image treatment, and they are the documented cause
     of the isolated 40-140ms frames this sweep has always thrown at 390 — so
     they get their own switch. Same method as above: visibility, so not one
     box moves and the sweep measures the identical geometry. */
  await page.evaluate(() =>
    document
      .querySelectorAll('[class*="storyImage"], [class*="chefImage"] img')
      .forEach((i) => (i.style.visibility = "hidden")),
  );
}

console.log(`\n=== ${RUNS} runs at ${VW}x${VH}   diag=${DIAG} ===`);
const all = { down: [], up: [] };
/* the control sweep stops a viewport short of the pin, so 24 steps of 90px
   never reach it — same wheel, same jiggle, same sampling, no deck */
const legs =
  /* THE PHONE SWEEP. Below 1200px there is no deck, so `none` has nothing to
     aim at and `abovepin` stops after 2160px — which on a 844px-tall window
     is barely past the chef block. This walks 60 steps (~5400px) from the top
     instead, so one leg crosses everything a phone reader actually gets
     animated: the hero entrance and settle, the scrubbed statement, the chef
     block's arrival and the head of the story list. The `up` leg comes back
     through the same stretch, which is where a scrub is most likely to fight
     the wheel. */
  DIAG === "mobile"
    ? [
        ["down", 0, 90, 60],
        ["up", 5400, -90, 60],
      ]
    : DIAG === "abovepin"
      ? [
          ["down", 0, 90, 24],
          ["up", Math.max(0, geom.top - VH - 200), -90, 24],
        ]
      : [
        ["down", geom.top - Math.round(VH * 0.6), 90, 70],
        ["up", geom.top + travel * 0.75, -90, 70],
      ];
for (let r = 0; r < RUNS; r++) {
  for (const [label, from, dy, steps] of legs) {
    await page.evaluate(
      (y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
      from,
    );
    await sleep(1600);
    const v = await sampleFrames(page, steps, dy, g);
    all[label].push(v);
    console.log(
      `  run ${r + 1} ${label.padEnd(5)} median ${String(v.median).padStart(5)}  p99 ${String(v.p99).padStart(5)}  worst ${String(v.worst).padStart(5)}  over20 ${v.over20}  over32 ${v.over32}  ${v.where.join(" ")}`,
    );
  }
}

for (const k of ["down", "up"]) {
  const o32 = all[k].filter((v) => v.over32 > 0).length;
  const p99 = Math.max(...all[k].map((v) => v.p99));
  console.log(
    `\n  ${k.padEnd(5)} runs with an over-32: ${o32}/${RUNS}   worst p99 across runs ${p99}`,
  );
}
/* CLOSE, THEN MAKE SURE. `b.close()` resolves on the browser PROCESS's exit
   event, and this harness leaves Chrome in the one state where that event can
   fail to arrive: a GPU-backed headless run (--enable-gpu --use-gl=angle) with
   a page still holding a live requestAnimationFrame loop and a playing <video>.
   The report printed and the script then sat there forever, which cost more
   real time than the measurement it had just taken.

   So the close is raced against a short timer and the process is killed if the
   timer wins. Nothing measured depends on a graceful shutdown — every number
   is already out of the page and into this process by the time we get here. */
const shutdown = async () => {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    proc?.kill("SIGKILL");
  } catch {}
  process.exit(0);
};
await shutdown();
