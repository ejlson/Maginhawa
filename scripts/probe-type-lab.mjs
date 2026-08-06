/* Shoots one image per direction from /lab/type, plus a measured read of what
   each panel ACTUALLY computed to — the font families the browser resolved
   (not the ones the stylesheet asked for) and the four palette ratios read
   off rendered pixels rather than off the hex values in the source.

   The font check is the point of measuring rather than asserting: next/font
   falls back silently, so a direction can look shipped and be rendering
   Georgia.

   IT IS A WIDTH DIFF, NOT `document.fonts.check`, AND THAT MATTERS. The
   first version of this probe used `fonts.check('16px "Bricolage
   Grotesque"')`. It reported PASS on three panels, then reported FAIL on the
   same three panels on the next run with nothing about those panels changed
   — the faces were rendering correctly in the screenshots the whole time.
   `fonts.check` answers "is a matching face LOADED", and next/font's faces
   are fetched lazily, so the answer depends on whether `fonts.ready` happened
   to resolve after the dev server's CSS injection. A check that flips without
   the thing it checks changing is worse than no check.

   What cannot flake: render the heading's own text twice, once as the
   element actually computes and once with the family forced to the declared
   fallback, and compare advance widths. Different widths mean the browser is
   really setting that string in the proposed face. Same widths mean the
   panel is a fallback wearing the right name.

   Throwaway, like the route it shoots. Delete both once a direction is
   picked. */

import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/1fc8ec40-c8ba-4c1f-8e2d-89c2ff0d34ec/scratchpad/lab";
const PANELS = [
  "cobalt",
  "ube",
  "ember",
  "plaster",
  "emberdark",
  "emberbricolage",
  "plasterarchivo",
  "claret",
  "plastergaramond",
  "plasterliterata",
  "plasteryoung",
  "plasternewsreader",
  "plasterzilla",
  "plastersyne",
  "plasterpetrona",
];

/* The faces that must resolve, by panel — a miss here means the panel in the
   screenshot is not the panel being proposed.

   THE REPEATS ARE THE ASSERTION. Four panels claim to reuse another panel's
   type system, and two of those (06, 07) claim to be a straight trade of two
   type systems across two colourways. Naming the expected pair per panel and
   measuring it is what turns those claims into checks: if 06 quietly rendered
   Archivo, the width diff would still PASS against Georgia and only this
   table would catch it. */
const FACES = {
  cobalt: ["Bricolage Grotesque", "Instrument Sans"],
  ube: ["Archivo", "Host Grotesk"],
  ember: ["Young Serif", "Schibsted Grotesk"],
  plaster: ["Bricolage Grotesque", "Instrument Sans"],
  emberdark: ["Archivo", "Host Grotesk"],
  emberbricolage: ["Bricolage Grotesque", "Instrument Sans"],
  plasterarchivo: ["Archivo", "Host Grotesk"],
  claret: ["Bricolage Grotesque", "Instrument Sans"],
  plastergaramond: ["EB Garamond", "Figtree"],
  plasterliterata: ["Literata", "Familjen Grotesk"],
  plasteryoung: ["Young Serif", "Schibsted Grotesk"],
  plasternewsreader: ["Newsreader", "Public Sans"],
  plasterzilla: ["Zilla Slab", "Epilogue"],
  plastersyne: ["Syne", "Figtree"],
  plasterpetrona: ["Petrona", "Onest"],
};

const srgb = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/* TWO COMPUTED COLOUR SYNTAXES, AND THEY ARE ON DIFFERENT SCALES.
   `color` and `background-color` compute to `rgb(233, 216, 203)` — 0–255.
   But `color-mix(in srgb, …)` computes to `color(srgb 0.290196 0.0784314
   0.129412 / 0.22)` — 0–1 FLOATS. A parser that grabs the first three numbers
   and treats them as bytes turns 0.29 into 0.001, which is how the first
   version of the shadow check came to report L 0.000 on all eight panels and
   pass unconditionally: 0.000 is below every ground, including the dark ones,
   so it would have passed with the halo bug still in place.
   Detect the syntax, do not assume it. */
