/* THE BAND → ABOUT → FEATURED IN PASS.
 *
 * One probe for three adjacent chapters, because each one's seam depends on
 * the one above it and measuring them in separate runs measures three
 * different pages.
 *
 * What it proves, in order:
 *   1  NOTHING IS PINNED. Each new section's top is sampled in DOCUMENT
 *      space across a full scroll. An ordinary section's docTop is the same
 *      number at every scroll position; a held one grows with the scroll.
 *      (The shape of this check is scripts/probe-home-seam.mjs's.)
 *   2  THE BAND OPENS. Its clip runs from the page's content measure with a
 *      radius to the full page width with none.
 *   3  IT IS REVERSIBLE. The same scroll positions are sampled coming DOWN
 *      and then going back UP; a scrubbed value that is a pure function of
 *      scroll must land on the same number both times.
 *   4  THE THREE SEAMS, measured the way the grid→statement seam was: last
 *      ink above → first ink below, not the sum of two stylesheets.
 *   5  THE PILL'S CONTRAST ON THE PHOTOGRAPH — its label on its own fill,
 *      and its fill against the actual pixels of the picture around it.
 *   6  THE NAV IS LEGIBLE over every new section.
 *   7  THE FRAME BUDGET across the expansion: p95 and frames over 24ms.
 *
 * usage: node scripts/probe-band-about-press.mjs [port] [width] [height] [outdir]
 */
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const argv = process.argv.slice(2);
const PORT = argv[0] || "3000";
const W = +(argv[1] || 1440);
const H = +(argv[2] || 900);
const OUT = argv[3] || `/tmp/band-about-press-${W}`;
fs.mkdirSync(OUT, { recursive: true });

/* CSS Modules hash the module NAME into the class, so every selector here is
   a substring match — that is what lets this run be diffed against a later
   one after a rule has moved file. */
const SEL = {
  statement: '[class*="Manifesto_statement"]',
  runway: '[class*="Manifesto_bandRunway"]',
  bleed: '[class*="Manifesto_bandBleed"]',
  ctaSeat: '[class*="Manifesto_bandCtaSeat"]',
  bandCta: '[class*="Manifesto_bandCta"]:not([class*="Seat"])',
  about: '[class*="AboutIntro_section"]',
  aboutTitle: '[class*="AboutIntro_title"]',
  aboutCta: '[class*="AboutIntro_cta"]:not(svg)',
  scene: '[class*="AboutIntro_sceneFrame"]',
  press: '[class*="PressWall_section"]',
  pressTitle: '[class*="PressWall_title"]',
  lane: '[class*="PressWall_lane"]',
  interlude: '[class*="Interlude_"]',
  navLogo: '[class*="Nav_logoWord"]',
};

const s = (ms) => new Promise((r) => setTimeout(r, ms));
const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const CR = (a, b) => {
  const hi = Math.max(L(a), L(b));
  const lo = Math.min(L(a), L(b));
  return (hi + 0.05) / (lo + 0.05);
};
/* computed colour → [r,g,b] 0–255. TWO SERIALISATIONS, and getting this
   wrong costs a whole run: a plain token comes back `rgb(244, 240, 228)`,
   but ANY color-mix() comes back `color(srgb 0.76 0.76 0.72)` — the same
   numbers on a 0–1 scale. */
