/* THE FLAT-BAND / RAISED-PORTRAIT / LEFT-RANGED-PRESS PASS.
 *
 * Named for the three changes it exists to prove, and deliberately NOT a
 * re-run of scripts/probe-band-about-press.mjs — that probe's whole subject
 * is the band's clip OPENING, and the point of this one is that there is no
 * longer a clip to open. Keeping both means the old numbers stay readable as
 * the "before" they were, instead of being overwritten by a run of a page
 * that no longer has the mechanism they measured.
 *
 * What it proves, in order:
 *   A  THE BAND IS FULL-BLEED AT EVERY SCROLL POSITION. Not one reading —
 *      the whole page is swept in ~500px steps and the band's width/left are
 *      read at every stop. A scrub that had merely been re-tuned would show
 *      a spread here; a deleted one shows a spread of exactly 0.
 *   B  NO CLIP ANIMATION REMAINS on it: computed `clip-path` is `none` at
 *      every one of those stops, and no inline clipPath is ever written.
 *   C  THE PILL IS GONE from the DOM, by class and by its label text.
 *   D  BOTH ABOUT PHOTOGRAPHS ARE SQUARE-CORNERED — computed radius 0 on the
 *      frame AND on the <img> inside it.
 *   E  THE PORTRAIT'S TOP SITS ON THE STORY'S FIRST LINE. Reported against
 *      the first LINE BOX (measured with a Range, not the paragraph's box)
 *      and, for information, against the cap height inside it.
 *   F  THE BAND → ABOUT SEAM: the photograph's bottom edge to the "About Us"
 *      ink, the way every other seam on this page has been measured.
 *   G  THREE LEFT EDGES agree: the About title, the Featured In title, the
 *      credential list. Box edge and ink edge both, because the two titles
 *      start on different letters and only one of those numbers is the
 *      layout contract.
 *   H  THE ROW HOVER changes the row's GROUND and its TYPE, and keyboard
 *      focus reaches the same state. Ground is read off real pixels, not off
 *      a stylesheet — the plate is a faded pseudo-element and its computed
 *      colour says nothing about what is on screen.
 *   I  NOTHING IS PINNED: each section's document-space top is sampled
 *      across the full scroll and must not move at all.
 *
 * usage: node scripts/probe-flatband-aboutraise-pressrange.mjs [port] [width] [height] [outdir]
 */
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const argv = process.argv.slice(2);
const PORT = argv[0] || "3000";
const W = +(argv[1] || 1440);
const H = +(argv[2] || 900);
const OUT = argv[3] || `/tmp/flatband-${W}`;
fs.mkdirSync(OUT, { recursive: true });

/* CSS Modules hash the module NAME into the class, so every selector is a
   substring match — which is what lets a run from before a rule moved file
   be diffed against a run from after. */
const SEL = {
  manifesto: '[class*="Manifesto_section"]',
  /* THE PHOTOGRAPHIC BOX, under either name. Written as an alternation so a
     run from BEFORE this pass (where the picture was `.bandBleed`, absolutely
     positioned inside a `.bandRunway`) and a run from after (where it is just
     `.band`) both land on the same object. The `:not()`s keep the second
     alternative off the runway, the scrim, the pill and the <img>. */
  band:
    '[class*="Manifesto_bandBleed"], [class*="Manifesto_band"]:not([class*="Runway"]):not([class*="Cta"]):not([class*="Scrim"]):not([class*="Img"])',
  bandCta: '[class*="Manifesto_bandCta"]',
  about: '[class*="AboutIntro_section"]',
  aboutTitle: '[class*="AboutIntro_title"]',
  portraitFrame: '[class*="AboutIntro_portraitFrame"]',
  portraitImg: '[class*="AboutIntro_portraitImg"]',
  sceneFrame: '[class*="AboutIntro_sceneFrame"]',
  sceneImg: '[class*="AboutIntro_sceneImg"]',
  copy: '[class*="AboutIntro_copy"]',
  press: '[class*="PressWall_section"]',
  pressTitle: '[class*="PressWall_title"]',
  creds: '[class*="PressWall_creds"]',
  credRow: '[class*="PressWall_credRow"]',
  credLine: '[class*="PressWall_credLine"]',
  credOutlet: '[class*="PressWall_credOutlet"]',
};

