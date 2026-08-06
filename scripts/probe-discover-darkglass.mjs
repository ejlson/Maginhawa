/* THE DARK-GLASS CARD — the two changes of 2026-08-04 (second pass), each
   with its evidence read off the RENDERED PIXELS rather than off the
   arithmetic in the stylesheet.

     SIZE      all eight cards still render at one identical width and
               height, full-bleed, ~14px radius, with the soft shadow.
     BARE      the venue mark has NO ground of any kind: no background
               colour, no background image, no border, no backdrop-filter,
               no box-shadow, on the mark OR on the span that carries its
               shadow. The pill this pass removes would fail every one.
     MARK      what the bare mark actually measures against the picture
               under it. Solved exactly rather than estimated: the card is
               rendered twice, once with the mark filled cream and once
               filled black, which recovers the mask's per-pixel alpha and
               with it the true ground (photograph + wash + drop-shadow)
               beneath every glyph. The number reported is the contrast of
               cream against the BRIGHTEST ground pixel lying within 2px of
               a solid glyph pixel — i.e. the worst thing the mark's edge
               has to survive. Rule: 3:1, the WCAG 1.4.11 graphical-object
               bar. A logotype carries no text-contrast requirement at all
               (1.4.3 exempts it), so 4.5:1 would be the wrong bar to claim.
     PANEL     the venue name, the metadata row and the control, each
               measured against the panel's real composited ground inside
               that element's own band — sampled with the type hidden and
               the gradient and backdrop-filter left running, so the ground
               is the one the type actually sits on. Rule: 4.5:1 for all
               three (see PANEL RULES below).
     CONTROL   the label against its own fill, and the fill and its hairline
               against the panel around it (1.4.11's 3:1 for the boundary).
     SEATED    every plate rests on its seat, opaque and untransformed.
     HOVER     the film still wipes open from the cursor AND the plate's
               rectangle does not move while it does — the layoutId
               re-measure bug this card is on record for.
     4UP       the panel is still 35–42% of the card at the 981 four-up.
     SHOTS     1440 / 981 / 390, plus a 4x zoom on one mark and one panel.

   PANEL RULES, stated per element because the brief asks which was
   applied: the venue name is 24.7px at 1440 and would qualify for the
   3:1 large-text allowance, but the same name drops to its 16px clamp
   floor on the 981 four-up where it would not — so it is held to 4.5:1
   everywhere and the allowance is never claimed. Metadata and control
   label are 12–13px: 4.5:1 outright.

   HARNESS NOTES, all of them learned the hard way and none of them
   negotiable: never networkidle0 (the hero clip loops and the page never
   idles) — domcontentloaded plus the is-loading class; Lenis keeps easing
   for seconds after scrollTo; walk down in ~500px steps so every
   IntersectionObserver on the way arms; headless reports (hover: none) so
   hover is emulated through CDP (puppeteer's own emulateMediaFeatures
   rejects `hover`); page.screenshot clips measure from the DOCUMENT
   origin, so shoot full and crop after; hover needs TWO mouse moves, one
   outside and one inside.

   The assembly intro that used to run in front of this grid was removed
   along with `data-assembly-armed` / `data-assembly-step`, so the waits
   that rode it out are gone — the grid only has to be scrolled into view.

   usage: node scripts/probe-discover-darkglass.mjs [port] [outdir] */
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "51365";
const OUT = process.argv[3] || "/tmp/discover-darkglass";
const s = (ms) => new Promise((r) => setTimeout(r, ms));
const GRID = 'ul[aria-label="Our restaurants"]';
fs.mkdirSync(OUT, { recursive: true });

/* ---- colour maths, WCAG 2.x ---- */
const lin = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const CR = (a, b) => {
  const hi = Math.max(L(a), L(b));
  const lo = Math.min(L(a), L(b));
  return (hi + 0.05) / (lo + 0.05);
};
/* computed colour → [r,g,b] 0–255.
   TWO SERIALISATIONS, and getting this wrong cost a whole run: a plain
   token comes back as `rgb(244, 240, 228)`, but ANY color-mix() comes back
   as `color(srgb 0.7647 0.7647 0.7215)` — the same numbers on a 0–1 scale.
   Read naively, the metadata's colour parsed as rgb(0,0,0) and every
   contrast in the table was a fiction. The stylesheet uses color-mix for
   the metadata ink, the meta hairline and the control's border, so this
   affects three of the five numbers this probe exists to produce. */
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
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