const parse = (css) => {
  const n = css.match(/-?\d+(\.\d+)?/g).slice(0, 3).map(Number);
  return css.trimStart().startsWith("color(") ? n.map((v) => v * 255) : n;
};

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--force-color-profile=srgb", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });

await page.goto(`${BASE}/lab/type`, { waitUntil: "networkidle0", timeout: 90_000 });
await page.evaluate(() => document.fonts.ready);

/* HIDE THE ROOT-LEVEL FURNITURE BEFORE CAPTURING, and the reason is worth
   recording because it is not specific to this lab.

   PageTransition's curtain is `position: fixed; z-index: 9999` parked at
   `top: 100vh` — just below the fold, waiting to sweep up on a route change.
   The moment a capture goes BEYOND the viewport (captureBeyondViewport, a
   full-page screenshot, or a clip taller than the window) Chrome grows the
   viewport, the parked curtain lands inside the captured area, and it paints
   its maroon over everything beneath it. The first plate off this probe had
   a 440px band of #233829 across the lower third of a bone-coloured panel
   and it read as a layout bug in the lab rather than as an artefact.

   The same applies to every full-page screenshot taken of this site. The
   grain overlay and the glass cursor's clip layer are hidden for the same
   reason at lower stakes. */
const HIDDEN = await page.evaluate(() => {
  const sel = ['[class*="PageTransition_curtain"]', '[class*="CustomCursor_clip"]', ".scrollBlur"];
  const hit = sel.flatMap((s) => [...document.querySelectorAll(s)]);
  hit.forEach((el) => (el.style.display = "none"));
  const grain = document.createElement("style");
  grain.textContent = "body::after{display:none!important}";
  document.head.appendChild(grain);
  return hit.length;
});
console.log(`hid ${HIDDEN} fixed overlay(s) + the grain wash before capture`);

let bad = 0;

