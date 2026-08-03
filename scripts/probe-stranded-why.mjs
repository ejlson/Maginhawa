/* WHY the home page strands split words under a continuous wheel.

   probe-stranded.mjs counts them; this asks where the reader ended up and
   what state the page was in when they did. The hypothesis under test is
   that it is not the word masks at all: the restaurants chapter HOLDS the
   page for the length of its assembly (lenis.stop + a body lock), and a
   wheel that keeps turning through the hold spends its deltas on nothing.
   The sweep then ends early, most of the page below is never reached, and
   every block down there is simply still waiting for its observer.

   If that is what is happening, the tell is unambiguous: the sweep stops
   short of the document, the stranded blocks are BELOW the fold rather than
   on screen, and repeating the same sweep after the hold clears them.

   usage: node scripts/probe-stranded-why.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3210";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const census = () =>
  [
    ...document.querySelectorAll(
      '[class*="SplitWords_word"],[class*="SplitWords_cssWord"]',
    ),
  ].map((w) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(w).transform);
    const r = w.getBoundingClientRect();
    return {
      word: w.textContent.trim().slice(0, 18),
      off: Math.round(m.m42),
      // where it sits relative to the reader RIGHT NOW
      top: Math.round(r.top),
      onScreen: r.bottom > 0 && r.top < window.innerHeight,
      seen: Math.round(w.getAttribute("data-seen") ?? 0),
    };
  });

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
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);
await sleep(1500);

// the same sweep probe-stranded.mjs performs, but recording the hold
await page.evaluate(() => {
  window.__held = [];
  const t = setInterval(() => {
    window.__held.push({
      t: Math.round(performance.now()),
      y: Math.round(window.scrollY),
      stopped: !!window.__lenis?.isStopped,
      overflow: getComputedStyle(document.body).overflow,
      step: document.querySelector("#restaurants")?.getAttribute("data-assembly-step"),
    });
  }, 100);
  window.__stopHeld = () => clearInterval(t);
});

const H = await page.evaluate(() => document.documentElement.scrollHeight);
const ticks = Math.ceil(H / 300);
await page.mouse.move(720, 450);
for (let i = 0; i < ticks; i++) {
  await page.mouse.wheel({ deltaY: 300 });
  await sleep(60);
}
await sleep(2500);

const first = await page.evaluate(
  ({ census }) => {
    window.__stopHeld();
    const held = window.__held.filter((h) => h.stopped || h.overflow.includes("hidden"));
    const c = eval(`(${census})`)();
    return {
      docH: document.documentElement.scrollHeight,
      maxY: document.documentElement.scrollHeight - window.innerHeight,
      y: Math.round(window.scrollY),
      heldMs: held.length * 100,
      heldFrom: held[0]?.y ?? null,
      stranded: c.filter((w) => Math.abs(w.off) > 1.5),
      total: c.length,
    };
  },
  { census: census.toString() },
);

console.log("=== sweep 1 (the reader wheels straight through) ===");
console.log(
  `document ${first.docH}px | reachable ${first.maxY}px | ended at ${first.y}px  →  ${Math.round((first.y / first.maxY) * 100)}% of the page`,
);
console.log(`page held for ~${first.heldMs}ms, from y=${first.heldFrom}`);
console.log(`stranded ${first.stranded.length}/${first.total}`);
const on = first.stranded.filter((w) => w.onScreen);
console.log(`  …of which ON SCREEN right now: ${on.length}`);
console.log(
  "  above the fold:",
  first.stranded.filter((w) => w.top < 0).length,
  "| on screen:",
  on.length,
  "| below the fold:",
  first.stranded.filter((w) => w.top >= 900).length,
);
console.log("  worst offset:", Math.max(0, ...first.stranded.map((w) => Math.abs(w.off))));
if (on.length) console.log("  on screen:", JSON.stringify(on.slice(0, 8)));

// now WAIT OUT the hold and finish the journey it interrupted — the same
// wheel, the same page, the only difference being that the reader is
// allowed to arrive at the bottom
await page.waitForFunction(
  () => !window.__lenis?.isStopped &&
    !document.querySelector("#restaurants")?.getAttribute("data-assembly-step"),
  { timeout: 30000 },
);
for (let i = 0; i < ticks; i++) {
  await page.mouse.wheel({ deltaY: 300 });
  await sleep(60);
}
await sleep(2500);
const second = await page.evaluate(
  ({ census }) => {
    const c = eval(`(${census})`)();
    return {
      y: Math.round(window.scrollY),
      stranded: c.filter((w) => Math.abs(w.off) > 1.5).length,
      total: c.length,
    };
  },
  { census: census.toString() },
);
console.log("\n=== sweep 2 (same wheel, but the reader waits out the chapter) ===");
console.log(`ended at ${second.y}px | stranded ${second.stranded}/${second.total}`);

await b.close();