/* HEADLESS REPORTS (hover: none). Straight to CDP: puppeteer's own
   emulateMediaFeatures keeps an allowlist that rejects `hover` outright,
   but the protocol underneath accepts it. */
async function open(w, h, extraFeatures = []) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [
      { name: "hover", value: "hover" },
      { name: "pointer", value: "fine" },
      ...extraFeatures,
    ],
  });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://localhost:${PORT}/`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 30000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await s(1800);
  return { page, errors };
}

async function walk(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await s(140);
  }
  await s(1200);
}

/* put the grid on screen — Lenis keeps easing after scrollTo returns */
async function seatGrid(page) {
  const y = await page.evaluate((sel) => {
    const g = document.querySelector(sel);
    return g ? Math.round(g.getBoundingClientRect().top + window.scrollY) : null;
  }, GRID);
  if (y == null) return false;
  await page.evaluate((v) => window.scrollTo(0, v - 90), y);
  await s(4000);
  return true;
}

/* a screenshot decoded to a raw RGBA reader */
async function shoot(page, file) {
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

/* brightest pixel in a box. INSET defaults to 3px on every side: the card
   has a 14px radius and the panel's BOUNDING BOX corners fall outside it
   onto the page's own cream ground — an early version of this probe
   reported L 0.75 on every card including Bunso's solid ink field, which
   was the page showing through the corners, not the panel. Boxes that
   reach the card's edge are clipped by the caller instead. */
function brightest(img, b, inset = 3) {
  let max = -1;
  let px = null;
  for (let y = Math.ceil(b.y) + inset; y < b.y + b.h - inset; y++) {
    for (let x = Math.ceil(b.x) + inset; x < b.x + b.w - inset; x++) {
      if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
      const p = img.at(x, y);
      const l = L(p);
      if (l > max) {
        max = l;
        px = p;
      }
    }
  }
  return { L: max, px };
}

/* ═══════════════════════════════════════════════════════════════════════
   1440 — the whole argument
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n=== 1440x900 ===");
const { page, errors } = await open(1440, 900);

/* ── the grid walked into view the way a reader reaches it ──────────── */
await walk(page);
await seatGrid(page);
await s(500);

const seats = await page.evaluate((sel) => {
  return [...document.querySelectorAll(`${sel} [data-plate]`)].map((p) => {
    const r = p.getBoundingClientRect();
    const cs = getComputedStyle(p);
    return {
      i: Number(p.dataset.plate),
      w: +r.width.toFixed(2),
      h: +r.height.toFixed(2),
      opacity: +cs.opacity,
      transform: cs.transform,
    };
  });
}, GRID);
const s0 = seats[0];
ok(
  "SIZE eight cards, one size",
  seats.length === 8 &&
    seats.every((x) => Math.abs(x.w - s0.w) < 0.5 && Math.abs(x.h - s0.h) < 0.5),
  `n=${seats.length}  ${s0.w}x${s0.h}  heights=[${seats.map((x) => x.h).join(", ")}]`,
);
ok(
  "SEATED every plate on its seat",
  seats.every(
    (x) =>
      x.opacity === 1 &&
      (x.transform === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(x.transform)),
  ),
  `opacity=[${[...new Set(seats.map((x) => x.opacity))].join(",")}] transform=${[...new Set(seats.map((x) => x.transform))].join(" | ")}`,
);

/* ── BARE: the mark has no ground of any kind ───────────────────────── */
const bare = await page.evaluate((sel) => {
  const boxish = (el) => {
    const c = getComputedStyle(el);
    return {
      bg: c.backgroundColor,
      bgImage: c.backgroundImage,
      border: c.borderTopWidth + " " + c.borderTopStyle,
      backdrop: c.backdropFilter || c.webkitBackdropFilter || "none",
      shadow: c.boxShadow,
      radius: c.borderTopLeftRadius,
      filter: c.filter,
    };
  };
  return [...document.querySelectorAll(`${sel} > li`)].map((c) => {
    const slot = c.querySelector('[class*="cardLogo"]:not([class*="Mark"])');
    const mark = c.querySelector('[class*="cardLogoMark"]');
    const cr = c.querySelector("[data-plate]").getBoundingClientRect();
    const mr = mark?.getBoundingClientRect();
    return {
      name: c.querySelector("h3")?.textContent?.trim(),
      slot: slot ? boxish(slot) : null,
      mark: mark ? boxish(mark) : null,
      markInk: mark ? getComputedStyle(mark).backgroundColor : null,
      markMask: mark
        ? (getComputedStyle(mark).maskImage || "none").slice(0, 42)
        : null,
      // top-LEFT, and inside the card
      insetL: mr ? Math.round(mr.left - cr.left) : null,
      insetT: mr ? Math.round(mr.top - cr.top) : null,
    };
  });
}, GRID);

/* "no box" has to be asserted on the two elements SEPARATELY, because the
   mark's own background-color is not a box — it is the mark's INK, and it
   only ever paints where the mask is opaque. A first version of this check
   demanded a transparent background on both and failed all eight cards on
   the ink itself. What actually has to be absent is a painted ground: no
   background IMAGE, no border, no backdrop-filter, no box-shadow, no
   radius, on either element, plus a transparent background on the outer
   span, which is the one a chip would have lived on. */
const noGround = (o, allowBg) =>
  o &&
  (allowBg || /rgba\(0, 0, 0, 0\)|transparent/.test(o.bg)) &&
  o.bgImage === "none" &&
  /^0px/.test(o.border) &&
  o.backdrop === "none" &&
  o.shadow === "none" &&
  /^0(px)?$/.test(o.radius);
const bareOK = (b) => noGround(b.slot, false) && noGround(b.mark, true);
ok(
  "BARE no chip, plate or ground behind any mark",
  bare.every(bareOK),
  bare.every(bareOK)
    ? `slot bg=${bare[0].slot.bg} radius=${bare[0].slot.radius} border=${bare[0].slot.border} backdrop=${bare[0].slot.backdrop} shadow=${bare[0].slot.shadow}; mark ink=${bare[0].mark.bg} radius=${bare[0].mark.radius}`
    : bare
        .filter((b) => !bareOK(b))
        .map((b) => `${b.name} SLOT${JSON.stringify(b.slot)} MARK${JSON.stringify(b.mark)}`)
        .join("  "),
);
ok(
  "BARE the mark is a cream mask, top-left, on all eight",
  bare.every(
    (b) =>
      b.markInk === "rgb(244, 240, 228)" &&
      /url\(/.test(b.markMask || "") &&
      b.insetL >= 8 &&
      b.insetL <= 22 &&
      b.insetT >= 8 &&
      b.insetT <= 22,
  ),
  `ink=${[...new Set(bare.map((b) => b.markInk))].join("|")}  inset=[${[...new Set(bare.map((b) => `${b.insetL},${b.insetT}`))].join(" ")}]`,
);
ok(
  "BARE the shadow stack is on the PARENT of the masked span",
  bare.every(
    (b) =>
      /drop-shadow/.test(b.slot?.filter || "") &&
      !/drop-shadow/.test(b.mark?.filter || ""),
  ),
  `slot.filter=${bare[0].slot?.filter?.slice(0, 120)}…  mark.filter=${bare[0].mark?.filter}`,
);

/* ── MARK: the true ground under every glyph, solved exactly ──────────
   Two renders of the same frame differing ONLY in the mask's fill colour.
   drop-shadow() reads the alpha channel and nothing else, so the shadow is
   byte-identical between them; the ground G and the mask coverage α are
   then recoverable per pixel from
        P_cream = α·cream + (1−α)·G
        P_black = α·0     + (1−α)·G
   giving α = (P_cream − P_black)/cream and G = P_black/(1−α).
   This is why the number below is a measurement and not a model: nothing
   about the shadow's blur profile has to be guessed at. */
const markBoxes = await page.evaluate((sel) => {
  return [...document.querySelectorAll(`${sel} > li`)].map((c) => {
    const m = c.querySelector('[class*="cardLogoMark"]');
    if (!m) return null;
    const r = m.getBoundingClientRect();
    // widen by 12px so the shadow's whole halo is inside the sample
    return {
      name: c.querySelector("h3")?.textContent?.trim(),
      x: r.x - 12,
      y: r.y - 12,
      w: r.width + 24,
      h: r.height + 24,
    };
  });
}, GRID);

const imgCream = await shoot(page, "mark-fill-cream.png");
await page.addStyleTag({
  content: `${GRID} [class*="cardLogoMark"] { background-color: #000 !important; }`,
});
await s(350);
const imgBlack = await shoot(page, "mark-fill-black.png");
// put it back before anything else is measured or shot
await page.evaluate(() => {
  const t = [...document.querySelectorAll("style")].pop();
  if (t && /cardLogoMark/.test(t.textContent)) t.remove();
});
await s(300);

const CREAM = [244, 240, 228];
const markRows = [];
for (const b of markBoxes) {
  if (!b) continue;
  const W = Math.round(b.w);
  const H = Math.round(b.h);
  const alpha = new Float32Array(W * H);
  const ground = new Array(W * H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = b.x + i;
      const y = b.y + j;
      const pc = imgCream.at(x, y);
      const pb = imgBlack.at(x, y);
      // solve on the green channel (the heaviest in the luminance sum and
      // the least noisy under subpixel AA), then reconstruct the ground
      const a = Math.min(1, Math.max(0, (pc[1] - pb[1]) / CREAM[1]));
      alpha[j * W + i] = a;
      ground[j * W + i] =
        a > 0.98 ? null : pb.map((v) => Math.min(255, v / (1 - a)));
    }
  }
  /* worst GROUND pixel within 2px of a MARK pixel.
     SOLID IS 0.8, NOT 0.99, and the difference is not slack. Five of the
     eight marks are scripts or thin serifs, drawn from PNGs several hundred
     pixels wide into a 32px slot; after that downsample a stroke can be
     two partial pixels with no fully-opaque core at all. Held at 0.99 this
     probe found THREE solid pixels on Bintang and measured the mark's
     legibility off them. 0.8 is the coverage at which a cream pixel is
     reading as cream; 0.08 is the coverage below which a pixel is reading
     as ground. The band between the two is excluded from both. */
  let worst = -1;
  let worstPx = null;
  let solid = 0;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      if (alpha[j * W + i] < 0.8) continue;
      solid++;
      for (let dj = -2; dj <= 2; dj++) {
        for (let di = -2; di <= 2; di++) {
          const jj = j + dj;
          const ii = i + di;
          if (jj < 0 || ii < 0 || jj >= H || ii >= W) continue;
          if (alpha[jj * W + ii] > 0.08) continue;
          const g = ground[jj * W + ii];
          if (!g) continue;
          const l = L(g);
          if (l > worst) {
            worst = l;
            worstPx = g.map(Math.round);
          }
        }
      }
    }
  }
  /* THE SECOND, INDEPENDENT PROOF THAT THERE IS NO CHIP, read off pixels
     rather than off computed style: across the mark's own box, at every
     pixel the mask leaves empty, the recovered ground still VARIES — the
     photograph is carrying on through the slot. A pill would flatten that
     range to the chip's own colour. (Bunso is exempt and says so: its card
     is a solid ink field, so a flat range there is the picture, not a
     chip.) */
  let gMin = 9;
  let gMax = -9;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      if (alpha[j * W + i] > 0.08) continue;
      const g = ground[j * W + i];
      if (!g) continue;
      const l = L(g);
      if (l < gMin) gMin = l;
      if (l > gMax) gMax = l;
    }
  markRows.push({
    venue: b.name,
    glyphPx: solid,
    worstAdjacentL: worst < 0 ? null : +worst.toFixed(4),
    worstAdjacentPx: worstPx ? worstPx.join(",") : null,
    contrast: worst < 0 ? null : +CR(CREAM, worstPx).toFixed(2),
    groundRangeL: +(gMax - gMin).toFixed(4),
  });
}
console.table(markRows);
const markMin = Math.min(...markRows.map((r) => r.contrast ?? 99));
/* the glyph floor is only a sanity check that the mask RENDERED — it is
   deliberately low, because it counts pixels at >=0.8 coverage and the
   thin scripts in this set genuinely have very few. Bintang's is 24 out of
   an 80x32 slot; that is the wordmark being a hairline script at 32px, not
   the probe missing it, and it is the same mask at the same size the pill
   era shipped. Anything under about 12 would mean the mask failed to load
   and the "contrast" beside it would be meaningless. */
