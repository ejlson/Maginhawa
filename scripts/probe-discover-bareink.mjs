/* THE BARE-MARK / NEAR-SOLID-INK CARD — the four changes of 2026-08-04
   (third pass), each with its evidence read off the RENDERED PIXELS rather
   than off the arithmetic in the stylesheet.

     MATERIAL  the panel is a near-solid ink surface with a CRISP top edge,
               not a backdrop blur. Asserted three ways: the computed
               backdrop-filter carries a 0px blur radius (i.e. the property
               is gone); the panel's own composited ground is dark and
               nearly FLAT across its whole box, which a 34%-at-the-top
               tint over a blurred picture never was; and the PICTURE'S
               VARIATION stops dead at the boundary — the band just below
               the edge, which a 20px blur would fill with smeared
               photograph, carries a fraction of the range the real picture
               above it does.
     SHADOW    no drop-shadow, and no filter of any kind, on the mark or on
               the span that carries it. The four-stop stack this pass
               removes would fail on the first clause.
     MARK      what the bare, UNSHADOWED mark measures against the picture
               under it, now that a corner wash is its whole budget. Solved
               exactly rather than estimated: the card is rendered twice,
               once with the mask filled cream and once filled black, which
               recovers the mask's per-pixel alpha and with it the true
               ground beneath every glyph. The number reported is the
               contrast of cream against the BRIGHTEST ground pixel lying
               within 2px of a solid glyph pixel — the worst thing the
               mark's edge has to survive. Rule: 3:1, the WCAG 1.4.11
               graphical-object bar. A logotype carries no text-contrast
               requirement at all (1.4.3 exempts it), so 4.5:1 would be the
               wrong bar to claim.
     BIGGER    the mark is meaningfully larger than the 32×80 it shipped at,
               and still clears Belly's Michelin sticker at the NARROWEST
               card in the layout (the 981 four-up, ~183px wide).
     NAME      there is no venue name anywhere on the panel — no heading in
               the card at all — and the venue is still ANNOUNCED: the mark
               carries role="img" with the name, the plate button and the
               action link still have sensible accessible names.
     PANEL     the metadata row and the control, each measured against the
               panel's real composited ground inside that element's own
               band — sampled with the type hidden and the panel left
               running. Rule: 4.5:1 (both are 12–14px; the large-text
               allowance is never claimed).
     CONTROL   the label against its own fill, and the fill and its hairline
               against the panel around it (1.4.11's 3:1 for the boundary).
     INTRO     the assembly still runs to `done` and every plate is left on
               its seat, opaque and untransformed.
     HOVER     the film still wipes open from the cursor AND the plate's
               rectangle does not move while it does — the layoutId
               re-measure bug this card is on record for.
     4UP       the panel's share of the card at the 981 four-up, and the
               container-query block still winning on SOURCE ORDER.
     SHOTS     1440 / 981 / 390, plus 4x zooms on one mark and one whole
               card so the material is judgeable by eye.

   HARNESS NOTES, all of them learned the hard way and none of them
   negotiable: never networkidle0 (the hero clip loops and the page never
   idles) — domcontentloaded plus the is-loading class; Lenis keeps easing
   for seconds after scrollTo; walk down in ~500px steps so every
   IntersectionObserver on the way arms; WAIT FOR data-assembly-step TO
   CLEAR before shooting the settled grid, because scrolling back re-arms
   the assembly and a shot taken mid-cue photographs eight empty deck
   plates; headless reports (hover: none) so hover is emulated through CDP
   (puppeteer's own emulateMediaFeatures rejects `hover`); page.screenshot
   clips measure from the DOCUMENT origin, so shoot full and crop after;
   hover needs TWO mouse moves, one outside and one inside.

   THE VENUE HANDLE IS THE MARK'S aria-label, not an <h3> and not a
   data-attribute added for the probe's convenience. The heading is what
   this pass deletes, and reading the name off the accessible tree makes
   every table below double as proof that the name survived the deletion.

   usage: node scripts/probe-discover-bareink.mjs [port] [outdir] */
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "51365";
const OUT = process.argv[3] || "/tmp/discover-bareink";
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
   TWO SERIALISATIONS, and getting this wrong cost a whole run once: a plain
   token comes back as `rgb(244, 240, 228)`, but ANY color-mix() comes back
   as `color(srgb 0.7647 0.7647 0.7215)` — the same numbers on a 0–1 scale.
   Read naively, the metadata's colour parsed as rgb(0,0,0) and every
   contrast in the table was a fiction. */
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