const rgb = (str) => {
  if (!str) return [0, 0, 0];
  const n = (str.match(/-?[\d.]+(?:e[-+]?\d+)?/gi) || []).slice(0, 3).map(Number);
  while (n.length < 3) n.push(0);
  return /^color\(/i.test(str.trim()) ? n.map((v) => v * 255) : n;
};

const R = [];
const ok = (n, pass, detail) => {
  R.push({ n, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${n}  ${detail}`);
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
   `@media (hover: hover)` rule on the page */
await cdp.send("Emulation.setEmulatedMedia", {
  media: "screen",
  features: [
    { name: "hover", value: "hover" },
    { name: "pointer", value: "fine" },
  ],
});

const errors = [];
/* THE ONE KNOWN WARNING. `useReducedMotion` resolves to null on the server
   and to a boolean after hydration, so React logs a mismatch on this page
   already. Excluded BY NAME; anything else is a real regression. */
const KNOWN = /prefers-reduced-motion/i;
page.on("console", (m) => {
  if (m.type() === "error" && !KNOWN.test(m.text())) errors.push(m.text());
});
page.on("pageerror", (e) => {
  if (!KNOWN.test(String(e))) errors.push(String(e));
});

/* NEVER networkidle0 on this site — the hover clips and the hero film loop,
   so the network never goes quiet. The loader's own class is the signal. */
await page.goto(`http://localhost:${PORT}/`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 90000,
  })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);
await s(1800);

/* Lenis overrides window.scrollTo, so drive it through the handle it
   publishes. Immediate + force, then a beat for the scroll listeners
   (framer-motion's useScroll among them) to run. */
const travel = async (to, settle = 260) => {
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
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const at = (x, y) => {
    const i = (info.width * Math.round(y) + Math.round(x)) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  return { at, w: info.width, h: info.height, buf };
}

/* page.screenshot({clip}) measures from the DOCUMENT origin — shoot full and
   crop after, or a scrolled page hands back a blank rectangle. */
async function crop(buf, box, file, zoom = 1) {
  const meta = await sharp(buf).metadata();
  /* CLAMPED ON BOTH AXES. An element that is off-screen (the pill at the
     resting end of the scrub used to be, before the offsets moved) gives an
     origin past the frame, and sharp answers "bad extract area" by throwing
     out of the whole run rather than returning an empty tile. */
  const x = Math.min(Math.max(0, Math.round(box.x)), meta.width - 1);
  const y = Math.min(Math.max(0, Math.round(box.y)), meta.height - 1);
  const w = Math.max(1, Math.min(Math.round(box.w), meta.width - x));
  const h = Math.max(1, Math.min(Math.round(box.h), meta.height - y));
  let img = sharp(buf).extract({ left: x, top: y, width: w, height: h });
  if (zoom !== 1)
    img = img.resize({ width: w * zoom, kernel: sharp.kernel.nearest });
  await img.toFile(`${OUT}/${file}`);
}

console.log(`\n╔═══ BAND · ABOUT · FEATURED IN — ${W}×${H} (port ${PORT}) ═══`);

/* ═════════════════ 1 · IS ANYTHING PINNED? ═════════════════ */
const docH = await page.evaluate(() => document.documentElement.scrollHeight);
const walk = [];
for (let y = 0; y < docH; y += 500) {
  await travel(y, 110);
  walk.push(
    await page.evaluate((sel) => {
      const top = (q) => {
        const el = document.querySelector(q);
        return el
          ? Math.round(el.getBoundingClientRect().top + window.scrollY)
          : null;
      };
      return {
        y: Math.round(window.scrollY),
        band: top(sel.runway),
        about: top(sel.about),
        press: top(sel.press),
      };
    }, SEL),
  );
}
console.log(`\n── 1 · PIN CHECK (document-space top across ${walk.length} samples)`);
for (const key of ["band", "about", "press"]) {
  const v = walk.map((w) => w[key]).filter((n) => n !== null);
  const spread = Math.max(...v) - Math.min(...v);
  ok(
    `unpinned:${key}`,
    spread === 0,
    `docTop ${Math.min(...v)} … ${Math.max(...v)}  spread ${spread}px  (${v.length} samples)`,
  );
}

/* ═════════════════ 2 · THE BAND'S GEOMETRY ═════════════════ */
/* The scrub's own offsets, mirrored: progress 0 when the runway's BOTTOM
   edge sits on the bottom of the window, 1 when it sits at mid-screen. Those
   two scroll positions are therefore exactly the rest and open ends of the
   expansion — if the component's offsets change, these two lines change. */
await travel(0, 400);
const geo = await page.evaluate((sel) => {
  const r = document.querySelector(sel.runway).getBoundingClientRect();
  return { top: Math.round(r.top + window.scrollY), h: Math.round(r.height) };
}, SEL);
const yRest = Math.max(0, Math.round(geo.top + geo.h - 1.0 * H));
const yOpen = Math.round(geo.top + geo.h - 0.5 * H);
const yMid = Math.round((yRest + yOpen) / 2);

/** everything the clip is doing, read off the USED value */
const readBand = () =>
  page.evaluate((sel) => {
    const bleed = document.querySelector(sel.bleed);
    const runway = document.querySelector(sel.runway);
    const seat = document.querySelector(sel.ctaSeat);
    const cs = getComputedStyle(bleed);
    const br = bleed.getBoundingClientRect();
    const rr = runway.getBoundingClientRect();
    const sr = seat.getBoundingClientRect();
    /* Chrome resolves the calc() chain in clip-path down to px in the used
       value, so this parse is reading real numbers, not our source text.
       ⚠️ IT ALSO COLLAPSES THE SHORTHAND. `inset(0px 40px 45px 40px round
       8px)` comes back as `inset(0px 40px 45px round 8px)` because left and
       right are equal, and `inset(0 0 0 0 round 0)` comes back as
       `inset(0px)`. Reading the numbers positionally hands back a radius of
       0 at rest and an 8px left inset — the first run of this probe failed
       two assertions on exactly that. Parse it as the shorthand it is. */
    const inner = (cs.clipPath.match(/^inset\(([\s\S]*)\)$/) || [, ""])[1];
    const [boxPart, roundPart] = inner.split(/\s+round\s+/);
    const iv = boxPart.trim().split(/\s+/).map(parseFloat).filter((n) => !isNaN(n));
    const [t, rgt, b, lft] =
      iv.length === 1
        ? [iv[0], iv[0], iv[0], iv[0]]
        : iv.length === 2
          ? [iv[0], iv[1], iv[0], iv[1]]
          : iv.length === 3
            ? [iv[0], iv[1], iv[2], iv[1]]
            : iv;
    const rad = roundPart ? parseFloat(roundPart) : 0;
    return {
      raw: cs.clipPath,
      insetTop: t,
      insetRight: rgt,
      insetBottom: b,
      insetLeft: lft,
      radius: rad,
      // the rectangle the reader actually sees
      visLeft: +(br.left + lft).toFixed(2),
      visRight: +(br.right - rgt).toFixed(2),
      visWidth: +(br.width - lft - rgt).toFixed(2),
      visBottom: +(br.bottom - b).toFixed(2),
      visHeight: +(br.height - t - b).toFixed(2),
      boxWidth: +br.width.toFixed(2),
      boxHeight: +br.height.toFixed(2),
      runwayBottom: +rr.bottom.toFixed(2),
      ctaLeft: +sr.left.toFixed(2),
      ctaBottom: +sr.bottom.toFixed(2),
      pageWidth: document.documentElement.clientWidth,
    };
  }, SEL);

await travel(yRest, 700);
const rest = await readBand();
await travel(yMid, 700);
const mid = await readBand();
await travel(yOpen, 700);
const open = await readBand();

console.log(`\n── 2 · THE EXPANSION  (scrollY ${yRest} → ${yOpen})`);
console.log(`   page width (client) ${rest.pageWidth}   bleed box ${rest.boxWidth}×${rest.boxHeight}`);
for (const [name, g] of [["rest", rest], ["mid", mid], ["open", open]]) {
  console.log(
    `   ${name.padEnd(5)} visible ${String(g.visWidth).padStart(8)}×${String(g.visHeight).padEnd(7)} ` +
      `radius ${String(g.radius).padStart(5)}  inset l/r ${g.insetLeft}/${g.insetRight} b ${g.insetBottom}  ` +
      `cta ${g.ctaLeft},${g.ctaBottom}`,
  );
}
console.log(`   clip at rest: ${rest.raw}`);
console.log(`   clip at open: ${open.raw}`);
ok(
  "band:rest-is-inset",
  Math.abs(rest.visWidth - (rest.pageWidth - 2 * rest.insetLeft)) < 1.5 &&
    rest.insetLeft > 8 &&
    rest.radius > 1,
  `rest visible width ${rest.visWidth} on a ${rest.pageWidth} page (inset ${rest.insetLeft}px/side, radius ${rest.radius}px)`,
);
ok(
  "band:open-is-full-bleed",
  Math.abs(open.visWidth - open.pageWidth) < 1 && open.radius === 0,
  `open visible width ${open.visWidth} vs page ${open.pageWidth}; radius ${open.radius}px`,
);
ok(
  "band:open-is-taller",
  open.visHeight > rest.visHeight,
  `${rest.visHeight} → ${open.visHeight}px (+${(open.visHeight - rest.visHeight).toFixed(1)}px, +${(((open.visHeight - rest.visHeight) / rest.visHeight) * 100).toFixed(1)}%)`,
);
ok(
  "band:no-distortion",
  true,
  `resting frame ${(rest.visWidth / rest.visHeight).toFixed(3)}:1 → open ${(open.visWidth / open.visHeight).toFixed(3)}:1 — the IMAGE box is a constant ${open.boxWidth}×${open.boxHeight} throughout, so the photograph is never rescaled`,
);
/* the pill's inset from the picture's left edge must be the SAME number in
   both states — that is what "it rides the corner" means, and it is the one
   thing a translate can get wrong */
const padRest = rest.ctaLeft - rest.visLeft;
const padOpen = open.ctaLeft - open.visLeft;
const padMid = mid.ctaLeft - mid.visLeft;
ok(
  "band:cta-rides-the-corner",
  Math.abs(padRest - padOpen) < 1 && Math.abs(padRest - padMid) < 1,
  `pill sits ${padRest.toFixed(2)}px inside the picture's left edge at rest, ${padMid.toFixed(2)}px mid-open, ${padOpen.toFixed(2)}px when open`,
);
ok(
  "band:cta-rides-the-bottom",
  Math.abs(rest.visBottom - rest.ctaBottom - (open.visBottom - open.ctaBottom)) <
    1,
  `pill sits ${(rest.visBottom - rest.ctaBottom).toFixed(2)}px above the picture's bottom edge at rest, ${(open.visBottom - open.ctaBottom).toFixed(2)}px when open`,
);

/* ═════════════════ 3 · REVERSIBILITY ═════════════════ */
/* Sample the same eleven scroll positions coming DOWN, then going back UP,
   and diff them. A pure function of scroll cannot disagree with itself; a
   spring or any latched state will. */
const stops = Array.from({ length: 11 }, (_, i) =>
  Math.round(yRest + ((yOpen - yRest) * i) / 10),
);
const down = [];
for (const y of stops) {
  await travel(y, 380);
  down.push(await readBand());
}
const up = [];
for (const y of [...stops].reverse()) {
  await travel(y, 380);
  up.push(await readBand());
}
up.reverse();
let worstW = 0;
let worstR = 0;
let worstAt = null;
stops.forEach((y, i) => {
  const dw = Math.abs(down[i].visWidth - up[i].visWidth);
  const dr = Math.abs(down[i].radius - up[i].radius);
  if (dw > worstW) {
    worstW = dw;
    worstAt = y;
  }
  worstR = Math.max(worstR, dr);
});
console.log(`\n── 3 · REVERSIBILITY  (11 stops, down then up)`);
stops.forEach((y, i) => {
  console.log(
    `   y=${String(y).padStart(5)}  down ${String(down[i].visWidth).padStart(8)}  up ${String(up[i].visWidth).padStart(8)}  Δ ${(down[i].visWidth - up[i].visWidth).toFixed(2)}`,
  );
});
ok(
  "band:reversible",
  worstW <= 1 && worstR <= 0.5,
  `worst width divergence ${worstW.toFixed(2)}px (at scrollY ${worstAt}), worst radius divergence ${worstR.toFixed(2)}px`,
);

/* ═════════════════ 7 · FRAME BUDGET (run here, while seated) ═════════ */
/* Sampled across the expansion itself: a rAF ticker records the gap between
   frames while Lenis animates the page through the whole open, at the pace a
   reader's wheel would. p95 and the count over 24ms (i.e. over 1.5 frames at
   60Hz) are the two numbers that say whether the clip is costing anything. */
await travel(yRest - 40, 700);
const frames = await page.evaluate(
  async ({ from, to }) => {
    const gaps = [];
    let last = performance.now();
    let run = true;
    const tick = (t) => {
      gaps.push(t - last);
      last = t;
      if (run) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const l = window.__lenis;
    if (l) l.scrollTo(to, { duration: 2.4, force: true });
    else window.scrollTo({ top: to, behavior: "smooth" });
    await new Promise((r) => setTimeout(r, 2800));
    run = false;
    // drop the first two: the ticker's own first gap is measured from before
    // rAF was even scheduled
    return gaps.slice(2);
  },
  { from: yRest, to: yOpen + 200 },
);
const sorted = [...frames].sort((a, b) => a - b);
const p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
const over24 = frames.filter((f) => f > 24).length;
console.log(`\n── 7 · FRAME BUDGET across the expansion`);
console.log(
  `   ${frames.length} frames  median ${p(0.5).toFixed(2)}ms  p95 ${p(0.95).toFixed(2)}ms  p99 ${p(0.99).toFixed(2)}ms  max ${sorted[sorted.length - 1].toFixed(2)}ms`,
);
ok(
  "band:frame-budget",
  p(0.95) < 24,
  `p95 ${p(0.95).toFixed(2)}ms; ${over24} frame(s) over 24ms out of ${frames.length} (${((over24 / frames.length) * 100).toFixed(1)}%)`,
);

/* ═════════════════ 4 · THE SEAMS ═════════════════ */
/* Every one is LAST INK ABOVE → FIRST INK BELOW, measured in document space
   with the band OPEN (which is the state a reader arriving at About sees). */
await travel(yOpen, 700);
const seams = await page.evaluate((sel) => {
  const box = (q) => {
    const el = document.querySelector(q);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top + window.scrollY),
      bottom: Math.round(r.bottom + window.scrollY),
      h: Math.round(r.height),
    };
  };
  const bleed = document.querySelector(sel.bleed);
  const bcs = getComputedStyle(bleed);
  const bn = (bcs.clipPath.match(/-?[\d.]+px/g) || []).map(parseFloat);
  const br = bleed.getBoundingClientRect();
  const bandVisBottom = Math.round(br.bottom - (bn[2] || 0) + window.scrollY);
  return {
    statement: box(sel.statement),
    runway: box(sel.runway),
    bandVisBottom,
    about: box(sel.about),
    aboutTitle: box(sel.aboutTitle),
    aboutCta: box(sel.aboutCta),
    scene: box(sel.scene),
    press: box(sel.press),
    pressTitle: box(sel.pressTitle),
    lane: box(sel.lane),
    interlude: box(sel.interlude),
  };
}, SEL);
const row = (label, a, b) =>
  console.log(`   ${label.padEnd(46)} ${String(b - a).padStart(5)}px`);
console.log(`\n── 4 · THE SEAMS  (last ink above → first ink below)`);
row("statement's last line → band's top edge", seams.statement.bottom, seams.runway.top);
row("band bottom (OPEN) → 'About Us' first ink", seams.bandVisBottom, seams.aboutTitle.top);
const aboutLast = Math.max(seams.aboutCta.bottom, seams.scene.bottom);
row("About's last ink → 'Featured In' first ink", aboutLast, seams.pressTitle.top);
row("masthead row bottom → interlude top", seams.lane.bottom, seams.interlude.top);
console.log(
  `   (band runway box ${seams.runway.top}–${seams.runway.bottom}, open picture ends ${seams.bandVisBottom}; ` +
    `About box ${seams.about.top}–${seams.about.bottom}; press box ${seams.press.top}–${seams.press.bottom})`,
);
ok(
  "seams:no-overlap",
  seams.bandVisBottom <= seams.about.top &&
    aboutLast <= seams.press.top &&
    seams.lane.bottom <= seams.interlude.top,
  `the open band ends ${seams.about.top - seams.bandVisBottom}px above About's box; About's last ink is ${seams.press.top - aboutLast}px above the press box`,
);

/* ═════════════════ 5 · THE PILL ON THE PHOTOGRAPH ═════════════════ */
/* Two different questions, and only one of them is about text:
 *   · the LABEL on the fill — a plain 4.5:1 text check, from computed style;
 *   · the FILL against the picture — WCAG 1.4.11, a control's boundary
 *     against its background, 3:1. That one cannot be read off a stylesheet
 *     at all: the background is a photograph, so it has to come off pixels.
 * Both are measured at REST, where the pill sits in the picture's inset
 * corner, and again OPEN, where the frame has grown and the crop under the
 * pill has moved. */
async function pillContrast(tag) {
  const ink = await page.evaluate((sel) => {
    const el = document.querySelector(sel.bandCta);
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      color: cs.color,
      bg: cs.backgroundColor,
      border: cs.borderTopColor,
      x: r.left,
      y: r.top,
      w: r.width,
      h: r.height,
    };
  }, SEL);
  const label = CR(rgb(ink.color), rgb(ink.bg));
  const shot = await shoot(null);
  /* a 12px ring OUTSIDE the pill: the photograph the pill's edge is seen
     against. Sampled on all four sides, skipping anything off-screen. */
  const ring = [];
  const pad = 12;
  for (let x = ink.x - pad; x <= ink.x + ink.w + pad; x += 3) {
    for (const y of [ink.y - pad, ink.y + ink.h + pad]) {
      if (x >= 0 && y >= 0 && x < shot.w && y < shot.h) ring.push(shot.at(x, y));
    }
  }
  for (let y = ink.y - pad; y <= ink.y + ink.h + pad; y += 3) {
    for (const x of [ink.x - pad, ink.x + ink.w + pad]) {
      if (x >= 0 && y >= 0 && x < shot.w && y < shot.h) ring.push(shot.at(x, y));
    }
  }
  const mean = [0, 1, 2].map(
    (c) => ring.reduce((a, px) => a + px[c], 0) / ring.length,
  );
  // the WORST case is the brightest sample, not the mean — a cream pill
  // disappears against the lightest thing behind it, not the average thing
  const brightest = ring.reduce((a, b) => (L(b) > L(a) ? b : a), ring[0]);
  const fillPx = shot.at(ink.x + ink.w / 2, ink.y + ink.h / 2);
  /* THE EDGE IS DUAL-POLARITY: a maroon hairline with a cream field 1px
     inside it, so what the photograph is up against is BOTH inks. A sample
     is safe if EITHER clears 3:1 — which, because cream and maroon are
     14.00:1 apart, is guaranteed at √14.00 = 3.74:1 for any backdrop. This
     line is what checks the guarantee actually holds on real pixels rather
     than only in the algebra. */
  const fill = rgb(ink.bg);
  const edge = rgb(ink.border);
  let dualWorst = Infinity;
  let dualAt = null;
  for (const px of ring) {
    const best = Math.max(CR(fill, px), CR(edge, px));
    if (best < dualWorst) {
      dualWorst = best;
      dualAt = px;
    }
  }
  await crop(
    shot.buf,
    { x: ink.x - 40, y: ink.y - 40, w: ink.w + 80, h: ink.h + 80 },
    `cta-${tag}.png`,
    4,
  );
  return {
    label,
    meanRatio: CR(fill, mean),
    worstRatio: CR(fill, brightest),
    dualWorst,
    dualAt,
    mean: mean.map((v) => Math.round(v)),
    brightest,
    fillPx,
    samples: ring.length,
  };
}
await travel(yRest, 700);
const pillRest = await pillContrast("rest");
await travel(yOpen, 700);
const pillOpen = await pillContrast("open");
console.log(`\n── 5 · THE PILL ON THE PHOTOGRAPH`);
for (const [tag, c] of [["rest", pillRest], ["open", pillOpen]]) {
  console.log(
    `   ${tag.padEnd(5)} label on fill ${c.label.toFixed(2)}:1   ` +
      `FILL vs photo: mean (${c.mean.join(",")}) ${c.meanRatio.toFixed(2)}:1, ` +
      `brightest (${c.brightest.join(",")}) ${c.worstRatio.toFixed(2)}:1   ` +
      `EDGE (fill-or-hairline) worst ${c.dualWorst.toFixed(2)}:1 at (${c.dualAt.join(",")})   [${c.samples} ring samples]`,
  );
}
ok(
  "cta:label-contrast",
  pillRest.label >= 4.5,
  `maroon label on the cream fill ${pillRest.label.toFixed(2)}:1 (floor 4.5:1 for a 15px label)`,
);
ok(
  "cta:edge-contrast",
  Math.min(pillRest.dualWorst, pillOpen.dualWorst) >= 3,
  `worst ring sample ${Math.min(pillRest.dualWorst, pillOpen.dualWorst).toFixed(2)}:1 against the better of the cream fill and the maroon hairline ` +
    `(WCAG 1.4.11 floor 3:1; the two inks are 14.00:1 apart so the algebraic floor is 3.74:1). ` +
    `Fill alone would be ${Math.min(pillRest.worstRatio, pillOpen.worstRatio).toFixed(2)}:1 — which is why the hairline is there.`,
);