ok(
  "MARK cream survives every photograph in the set (3:1, WCAG 1.4.11)",
  markRows.every((r) => r.glyphPx >= 12 && (r.contrast ?? 0) >= 3),
  `worst = ${markMin.toFixed(2)}:1 on ${markRows.find((r) => r.contrast === markMin)?.venue}; ` +
    markRows.map((r) => `${r.venue} ${r.contrast}`).join(" · ") +
    `; glyph px = ${markRows.map((r) => r.glyphPx).join("/")}`,
);
ok(
  "BARE the photograph shows through the mark's own box (no chip, in pixels)",
  markRows.filter((r) => r.venue !== "Bunso").every((r) => r.groundRangeL > 0.02),
  markRows.map((r) => `${r.venue} ${r.groundRangeL}`).join(" · ") +
    "  (Bunso exempt: solid ink field, nothing to vary)",
);

/* ── PANEL: the type's real ground ──────────────────────────────────── */
const panelGeom = await page.evaluate((sel) => {
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };
  return [...document.querySelectorAll(`${sel} > li`)].map((c) => {
    const card = c.querySelector("[data-plate]");
    const glass = c.querySelector('[class*="glass"]');
    const name = c.querySelector("h3");
    // metaCLIP, never metaRow: the row is dragged 17px left by the
    // wrap-safe gutter trick and its rect hangs outside the card
    const meta = c.querySelector('[class*="metaClip"]');
    const act = c.querySelector('[class*="panelAction"]');
    const cs = act ? getComputedStyle(act) : null;
    return {
      venue: name?.textContent?.trim(),
      card: box(card),
      glass: box(glass),
      nameBox: box(name),
      nameColor: getComputedStyle(name).color,
      nameSize: parseFloat(getComputedStyle(name).fontSize),
      metaBox: meta ? box(meta) : null,
      metaColor: meta
        ? getComputedStyle(c.querySelector('[class*="metaCell"]')).color
        : null,
      metaSize: meta
        ? parseFloat(
            getComputedStyle(c.querySelector('[class*="metaCell"]')).fontSize,
          )
        : null,
      actBox: act ? box(act) : null,
      actLabel: act?.textContent?.trim(),
      actColor: cs?.color,
      actFill: cs?.backgroundColor,
      actBorder: cs?.borderTopColor,
      actSize: cs ? parseFloat(cs.fontSize) : null,
      pctOfCard: Math.round(
        (glass.getBoundingClientRect().height /
          card.getBoundingClientRect().height) *
          100,
      ),
    };
  });
}, GRID);

