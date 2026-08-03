/* THE CHAPTER COPY — does the new title and body RISE, and can a fast scrub
   strand a word half way up?

   Three things to establish, none of them visible in a screenshot:

     1. IT FIRES. On a chapter change the incoming panel's words start below
        their masks and finish at translateY(0). Sampled as the mean |ty| of
        every word in the active panel, a few frames after the change and
        again once it has settled.
     2. NOTHING IS STRANDED. Cross five chapters in half a second, stop, wait,
        and every word in the COLUMN — the active panel's and all eight
        inactive ones' — must be at translateY(0). Then do it in reverse.

        ALL NINE PANELS ARE SPLIT, which is why this is phrased over the whole
        column rather than over the active panel. An earlier build rendered
        the inactive eight as plain text and this check asserted they carried
        no masks at all; that build was measured putting a 49ms frame on every
        chapter handover (mounting and unmounting ~116 elements on a scroll
        frame), so the masks now stay and the assertion moved to where the
        risk actually is. A word left half way up in a panel the reader is
        about to scroll back to is the failure this is looking for, and it can
        happen in an inactive panel just as easily as in the live one.
     3. THE CONTRACT AROUND IT SURVIVES. Exactly one panel is not `inert`, all
        nine bodies are still text in the DOM, and `will-change` is carried
        only by the live panel's words — the other eight must not be parking
        ~300 promoted layers beside a 3D scene.

   usage: node scripts/probe-copy.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
  ],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.goto(`http://localhost:${PORT}/about`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await p
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await p.evaluate(() => document.fonts.ready);
await sleep(2200);

const g = await p.evaluate(() => {
  const w = document.querySelector('[class*="railPinWrap"]');
  const r = w.getBoundingClientRect();
  return { top: r.top + scrollY, h: r.height, vh: innerHeight };
});
const travel = g.h - g.vh;
const LEAD = 0.04;
const STEP = 0.92 / 8;
const DWELL = 0.55;
const seatAt = (i) => LEAD + STEP * (i + (i < 8 ? DWELL / 2 : 0));

const park = (i) =>
  p.evaluate(
    (y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
    g.top + travel * seatAt(i),
  );

/* the state of the copy: which panel is live, how far its words still have to
   travel, and whether any inactive panel is still carrying word masks */
const state = () =>
  p.evaluate(() => {
    const panels = [...document.querySelectorAll("article[class*=railPanel]")];
    const active = panels.findIndex((a) => !a.hasAttribute("inert"));
    const ty = (el) => {
      const m = new DOMMatrix(getComputedStyle(el).transform);
      return Math.abs(m.m42);
    };
    const wordsIn = (el) =>
      [...el.querySelectorAll("span > span")].filter(
        (s) => getComputedStyle(s).display === "inline-block",
      );
    const live = active >= 0 ? wordsIn(panels[active]) : [];
    const all = panels.flatMap(wordsIn);
    /* promotion, counted rather than assumed: only the live panel's words
       should be asking the compositor for a layer */
    const promoted = all.filter(
      (w) => getComputedStyle(w).willChange === "transform",
    ).length;
    return {
      active,
      words: live.length,
      split: all.length,
      meanTy: live.length
        ? +(live.reduce((s, w) => s + ty(w), 0) / live.length).toFixed(2)
        : 0,
      maxTy: live.length ? +Math.max(...live.map(ty)).toFixed(2) : 0,
      /* the stranding check — the worst word ANYWHERE in the column */
      maxTyAll: all.length ? +Math.max(...all.map(ty)).toFixed(2) : 0,
      promoted,
      notInert: panels.filter((a) => !a.hasAttribute("inert")).length,
      textNodes: panels.filter((a) => a.textContent.trim().length > 40).length,
    };
  });

console.log("=== 1. does it fire? chapter 1 -> 2 ===");
await park(0);
await sleep(1600);
console.log(`  settled on 1   ${JSON.stringify(await state())}`);
await park(1);
await sleep(120);
console.log(`  +120ms         ${JSON.stringify(await state())}`);
await sleep(260);
console.log(`  +380ms         ${JSON.stringify(await state())}`);
await sleep(1400);
console.log(`  settled on 2   ${JSON.stringify(await state())}`);

console.log("\n=== 2. scrubbed fast through five chapters ===");
for (const dir of ["down", "up"]) {
  const order = dir === "down" ? [1, 2, 3, 4, 5, 6] : [6, 5, 4, 3, 2, 1];
  for (const i of order) {
    await park(i);
    await sleep(70);
  }
  await sleep(1800);
  const s = await state();
  const ok = s.maxTyAll < 0.5 && s.notInert === 1;
  console.log(
    `  ${dir.padEnd(5)} ended on chapter ${s.active + 1}  worst word offset anywhere ${s.maxTyAll}px  notInert ${s.notInert}  ${ok ? "PASS" : "FAIL"}`,
  );
}

console.log("\n=== 3. the contract around it ===");
const c = await state();
console.log(
  `  exactly one live panel               ${c.notInert === 1 ? "PASS" : `FAIL (${c.notInert})`}`,
);
console.log(
  `  nine chapter bodies still in the DOM ${c.textNodes === 9 ? "PASS" : `FAIL (${c.textNodes})`}`,
);
console.log(
  `  no word stranded anywhere            ${c.maxTyAll < 0.5 ? "PASS" : `FAIL (${c.maxTyAll}px)`}   (${c.split} split words in the column)`,
);
console.log(
  `  promotion only on the live panel     ${c.promoted <= c.words ? `PASS (${c.promoted} of ${c.split})` : `FAIL (${c.promoted} of ${c.split})`}`,
);

await b.close();