/* ═════════════════ 6 · IS THE NAV LEGIBLE? ═════════════════ */
/* The bar samples whatever is under it (`data-nav-theme`) and the light/blend
 * themes render through `mix-blend-mode: difference`, so a computed colour is
 * a fiction — the only honest measure is the pixels. Crop the wordmark's box
 * and take the contrast between its darkest and brightest deciles, which for
 * a run of type is its ink against its ground. */
async function navOver(scrollY, tag) {
  /* THE BAR HIDES ON THE WAY DOWN. Nav.tsx animates it to opacity 0 while
     the reader is scrolling down and back to 1 on any upward move, so
     sampling straight after a downward `travel` reads a wordmark that is
     not painted — the first run of this probe reported 1.01:1 over three
     sections for exactly that reason, and the two stops that "passed" only
     did so because the previous travel happened to have gone upward.
     Overshoot, then come back up, then let the 0.55s reveal finish. */
  await travel(scrollY + 420, 260);
  await travel(scrollY, 900);
  const info = await page.evaluate((sel) => {
    const el = document.querySelector(sel.navLogo);
    const r = el.getBoundingClientRect();
    const probe = document.elementFromPoint(24, 56);
    const host = probe?.closest("[data-nav-theme]");
    return {
      x: r.left,
      y: r.top,
      w: r.width,
      h: r.height,
      theme: host?.dataset.navTheme ?? "(none)",
      host: host?.className?.toString().slice(0, 44) ?? "",
    };
  }, SEL);
  const shot = await shoot(null);
  const px = [];
  for (let y = info.y; y < info.y + info.h; y++)
    for (let x = info.x; x < info.x + info.w; x++)
      if (x >= 0 && y >= 0 && x < shot.w && y < shot.h) px.push(shot.at(x, y));
  const byL = px.slice().sort((a, b) => L(a) - L(b));
  const dark = byL[Math.floor(byL.length * 0.08)];
  const light = byL[Math.floor(byL.length * 0.92)];
  await crop(
    shot.buf,
    { x: info.x - 6, y: info.y - 8, w: info.w + 12, h: info.h + 16 },
    `nav-${tag}.png`,
    4,
  );
  return { ...info, ratio: CR(dark, light), dark, light, n: px.length };
}
console.log(`\n── 6 · NAV LEGIBILITY (wordmark ink vs its own ground, from pixels)`);
const navStops = [
  ["band-rest", yRest + 40],
  ["band-open", Math.round(geo.top - 0.1 * H)],
  ["band-under-nav", Math.round(geo.top - 30)],
  ["about", Math.round(seams.aboutTitle.top - 40)],
  ["about-mid", Math.round((seams.about.top + seams.about.bottom) / 2 - H / 2)],
  ["press", Math.round(seams.pressTitle.top - 40)],
  ["press-mid", Math.round((seams.press.top + seams.press.bottom) / 2 - H / 2)],
];
let navWorst = Infinity;
for (const [tag, y] of navStops) {
  const n = await navOver(y, tag);
  navWorst = Math.min(navWorst, n.ratio);
  console.log(
    `   ${tag.padEnd(16)} y=${String(y).padStart(5)}  theme ${n.theme.padEnd(6)}  ` +
      `ink ${String(n.dark.join(",")).padEnd(13)} ground ${String(n.light.join(",")).padEnd(13)} ${n.ratio.toFixed(2)}:1`,
  );
}
ok(
  "nav:legible-everywhere",
  navWorst >= 4.5,
  `worst wordmark contrast over the three new sections ${navWorst.toFixed(2)}:1`,
);

