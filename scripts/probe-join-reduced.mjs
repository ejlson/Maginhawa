/* DOES prefers-reduced-motion ACTUALLY QUIET THE HERO?

   "I wrote the media query" is not the same claim as "nothing is moving". The
   hero has four moving parts and they are owned by three different systems,
   so a media query that misses one leaves a page that still moves for exactly
   the people who asked it not to:

     · the headline's word masks        — SplitWords (Motion, honours it itself)
     · the split that parts the lines   — a Motion spring on a MotionValue
     · the photograph's scale and fade  — transforms of that same value
     · the corner labels and caption    — a Motion opacity, and a SplitWords
     · the photograph's scroll parallax — a Motion scroll subscription

   THERE ARE NO CSS ANIMATIONS LEFT. The clip-path aperture and the caption
   keyframe are both gone with the letterbox hero, and with them the
   `@media (prefers-reduced-motion)` block that cancelled them — the quiet
   version is now produced at the source (a split parked at 1, no timer
   armed) rather than by a second copy of the decision in the stylesheet.
   Which makes `getAnimations().length === 0` a stronger assertion than it
   was, not a weaker one: it is now the whole claim.

   The last one is the trap: it is not an animation, so it does not appear in
   `document.getAnimations()` and no CSS query can cancel it. Quieting the
   stylesheet alone leaves the picture still riding the wheel. This probe
   therefore checks BOTH — that nothing is animating at rest, and that
   scrolling moves nothing either.

   The second trap is the mirror image: cancelling an animation whose element
   sits at the animation's `from` state leaves the aperture shut and the
   headline invisible. So it also checks that the reduced hero is the same
   composition as the settled normal one, not an earlier frame of it.

   usage: node scripts/probe-join-reduced.mjs [port] [w] [h] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3187";
const VW = +(process.argv[3] || 1440);
const VH = +(process.argv[4] || 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => {
  if (!c) fails++;
  console.log(`  ${c ? "PASS" : "FAIL"}  ${m}`);
};

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu", "--use-gl=angle"],
});

const look = async (reduce) => {
  const page = await b.newPage();
  await page.setViewport({ width: VW, height: VH });
  if (reduce)
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(`http://localhost:${PORT}/careers`, { waitUntil: "networkidle0", timeout: 60000 });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(3200);

  const read = () =>
    page.evaluate(() => {
      const g = (s) => document.querySelector(s);
      const frame = g('[class*="heroFrame"]');
      const cap = g('[class*="heroStand"]');
      const pan = g('[class*="heroPan"]');
      const labels = g('[class*="heroLabels"]');
      // the <h1> is `display: contents` and has no box of its own — the two
      // line spans are what carry the split's transform and the type
      const lines = [...document.querySelectorAll('[class*="heroLine"]')];
      const r = (el) => {
        const b = el.getBoundingClientRect();
        return `${b.top.toFixed(2)},${b.left.toFixed(2)},${b.width.toFixed(1)}`;
      };
      return {
        anims: document
          .getAnimations()
          .map((a) => `${a.animationName ?? a.constructor.name}:${a.playState}`),
        // the settled composition: the photograph at full size, unmoved
        frameTransform: getComputedStyle(frame).transform,
        frameOpacity: +getComputedStyle(frame).opacity,
        frameRect: r(frame),
        capAnim: getComputedStyle(cap).animationName,
        capOpacity: +getComputedStyle(cap).opacity,
        labelOpacity: +getComputedStyle(labels).opacity,
        panTransform: getComputedStyle(pan).transform,
        panRect: r(pan),
        // both lines at their RESTING seats — the split's whole failure mode
        // under reduced motion is leaving them stacked in the middle
        lineTransforms: lines.map((el) => getComputedStyle(el).transform).join(" | "),
        titleOpacity: Math.min(...lines.map((el) => +getComputedStyle(el).opacity)),
        titleText: lines.map((el) => el.innerText).join(" ").replace(/\s+/g, " ").trim(),
        titleRect: lines.map(r).join(" | "),
      };
    });

  const atRest = await read();

  /* THE SCROLL CHECK. Park the page a third of the way through the frame's
     pass and read the photograph's transform again: with the parallax live it
     has moved, with it quieted it has not. */
  const y = await page.evaluate(() => {
    const f = document.querySelector('[class*="heroBand"]');
    return f.getBoundingClientRect().top + scrollY + 220;
  });
  await page.evaluate(
    (v) => window.__lenis?.scrollTo(v, { immediate: true }) ?? scrollTo(0, v),
    y,
  );
  await sleep(900);
  const scrolled = await page.evaluate(
    () => getComputedStyle(document.querySelector('[class*="heroPan"]')).transform,
  );
  await page.close();
  return { ...atRest, scrolledTransform: scrolled };
};