// hide the type, keep the gradient AND the backdrop-filter running
await page.addStyleTag({
  content: `${GRID} [class*="glass"] > * { visibility: hidden !important; }`,
});
await s(400);
const imgGround = await shoot(page, "panel-ground.png");
await page.evaluate(() => {
  const t = [...document.querySelectorAll("style")].pop();
  if (t && /glass/.test(t.textContent)) t.remove();
});
await s(300);

const panelRows = [];
for (const g of panelGeom) {
  // clip every sample to the card's interior — 16px in from the left and
  // right edges, clear of the 14px corner radius
  const clip = (b) => {
    if (!b) return null;
    const x0 = Math.max(b.x, g.card.x + 16);
    const x1 = Math.min(b.x + b.w, g.card.x + g.card.w - 16);
    return { x: x0, y: b.y, w: Math.max(1, x1 - x0), h: b.h };
  };
  const nameG = brightest(imgGround, clip(g.nameBox), 1);
  const metaG = g.metaBox ? brightest(imgGround, clip(g.metaBox), 1) : null;
  // the ground the CONTROL sits against is the panel just outside the pill
  const actRing = g.actBox
    ? brightest(
        imgGround,
        clip({
          x: g.actBox.x - 4,
          y: g.actBox.y - 4,
          w: g.actBox.w + 8,
          h: g.actBox.h + 8,
        }),
        1,
      )
    : null;
  const whole = brightest(imgGround, clip(g.glass), 1);
  panelRows.push({
    venue: g.venue,
    "panel%": g.pctOfCard,
    lightestL: +whole.L.toFixed(4),
    name: +CR(rgb(g.nameColor), nameG.px).toFixed(2),
    nameSz: +g.nameSize.toFixed(1),
    meta: metaG ? +CR(rgb(g.metaColor), metaG.px).toFixed(2) : null,
    metaSz: g.metaSize,
    label_on_fill: g.actColor ? +CR(rgb(g.actColor), rgb(g.actFill)).toFixed(2) : null,
    fill_vs_panel: actRing ? +CR(rgb(g.actFill), actRing.px).toFixed(2) : null,
    hairline_vs_panel: actRing
      ? +CR(
          // the 42%-cream hairline composited over the annatto fill it
          // rides — a border paints over the element's own background
          rgb(g.actBorder).map((v, i) => v * 0.42 + rgb(g.actFill)[i] * 0.58),
          actRing.px,
        ).toFixed(2)
      : null,
  });
}
console.table(panelRows);