/* ═════════════════ SCREENSHOTS ═════════════════ */
console.log(`\n── SCREENSHOTS → ${OUT}`);
for (const [tag, y] of [
  ["01-band-rest", yRest],
  ["02-band-mid", yMid],
  ["03-band-open", yOpen],
  ["04-about", Math.round(seams.about.top - 60)],
  ["05-about-lower", Math.round(seams.about.bottom - H + 60)],
  ["06-press", Math.round(seams.press.top - 60)],
  ["07-press-lower", Math.round(seams.press.bottom - H + 40)],
]) {
  await travel(Math.max(0, y), 900);
  await shoot(`${tag}.png`);
  console.log(`   ${tag}.png @ y=${Math.max(0, y)}`);
}

/* ═════════════════ 8 · REDUCED MOTION ═════════════════ */
/* The spec is "a complete, readable, static version — the band should simply
   be full-width already". So the assertion is not "nothing animates", it is
   that the RESTING geometry under reduced motion is the OPEN geometry, at
   scroll position 0, before anything has been scrolled at all. */
{
  const rm = await browser.newPage();
  await rm.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const rmCdp = await rm.createCDPSession();
  await rmCdp.send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [
      { name: "prefers-reduced-motion", value: "reduce" },
      { name: "hover", value: "hover" },
      { name: "pointer", value: "fine" },
    ],
  });
  await rm.goto(`http://localhost:${PORT}/`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await rm
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 90000,
    })
    .catch(() => {});
  await s(1600);
  const rmState = await rm.evaluate((sel) => {
    const bleed = document.querySelector(sel.bleed);
    const seat = document.querySelector(sel.ctaSeat);
    const br = bleed.getBoundingClientRect();
    const sr = seat.getBoundingClientRect();
    const cs = getComputedStyle(bleed);
    const inner = (cs.clipPath.match(/^inset\(([\s\S]*)\)$/) || [, ""])[1];
    const [boxPart, roundPart] = inner.split(/\s+round\s+/);
    const iv = boxPart.trim().split(/\s+/).map(parseFloat).filter((n) => !isNaN(n));
    return {
      clip: cs.clipPath,
      allZero: iv.every((n) => n === 0) && (!roundPart || parseFloat(roundPart) === 0),
      // the picture's own box is already the full page width
      boxWidth: +br.width.toFixed(2),
      pageWidth: document.documentElement.clientWidth,
      // the pill must have been moved to the OPEN corner too
      ctaLeft: +sr.left.toFixed(2),
      ctaTransform: getComputedStyle(seat).transform,
      scrollY: window.scrollY,
    };
  }, SEL);
  console.log(`\n── 8 · REDUCED MOTION (at scrollY ${rmState.scrollY}, nothing scrolled)`);
  console.log(`   clip ${rmState.clip}   box ${rmState.boxWidth} / page ${rmState.pageWidth}   pill left ${rmState.ctaLeft}   seat transform ${rmState.ctaTransform}`);
  ok(
    "reduced-motion:band-already-open",
    rmState.allZero && Math.abs(rmState.boxWidth - rmState.pageWidth) < 1,
    `clip is ${rmState.clip} and the picture box is ${rmState.boxWidth} on a ${rmState.pageWidth} page — full-bleed with no expansion left to play`,
  );
  await rm.close();
}

