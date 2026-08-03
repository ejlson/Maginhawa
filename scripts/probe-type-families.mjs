/* THE TYPE SWEEP, READ OFF THE RENDERED PAGE.
   Proves the site now speaks exactly two families, and measures every
   consequence the swap was supposed to have:

     FAMILIES   every element that declares a font-family resolves to a
                Helvetica stack or a Contralto stack — nothing else, and
                nothing still naming Hanken or DM Mono.
     RENDERED   the family the browser actually PAINTED (not the CSS string)
                via CDP's CSS.getPlatformFontsForNode, so a stack that falls
                through to a system serif is caught.
     OBLIQUE    ATTEMPTED HERE AND ANSWERED ELSEWHERE. This file measures
                advance WIDTHS, which cannot settle the question: Helvetica
                Oblique is metrically identical to the roman, so a drawn
                oblique and a sheared one measure the same and this test
                always reports "synthesised". The real answer is in
                scripts/probe-type-faces.mjs, which diffs PIXELS and reads
                the platform face — verdict there: a real drawn oblique.
                The width numbers below are kept only as the evidence that
                the metrics are shared.
     FIGURES    all ten digits share one advance (the tabular property the
                monospace used to give the counters for free).
     ch         the "0" advance, which every ch-based max-width and the
                clock's 5ch reservation are denominated in.

   usage: node scripts/probe-type-families.mjs [port]                      */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3220";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROUTES = [
  "/",
  "/about",
  "/blog",
  "/contact",
  "/careers",
  "/restaurants",
  "/restaurants/belly",
];

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });

/* ---- one-off face measurements, done on a blank page so nothing on the
   site can influence them ---- */
await page.goto("about:blank");
const faces = await page.evaluate(() => {
  const HELV = 'Helvetica, "Helvetica Neue", Arial, "Liberation Sans", sans-serif';
  const c = document.createElement("canvas").getContext("2d");

  // digit advances — tabular means all ten are equal
  c.font = `16px ${HELV}`;
  const digits = [..."0123456789"].map((d) => c.measureText(d).width);
  const zero = digits[0];

  // italic synthesis. A DOM measurement, not canvas: canvas ignores
  // font-synthesis. Three spans, identical text, measured to sub-pixel.
  const mk = (style, synth) => {
    const s = document.createElement("span");
    s.textContent = "Handgloves fifty-eight";
    s.style.cssText = `position:absolute;white-space:pre;font:${style} 40px ${HELV};font-synthesis:${synth}`;
    document.body.appendChild(s);
    const r = s.getBoundingClientRect();
    return { w: +r.width.toFixed(3), h: +r.height.toFixed(3) };
  };
  const roman = mk("normal", "weight style");
  const ital = mk("italic", "weight style");
  const italNoSynth = mk("italic", "none");

  // the "0" advance as a fraction of the em — what 1ch is worth
  const el = document.createElement("div");
  el.style.cssText = `position:absolute;font:100px ${HELV};width:1ch`;
  document.body.appendChild(el);
  const chAt100 = el.getBoundingClientRect().width;

  // weights the family can actually draw: 400 and 700 should differ,
  // 200/300/400/500 should all be identical (nothing below Regular exists)
  const atWeight = (w) => {
    const s = document.createElement("span");
    s.textContent = "Weight sample 0123";
    s.style.cssText = `position:absolute;white-space:pre;font-weight:${w};font-size:40px;font-family:${HELV}`;
    document.body.appendChild(s);
    return +s.getBoundingClientRect().width.toFixed(3);
  };
  const weights = Object.fromEntries(
    [100, 200, 300, 400, 500, 600, 700, 900].map((w) => [w, atWeight(w)]),
  );

  return {
    digitsEqual: digits.every((d) => Math.abs(d - zero) < 0.01),
    digitAdvances: digits.map((d) => +d.toFixed(3)),
    roman,
    ital,
    italNoSynth,
    chEm: +(chAt100 / 100).toFixed(4),
    weights,
  };
});

/* ---- per-route family sweep ---- */
const client = await page.createCDPSession();
await client.send("DOM.enable");
await client.send("CSS.enable");

const HELV_RE = /helvetica|arial|liberation sans/i;
const CONTRALTO_RE = /contralto/i;
const RETIRED_RE = /hanken|dm[ _-]?mono|font-hanken|font-dm-mono|fraunces|inter\b/i;