/* put the grid on screen and WAIT OUT the assembly the return scroll
   re-arms — the section drops data-assembly-step at DONE */
async function seatGrid(page) {
  const y = await page.evaluate((sel) => {
    const g = document.querySelector(sel);
    return g ? Math.round(g.getBoundingClientRect().top + window.scrollY) : null;
  }, GRID);
  if (y == null) return false;
  await page.evaluate((v) => window.scrollTo(0, v - 90), y);
  await s(3000);
  await page
    .waitForFunction(
      () => !document.querySelector("#restaurants")?.dataset.assemblyStep,
      { timeout: 25000, polling: 100 },
    )
    .catch(() => console.log("  (warn: assembly still stepping after 25s)"));
  await s(1000);
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
   has an 18px radius and a bounding box's corners fall outside it onto the
   page's own cream ground — an early version of this probe reported L 0.75
   on every card including Bunso's solid ink field, which was the page
   showing through the corners, not the panel. Boxes that reach the card's
   edge are clipped by the caller instead. */
function extremes(img, b, inset = 3) {
  let max = -1;
  let min = 9;
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
      if (l < min) min = l;
    }
  }
  return { L: max, min, px };
}

/* ═══════════════════════════════════════════════════════════════════════
   1440 — the whole argument
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n=== 1440x900 ===");
const { page, errors } = await open(1440, 900);

/* ── INTRO, watched from a fresh page the way a reader arms it ───────── */
const trace = await page.evaluate(async () => {
  const sec = document.querySelector("#restaurants");
  const seen = new Set();
  let armed = false;
  // creep only until it ARMS — scrolling on past trips the escape hatch,
  // which is a different path from the one under test
  for (let i = 0; i < 400 && !armed; i++) {
    window.scrollBy(0, 40);
    await new Promise((r) => requestAnimationFrame(() => r()));
    if (sec.dataset.assemblyArmed === "1") armed = true;
    const st = sec.dataset.assemblyStep;
    if (st != null) seen.add(Number(st));
  }
  // then STAND STILL and let the cue sheet run. The last cue is DONE at
  // 8700ms from arming and the attribute is dropped there.
  const t0 = performance.now();
  while (performance.now() - t0 < 12000) {
    const st = sec.dataset.assemblyStep;
    if (st != null) seen.add(Number(st));
    else if (performance.now() - t0 > 500) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  return {
    armed,
    steps: [...seen].sort((a, b) => a - b),
    stepNow: sec.dataset.assemblyStep ?? null,
  };
});
ok(
  "INTRO reached done",
  trace.armed && trace.stepNow === null && trace.steps.includes(7),
  `armed=${trace.armed} steps=[${trace.steps.join(",")}] step-now=${trace.stepNow}`,
);
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
  "INTRO every plate on its seat",
  seats.every(
    (x) =>
      x.opacity === 1 &&
      (x.transform === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(x.transform)),
  ),
  `opacity=[${[...new Set(seats.map((x) => x.opacity))].join(",")}] transform=${[...new Set(seats.map((x) => x.transform))].join(" | ")}`,
);

await seatGrid(page);