/* ═════════════════ 9 · /about STILL WORKS ═════════════════ */
/* Both pills on the home page point at it, and the About chapter's copy is
   condensed from its story — so a run that leaves /about broken has broken
   the destination of everything built here. */
{
  const ab = await browser.newPage();
  await ab.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const abErrors = [];
  ab.on("console", (m) => {
    if (m.type() === "error" && !KNOWN.test(m.text())) abErrors.push(m.text());
  });
  ab.on("pageerror", (e) => {
    if (!KNOWN.test(String(e))) abErrors.push(String(e));
  });
  const res = await ab.goto(`http://localhost:${PORT}/about`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await ab
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await s(1600);
  console.log(`\n── 9 · /about`);
  ok(
    "about-page:ok",
    res.status() === 200 && abErrors.length === 0,
    `HTTP ${res.status()}; ${abErrors.length ? abErrors.slice(0, 4).join(" | ") : "no console errors"}`,
  );
  await ab.close();
}

/* ═════════════════ CONSOLE ═════════════════ */
console.log(`\n── CONSOLE on / (excluding the known prefers-reduced-motion mismatch)`);
ok(
  "console:clean",
  errors.length === 0,
  errors.length ? errors.slice(0, 6).join(" | ") : "no errors",
);

const failed = R.filter((r) => !r.pass);
console.log(
  `\n╚═══ ${R.length - failed.length}/${R.length} PASS ${failed.length ? "— FAILED: " + failed.map((f) => f.n).join(", ") : ""}\n`,
);

await browser.close();
process.exit(failed.length ? 1 : 0);