const worstName = Math.min(...panelRows.map((r) => r.name));
const worstMeta = Math.min(...panelRows.map((r) => r.meta ?? 99));
const worstLabel = Math.min(...panelRows.map((r) => r.label_on_fill ?? 99));
const worstHair = Math.min(...panelRows.map((r) => r.hairline_vs_panel ?? 99));
ok(
  "PANEL venue name >= 4.5:1 on its own ground",
  worstName >= 4.5,
  `worst ${worstName.toFixed(2)}:1 (${panelRows.find((r) => r.name === worstName).venue}) — 4.5 applied, not the 3:1 large-text allowance, because the same name is 16px on the 981 four-up`,
);
ok(
  "PANEL metadata row >= 4.5:1",
  worstMeta >= 4.5,
  `worst ${worstMeta.toFixed(2)}:1 (${panelRows.find((r) => r.meta === worstMeta).venue}) at ${panelRows[0].metaSz}px`,
);
ok(
  "CONTROL label >= 4.5:1 on its fill",
  worstLabel >= 4.5,
  `${worstLabel.toFixed(2)}:1 at ${panelRows[0].label_on_fill && panelGeom[0].actSize}px`,
);
ok(
  "CONTROL boundary >= 3:1 against the panel (1.4.11)",
  worstHair >= 3,
  `hairline ${worstHair.toFixed(2)}:1; the FILL alone is ${Math.min(...panelRows.map((r) => r.fill_vs_panel ?? 99)).toFixed(2)}:1, which is why the hairline is there`,
);

