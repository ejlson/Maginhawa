/* THE CLOSING CTA'S VERTICAL RHYTHM.

   Four elements stacked on one centre line. This prints the gap between
   each pair, each element's own box, and where the whole block sits in the
   frame — the question being whether the spacing reads as a hierarchy or as
   four things evenly dumped.

   usage: node scripts/probe-cta-rhythm.mjs [port] [w] [h] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const SIZES = [
  [1920, 1080],
  [1440, 900],
  [390, 844],
];

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [W, H] of SIZES) {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  });
  await page.evaluate(() => document.fonts.ready);
  await sleep(1200);

  // seat the section so the block sits mid-frame
  await page.evaluate(() => {
    const el = document.querySelector("#book");
    window.__lenis?.scrollTo(scrollY + el.getBoundingClientRect().top, {
      immediate: true,
    });
  });
  await sleep(1800);

  const g = await page.evaluate(() => {
    const book = document.querySelector("#book");
    const stage = book.querySelector('[class*="stage"]');
    // every text-bearing child of the block, in DOM order
    const block = book.querySelector('[class*="book__"]') ?? book.querySelector('[class*="_book"]');
    const kids = block ? [...block.children] : [];
    const info = kids.map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        cls: (el.className?.toString?.() ?? el.tagName).split(" ")[0].split("__")[0],
        tag: el.tagName.toLowerCase(),
        top: +r.top.toFixed(1),
        bottom: +r.bottom.toFixed(1),
        h: +r.height.toFixed(1),
        w: +r.width.toFixed(1),
        cx: +(r.left + r.width / 2).toFixed(1),
        fs: cs.fontSize,
        lh: cs.lineHeight,
        mt: cs.marginTop,
        text: (el.textContent ?? "").trim().slice(0, 60),
        lines: el.getClientRects
          ? new Set(
              [...el.querySelectorAll("*")].length
                ? []
                : [],
            ).size
          : 0,
      };
    });
    // how many line boxes does the support copy actually set on?
    const lineCount = (el) => {
      if (!el) return null;
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = new Set(
        [...range.getClientRects()].map((r) => Math.round(r.top)),
      );
      return tops.size;
    };
    // by class, not by position — the pill is the last child now
    const support = block?.querySelector('[class*="support"]');
    const blockRect = block?.getBoundingClientRect();
    const stageRect = stage?.getBoundingClientRect();
    return {
      vh: innerHeight,
      vw: innerWidth,
      kids: info,
      supportLines: lineCount(support),
      supportText: (support?.textContent ?? "").trim(),
      // WHERE does it break? Group each character by its line-box top, so a
      // bad turn (mid-clause, orphaned tail) is visible rather than inferred.
      supportBreak: (() => {
        if (!support) return null;
        const node = support.firstChild;
        if (!node || node.nodeType !== 3) return null;
        const txt = node.textContent;
        const lines = new Map();
        const r = document.createRange();
        for (let i = 0; i < txt.length; i++) {
          r.setStart(node, i);
          r.setEnd(node, i + 1);
          const top = Math.round(r.getBoundingClientRect().top);
          if (!lines.has(top)) lines.set(top, "");
          lines.set(top, lines.get(top) + txt[i]);
        }
        return [...lines.entries()]
          .sort((a, c) => a[0] - c[0])
          .map(([, s]) => s.trim());
      })(),
      block: blockRect
        ? {
            top: +blockRect.top.toFixed(1),
            bottom: +blockRect.bottom.toFixed(1),
            h: +blockRect.height.toFixed(1),
          }
        : null,
      stage: stageRect
        ? { top: +stageRect.top.toFixed(1), h: +stageRect.height.toFixed(1) }
        : null,
    };
  });

  console.log(`\n========== ${W}x${H} ==========`);
  for (const k of g.kids) {
    console.log(
      `  ${k.tag.padEnd(4)} ${k.cls.slice(0, 26).padEnd(27)} ${String(k.w).padStart(7)}x${String(k.h).padStart(6)}  top ${String(k.top).padStart(7)}  fs ${k.fs.padEnd(9)} lh ${k.lh.padEnd(8)} mt ${k.mt.padEnd(8)} cx ${k.cx}`,
    );
  }
  console.log(`  ---- GAPS (bottom of one to top of the next) ----`);
  for (let i = 1; i < g.kids.length; i++) {
    const gap = g.kids[i].top - g.kids[i - 1].bottom;
    console.log(
      `  ${g.kids[i - 1].cls.slice(0, 18).padEnd(19)} → ${g.kids[i].cls.slice(0, 18).padEnd(19)} ${gap.toFixed(1).padStart(7)}px`,
    );
  }
  console.log(`  ---- POSITION ----`);
  console.log(
    `  block ${g.block.top} → ${g.block.bottom} (h ${g.block.h}) in a ${g.vh}px viewport`,
  );
  console.log(
    `  air above the block ${g.block.top.toFixed(0)}px · air below ${(g.vh - g.block.bottom).toFixed(0)}px · block centre ${((g.block.top + g.block.bottom) / 2).toFixed(0)} vs viewport centre ${(g.vh / 2).toFixed(0)}`,
  );
  console.log(`  support copy sets on ${g.supportLines} line(s):`);
  for (const l of g.supportBreak ?? []) console.log(`      | ${l}`);
  await page.close();
}

await b.close();
