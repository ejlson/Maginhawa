/* DOES `prefers-reduced-motion` ACTUALLY QUIET THE PAGE?

   Honouring the preference is easy to claim and easy to half-do: a component
   can guard its own entrance and still sit inside a section that autoplays a
   film, or ship a CSS keyframe nobody thought to gate. So this asserts every
   move on /about individually, with the preference emulated, and it asserts
   the POSITIVE case too — that the same thing genuinely does move when the
   preference is absent. A check that only ever looks at the quiet build will
   pass just as happily against a page where the feature is broken outright.

   usage: node scripts/probe-quiet.mjs [port] [w] [h] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [PORT = "3100", W = "1440", H = "900"] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

const read = async (reduce) => {
  const page = await b.newPage();
  await page.setViewport({ width: +W, height: +H });
  if (reduce)
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
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
  /* long enough for the entrance (1.45s), the settle (to 3.05s) and the
     gated play() call to have happened or provably not happened */
  await sleep(4200);

  const out = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const v = q("video");
    const cue = q('[class*="scrollCueInner"]');
    /* THE DISPLAY LINES ARE WORD MASKS AGAIN. They travelled sideways for one
       build — `.heroSlideInner`, which this file used to read a transform off
       — and now speak the same grammar as the kicker and the lede (see the
       entrance header in About.tsx). So there is no bespoke element left to
       inspect: the right question is the same one asked of the other two
       beats, which is whether the quiet build renders prose or clips.

       Read the LINE rather than a word: under the preference SplitWords
       returns a bare tag with the text in it, so there is no word span to
       find, and a selector that only matches the loud build would report
       `null` and fail the quiet build for a rule it is not testing — which is
       exactly what the stale one did. */
    const top = q('[class*="heroLineTop"]');
    /* all four word-mask beats — kicker, the two display lines, lede.
       SplitWords returns plain text under the preference, so the quiet build
       should have no masks in the hero at all. */
    const heroMasks = document.querySelectorAll(
      '[class*="hero"] [class*="SplitWords_mask"]',
    ).length;
    const heroDisplayMasks = document.querySelectorAll(
      '[class*="heroLineTop"] [class*="SplitWords_mask"], [class*="heroLineBottom"] [class*="SplitWords_mask"]',
    ).length;
    const st = q('[class*="statementText"]');
    /* the scrubbed form renders one clip per word; the quiet form is a plain
       paragraph with real <em>s and no masks at all */
    const masks = st ? st.querySelectorAll('[class*="statementMask"]').length : -1;
    const ems = st ? st.querySelectorAll("em").length : -1;
    const img = q('[class*="storyImage"]');
    return {
      videoPaused: v ? v.paused : null,
      videoPreload: v ? v.preload : null,
      /* the settle keyframe: `none` when quiet, `heroSettle` otherwise */
      videoAnim: v ? getComputedStyle(v).animationName : null,
      videoTransform: v ? getComputedStyle(v).transform : null,
      heroTopTransform: top ? getComputedStyle(top).transform : null,
      heroTopText: top ? top.textContent.trim() : null,
      heroMasks,
      heroDisplayMasks,
      cueOpacity: cue ? +getComputedStyle(cue).opacity.slice(0, 6) : null,
      statementMasks: masks,
      statementEms: ems,
      /* the list branch's own scroll-driven photo drift */
      listImgTimeline: img ? getComputedStyle(img).animationTimeline : null,
      listImgScale: img ? getComputedStyle(img).scale : null,
      deck: !!q('[class*="railPinWrap"]'),
      list: !!q('[class*="storyList"]'),
    };
  });
  await page.close();
  return out;
};

const quiet = await read(true);
const loud = await read(false);

console.log("\n=== prefers-reduced-motion: reduce ===");
console.log(JSON.stringify(quiet, null, 1));
console.log("\n=== no preference ===");
console.log(JSON.stringify(loud, null, 1));

const CHECKS = [
  [
    "hero film is paused on its poster",
    quiet.videoPaused === true,
    loud.videoPaused === false,
  ],
  [
    "hero film is never fetched",
    quiet.videoPreload === "none",
    loud.videoPreload === "auto",
  ],
  [
    "hero settle keyframe is off",
    quiet.videoAnim === "none",
    loud.videoAnim.includes("heroSettle"),
  ],
  [
    /* THE QUIET BUILD SETS THE TITLE AS TYPE, NOT AS A CLIP. No masks, no
       transform on the line, and — the part a mask count alone would not
       catch — the word still actually there to be read. The loud build is
       asserted to be the other thing, so a build that shipped prose to
       everybody would fail here rather than pass twice. */
    "hero display lines are seated type, not clips",
    quiet.heroDisplayMasks === 0 &&
      quiet.heroTopText === "MAGINHAWA" &&
      (quiet.heroTopTransform === "none" ||
        quiet.heroTopTransform === "matrix(1, 0, 0, 1, 0, 0)"),
    loud.heroDisplayMasks === 2 && loud.heroTopText === "MAGINHAWA",
  ],
  [
    /* the kicker and the lede are word-mask blocks with no preference set;
       under it they are ordinary prose, which is also what makes them
       selectable and copyable rather than nineteen clipped spans */
    "hero word-mask beats are prose",
    quiet.heroMasks === 0,
    loud.heroMasks > 20,
  ],
  ["scroll cue landed without a fade", quiet.cueOpacity > 0.7, loud.cueOpacity > 0.7],
  [
    "statement is prose, not word masks",
    quiet.statementMasks === 0 && quiet.statementEms === 2,
    loud.statementMasks > 15,
  ],
  [
    "story list photos do not drift",
    quiet.listImgTimeline === "auto" && quiet.listImgScale === "none",
    true,
  ],
  ["deck replaced by the list", quiet.deck === false && quiet.list === true, loud.deck === true],
];

console.log("\n=== audit ===");
let bad = 0;
for (const [name, ok, alsoMoves] of CHECKS) {
  const pass = ok && alsoMoves;
  if (!pass) bad++;
  console.log(
    `  ${pass ? "PASS" : "FAIL"}  ${name}${ok ? "" : "   (quiet build still moving)"}${alsoMoves ? "" : "   (loud build not moving — check is vacuous)"}`,
  );
}
console.log(bad ? `\n  ${bad} FAILING` : "\n  all quiet");
await b.close();