/* ── HOVER: the wipe still opens, the plate does not move ────────────── */
const hoverBox = await page.evaluate((sel) => {
  const li = document.querySelector(`${sel} > li`);
  const r = li.querySelector("[data-plate]").getBoundingClientRect();
  return { cx: r.x + r.width / 2, cy: r.y + r.height * 0.35, r: { ...r.toJSON() } };
}, GRID);
await page.mouse.move(5, 5); // TWO moves — one outside, then one in
await s(120);
await page.mouse.move(hoverBox.cx, hoverBox.cy);
await s(900);
const hoverState = await page.evaluate((sel) => {
  const li = document.querySelector(`${sel} > li`);
  const v = li.querySelector("video");
  const r = li.querySelector("[data-plate]").getBoundingClientRect();
  return {
    hasClip: !!v,
    clipClass: v ? v.className : null,
    // Chrome does not resolve circle() percentages in computed style, so
    // the assertion is on the class + the transition being armed
    clipPath: v ? getComputedStyle(v).clipPath : null,
    transition: v ? getComputedStyle(v).transitionProperty : null,
    opacity: v ? +getComputedStyle(v).opacity : null,
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
  };
}, GRID);
const moved =
  Math.abs(hoverState.rect.x - hoverBox.r.x) > 0.5 ||
  Math.abs(hoverState.rect.y - hoverBox.r.y) > 0.5 ||
  Math.abs(hoverState.rect.w - hoverBox.r.width) > 0.5 ||
  Math.abs(hoverState.rect.h - hoverBox.r.height) > 0.5;