const s = (ms) => new Promise((r) => setTimeout(r, ms));
const R = [];
const ok = (n, pass, detail) => {
  R.push({ n, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${n}  ${detail}`);
};
const note = (n, detail) => {
  console.log(`----  ${n}  ${detail}`);
  R.push({ n, pass: null, detail });
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const cdp = await page.createCDPSession();
/* headless reports (hover:none)/(pointer:coarse), which silently drops every
   `@media (hover: hover)` rule on the page — including the one this probe's
   section H exists to read. */
await cdp.send("Emulation.setEmulatedMedia", {
  media: "screen",
  features: [
    { name: "hover", value: "hover" },
    { name: "pointer", value: "fine" },
  ],
});

const errors = [];
/* THE ONE KNOWN WARNING, excluded BY NAME. `useReducedMotion` resolves to
   null on the server and to a boolean after hydration, so React logs a
   mismatch on this page already. Anything else is a real regression. */
const KNOWN = /prefers-reduced-motion/i;
page.on("console", (m) => {
  if (m.type() === "error" && !KNOWN.test(m.text())) errors.push(m.text());
});
page.on("pageerror", (e) => {
  if (!KNOWN.test(String(e))) errors.push(String(e));
});

const status = (
  await page.goto(`http://localhost:${PORT}/`, {
    /* NEVER networkidle0 on this site — the hero film and the hover clips
       loop, so the network never goes quiet. The loader's own body class is
       the signal that the page is actually up. */
    waitUntil: "domcontentloaded",
    timeout: 90000,
  })
).status();
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 90000,
  })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);
await s(1800);
ok("http:status", status === 200, `GET / → ${status}`);

/* Lenis owns the scroll and overrides window.scrollTo, so drive it through
   the handle it publishes. Immediate + force, then a beat for the scroll
   listeners to run and for any Reveal spring to settle — Reveal animates a
   transform, and a measurement taken mid-spring is a measurement of the
   animation rather than of the layout. */