for (const id of PANELS) {
  const el = await page.$(`[data-lab-panel="${id}"]`);
  if (!el) {
    console.log(`MISS  panel ${id} not in the DOM`);
    bad++;
    continue;
  }

  /* CLIP, MEASURED IN DOCUMENT COORDINATES — and that is the right call here
     rather than the trap it usually is. `clip` is document-origin, which is
     what breaks it when someone passes a viewport-relative box; each panel is
     1402px against a 1000px viewport, and elementHandle.screenshot's own
     scroll-and-stitch produced a plate with a band of a LATER panel's ground
     smeared into it (the fixed grain overlay in globals.css moves with the
     scroll, the stitched strips do not). Measuring the panel's own document
     box and clipping to it sidesteps the stitch entirely. */
  const box = await page.evaluate((panelId) => {
    const r = document.querySelector(`[data-lab-panel="${panelId}"]`).getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
  }, id);
  await page.screenshot({ path: `${OUT}/${id}.png`, clip: box, captureBeyondViewport: true });

  const read = await page.evaluate(
    (panelId, wanted) => {
      const root = document.querySelector(`[data-lab-panel="${panelId}"]`);
      const pick = (sel) => root.querySelector(sel);
      const cs = (n) => getComputedStyle(n);
      const heading = pick("h2");
      const para = [...root.querySelectorAll("p")].find((p) => p.textContent.startsWith("Maginhawa began"));
      const eyebrow = [...root.querySelectorAll("p")].find((p) => p.textContent.trim() === "The group");
      const soft = [...root.querySelectorAll("p")].find((p) => p.textContent.startsWith("Explore our family"));
      /* the filled pill on film — the first version of this lab set its label
         to the direction's GROUND, which on the two light directions is a
         near-white label on a white fill. Measured here so it cannot return. */
      const pill = [...root.querySelectorAll("button")].find((b) => b.textContent.startsWith("Explore our"));
      return {
        ground: cs(root).backgroundColor,
        ink: cs(para).color,
        soft: cs(soft).color,
        accent: cs(eyebrow).color,
        pillFill: cs(pill).backgroundColor,
        pillLabel: cs(pill).color,
        /* A SHADOW MUST BE DARKER THAN WHAT IT FALLS ON. The card's shadow
           was mixed from --ink, which is the cream on every dark palette, so
           the dark panels drew a pale halo. Reading the first colour out of
           the computed box-shadow catches that inversion on any palette
           added later, without anyone having to look at a screenshot. */
        cardShadow: cs(root.querySelector("article")).boxShadow,
        displayFamily: cs(heading).fontFamily,
        textFamily: cs(para).fontFamily,
        /* the real question: is the panel SET in the proposed face, or is it
           a fallback wearing the right family name? Measured by advance width
           against the declared fallback, which cannot flake the way
           document.fonts.check did. */
        widths: [
          [heading, wanted[0], "Georgia, serif"],
          [para, wanted[1], "Helvetica, Arial, sans-serif"],
        ].map(([node, face, fallback]) => {
          const probe = document.createElement("span");
          probe.textContent = "Handgloves 1987 — Maginhawa";
          const ns = cs(node);
          probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-size:${ns.fontSize};font-weight:${ns.fontWeight};letter-spacing:${ns.letterSpacing}`;
          document.body.appendChild(probe);

          probe.style.fontFamily = ns.fontFamily;
          const real = probe.getBoundingClientRect().width;
          probe.style.fontFamily = fallback;
          const base = probe.getBoundingClientRect().width;

          probe.remove();
          return {
            face,
            resolved: ns.fontFamily,
            real: Math.round(real * 100) / 100,
            fallback: Math.round(base * 100) / 100,
          };
        }),
      };
    },
    id,
    FACES[id],
  );

  const g = parse(read.ground);
  const rows = [
    ["ink", ratio(parse(read.ink), g), 4.5],
    ["soft", ratio(parse(read.soft), g), 4.5],
    ["accent", ratio(parse(read.accent), g), 4.5],
    ["pill", ratio(parse(read.pillLabel), parse(read.pillFill)), 4.5],
  ];

  console.log(`\n── ${id}`);
  for (const [name, r, floor] of rows) {
    const ok = r >= floor;
    if (!ok) bad++;
    console.log(`   ${ok ? "PASS" : "FAIL"}  ${name.padEnd(7)} ${r.toFixed(2)}:1  (needs ${floor})`);
  }

  /* the shadow check — a luminance comparison, not a ratio, because the
     question is DIRECTION (is it darker than the ground?) rather than
     separation. A shadow lighter than its ground is a glow. */
  const shadowLum = lum(parse(read.cardShadow));
  const groundLum = lum(g);
  const shadowOk = shadowLum < groundLum;
  if (!shadowOk) bad++;
  console.log(
    `   ${shadowOk ? "PASS" : "FAIL"}  shadow  L ${shadowLum.toFixed(3)} vs ground L ${groundLum.toFixed(3)}` +
      (shadowOk ? "" : "  ← lighter than the ground: this is a halo, not a shadow"),
  );
  for (const w of read.widths) {
    /* TWO conditions, and both are needed.

       The WIDTH diff proves a real face is rendering rather than the
       fallback: a 0.5px allowance, not an exact inequality, because two
       genuinely different faces never land inside half a pixel over a
       28-character string while sub-pixel jitter between two reads of the
       same node could.

       The NAME check proves it is the RIGHT face. Without it a panel that
       quietly rendered Archivo where Bricolage was promised would still show
       a large width diff against Georgia and sail through — which matters
       most for 06 and 07, whose entire claim is about which family they are
       set in. */
    const sized = Math.abs(w.real - w.fallback) > 0.5;
    const named = w.resolved.toLowerCase().includes(w.face.toLowerCase());
    const ok = sized && named;
    if (!ok) bad++;
    const why = !named ? `resolved to ${w.resolved.split(",")[0]}` : `${w.real}px vs ${w.fallback}px fallback`;
    console.log(`   ${ok ? "PASS" : "FAIL"}  face    ${w.face.padEnd(20)} ${why}`);
  }
  console.log(`   display resolved: ${read.displayFamily.split(",")[0]}`);
  console.log(`   text    resolved: ${read.textFamily.split(",")[0]}`);
}

/* ---------------------------------------------------------------------------
   THE SPECIMEN SHEET, /lab/type/plaster.

   Checked as well as shot, because the sheet reaches the tokens through a
   DIFFERENT root element than the panels do: its <main> carries data-palette
   on ITSELF, where a panel carries it on a section inside .lab.

   THAT DISTINCTION ALREADY BIT ONCE. The token blocks were written as
   `.lab [data-palette="…"]` — a descendant selector — which cannot match an
   element that is both .lab and the attribute holder. The whole sheet
   rendered in the LIVE SITE's palette (green ink on cream, inherited from
   body) while every label still read "Plaster & Claret". The type resolved
   correctly the whole time, because rows ARE descendants, so a font-only
   check passed and the plate looked plausible enough at a glance.

   The ground assertion below is the one that would have caught it. The first
   version of this check READ the ground into the result and never compared
   it — a value collected is not a value checked.
   --------------------------------------------------------------------------- */

/* the plaster ground, as the panels resolve it */
const SHEET_GROUND = "rgb(245, 233, 224)";

const SHEET_FACES = {
  bricolage: "Bricolage Grotesque",
  archivo: "Archivo",
  syne: "Syne",
  garamond: "EB Garamond",
  petrona: "Petrona",
  newsreader: "Newsreader",
  literata: "Literata",
  young: "Young Serif",
  zilla: "Zilla Slab",
};

console.log("\n── specimen sheet /lab/type/plaster");
await page.goto(`${BASE}/lab/type/plaster`, { waitUntil: "networkidle0", timeout: 90_000 });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => {
  [...document.querySelectorAll('[class*="PageTransition_curtain"], [class*="CustomCursor_clip"], .scrollBlur')].forEach(
    (el) => (el.style.display = "none"),
  );
  const s = document.createElement("style");
  s.textContent = "body::after{display:none!important}";
  document.head.appendChild(s);
});

const sheet = await page.evaluate((expected) => {
  const rows = [...document.querySelectorAll("[data-sheet-row]")];
  const main = document.querySelector("main");
  return {
    count: rows.length,
    /* the sheet paints the ground on its ROOT, so that is where it is read */
    ground: getComputedStyle(main).backgroundColor,
    ink: getComputedStyle(main).color,
    rows: rows.map((r) => ({
      key: r.dataset.sheetRow,
      want: expected[r.dataset.sheetRow],
      got: getComputedStyle(r.querySelector("h3")).fontFamily,
      /* the accent has to reach the emphasised word too — if the palette
         block misses, `em` silently inherits the heading colour and the
         heading reads as one flat colour rather than two */
      accent: getComputedStyle(r.querySelector("h3 em")).color,
    })),
  };
}, SHEET_FACES);

if (sheet.count !== Object.keys(SHEET_FACES).length) {
  console.log(`   FAIL  row count ${sheet.count}, expected ${Object.keys(SHEET_FACES).length}`);
  bad++;
}

const groundOk = sheet.ground === SHEET_GROUND;
if (!groundOk) bad++;
console.log(
  `   ${groundOk ? "PASS" : "FAIL"}  ground      ${sheet.ground}` +
    (groundOk ? "" : `  ← expected ${SHEET_GROUND}; the palette block is not matching this root`),
);

/* the accent must differ from the ink, on every row */
const flat = sheet.rows.filter((r) => r.accent === sheet.ink);
if (flat.length) {
  bad++;
  console.log(`   FAIL  accent      ${flat.length} row(s) render the emphasis in the ink colour`);
} else {
  console.log(`   PASS  accent      ${sheet.rows[0].accent} on all ${sheet.count} rows, ink ${sheet.ink}`);
}

for (const r of sheet.rows) {
  const ok = r.got.toLowerCase().includes(r.want.toLowerCase());
  if (!ok) bad++;
  console.log(`   ${ok ? "PASS" : "FAIL"}  ${r.key.padEnd(11)} → ${r.got.split(",")[0]}`);
}

const sheetBox = await page.evaluate(() => {
  const r = document.querySelector("main").getBoundingClientRect();
  return { x: 0, y: 0, width: r.width, height: Math.ceil(r.height) };
});
await page.screenshot({ path: `${OUT}/plaster-sheet.png`, clip: sheetBox, captureBeyondViewport: true });
console.log(`   shot ${Math.round(sheetBox.width)}×${sheetBox.height}`);

/* ---------------------------------------------------------------------------
   THE INK LADDER, /lab/type/red.

   Two things to prove. That the CONTROLS are actually controlled — one ground
   and one accent across all seven rows, so any difference a reader sees is
   the ink — and that the ratio printed beside each swatch is the ratio the
   browser renders, since those labels are the whole basis for picking a row.
   --------------------------------------------------------------------------- */

const LADDER = {
  claret: 12.46,
  light: 11.72,
  mid: 13.06,
  deep: 14.36,
  brown: 12.78,
  red: 13.83,
  black: 15.3,
};

console.log("\n── ink ladder /lab/type/red");
await page.goto(`${BASE}/lab/type/red`, { waitUntil: "networkidle0", timeout: 90_000 });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => {
  [...document.querySelectorAll('[class*="PageTransition_curtain"], [class*="CustomCursor_clip"], .scrollBlur')].forEach(
    (el) => (el.style.display = "none"),
  );
  const s = document.createElement("style");
  s.textContent = "body::after{display:none!important}";
  document.head.appendChild(s);
});

const ladder = await page.evaluate(() => {
  const main = document.querySelector("main");
  return {
    ground: getComputedStyle(main).backgroundColor,
    rows: [...document.querySelectorAll("[data-ink-row]")].map((r) => ({
      key: r.dataset.inkRow,
      /* the heading's own colour, not the inline custom property — this is
         what a reader actually sees, and it survives a broken var chain that
         a read of the style attribute would not */
      ink: getComputedStyle(r.querySelector("h3")).color,
      accent: getComputedStyle(r.querySelector("h3 em")).color,
      /* the filled pill: the largest area of ink on the row, and the one
         place a wrong --ink would be unmissable */
      pill: getComputedStyle(r.querySelector("button")).backgroundColor,
    })),
  };
});

const gOk = ladder.ground === SHEET_GROUND;
if (!gOk) bad++;
console.log(`   ${gOk ? "PASS" : "FAIL"}  ground      ${ladder.ground}`);

const accents = new Set(ladder.rows.map((r) => r.accent));
const aOk = accents.size === 1;
if (!aOk) bad++;
console.log(`   ${aOk ? "PASS" : "FAIL"}  accent      ${[...accents].join(" / ")} across ${ladder.rows.length} rows`);

for (const r of ladder.rows) {
  const measured = ratio(parse(r.ink), parse(ladder.ground));
  const claimed = LADDER[r.key];
  /* 0.05 tolerance absorbs the rounding in the printed label, nothing more */
  const rOk = claimed !== undefined && Math.abs(measured - claimed) < 0.05;
  /* the pill must carry the SAME ink as the heading — they read from one
     custom property, so a mismatch means the var chain broke for one of them */
  const pOk = r.pill === r.ink;
  if (!rOk || !pOk) bad++;
  console.log(
    `   ${rOk && pOk ? "PASS" : "FAIL"}  ${r.key.padEnd(7)} ${measured.toFixed(2)}:1` +
      (rOk ? "" : `  ← label says ${claimed}`) +
      (pOk ? "" : `  ← pill ${r.pill} != heading ${r.ink}`),
  );
}

const ladderBox = await page.evaluate(() => {
  const r = document.querySelector("main").getBoundingClientRect();
  return { x: 0, y: 0, width: r.width, height: Math.ceil(r.height) };
});
await page.screenshot({ path: `${OUT}/ink-ladder.png`, clip: ladderBox, captureBeyondViewport: true });
console.log(`   shot ${Math.round(ladderBox.width)}×${ladderBox.height}`);

await browser.close();
console.log(bad === 0 ? "\nALL PASS" : `\n${bad} FAILURE(S)`);
process.exit(bad === 0 ? 0 : 1);