ok(
  "HOVER the plate's rectangle does not move",
  !moved,
  `before ${hoverBox.r.width.toFixed(1)}x${hoverBox.r.height.toFixed(1)} @${hoverBox.r.x.toFixed(1)},${hoverBox.r.y.toFixed(1)} → after ${hoverState.rect.w.toFixed(1)}x${hoverState.rect.h.toFixed(1)} @${hoverState.rect.x.toFixed(1)},${hoverState.rect.y.toFixed(1)}`,
);
ok(
  "HOVER the film wipe is armed",
  hoverState.hasClip &&
    /hoverClip/.test(hoverState.clipClass || "") &&
    /clip-path/.test(hoverState.transition || ""),
  `class="${hoverState.clipClass}" transition=${hoverState.transition} opacity=${hoverState.opacity}`,
);
await page.mouse.move(5, 5);
await s(500);

/* ── SHOTS ──────────────────────────────────────────────────────────── */
await seatGrid(page);
await page.screenshot({ path: `${OUT}/view-1440.png` });
const gridBox = await page.evaluate((sel) => {
  const r = document.querySelector(sel).getBoundingClientRect();
  return { x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height };
}, GRID);
await page.screenshot({
  path: `${OUT}/grid-1440.png`,
  clip: {
    x: gridBox.x,
    y: gridBox.y,
    width: gridBox.w,
    height: Math.min(gridBox.h, 1400),
  },
});
// 4x zooms: the mark on the brightest photograph, and one whole card
const zoomTargets = await page.evaluate((sel) => {
  const cells = [...document.querySelectorAll(`${sel} > li`)];
  const pick = (n) =>
    cells.find((c) => new RegExp(n, "i").test(c.querySelector("h3").textContent));
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height };
  };
  const hood = pick("Hoodwood") || cells[0];
  return {
    mark: box(hood.querySelector('[class*="cardLogoMark"]')),
    card: box(hood.querySelector("[data-plate]")),
  };
}, GRID);
for (const [name, b, pad] of [
  ["zoom-mark-hoodwood", zoomTargets.mark, 16],
  ["zoom-card-hoodwood", zoomTargets.card, 0],
]) {
  const buf = await page.screenshot({
    clip: { x: b.x - pad, y: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2 },
  });
  await sharp(buf)
    .resize({
      width: Math.round((b.w + pad * 2) * 4),
      kernel: "nearest",
    })
    .toFile(`${OUT}/${name}@4x.png`);
}

/* the KNOWN pre-existing hydration mismatch under prefers-reduced-motion is
   excluded BY NAME; anything else fails the run */
const KNOWN = /hydrat|Hydration failed|did not match|server rendered HTML/i;
const newErrors = errors.filter((e) => !KNOWN.test(e));
ok(
  "CONSOLE no new errors",
  newErrors.length === 0,
  newErrors.length
    ? newErrors.slice(0, 3).join(" | ")
    : `${errors.length} suppressed (known hydration mismatch only)`,
);
await page.close();

/* ═══════════════════════════════════════════════════════════════════════
   981 — the four-up, the hard case for the panel's share of the card
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n=== 981x900 (the 4-up) ===");
{
  const { page: p2 } = await open(981, 900);
  await walk(p2);
  await seatGrid(p2);
  const four = await p2.evaluate((sel) => {
    return [...document.querySelectorAll(`${sel} > li`)].map((c) => {
      const card = c.querySelector("[data-plate]").getBoundingClientRect();
      const glass = c.querySelector('[class*="glass"]').getBoundingClientRect();
      const mark = c.querySelector('[class*="cardLogoMark"]');
      const st = c.querySelector('[class*="stickerBadge"]');
      const mr = mark?.getBoundingClientRect();
      const sr = st?.getBoundingClientRect();
      const h3 = c.querySelector("h3");
      const crown = c.querySelector('[class*="cardCrown"]');
      return {
        venue: h3.textContent.trim(),
        cardW: +card.width.toFixed(1),
        cardH: +card.height.toFixed(1),
        panelPct: Math.round((glass.height / card.height) * 100),
        // the mark's wash, from the CONTAINER QUERY block — see below
        scrimH: getComputedStyle(crown, "::before").height,
        nameSize: +parseFloat(getComputedStyle(h3).fontSize).toFixed(1),
        nameLines: Math.round(
          h3.getBoundingClientRect().height /
            parseFloat(getComputedStyle(h3).lineHeight || "0"),
        ),
        crownGap: mr && sr ? Math.round(sr.left - mr.right) : null,
      };
    });
  }, GRID);
  console.table(four);
  const pcts = four.map((f) => f.panelPct);
  ok(
    "4UP panel stays 35–42% of the card",
    Math.min(...pcts) >= 34 && Math.max(...pcts) <= 43,
    `card ${four[0].cardW}x${four[0].cardH}, panel ${Math.min(...pcts)}–${Math.max(...pcts)}%, name ${four[0].nameSize}px`,
  );
  ok(
    "4UP the mark never collides with the sticker",
    four.every((f) => f.crownGap === null || f.crownGap > 0),
    `gaps=[${four.map((f) => f.crownGap ?? "—").join(", ")}]px (only Belly carries a sticker)`,
  );
  /* SOURCE ORDER, ASSERTED. A rule inside @container carries the
     specificity of its own selector and nothing more, so the narrow-card
     block only wins because it sits at the END of the stylesheet — this
     file lost an hour to exactly that once and carries a banner about it.
     The scrim's override is the newest thing in that block, so this is the
     assertion that will notice if someone moves it back up. Base clamp is
     84–130px; the 981 four-up must be showing the block's 68px. */
  ok(
    "4UP the container-query block still wins (mark wash at 68px, not the base clamp)",
    four.every((f) => f.scrimH === "68px"),
    `::before height = ${[...new Set(four.map((f) => f.scrimH))].join(" | ")}`,
  );
  await p2.screenshot({ path: `${OUT}/view-981.png` });
  await p2.close();
}