/* ── NAME: gone from the panel, still in the accessible tree ─────────── */
const naming = await page.evaluate((sel) => {
  return [...document.querySelectorAll(`${sel} > li`)].map((c) => {
    const slot = c.querySelector('[class*="cardLogo"]:not([class*="Mark"])');
    const panel = c.querySelector('[class*="glass"]');
    // the blurb lives inside the panel now and is hover copy that may well
    // mention the venue — it is not the panel's PRINTED name and is
    // excluded from the text scan by node, not by string matching
    const blurb = panel?.querySelector('[class*="hoverBlurb"]');
    const clone = panel?.cloneNode(true);
    if (clone && blurb) {
      const b = clone.querySelector('[class*="hoverBlurb"]');
      if (b) b.remove();
    }
    const btn = c.querySelector("button");
    const link = c.querySelector('[class*="panelAction"]');
    return {
      venue: slot?.getAttribute("aria-label") ?? null,
      markRole: slot?.getAttribute("role") ?? null,
      headings: c.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
      panelText: (clone?.textContent || "").replace(/\s+/g, " ").trim(),
      btnLabel: btn?.getAttribute("aria-label") ?? null,
      linkLabel: link?.getAttribute("aria-label") ?? null,
      hasBlurb: !!blurb,
    };
  });
}, GRID);
console.table(
  naming.map((n) => ({
    venue: n.venue,
    role: n.markRole,
    headings: n.headings,
    "panel prints": n.panelText.slice(0, 46),
    button: n.btnLabel,
  })),
);
ok(
  "NAME no heading anywhere in any card",
  naming.every((n) => n.headings === 0),
  `heading counts = [${naming.map((n) => n.headings).join(",")}]`,
);
ok(
  "NAME the panel never prints the venue's name",
  naming.every((n) => n.venue && !n.panelText.includes(n.venue)),
  naming
    .map((n) => `${n.venue}: "${n.panelText.slice(0, 34)}"`)
    .slice(0, 3)
    .join(" · ") + " …",
);
ok(
  "NAME the venue is still announced (mark role=img + button + link)",
  naming.every(
    (n) =>
      n.markRole === "img" &&
      n.venue &&
      n.btnLabel?.includes(n.venue) &&
      (n.linkLabel === null || n.linkLabel.includes(n.venue)),
  ),
  `mark role=${[...new Set(naming.map((n) => n.markRole))].join("|")}; e.g. "${naming[0].venue}" / "${naming[0].btnLabel}" / "${naming[0].linkLabel}"`,
);

/* ── BARE + BIGGER: no ground, no filter, and a real size ───────────── */
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
      textShadow: c.textShadow,
    };
  };
  return [...document.querySelectorAll(`${sel} > li`)].map((c) => {
    const slot = c.querySelector('[class*="cardLogo"]:not([class*="Mark"])');
    const mark = c.querySelector('[class*="cardLogoMark"]');
    const cr = c.querySelector("[data-plate]").getBoundingClientRect();
    const mr = mark?.getBoundingClientRect();
    return {
      venue: slot?.getAttribute("aria-label"),
      slot: slot ? boxish(slot) : null,
      mark: mark ? boxish(mark) : null,
      markInk: mark ? getComputedStyle(mark).backgroundColor : null,
      markMask: mark
        ? (getComputedStyle(mark).maskImage || "none").slice(0, 42)
        : null,
      markW: mr ? +mr.width.toFixed(1) : null,
      markH: mr ? +mr.height.toFixed(1) : null,
      cardW: +cr.width.toFixed(1),
      insetL: mr ? Math.round(mr.left - cr.left) : null,
      insetT: mr ? Math.round(mr.top - cr.top) : null,
    };
  });
}, GRID);

/* "no box" has to be asserted on the two elements SEPARATELY, because the
   mark's own background-color is not a box — it is the mark's INK, and it
   only ever paints where the mask is opaque. What has to be absent is a
   painted ground: no background IMAGE, no border, no backdrop-filter, no
   box-shadow, no radius, on either element, plus a transparent background
   on the outer span, which is the one a chip would have lived on. */
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
  bareOK(bare[0])
    ? `slot bg=${bare[0].slot.bg} radius=${bare[0].slot.radius} border=${bare[0].slot.border} backdrop=${bare[0].slot.backdrop} shadow=${bare[0].slot.shadow}`
    : bare
        .filter((b) => !bareOK(b))
        .map((b) => `${b.venue} SLOT${JSON.stringify(b.slot)}`)
        .join("  "),
);
/* THE NOTE'S HEADLINE ASSERTION. `filter` is what the removed stack lived
   in; text-shadow is checked too so a future "just a little outline" has
   nowhere obvious to hide. */