console.log(`\n=== ${VW}x${VH} ===`);
console.log("\n  --- normal motion (the control) ---");
const n = await look(false);
console.log(`  animations on the document: ${n.anims.length}   [${n.anims.join(", ")}]`);
console.log(`  pan transform  rest ${n.panTransform}   scrolled ${n.scrolledTransform}`);
console.log(`  frame ${n.frameTransform}  opacity ${n.frameOpacity}   lines ${n.lineTransforms}`);
ok(n.capOpacity > 0.98, "the standfirst finished arriving");
ok(n.labelOpacity > 0.98, "the corner labels finished arriving");
ok(
  n.frameOpacity > 0.98 && /matrix\(1, 0, 0, 1, 0, 0\)|none/.test(n.frameTransform),
  `the split finished — the photograph is at full size on its seat (${n.frameTransform})`,
);
ok(
  n.panTransform !== n.scrolledTransform,
  "the parallax genuinely moves the photograph on scroll",
);
ok(n.titleOpacity > 0.98 && n.titleText.length > 10, `the headline is present ("${n.titleText}")`);

console.log("\n  --- prefers-reduced-motion: reduce ---");
const r = await look(true);
console.log(`  animations on the document: ${r.anims.length}   [${r.anims.join(", ")}]`);
console.log(`  pan transform  rest ${r.panTransform}   scrolled ${r.scrolledTransform}`);
ok(r.anims.length === 0, `NOTHING is animating (${r.anims.length} animations on the document)`);
ok(r.capAnim === "none", "the standfirst carries no CSS animation");
ok(
  r.panTransform === r.scrolledTransform,
  "and the photograph does not move on scroll either — the parallax is unsubscribed, not just un-styled",
);
/* THE TRAP THIS EXISTS FOR: an element cancelled at its animation's `from`
   state. For this hero that is a photograph left at scale 0 in a seam, two
   lines still stacked against each other in the middle of the frame, and a
   caption and corner labels still at opacity 0. All four are the p = 0 pose
   of a sequence that must never run here — so the reduced hero is checked
   for being the SETTLED composition, not merely a still one. */
ok(
  r.frameOpacity > 0.98 && /matrix\(1, 0, 0, 1, 0, 0\)|none/.test(r.frameTransform),
  `the photograph is at full size on its seat, not seeded in the seam (${r.frameTransform})`,
);
ok(
  !/matrix\(1, 0, 0, 1, 0, -?[1-9]/.test(r.lineTransforms),
  `both lines are at their resting seats, not stacked in the middle (${r.lineTransforms})`,
);
ok(r.capOpacity > 0.98, `the standfirst is visible, not stranded at opacity 0 (${r.capOpacity})`);
ok(r.labelOpacity > 0.98, `the corner labels are visible (${r.labelOpacity})`);
ok(r.titleOpacity > 0.98 && r.titleText === n.titleText, "the headline reads the same as the animated one");
ok(r.titleRect === n.titleRect, "the headline lands in the same place");
/* THE PHOTOGRAPH'S FRAMING, NOT ITS POSITION. The animated pan is supposed to
   be somewhere different at every scroll position, so comparing its rect
   against the animated hero's is meaningless. What must hold is that the
   quiet hero shows the NEUTRAL crop — the middle of the drift — rather than
   one end of it. Parked at 0 rather than 0.5 it sat 27px off, which is a
   silent re-framing of the picture for exactly the people who asked for less
   motion. */
ok(
  /matrix\(1, 0, 0, 1, 0, 0\)|none/.test(r.panTransform),
  `the photograph rests at the MIDDLE of its drift, not at one end (${r.panTransform})`,
);

console.log(`\n  ${fails === 0 ? "REDUCED MOTION IS GENUINELY QUIET" : `${fails} FAILURE(S)`}\n`);
const shutdown = async () => {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    proc?.kill("SIGKILL");
  } catch {}
  process.exit(fails === 0 ? 0 : 1);
};
await shutdown();
