/* CAN THE SCRUBBED STATEMENT BE STRANDED?

   A scrub is a pure function of scroll, which is the whole argument for using
   one — but "pure function of scroll" is a property of the code, not of what
   the reader ends up looking at. The failure that matters is a word left half
   way out of its clip after a fling, or a sentence that never completes
   because the range was mis-specified and the block leaves the viewport
   before its last word arrives. Neither is visible in a screenshot taken at a
   scroll position chosen by the person who wrote the range.

   So this drives the statement the way a thumb does — a hard fling past it,
   a fling back, and a slow crawl — and after each one asserts the two things
   that have to be true:

     COMPLETE. Once the block has been scrolled fully past, every word sits at
     translateY(0). If any word is short, the range does not finish inside the
     viewport and some readers will never see the sentence set.

     REVERSIBLE. Scrolled back above the block, every word is back at its
     start. A scrub that cannot be re-read is a timeline with extra steps.

   It also samples the middle of the range to prove the thing is a WAVE and
   not a switch — several distinct offsets at once, which is what tells a
   staggered scrub apart from one that snaps.

   usage: node scripts/probe-scrub.mjs [port] [w] [h] */
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
const page = await b.newPage();
await page.setViewport({ width: +W, height: +H });
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
await sleep(3200);

/** every word's translateY, in px, off the live computed transform */
const words = () =>
  page.evaluate(() => {
    const st = document.querySelector('[class*="statementText"]');
    if (!st) return null;
    const ws = [...st.querySelectorAll('[class*="statementWord"]')];
    return ws.map((w) => {
      const m = new DOMMatrix(getComputedStyle(w).transform);
      return +m.m42.toFixed(1);
    });
  });

const geo = await page.evaluate(() => {
  const st = document.querySelector('[class*="statementText"]');
  const r = st.getBoundingClientRect();
  return { top: r.top + scrollY, h: r.height };
});

const to = async (y) => {
  await page.evaluate(
    (v) => window.__lenis?.scrollTo(v, { immediate: true }) ?? scrollTo(0, v),
    y,
  );
  await sleep(900);
};

/* a FLING, not a teleport — wheel deltas at the rate a thumb throws, so the
   scrub is sampled under momentum rather than at a settled position */
const fling = async (steps, dy) => {
  await page.mouse.move(+W / 2, +H / 2);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel({ deltaY: dy });
    await sleep(8);
  }
  await sleep(1200);
};

console.log(`\n=== scrubbed statement at ${W}x${H} ===`);
console.log(`  block top ${Math.round(geo.top)}  height ${Math.round(geo.h)}`);

// 1. above the block — nothing should have started
await to(0);
let w = await words();
const startMax = Math.max(...w);
console.log(`\n  above the block   max offset ${startMax.toFixed(1)}px  (want > 0 — the words are held down)`);

// 2. mid-range — a wave, not a switch
await to(geo.top - +H * 0.55);
w = await words();
const distinct = new Set(w.map((v) => Math.round(v / 4))).size;
console.log(
  `  mid range         ${w.filter((v) => v > 0.5).length}/${w.length} still rising, ${distinct} distinct offsets  (want several — a stagger)`,
);

// 3. FLUNG past it
await to(0);
await fling(40, 90);
w = await words();
const afterFling = Math.max(...w);
console.log(
  `  after a fling past  max offset ${afterFling.toFixed(1)}px  ${afterFling < 0.6 ? "PASS — nothing stranded" : "FAIL — a word is short"}`,
);

// 4. FLUNG back above it
await fling(50, -90);
w = await words();
const afterBack = Math.min(...w);
console.log(
  `  flung back above    min offset ${afterBack.toFixed(1)}px  ${afterBack > 0.5 || startMax < 0.5 ? "PASS — reversible" : "FAIL — did not reset"}`,
);

// 5. slow crawl through, sampling as it goes
await to(geo.top - +H);
const seen = [];
for (let i = 0; i < 14; i++) {
  await page.mouse.wheel({ deltaY: 90 });
  await sleep(90);
  const v = await words();
  seen.push(v.filter((x) => x > 0.5).length);
}
console.log(`  slow crawl        words still rising, step by step: ${seen.join(" ")}`);

// 6. settled well past
await to(geo.top + geo.h + 400);
w = await words();
const settled = Math.max(...w);
console.log(
  `  settled past      max offset ${settled.toFixed(1)}px  ${settled < 0.6 ? "PASS — sentence is set" : "FAIL"}`,
);

await b.close();