ok(
  "SHADOW no drop-shadow — no filter at all — on the mark or its slot",
  bare.every(
    (b) =>
      (b.slot?.filter ?? "none") === "none" &&
      (b.mark?.filter ?? "none") === "none" &&
      (b.slot?.textShadow ?? "none") === "none" &&
      (b.mark?.textShadow ?? "none") === "none",
  ),
  `slot.filter=${[...new Set(bare.map((b) => b.slot?.filter))].join("|")}  mark.filter=${[...new Set(bare.map((b) => b.mark?.filter))].join("|")}`,
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
/* BIGGER, against the recorded shipped size: 32px tall / 80px wide at
   1440. Held at >=40 / >=100 so a regression to the old clamp fails
   outright rather than passing on a rounding. */
ok(
  "BIGGER the mark is materially larger than the 32x80 it shipped at",
  bare.every((b) => b.markH >= 40 && b.markW >= 100),
  `${bare[0].markW}x${bare[0].markH} on a ${bare[0].cardW}px card (was 80x32) — ${Math.round((bare[0].markW / bare[0].cardW) * 100)}% of the card's width`,
);

/* ── MARK: the true ground under every glyph, solved exactly ──────────
   Two renders of the same frame differing ONLY in the mask's fill colour.
   The ground G and the mask coverage α are recoverable per pixel from
        P_cream = α·cream + (1−α)·G
        P_black = α·0     + (1−α)·G
   giving α = (P_cream − P_black)/cream and G = P_black/(1−α).
   This is why the number below is a measurement and not a model. With the
   drop-shadow gone there is no halo to see through either, so the solve is
   cleaner than it was on the previous pass. */
const markBoxes = await page.evaluate((sel) => {
  return [...document.querySelectorAll(`${sel} > li`)].map((c) => {
    const m = c.querySelector('[class*="cardLogoMark"]');
    if (!m) return null;
    const slot = c.querySelector('[class*="cardLogo"]:not([class*="Mark"])');
    const r = m.getBoundingClientRect();
    // widen by 8px so the ground immediately outside the glyphs is sampled
    return {
      venue: slot?.getAttribute("aria-label"),
      x: r.x - 8,
      y: r.y - 8,
      w: r.width + 16,
      h: r.height + 16,
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
     pixels wide into a 42px slot; after that downsample a stroke can be two
     partial pixels with no fully-opaque core at all. Held at 0.99 an
     earlier version of this probe found THREE solid pixels on Bintang and
     measured the mark's legibility off them. 0.8 is the coverage at which a
     cream pixel is reading as cream; 0.08 is the coverage below which a
     pixel is reading as ground. The band between is excluded from both. */
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
    venue: b.venue,
    glyphPx: solid,
    worstGroundL: worst < 0 ? null : +worst.toFixed(4),
    worstGroundPx: worstPx ? worstPx.join(",") : null,
    contrast: worst < 0 ? null : +CR(CREAM, worstPx).toFixed(2),
    groundRangeL: +(gMax - gMin).toFixed(4),
  });
}
console.log("\nMARK — bare cream against the worst ground pixel beside a glyph");
console.table(markRows);
const markMin = Math.min(...markRows.map((r) => r.contrast ?? 99));
ok(
  "MARK cream survives every photograph with NO shadow (3:1, WCAG 1.4.11)",
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

/* ── PANEL: geometry, then the type's real ground ───────────────────── */
const panelGeom = await page.evaluate((sel) => {
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };
  return [...document.querySelectorAll(`${sel} > li`)].map((c) => {
    const slot = c.querySelector('[class*="cardLogo"]:not([class*="Mark"])');
    const card = c.querySelector("[data-plate]");
    const glass = c.querySelector('[class*="glass"]');
    const gs = getComputedStyle(glass);
    // metaCLIP, never metaRow: the row is dragged 17px left by the
    // wrap-safe gutter trick and its rect hangs outside the card
    const meta = c.querySelector('[class*="metaClip"]');
    const act = c.querySelector('[class*="panelAction"]');
    const cs = act ? getComputedStyle(act) : null;
    return {
      venue: slot?.getAttribute("aria-label"),
      card: box(card),
      glass: box(glass),
      radius: getComputedStyle(c.querySelector('[class*="cardSurface"]'))
        .borderTopLeftRadius,
      backdrop: gs.backdropFilter || gs.webkitBackdropFilter || "none",
      panelBg: gs.backgroundImage.slice(0, 90),
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
      actH: cs ? parseFloat(cs.minHeight) : null,
      actSize: cs ? parseFloat(cs.fontSize) : null,
      pctOfCard: Math.round(
        (glass.getBoundingClientRect().height /
          card.getBoundingClientRect().height) *
          100,
      ),
    };
  });
}, GRID);

/* THE MATERIAL, ASSERTED ON THE COMPUTED STYLE FIRST. The brief asks for
   the blur radius this pass settled on, and it is ZERO: the property is
   gone, not reduced. A `none` backdrop-filter parses to no length at all,
   which is what the regex below is looking for. */
const blurRadius = (v) => {
  const m = /blur\(\s*([\d.]+)px/.exec(v || "");
  return m ? Number(m[1]) : 0;
};
ok(
  "MATERIAL the panel's backdrop blur radius is 0px (property retired)",
  panelGeom.every((g) => blurRadius(g.backdrop) === 0),
  `backdrop-filter = ${[...new Set(panelGeom.map((g) => g.backdrop))].join(" | ")} → blur ${[...new Set(panelGeom.map((g) => blurRadius(g.backdrop)))].join("/")}px (was blur(20px) saturate(120%) brightness(0.7))`,
);
ok(
  "RADIUS the card carries the softened corner",
  panelGeom.every((g) => g.radius === "18px"),
  `border-radius = ${[...new Set(panelGeom.map((g) => g.radius))].join("|")} (was 14px; the reference is ~20)`,
);

// hide the type, keep the panel and its fade running
await page.addStyleTag({
  content: `${GRID} [class*="glass"] > * { visibility: hidden !important; }`,
});
await s(400);
const imgGround = await shoot(page, "panel-ground.png");

/* ── THE EDGE, IN PIXELS, AND THE FIRST VERSION OF THIS TEST WAS NO GOOD.
   It timed an 80%→20% luminance fall down a single column through the
   boundary, which assumed the profile was monotonic. It is not: a
   photograph has texture, and the panel's own fade darkens the 40px of
   picture immediately above the edge, so on five of the eight cards the
   two thresholds crossed in the wrong order and the test passed on a
   negative number. A test that cannot fail is not evidence.

   WHAT ACTUALLY SEPARATES AN EDGE FROM A SMEAR is not the steepness of one
   column but whether the PICTURE CONTINUES past the boundary. A 20px
   backdrop blur composites a blurred copy of the photograph under the
   tint, so the band just below the edge still carries the picture's
   variation, shifted and softened. A near-solid tint carries none: below
   the edge every card's ground is the same flat ink whatever is above it.

   So this measures VARIATION either side of the boundary, over a full-width
   band rather than one column:
     · photoBand   L range across a 16px band of real picture, above the
                   panel's own fade (60→44px up)
     · panelBand   L range across a 16px band 4→20px below the edge — the
                   exact strip a blur would fill with smeared photograph
     · step        L 2px above the edge minus L 2px below it, at the card's
                   centre, for the record
   Bunso is exempt from the ratio and says why: it is an ink panel on an
   ink field, and there is no picture on either side to stop. */
const edgeRows = [];
for (const g of panelGeom) {
  const x0 = Math.round(g.card.x + 20);
  const x1 = Math.round(g.card.x + g.card.w - 20);
  const ey = Math.round(g.glass.y);
  const band = (yFrom, yTo) => {
    let lo = 9;
    let hi = -9;
    for (let y = ey + yFrom; y < ey + yTo; y++)
      for (let x = x0; x < x1; x++) {
        const l = L(imgGround.at(x, y));
        if (l < lo) lo = l;
        if (l > hi) hi = l;
      }
    return +(hi - lo).toFixed(4);
  };
  const cx = Math.round(g.card.x + g.card.w / 2);
  edgeRows.push({
    venue: g.venue,
    photoBand: band(-60, -44),
    panelBand: band(4, 20),
    ratio: null, // filled below so the divide reads once
    "L −2px": +L(imgGround.at(cx, ey - 2)).toFixed(4),
    "L +2px": +L(imgGround.at(cx, ey + 2)).toFixed(4),
  });
  const r = edgeRows[edgeRows.length - 1];
  r.ratio = r.panelBand > 0 ? +(r.photoBand / r.panelBand).toFixed(1) : null;
}
console.log(
  "\nMATERIAL — does the picture continue past the panel's top edge? (type hidden)",
);
console.table(edgeRows);
ok(
  "MATERIAL the picture stops dead at the panel's top edge",
  edgeRows.every((r) => r.panelBand <= 0.02) &&
    edgeRows
      .filter((r) => r.venue !== "Bunso")
      .every((r) => r.ratio !== null && r.ratio >= 3),
  `panel band L-range <= ${Math.max(...edgeRows.map((r) => r.panelBand)).toFixed(4)} on every card, against ${Math.min(...edgeRows.filter((r) => r.venue !== "Bunso").map((r) => r.photoBand)).toFixed(4)}–${Math.max(...edgeRows.map((r) => r.photoBand)).toFixed(4)} in the picture above it — a ratio of ${Math.min(...edgeRows.filter((r) => r.venue !== "Bunso").map((r) => r.ratio)).toFixed(1)}x at worst. A blur(20px) panel would carry the picture's variation straight through this band; this one carries none of it. Bunso exempt: ink panel on an ink field.`,
);

const panelRows = [];
for (const g of panelGeom) {
  // clip every sample to the card's interior — 20px in from the left and
  // right edges, clear of the 18px corner radius
  const clip = (b) => {
    if (!b) return null;
    const x0 = Math.max(b.x, g.card.x + 20);
    const x1 = Math.min(b.x + b.w, g.card.x + g.card.w - 20);
    return { x: x0, y: b.y, w: Math.max(1, x1 - x0), h: b.h };
  };
  const metaG = g.metaBox ? extremes(imgGround, clip(g.metaBox), 1) : null;
  // the ground the CONTROL sits against is the panel just outside the pill
  const actRing = g.actBox
    ? extremes(
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
  const whole = extremes(imgGround, clip(g.glass), 1);
  panelRows.push({
    venue: g.venue,
    "panel%": g.pctOfCard,
    lightestL: +whole.L.toFixed(4),
    // near-opaque means the panel's own ground barely varies. Under the
    // frosted panel this spread was the photograph coming through.
    spreadL: +(whole.L - whole.min).toFixed(4),
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
    pillH: g.actH,
  });
}
console.log("\nPANEL — type against the panel's real composited ground");
console.table(panelRows);

await page.evaluate(() => {
  const t = [...document.querySelectorAll("style")].pop();
  if (t && /glass/.test(t.textContent)) t.remove();
});
await s(300);

const worstMeta = Math.min(...panelRows.map((r) => r.meta ?? 99));
const worstLabel = Math.min(...panelRows.map((r) => r.label_on_fill ?? 99));
const worstHair = Math.min(...panelRows.map((r) => r.hairline_vs_panel ?? 99));
const worstFill = Math.min(...panelRows.map((r) => r.fill_vs_panel ?? 99));
const lightest = Math.max(...panelRows.map((r) => r.lightestL));
ok(
  "PANEL metadata row >= 4.5:1 on its own ground",
  worstMeta >= 4.5,
  `worst ${worstMeta.toFixed(2)}:1 (${panelRows.find((r) => r.meta === worstMeta).venue}) at ${panelRows[0].metaSz}px — 4.5 applied outright, no large-text allowance claimed`,
);
ok(
  "PANEL the material is near-opaque (lightest point, and how flat it is)",
  lightest <= 0.06 && panelRows.every((r) => r.spreadL <= 0.03),
  `lightest composited point on any card L ${lightest.toFixed(4)} (frosted panel measured L 0.113); spread within a panel <= ${Math.max(...panelRows.map((r) => r.spreadL)).toFixed(4)}`,
);
ok(
  "CONTROL label >= 4.5:1 on its fill",
  worstLabel >= 4.5,
  `${worstLabel.toFixed(2)}:1 at ${panelGeom[0].actSize}px`,
);
ok(
  "CONTROL boundary >= 3:1 against the panel (1.4.11)",
  worstHair >= 3,
  `hairline ${worstHair.toFixed(2)}:1; the FILL ALONE is now ${worstFill.toFixed(2)}:1 (it was 2.4:1 under the frosted panel, which is why the hairline was added — it is no longer load-bearing)`,
);
ok(
  "CONTROL the pill carries the reference's weight",
  panelRows.every((r) => (r.pillH ?? 0) >= 34),
  `min-height ${[...new Set(panelRows.map((r) => r.pillH))].join("/")}px (was 26px), label "${panelGeom[0].actLabel}" at ${panelGeom[0].actSize}px`,
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
  const blurb = li.querySelector('[class*="hoverBlurb"]');
  return {
    hasClip: !!v,
    clipClass: v ? v.className : null,
    // Chrome does not resolve circle() percentages in computed style, so
    // the assertion is on the class + the transition being armed
    clipPath: v ? getComputedStyle(v).clipPath : null,
    transition: v ? getComputedStyle(v).transitionProperty : null,
    opacity: v ? +getComputedStyle(v).opacity : null,
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    // the blurb moved into the panel this pass — prove it still surfaces
    // and still sits ABOVE the panel's top edge
    blurbOpacity: blurb ? +getComputedStyle(blurb).opacity : null,
    blurbBottomGap: blurb
      ? Math.round(
          li.querySelector('[class*="glass"]').getBoundingClientRect().top -
            blurb.getBoundingClientRect().bottom,
        )
      : null,
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
ok(
  "HOVER the blurb still surfaces from its new seat inside the panel",
  hoverState.blurbOpacity === 1 &&
    hoverState.blurbBottomGap != null &&
    hoverState.blurbBottomGap >= 8 &&
    hoverState.blurbBottomGap <= 20,
  `opacity=${hoverState.blurbOpacity}, sitting ${hoverState.blurbBottomGap}px above the panel's top edge`,
);
await page.screenshot({ path: `${OUT}/hover-1440.png` });
await page.mouse.move(5, 5);
await s(700);

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
// 4x zooms: the mark on the brightest photograph, one whole card, and the
// panel's boundary on its own so the material can be judged by eye
const zoomTargets = await page.evaluate((sel) => {
  const cells = [...document.querySelectorAll(`${sel} > li`)];
  const pick = (n) =>
    cells.find((c) =>
      new RegExp(n, "i").test(
        c
          .querySelector('[class*="cardLogo"]:not([class*="Mark"])')
          ?.getAttribute("aria-label") || "",
      ),
    );
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height };
  };
  const hood = pick("Hoodwood") || cells[0];
  // "Mama" alone matches Mamasons first — the two venues share a stem and
  // the cells are in grid order
  const mama = pick("Café Mama") || cells[1];
  const card = box(hood.querySelector("[data-plate]"));
  const panel = box(hood.querySelector('[class*="glass"]'));
  return {
    mark: box(hood.querySelector('[class*="cardLogoMark"]')),
    card,
    cardMama: box(mama.querySelector("[data-plate]")),
    // the boundary, with 44px of photograph above it and 44px of panel below
    edge: { x: card.x, y: panel.y - 44, w: card.w, h: 88 },
  };
}, GRID);
for (const [name, b, pad] of [
  ["zoom-mark-hoodwood", zoomTargets.mark, 14],
  ["zoom-card-hoodwood", zoomTargets.card, 0],
  ["zoom-card-cafemama", zoomTargets.cardMama, 0],
  ["zoom-panel-edge", zoomTargets.edge, 0],
]) {
  const buf = await page.screenshot({
    clip: { x: b.x - pad, y: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2 },
  });
  await sharp(buf)
    .resize({ width: Math.round((b.w + pad * 2) * 4), kernel: "nearest" })
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
   981 — the four-up: the narrowest card, where the mark and the sticker
   share a row and the container query has to be winning
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
      const slot = c.querySelector('[class*="cardLogo"]:not([class*="Mark"])');
      const mark = c.querySelector('[class*="cardLogoMark"]');
      const st = c.querySelector('[class*="stickerBadge"]');
      const act = c.querySelector('[class*="panelAction"]');
      const mr = mark?.getBoundingClientRect();
      const sr = st?.getBoundingClientRect();
      const crown = c.querySelector('[class*="cardCrown"]');
      return {
        venue: slot?.getAttribute("aria-label"),
        cardW: +card.width.toFixed(1),
        cardH: +card.height.toFixed(1),
        panelPct: Math.round((glass.height / card.height) * 100),
        markW: mr ? +mr.width.toFixed(1) : null,
        markH: mr ? +mr.height.toFixed(1) : null,
        logoH: +parseFloat(getComputedStyle(slot).height).toFixed(1),
        pillH: act ? parseFloat(getComputedStyle(act).minHeight) : null,
        washH: getComputedStyle(crown, "::before").height,
        crownGap: mr && sr ? Math.round(sr.left - mr.right) : null,
      };
    });
  }, GRID);
  console.log("\n4UP — the narrowest card in the layout");
  console.table(four);
  const pcts = four.map((f) => f.panelPct);
  /* THE BAND MOVED, AND DELIBERATELY. It was 35–42% with a venue name on
     the panel; the name is gone, the panel is shorter and the photograph
     has more room, which is the point of the change. What still has to
     hold is the CEILING — this container query exists because the narrow
     card's panel once stood at 53–62% — and that no card is an outlier. */
  ok(
    "4UP the panel stays a footer, not a caption block",
    Math.max(...pcts) <= 43 && Math.min(...pcts) >= 24,
    `card ${four[0].cardW}x${four[0].cardH}, panel ${Math.min(...pcts)}–${Math.max(...pcts)}% (was 35–42% with the venue name on it; the ceiling is what this query is for — it was 53–62% before the query existed)`,
  );
  ok(
    "4UP the enlarged mark never collides with the sticker",
    four.every((f) => f.crownGap === null || f.crownGap > 8),
    `mark ${four[0].markW}x${four[0].markH}; gaps=[${four.map((f) => f.crownGap ?? "—").join(", ")}]px (only Belly carries a sticker)`,
  );
  /* SOURCE ORDER, ASSERTED. A rule inside @container carries the
     specificity of its own selector and nothing more, so the narrow-card
     block only wins because it sits at the END of the stylesheet — this
     file lost an hour to exactly that once and carries a banner about it.
     Two independent tripwires: the control's 27px against the base 34, and
     the mark slot's 30px against the base clamp, which resolves to 33.4px
     at a 981px window. */
  ok(
    "4UP the container-query block still wins (source order)",
    four.every((f) => f.pillH === 27 && Math.abs(f.logoH - 30) < 0.5),
    `pill min-height ${[...new Set(four.map((f) => f.pillH))].join("|")}px (base 34) · logo slot ${[...new Set(four.map((f) => f.logoH))].join("|")}px (base clamp resolves to 33.4 here)`,
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
    const mk = cells[0]
      .querySelector('[class*="cardLogoMark"]')
      .getBoundingClientRect();
    return {
      n: cells.length,
      w: +c0.width.toFixed(1),
      h: +c0.height.toFixed(1),
      mark: `${mk.width.toFixed(0)}x${mk.height.toFixed(0)}`,
      panelPct: Math.round(
        (cells[0].querySelector('[class*="glass"]').getBoundingClientRect()
          .height /
          c0.height) *
          100,
      ),
    };
  }, GRID);
  ok(
    "390 renders eight cards",
    m.n === 8,
    `${m.n} cards, ${m.w}x${m.h}, mark ${m.mark}, panel ${m.panelPct}%`,
  );
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
console.log(`\n${R.length - failed.length}/${R.length} passed. shots → ${OUT}`);
if (failed.length) {
  console.log("FAILURES:");
  for (const f of failed) console.log(`  · ${f.n} — ${f.detail}`);
}
process.exit(failed.length ? 1 : 0);