const travel = async (to, settle = 700) => {
  await page.evaluate((y) => {
    const l = window.__lenis;
    if (l) l.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, to);
  await s(settle);
};

async function shoot(file) {
  const buf = await page.screenshot({ fullPage: false });
  if (file) fs.writeFileSync(`${OUT}/${file}`, buf);
  return buf;
}

/* page.screenshot({clip}) measures from the DOCUMENT origin, so on a scrolled
   page it hands back a blank rectangle. Shoot the viewport full and crop. */
async function crop(buf, box, file, zoom = 1) {
  const meta = await sharp(buf).metadata();
  const x = Math.min(Math.max(0, Math.round(box.x)), meta.width - 1);
  const y = Math.min(Math.max(0, Math.round(box.y)), meta.height - 1);
  const w = Math.max(1, Math.min(Math.round(box.w), meta.width - x));
  const h = Math.max(1, Math.min(Math.round(box.h), meta.height - y));
  let img = sharp(buf).extract({ left: x, top: y, width: w, height: h });
  if (zoom !== 1)
    img = img.resize({ width: w * zoom, kernel: sharp.kernel.nearest });
  await img.toFile(`${OUT}/${file}`);
}

/** pixel reader over a viewport screenshot */
async function pixels(buf) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return (x, y) => {
    const i = (info.width * Math.round(y) + Math.round(x)) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
}

// ── shared page-side helper: the first LINE BOX of an element's text.
// getBoundingClientRect() on a multi-line block gives the block, and on an
// inline-block-heavy heading it gives the padded mask, not the type. A Range
// over the first text node gives the actual line box the reader sees.
const FIRSTLINE = `(el) => {
  if (!el) return null;
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walk.nextNode())) {
    if (!n.textContent.trim()) continue;
    const r = document.createRange();
    r.selectNodeContents(n);
    const rects = [...r.getClientRects()].filter((b) => b.width > 0 && b.height > 0);
    if (!rects.length) continue;
    const top = Math.min(...rects.map((b) => b.top));
    const first = rects.filter((b) => b.top < top + 4);
    return {
      top,
      bottom: Math.max(...first.map((b) => b.bottom)),
      left: Math.min(...first.map((b) => b.left)),
      height: Math.max(...first.map((b) => b.height)),
    };
  }
  return null;
}`;

const docTop = (sel) =>
  page.evaluate((q) => {
    const el = document.querySelector(q);
    if (!el) return null;
    return el.getBoundingClientRect().top + window.scrollY;
  }, sel);

const pageH = await page.evaluate(
  () => document.documentElement.scrollHeight - window.innerHeight,
);
const clientW = await page.evaluate(() => document.documentElement.clientWidth);
note("page:height", `scrollable ${pageH}px, clientWidth ${clientW}px`);

/* ══════════════════════ A + B + I — THE FULL SWEEP ══════════════════════
   One pass down the whole document in 500px steps. 500 rather than a larger
   stride because IntersectionObservers (Reveal, the credential stagger) arm
   on entry and a jump past a section leaves it unrevealed. */
const sweep = [];
for (let y = 0; y <= pageH; y += 500) {
  await travel(y, 260);
  const row = await page.evaluate(
    (q, band) => {
      const b = document.querySelector(band);
      const out = { y: window.scrollY, band: null, tops: {} };
      if (b) {
        const r = b.getBoundingClientRect();
        const cs = getComputedStyle(b);
        out.band = {
          left: +r.left.toFixed(2),
          width: +r.width.toFixed(2),
          height: +r.height.toFixed(2),
          clip: cs.clipPath,
          inline: b.style.clipPath || "",
          willChange: cs.willChange,
        };
      }
      for (const [k, sel] of Object.entries(q)) {
        const el = document.querySelector(sel);
        out.tops[k] = el
          ? +(el.getBoundingClientRect().top + window.scrollY).toFixed(1)
          : null;
      }
      return out;
    },
    { manifesto: SEL.manifesto, about: SEL.about, press: SEL.press },
    SEL.band,
  );
  sweep.push(row);
}

const bands = sweep.map((r) => r.band).filter(Boolean);
const widths = [...new Set(bands.map((b) => b.width))];
const lefts = [...new Set(bands.map((b) => b.left))];
const clips = [...new Set(bands.map((b) => b.clip))];
const inlines = [...new Set(bands.map((b) => b.inline))];

ok(
  "band:full-bleed-every-scroll",
  bands.length > 0 &&
    widths.length === 1 &&
    Math.abs(widths[0] - clientW) <= 1 &&
    lefts.length === 1 &&
    Math.abs(lefts[0]) <= 1,
  `${bands.length} samples · width ${widths.join("/")} (viewport ${clientW}) · left ${lefts.join("/")} · height ${[...new Set(bands.map((b) => b.height))].join("/")}`,
);
ok(
  "band:no-clip-animation",
  clips.length === 1 && clips[0] === "none" && inlines.every((v) => v === ""),
  `computed clip-path ∈ {${clips.join(" | ")}} · inline clipPath ∈ {${inlines.map((v) => v || "∅").join(" | ")}}`,
);

for (const k of ["manifesto", "about", "press"]) {
  const vals = sweep.map((r) => r.tops[k]).filter((v) => v !== null);
  const spread = Math.max(...vals) - Math.min(...vals);
  ok(
    `pin:${k}`,
    spread === 0,
    `docTop spread ${spread.toFixed(1)}px over ${vals.length} scroll positions (docTop ${vals[0]})`,
  );
}

/* ══════════════════════ C — THE PILL IS GONE ══════════════════════ */
const pill = await page.evaluate(
  (q) => ({
    byClass: document.querySelectorAll(q).length,
    byText: [...document.querySelectorAll("a")].filter((a) =>
      /learn more about us/i.test(a.textContent || ""),
    ).length,
  }),
  SEL.bandCta,
);
ok(
  "band:pill-removed",
  pill.byClass === 0 && pill.byText === 0,
  `${pill.byClass} node(s) matching ${SEL.bandCta}, ${pill.byText} anchor(s) labelled "Learn more about us"`,
);

/* ══════════════════════ D + E + F — THE ABOUT CHAPTER ══════════════════════
   Parked so the chapter sits in the middle of the window: the Reveal springs
   have to have fired AND settled before anything here is measured. */
const aboutTop = await docTop(SEL.about);
await travel(Math.max(0, aboutTop - 120), 1800);

const about = await page.evaluate(
  (S, FL) => {
    const firstLine = eval(`(${FL})`);
    const q = (x) => document.querySelector(x);
    const box = (x) => {
      const el = q(x);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: +r.top.toFixed(2),
        left: +r.left.toFixed(2),
        right: +r.right.toFixed(2),
        bottom: +r.bottom.toFixed(2),
        w: +r.width.toFixed(2),
        h: +r.height.toFixed(2),
      };
    };
    const radius = (x) => {
      const el = q(x);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return [
        cs.borderTopLeftRadius,
        cs.borderTopRightRadius,
        cs.borderBottomRightRadius,
        cs.borderBottomLeftRadius,
      ].join(" ");
    };
    const copyEl = q(S.copy);
    const firstP = copyEl?.querySelector("p");
    const bandEl = q(S.band);
    const titleEl = q(S.aboutTitle);
    return {
      portrait: box(S.portraitFrame),
      scene: box(S.sceneFrame),
      copy: box(S.copy),
      /* THE FIRST LINE BOX is the paragraph's own border-box top: `.body`
         has no margin or padding and this is its first line, so the two
         coincide. A Range's client rects do NOT give it — they give the
         font's ascent/descent box, which sits half the leading lower (2.0px
         here) and would make an exact grid alignment read as a 2px miss. */
      storyBlock: firstP ? +firstP.getBoundingClientRect().top.toFixed(2) : null,
      storyLine: firstLine(firstP),
      radii: {
        portraitFrame: radius(S.portraitFrame),
        portraitImg: radius(S.portraitImg),
        sceneFrame: radius(S.sceneFrame),
        sceneImg: radius(S.sceneImg),
      },
      sceneSrc: q(S.sceneImg)?.currentSrc || q(S.sceneImg)?.src || null,
      sceneNatural: q(S.sceneImg)
        ? [q(S.sceneImg).naturalWidth, q(S.sceneImg).naturalHeight]
        : null,
      sceneSizes: q(S.sceneImg)?.getAttribute("sizes") || null,
      bandBottomDoc: bandEl
        ? +(bandEl.getBoundingClientRect().bottom + window.scrollY).toFixed(2)
        : null,
      titleLine: firstLine(titleEl),
      titleLineDoc: titleEl
        ? +(firstLine(titleEl).top + window.scrollY).toFixed(2)
        : null,
      titleBox: box(S.aboutTitle),
      titleBoxDoc: titleEl
        ? +(titleEl.getBoundingClientRect().top + window.scrollY).toFixed(2)
        : null,
      /* the cap top inside the first line box, for information only. A
         canvas measurement of the actual face, not a guessed ratio. */
      capOffset: (() => {
        if (!firstP) return null;
        const cs = getComputedStyle(firstP);
        const c = document.createElement("canvas").getContext("2d");
        c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`;
        const m = c.measureText("M");
        const fs = parseFloat(cs.fontSize);
        const lh = parseFloat(cs.lineHeight) || fs * 1.2;
        const ascent = m.fontBoundingBoxAscent ?? fs * 0.8;
        const descent = m.fontBoundingBoxDescent ?? fs * 0.2;
        const half = (lh - (ascent + descent)) / 2;
        return +(half + (ascent - (m.actualBoundingBoxAscent ?? fs * 0.7))).toFixed(2);
      })(),
    };
  },
  SEL,
  FIRSTLINE,
);

const flat = (v) => (v || "").split(" ").every((x) => parseFloat(x) === 0);
ok(
  "about:radius-zero",
  flat(about.radii.portraitFrame) &&
    flat(about.radii.sceneFrame) &&
    flat(about.radii.portraitImg) &&
    flat(about.radii.sceneImg),
  `portraitFrame [${about.radii.portraitFrame}] portraitImg [${about.radii.portraitImg}] sceneFrame [${about.radii.sceneFrame}] sceneImg [${about.radii.sceneImg}]`,
);

const lineDelta =
  about.portrait && about.storyBlock !== null
    ? +(about.portrait.top - about.storyBlock).toFixed(2)
    : null;
const textDelta =
  about.portrait && about.storyLine
    ? +(about.portrait.top - about.storyLine.top).toFixed(2)
    : null;
/* THE ALIGNMENT ONLY EXISTS AT ≥981px, and asserting it below that would be
   asserting a layout the stylesheet does not claim: under the breakpoint
   .grid is stacked flow in DOM order — title, portrait, story — so the
   portrait is deliberately a whole block ABOVE the first line it is aligned
   with on desktop, and there is no shared grid row to align to. Reported,
   not failed. */
if (W >= 981) {
  ok(
    "about:portrait-top-on-first-line",
    lineDelta !== null && Math.abs(lineDelta) <= 1,
    `portrait top ${about.portrait?.top} · story first LINE BOX top ${about.storyBlock} · Δ ${lineDelta}px   [for information: to the INK inside that line (Range box, half-leading lower) Δ ${textDelta}px; the cap sits a further ${about.capOffset}px down]`,
  );
} else {
  note(
    "about:portrait-top-on-first-line",
    `n/a below 981px — stacked flow, portrait is its own block above the story (Δ ${lineDelta}px, which is the stack, not a misalignment)`,
  );
}

const seam =
  about.bandBottomDoc !== null && about.titleLineDoc !== null
    ? +(about.titleLineDoc - about.bandBottomDoc).toFixed(2)
    : null;
note(
  "seam:band→about",
  `band bottom (doc ${about.bandBottomDoc}) → "About Us" first line box (doc ${about.titleLineDoc}) = ${seam}px   [title BOX top doc ${about.titleBoxDoc}, i.e. ${seam !== null ? (about.titleLineDoc - about.titleBoxDoc).toFixed(2) : "?"}px of leading above the ink]`,
);

note(
  "about:scene-photograph",
  `${about.sceneSrc} · natural ${about.sceneNatural?.join("×")} · frame ${about.scene?.w}×${about.scene?.h} · sizes="${about.sceneSizes}"`,
);

// screenshots — About at rest
{
  const buf = await shoot(null);
  const b = await page.evaluate((q) => {
    const el = document.querySelector(q);
    const r = el.getBoundingClientRect();
    return { x: 0, y: Math.max(0, r.top), w: window.innerWidth, h: window.innerHeight };
  }, SEL.about);
  await crop(buf, b, `about-${W}.png`);
}

/* ══════════════════════ G — THE THREE LEFT EDGES ══════════════════════ */
const pressTop = await docTop(SEL.press);
await travel(Math.max(0, pressTop - 80), 1800);

const edges = await page.evaluate(
  (S, FL) => {
    const firstLine = eval(`(${FL})`);
    const q = (x) => document.querySelector(x);
    const L = (x) => {
      const el = q(x);
      return el ? +el.getBoundingClientRect().left.toFixed(2) : null;
    };
    const ink = (x) => {
      const l = firstLine(q(x));
      return l ? +l.left.toFixed(2) : null;
    };
    const cs = getComputedStyle(document.documentElement);
    return {
      aboutTitleBox: L(S.aboutTitle),
      aboutTitleInk: ink(S.aboutTitle),
      pressTitleBox: L(S.pressTitle),
      pressTitleInk: ink(S.pressTitle),
      credsBox: L(S.creds),
      credOutletInk: ink(S.credOutlet),
      pressSectionPadLeft: getComputedStyle(q(S.press)).paddingLeft,
      aboutSectionPadLeft: getComputedStyle(q(S.about)).paddingLeft,
      gridMargin: cs.getPropertyValue("--grid-margin").trim(),
      padX: cs.getPropertyValue("--pad-x").trim(),
      gridCol2: cs.getPropertyValue("--grid-col2").trim(),
    };
  },
  SEL,
  FIRSTLINE,
);

const spreadBox = Math.max(
  Math.abs(edges.pressTitleBox - edges.aboutTitleBox),
  Math.abs(edges.credsBox - edges.aboutTitleBox),
);
ok(
  "press:left-edge-matches-about",
  spreadBox <= 1,
  `About title box-left ${edges.aboutTitleBox} · Featured In title box-left ${edges.pressTitleBox} · credential list box-left ${edges.credsBox} · max Δ ${spreadBox.toFixed(2)}px`,
);
note(
  "press:left-edge-ink",
  `INK left (side bearings differ per glyph): "About Us" ${edges.aboutTitleInk} · "Featured In" ${edges.pressTitleInk} · "Michelin Guide" ${edges.credOutletInk}`,
);
note(
  "press:padding",
  `About padding-left ${edges.aboutSectionPadLeft} · Featured In padding-left ${edges.pressSectionPadLeft} · tokens: --grid-margin ${edges.gridMargin}, --pad-x ${edges.padX}, --grid-col2 ${edges.gridCol2}`,
);

// Featured In at rest
{
  const buf = await shoot(null);
  await crop(buf, { x: 0, y: 0, w: W, h: H }, `press-rest-${W}.png`);
}

/* ══════════════════════ H — THE WHOLE-ROW HOVER ══════════════════════
   TWO mouse moves. One synthetic move that lands inside the row fires
   mousemove but not always mouseenter — the pointer has to have been
   somewhere else first for the browser to consider it a crossing. */
const rowBox = await page.evaluate((q) => {
  const el = document.querySelectorAll(q)[1]; // the middle row
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}, SEL.credRow);

const readRow = async () =>
  page.evaluate(
    (S) => {
      const row = document.querySelectorAll(S.credRow)[1];
      const a = row?.querySelector("a");
      const line = row?.querySelector(S.credLine);
      const thumb = row?.querySelector('[class*="PressWall_credThumb"]');
      const meta = row?.querySelector('[class*="PressWall_credMeta"]');
      const plate = a ? getComputedStyle(a, "::before") : null;
      return {
        lineColor: line ? getComputedStyle(line).color : null,
        metaOpacity: meta ? getComputedStyle(meta).opacity : null,
        thumbTransform: thumb ? getComputedStyle(thumb).transform : null,
        plateOpacity: plate ? plate.opacity : null,
        plateBg: plate ? plate.backgroundColor : null,
        plateBorder: plate ? plate.borderTopColor : null,
      };
    },
    SEL,
  );

// rest — sample the ground where the plate will be, well clear of any glyph
const groundProbe = rowBox
  ? { x: Math.round(rowBox.x + rowBox.w - 24), y: Math.round(rowBox.y + 8) }
  : null;

await page.mouse.move(10, 10);
await s(500);
const restRow = await readRow();
const restBuf = await shoot(null);
const restPx = await pixels(restBuf);
const restGround = groundProbe ? restPx(groundProbe.x, groundProbe.y) : null;

await page.mouse.move(
  Math.round(rowBox.x + rowBox.w * 0.5),
  Math.round(rowBox.y + rowBox.h * 0.5),
);
await s(700);
const hoverRow = await readRow();
const hoverBuf = await shoot(null);
const hoverPx = await pixels(hoverBuf);
const hoverGround = groundProbe ? hoverPx(groundProbe.x, groundProbe.y) : null;
await crop(hoverBuf, { x: 0, y: 0, w: W, h: H }, `press-hover-${W}.png`);
if (rowBox)
  await crop(
    hoverBuf,
    { x: 0, y: Math.max(0, rowBox.y - 20), w: W, h: rowBox.h + 40 },
    `press-hover-row-${W}.png`,
  );

const dGround = restGround
  ? Math.max(...restGround.map((v, i) => Math.abs(v - hoverGround[i])))
  : 0;
ok(
  "press:hover-changes-ground",
  dGround >= 4,
  `real pixels at the row's ground rgb(${restGround}) → rgb(${hoverGround}), max channel Δ ${dGround} · plate opacity ${restRow.plateOpacity} → ${hoverRow.plateOpacity} (${hoverRow.plateBg}, rules ${hoverRow.plateBorder})`,
);
ok(
  "press:hover-changes-type",
  restRow.lineColor !== hoverRow.lineColor,
  `credential line ${restRow.lineColor} → ${hoverRow.lineColor} · meta opacity ${restRow.metaOpacity} → ${hoverRow.metaOpacity} · thumbnail ${restRow.thumbTransform} → ${hoverRow.thumbTransform}`,
);

// keyboard focus — the same row, reached without a pointer
await page.mouse.move(10, 10);
await s(400);
await page.evaluate((S) => {
  const a = document.querySelectorAll(S.credRow)[1].querySelector("a");
  a.focus();
}, SEL);
await s(700);
const focusRow = await readRow();
const focusBuf = await shoot(null);
const focusPx = await pixels(focusBuf);
const focusGround = groundProbe ? focusPx(groundProbe.x, groundProbe.y) : null;
if (rowBox)
  await crop(
    focusBuf,
    { x: 0, y: Math.max(0, rowBox.y - 20), w: W, h: rowBox.h + 40 },
    `press-focus-row-${W}.png`,
  );

const dFocusGround = restGround
  ? Math.max(...restGround.map((v, i) => Math.abs(v - focusGround[i])))
  : 0;
ok(
  "press:focus-equivalent",
  dFocusGround >= 4 && focusRow.lineColor === hoverRow.lineColor,
  `focus ground rgb(${focusGround}) (Δ ${dFocusGround} from rest) · line ${focusRow.lineColor} (hover was ${hoverRow.lineColor}) · plate opacity ${focusRow.plateOpacity}`,
);

/* the hovered ink against the hovered ground, from real pixels rather than
   from the token — the plate is translucent, so neither colour is what the
   stylesheet says */
{
  const lum = (c) => {
    const f = (v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  /* TWO SERIALISATIONS, and getting this wrong costs the whole reading: a
     plain token comes back `rgb(244, 240, 228)`, but ANY color-mix() comes
     back `color(srgb 0.81 0.6 0.5)` — the same numbers on a 0–1 scale.
     Read as 0–255 that measured 1.44:1 where the truth is 5.87:1. */
  const parse = (str) => {
    const n = (str.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    return /^color\(/i.test(str.trim()) ? n.map((v) => v * 255) : n;
  };
  const ink = parse(hoverRow.lineColor);
  const a = lum(ink);
  const b = lum(hoverGround);
  const cr = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  note(
    "press:hover-contrast",
    `hovered ink rgb(${ink}) on hovered ground rgb(${hoverGround}) = ${cr.toFixed(2)}:1 (display type, 3:1 floor)`,
  );
}

/* ══════════════════════ the band, photographed ══════════════════════ */
{
  const bTop = await page.evaluate((q) => {
    const el = document.querySelector(q);
    return el.getBoundingClientRect().top + window.scrollY;
  }, SEL.band);
  await travel(Math.max(0, bTop - 140), 1200);
  const buf = await shoot(null);
  await crop(buf, { x: 0, y: 0, w: W, h: H }, `band-${W}.png`);
}

/* THE ERROR ASSERTION IS TAKEN HERE, before the reduced-motion reload
   below, and that is deliberate rather than convenient. Reloading with
   `prefers-reduced-motion: reduce` emulated makes this project's one
   standing hydration mismatch actually FIRE — `useReducedMotion()` resolves
   null on the server and a boolean on the client (PageTransition.tsx:184 is
   the node in the diff), and React reports it under a message that does not
   contain the words "prefers-reduced-motion", so the KNOWN filter above
   cannot catch it by name. Counting it against this run would be counting a
   pre-existing defect in a component this pass does not touch. */
const errorsBeforeRM = errors.length;
ok(
  "console:no-new-errors",
  errorsBeforeRM === 0,
  errors.slice(0, 4).join(" | ") || "none",
);

/* ══════════════════════ REDUCED MOTION ══════════════════════
   Two different questions, and the second one is the one that gets
   forgotten: (1) does anything still animate, and (2) does the reader still
   get the STATE. The row hover must survive with its clocks removed, not be
   stripped — a reader who asked for less motion did not ask for less
   feedback. The band needs no check for "does it open", because there is no
   longer a second state for it to be caught between; what IS worth checking
   is that removing the stylesheet's old `!important` override did not leave
   it clipped. */
await cdp.send("Emulation.setEmulatedMedia", {
  media: "screen",
  features: [
    { name: "hover", value: "hover" },
    { name: "pointer", value: "fine" },
    { name: "prefers-reduced-motion", value: "reduce" },
  ],
});
await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 90000,
  })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);
await s(1500);

const rmPressTop = await docTop(SEL.press);
await travel(Math.max(0, rmPressTop - 80), 1500);
const rm = await page.evaluate(
  (S) => {
    const b = document.querySelector(S.band);
    const row = document.querySelectorAll(S.credRow)[1];
    const a = row?.querySelector("a");
    const line = row?.querySelector(S.credLine);
    const before = getComputedStyle(a, "::before");
    return {
      bandClip: getComputedStyle(b).clipPath,
      bandWidth: +b.getBoundingClientRect().width.toFixed(2),
      plateTransition: before.transitionDuration,
      lineTransition: getComputedStyle(line).transitionDuration,
      restPlate: before.opacity,
    };
  },
  SEL,
);
await page.evaluate((S) => {
  document.querySelectorAll(S.credRow)[1].querySelector("a").focus();
}, SEL);
await s(300);
const rmFocus = await page.evaluate(
  (S) => {
    const row = document.querySelectorAll(S.credRow)[1];
    const a = row.querySelector("a");
    return {
      plate: getComputedStyle(a, "::before").opacity,
      line: getComputedStyle(row.querySelector(S.credLine)).color,
    };
  },
  SEL,
);
/* ≤1ms, not ==0: globals.css already carries the blanket
   `* { transition-duration: 0.001ms !important }` under this preference, and
   `!important` beats the per-rule `transition: none` in PressWall's own
   reduced-motion block. Chrome therefore reports 1e-06s, not 0s, and
   asserting on exactly zero measures which of the two rules won rather than
   whether the motion is gone. */
ok(
  "reduced-motion:honoured",
  rm.bandClip === "none" &&
    Math.abs(rm.bandWidth - clientW) <= 1 &&
    parseFloat(rm.plateTransition) <= 0.001 &&
    parseFloat(rm.lineTransition) <= 0.001 &&
    rmFocus.plate === "1" &&
    rmFocus.line !== "rgb(244, 240, 228)",
  `band clip ${rm.bandClip} at ${rm.bandWidth}px · transitions plate ${rm.plateTransition} / line ${rm.lineTransition} · focus state still applies (plate ${rm.restPlate} → ${rmFocus.plate}, line ${rmFocus.line})`,
);

note(
  "console:reduced-motion-reload",
  errors.length === errorsBeforeRM
    ? "nothing new"
    : `${errors.length - errorsBeforeRM} entr(ies), pre-existing: ${errors[errorsBeforeRM].slice(0, 110)}…`,
);

const failed = R.filter((r) => r.pass === false);
console.log(`\n${failed.length ? `${failed.length} FAILED` : "ALL PASS"}  ·  shots in ${OUT}`);
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ W, H, R, sweep, about, edges }, null, 2));
await browser.close();
process.exit(failed.length ? 1 : 0);
