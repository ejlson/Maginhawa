/* THE HEADLINE IS TWO LINES AT EVERY WIDTH.

   The careers hero sets its claim as two hand-broken lines, one SplitWords
   per line, and the whole entrance clock is derived from that shape. The
   headline just grew from clamp(2.4rem, 5.6vw, 5.6rem) to
   clamp(2.7rem, 7vw, 7rem), and the failure mode of a bigger headline is not
   that it overflows — `overflow-x: clip` on `.page` hides that — it is that
   one of the two lines WRAPS, and a hand-broken couplet silently becomes a
   ragged three-line block whose second break nobody chose.

   probe-join-fold.mjs cannot catch this: it counts `.heroLine` ELEMENTS,
   which is always 2 by construction. This counts RENDERED line boxes, by
   collecting the distinct `top` of every word mask inside each line. It also
   reports the line's used width against the container, so "it fits" is a
   margin rather than a yes.

   usage: node scripts/probe-join-head.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3187";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => {
  if (!c) fails++;
  console.log(`    ${c ? "PASS" : "FAIL"}  ${m}`);
};

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

for (const [VW, VH] of [
  [1440, 900],
  [1920, 1080],
  [820, 1180],
  [390, 844],
]) {
  const page = await b.newPage();
  await page.setViewport({ width: VW, height: VH });
  await page.goto(`http://localhost:${PORT}/careers`, { waitUntil: "networkidle0", timeout: 60000 });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 })
    .catch(() => {});
  // THE FONTS HAVE TO BE THE REAL ONES. Measuring a fallback face's advance
  // widths and calling the result "the headline fits" is the exact mistake
  // this probe exists to prevent.
  await page.evaluate(() => document.fonts.ready);
  await sleep(2600);

  const r = await page.evaluate(() => {
    /* THE <h1> IS `display: contents` — it has no box, so its own rect is
       empty and the type metrics live on the two line spans. Measuring the
       h1 reported "0px tall over 0px" and passed anyway, which is the shape
       of a probe measuring nothing. */
    const first = document.querySelector('[class*="heroLine"]');
    const cs = getComputedStyle(first);
    const lines = [...document.querySelectorAll('[class*="heroLine"]')].map((el) => {
      // one mask per word; distinct tops == rendered line boxes
      const masks = [...el.querySelectorAll('[class*="mask"]')].map((m) =>
        m.getBoundingClientRect(),
      );
      const tops = [...new Set(masks.map((m) => Math.round(m.top)))];
      const left = Math.min(...masks.map((m) => m.left));
      const right = Math.max(...masks.map((m) => m.right));
      return {
        text: el.getAttribute("aria-label") ?? el.textContent.trim(),
        boxes: tops.length,
        used: right - left,
      };
    });
    const host = document.querySelector('[class*="heroSplit"]').getBoundingClientRect();
    return {
      fontSize: cs.fontSize,
      family: cs.fontFamily.split(",")[0].replace(/["']/g, ""),
      lineHeight: cs.lineHeight,
      h1h: [...document.querySelectorAll('[class*="heroLine"]')].reduce(
        (n, el) => n + el.getBoundingClientRect().height,
        0,
      ),
      avail: host.width,
      lines,
    };
  });

  console.log(`\n=== ${VW}x${VH} ===`);
  console.log(
    `  ${r.fontSize} / ${r.lineHeight}  "${r.family}"   two lines ${r.h1h.toFixed(0)}px of type over ${r.avail.toFixed(0)}px`,
  );
  for (const l of r.lines) {
    console.log(
      `  "${l.text}"  ${l.boxes} line box${l.boxes === 1 ? "" : "es"}, ${l.used.toFixed(0)}px used (${((l.used / r.avail) * 100).toFixed(0)}% of measure)`,
    );
    ok(l.boxes === 1, `"${l.text}" stays on the line it was written as`);
    ok(l.used <= r.avail, `"${l.text}" fits the measure (${(r.avail - l.used).toFixed(0)}px spare)`);
  }
  ok(r.lines.length === 2, `the headline is two hand-broken lines (${r.lines.length})`);
  await page.close();
}

console.log(`\n  ${fails === 0 ? "THE HEADLINE HOLDS ITS SHAPE AT EVERY WIDTH" : `${fails} FAILURE(S)`}\n`);
const shutdown = async () => {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    proc?.kill("SIGKILL");
  } catch {}
  process.exit(fails === 0 ? 0 : 1);
};
await shutdown();