/* ═══════════════════════════════════════════════════════════════════════
   390 — mobile
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n=== 390x844 ===");
{
  const { page: p3 } = await open(390, 844);
  await walk(p3);
  await seatGrid(p3);
  const m = await p3.evaluate((sel) => {
    const cells = [...document.querySelectorAll(`${sel} > li`)];
    const c0 = cells[0].querySelector("[data-plate]").getBoundingClientRect();
    return {
      n: cells.length,
      w: +c0.width.toFixed(1),
      h: +c0.height.toFixed(1),
      panelPct: Math.round(
        (cells[0].querySelector('[class*="glass"]').getBoundingClientRect()
          .height /
          c0.height) *
          100,
      ),
    };
  }, GRID);
  ok("390 renders eight cards", m.n === 8, `${m.n} cards, ${m.w}x${m.h}, panel ${m.panelPct}%`);
  await p3.screenshot({ path: `${OUT}/view-390.png` });
  await p3.close();
}

/* ═══════════════════════════════════════════════════════════════════════
   reduced motion — the furniture must all be visible and still
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n=== prefers-reduced-motion ===");
{
  const { page: p4 } = await open(1440, 900, [
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await walk(p4);
  await s(1500);
  const rm = await p4.evaluate((sel) => {
    return [...document.querySelectorAll(`${sel} > li`)].map((c) => {
      const plate = c.querySelector("[data-plate]");
      const glass = c.querySelector('[class*="glass"]');
      const slot = c.querySelector('[class*="cardLogo"]:not([class*="Mark"])');
      return {
        plateOpacity: +getComputedStyle(plate).opacity,
        glassOpacity: +getComputedStyle(glass).opacity,
        crownOpacity: +getComputedStyle(
          c.querySelector('[class*="cardCrown"]'),
        ).opacity,
        markVisible: slot ? slot.getBoundingClientRect().width > 10 : false,
      };
    });
  }, GRID);
  ok(
    "REDUCE all eight cards fully painted, furniture visible",
    rm.length === 8 &&
      rm.every(
        (r) =>
          r.plateOpacity === 1 &&
          r.glassOpacity === 1 &&
          r.crownOpacity === 1 &&
          r.markVisible,
      ),
    `plate=[${[...new Set(rm.map((r) => r.plateOpacity))]}] glass=[${[...new Set(rm.map((r) => r.glassOpacity))]}] crown=[${[...new Set(rm.map((r) => r.crownOpacity))]}]`,
  );
  await p4.screenshot({ path: `${OUT}/view-reduced.png` });
  await p4.close();
}

await browser.close();

const failed = R.filter((r) => !r.pass);
console.log(
  `\n${R.length - failed.length}/${R.length} passed. shots → ${OUT}`,
);
if (failed.length) {
  console.log("FAILURES:");
  for (const f of failed) console.log(`  · ${f.n} — ${f.detail}`);
}
process.exit(failed.length ? 1 : 0);