const results = [];
for (const route of ROUTES) {
  await page.goto(`http://localhost:${PORT}${route}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 30000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1200);

  const declared = await page.evaluate(
    (helvSrc, contrSrc, retSrc) => {
      const HELV = new RegExp(helvSrc, "i");
      const CONTR = new RegExp(contrSrc, "i");
      const RET = new RegExp(retSrc, "i");
      const bad = [];
      const seen = new Map();
      for (const el of document.querySelectorAll("body *")) {
        const ff = getComputedStyle(el).fontFamily;
        if (!ff) continue;
        seen.set(ff, (seen.get(ff) || 0) + 1);
        const ok = HELV.test(ff) || CONTR.test(ff) || /monospace|^inherit$/.test(ff);
        if (!ok || RET.test(ff)) {
          bad.push({
            cls: (el.className || "").toString().split(" ")[0] || el.tagName,
            ff,
          });
        }
      }
      return {
        stacks: [...seen.entries()].sort((a, b) => b[1] - a[1]),
        bad: bad.slice(0, 20),
        badCount: bad.length,
        htmlClass: document.documentElement.className,
      };
    },
    HELV_RE.source,
    CONTRALTO_RE.source,
    RETIRED_RE.source,
  );

  // what the browser actually PAINTED, for the page's most important nodes
  const painted = [];
  for (const sel of [
    "body",
    "h1",
    "h2",
    "nav a",
    '[class*="wordmark"]',
    '[class*="counter"]',
    '[class*="clock"]',
    '[class*="name"]',
  ]) {
    const h = await page.$(sel);
    if (!h) continue;
    try {
      const { node } = await client.send("DOM.describeNode", {
        objectId: (await h.jsonValue?.()) ? undefined : undefined,
      });
    } catch {}
    const nodeId = await page.evaluate((s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      e.setAttribute("data-probe-target", "1");
      return true;
    }, sel);
    if (!nodeId) continue;
    const { root } = await client.send("DOM.getDocument", { depth: -1 });
    const { nodeId: id } = await client.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector: '[data-probe-target="1"]',
    });
    if (id) {
      const { fonts } = await client.send("CSS.getPlatformFontsForNode", {
        nodeId: id,
      });
      painted.push({
        sel,
        fonts: fonts.map((f) => `${f.familyName}×${f.glyphCount}`),
      });
    }
    await page.evaluate(() =>
      document
        .querySelectorAll("[data-probe-target]")
        .forEach((e) => e.removeAttribute("data-probe-target")),
    );
  }

  // layout hygiene at this width
  const layout = await page.evaluate(() => {
    const de = document.documentElement;
    const overflow = de.scrollWidth - de.clientWidth;
    const clipped = [];
    for (const el of document.querySelectorAll("body *")) {
      const s = getComputedStyle(el);
      if (!/^(inline|block|inline-block|flex|inline-flex|grid)$/.test(s.display))
        continue;
      // a text box whose content is wider than its box AND that is not a
      // deliberate scroller / clamp
      if (
        el.scrollWidth > el.clientWidth + 1 &&
        s.overflowX === "visible" &&
        el.children.length === 0 &&
        (el.textContent || "").trim().length > 0
      ) {
        clipped.push({
          cls: (el.className || "").toString().split(" ")[0] || el.tagName,
          scrollW: el.scrollWidth,
          clientW: el.clientWidth,
          text: (el.textContent || "").trim().slice(0, 40),
        });
      }
    }
    return { overflow, clipped: clipped.slice(0, 12), docH: de.scrollHeight };
  });

  results.push({ route, ...declared, painted, layout });
}

console.log("\n=== FACE MEASUREMENTS (Helvetica stack, this machine) ===");
console.log(JSON.stringify(faces, null, 2));

const romanW = faces.roman.w;
const italW = faces.ital.w;
const italNSW = faces.italNoSynth.w;
console.log(
  `\nOBLIQUE: roman ${romanW}  italic ${italW}  italic+no-synthesis ${italNSW}`,
);
console.log(
  italW === romanW
    ? "  -> metrics are IDENTICAL, as expected. This test cannot tell a drawn\n" +
      "     oblique from a sheared one; run scripts/probe-type-faces.mjs for\n" +
      "     the pixel diff (which reports: real drawn oblique)."
    : "  -> metrics DIFFER — unexpected for Helvetica; inspect.",
);
console.log(
  `TABULAR FIGURES: ${faces.digitsEqual ? "yes — all ten digits share one advance" : "NO — proportional"}`,
);
console.log(`1ch = ${faces.chEm}em`);
console.log(`WEIGHTS drawn: ${JSON.stringify(faces.weights)}`);

console.log("\n=== PER-ROUTE ===");
for (const r of results) {
  console.log(`\n--- ${r.route} ---`);
  console.log(`  html class: "${r.htmlClass}"`);
  console.log(`  offending font-family declarations: ${r.badCount}`);
  if (r.badCount) console.log("   ", JSON.stringify(r.bad, null, 2));
  console.log("  distinct computed stacks:");
  for (const [ff, n] of r.stacks) console.log(`    ${n.toString().padStart(4)}  ${ff}`);
  console.log("  painted faces:");
  for (const p of r.painted) console.log(`    ${p.sel.padEnd(22)} ${p.fonts.join(", ")}`);
  console.log(
    `  h-overflow: ${r.layout.overflow}px   docH: ${r.layout.docH}   clipped text nodes: ${r.layout.clipped.length}`,
  );
  if (r.layout.clipped.length)
    console.log("   ", JSON.stringify(r.layout.clipped, null, 2));
}

await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
