/* THE PHOTO-DERIVED RESTAURANT CARD — 2026-08-05, fourth pass.

   Every claim the stylesheet and the component make about this card,
   checked against the RENDERED PIXELS and the real layout rather than
   against the arithmetic that produced them.

     SHAPE   eight cards, one size, at 3 : 4.3 with a 20px radius.
     RAMP    the bottom material is PHOTO-DERIVED and EDGELESS. Three
             independent assertions: the backdrop-filter is genuinely
             live (a 34px blur radius in computed style is necessary but
             not sufficient); the ramp's hue DIFFERS card to card, which
             a brand tint cannot do; and no row-to-row luminance step
             anywhere down the ramp exceeds what the gradient itself
             prescribes — i.e. there is no line to find.
     MARK    the eight mark boxes, their rendered ink, and what a bare
             cream logotype measures against the brightest ground pixel
             beside a glyph. Solved exactly rather than estimated: the
             card is rendered twice, once with the mask filled cream and
             once filled black, which recovers the mask's per-pixel alpha
             and with it the true ground beneath every glyph. Rule: 3:1,
             the WCAG 1.4.11 graphical-object bar — a logotype carries no
             text-contrast requirement at all (1.4.3 exempts it).
     CLIP    THE MAIN EVENT. Every address line on every venue at three
             card widths (358 / 274 / 183), asserting
             scrollWidth <= clientWidth + 1. A clipping line is a design
             failure this card has already shipped once.
     BLOCK   the block's height across the eight cards (uniform, no
             min-height propping it), and the type's contrast against its
             own composited ground.
     CTRL    two pills, cream outline + cream fill, sized to content and
             not stretched, with the fill pushed right ONLY where it has
             a sibling. No annatto anywhere on the card.
     CROWN   Belly's Michelin sticker still clear of the mark at the
             narrowest card, measured.
     INTRO   the assembly still runs to `done` with all eight plates on
             their seats — the aspect change moved every one of those
             seats, so this is a regression check, not a formality.
     HOVER   the film still wipes open from the cursor AND the plate's
             rectangle does not move while it does — the layoutId
             re-measure bug this card is on record for.
     4UP     the container-query overrides still win on SOURCE ORDER.
     SHOTS   1440 / 981 / 390 of the real grid, plus 4x zooms.

   HARNESS NOTES, all learned the hard way and none negotiable: never
   networkidle0 (the hero clip loops and the page never idles) —
   domcontentloaded plus the is-loading class; Lenis keeps easing for
   seconds after scrollTo; walk down in ~500px steps so every
   IntersectionObserver on the way arms; WAIT FOR data-assembly-step TO
   CLEAR before shooting the settled grid, because scrolling back re-arms
   the assembly and a shot taken mid-cue photographs eight empty deck
   plates; headless reports (hover: none) so hover is emulated through CDP
   (puppeteer's own emulateMediaFeatures rejects `hover`);
   page.screenshot clips measure from the DOCUMENT origin, so shoot full
   and crop after; hover needs TWO mouse moves, one outside and one
   inside.

   usage: node scripts/probe-discover-card.mjs [port] [outdir] */
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "51365";
const OUT = process.argv[3] || "/tmp/discover-card";
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
/* computed colour → [r,g,b] 0–255. TWO SERIALISATIONS, and getting this
   wrong cost a whole run once: a plain token comes back as
   `rgb(244, 240, 228)`, but ANY color-mix() comes back as
   `color(srgb 0.7647 0.7647 0.7215)` — the same numbers on a 0–1 scale.
   Read naively, the type's colour parsed as rgb(0,0,0) and every contrast
   in the table was a fiction. */
const rgb = (str) => {
  if (!str) return [0, 0, 0];
  const n = (str.match(/-?[\d.]+(?:e[-+]?\d+)?/gi) || [])
    .slice(0, 3)
    .map(Number);
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

async function open(w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [
      { name: "hover", value: "hover" },
      { name: "pointer", value: "fine" },
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
  return { page, errors, cdp };
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
  await page.evaluate((v) => window.scrollTo(0, v - 70), y);
  await s(3000);
  await page
    .waitForFunction(
      () => !document.querySelector("#restaurants")?.dataset.assemblyStep,
      { timeout: 25000, polling: 100 },
    )
    .catch(() => console.log("  (warn: assembly still stepping after 25s)"));
  await s(1200);
  return true;
}

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

/* page.screenshot({clip}) measures from the DOCUMENT origin — shoot full
   and crop after, or a scrolled page hands back a blank rectangle */
async function crop(buf, box, file, zoom = 1) {
  const meta = await sharp(buf).metadata();
  const x = Math.max(0, Math.round(box.x));
  const y = Math.max(0, Math.round(box.y));
  // CLAMPED TO THE IMAGE. A grid scrolled so its top is above the fold
  // has a negative y; clamping only the origin and keeping the full
  // height then asks for a rectangle that runs off the bottom, and sharp
  // answers "bad extract area" rather than truncating.
  const w = Math.max(1, Math.min(Math.round(box.w), meta.width - x));
  const h = Math.max(1, Math.min(Math.round(box.h), meta.height - y));
  let img = sharp(buf).extract({ left: x, top: y, width: w, height: h });
  if (zoom !== 1)
    img = img.resize({ width: w * zoom, kernel: sharp.kernel.nearest });
  await img.toFile(`${OUT}/${file}`);
}

/* brightest / darkest pixel in a box. INSET defaults to 3px: the card has
   a 20px radius and a bounding box's corners fall outside it onto the
   page's own cream ground. */
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
   THE ADDRESS-CLIP TABLE, at three card widths. This runs FIRST at every
   viewport because it is the reason this pass exists.
   ═══════════════════════════════════════════════════════════════════════ */
async function clipTable(page, tag) {
  return page.evaluate(
    (sel, tag) => {
      const cards = [...document.querySelectorAll(`${sel} > li`)];
      const cardW = cards[0]
        ? +cards[0]
            .querySelector("[data-plate]")
            .getBoundingClientRect()
            .width.toFixed(1)
        : null;
      const rows = [];
      for (const c of cards) {
        const venue =
          c
            .querySelector('[class*="cardLogo"]:not([class*="Mark"])')
            ?.getAttribute("aria-label") ?? "?";
        // `_addr__` matches the column's own CSS-module class exactly —
        // a plain [class*="addr"] also catches .addrArea and .addrLine
        const addr = c.querySelector('[class*="_addr__"]');
        const lines = [
          ...c.querySelectorAll('[class*="addrArea"],[class*="addrLine"]'),
        ];
        const measure = addr ? +addr.getBoundingClientRect().width.toFixed(1) : 0;
        for (let i = 0; i < lines.length; i++) {
          const el = lines[i];
          /* THE INTRINSIC WIDTH OF THE TEXT, off a Range around the text
             node. scrollWidth alone is a PASS/FAIL and nothing more: it
             is clamped to clientWidth whenever the line fits, so a table
             built on it reports "slack 0" on a line with 40px to spare
             and on a line with 1px, and there is no way to see the
             margin closing. A Range measures the glyphs, so the slack
             column below is a real number and a future pass can watch it
             shrink. */
          const rg = document.createRange();
          rg.selectNodeContents(el);
          const ink = +rg.getBoundingClientRect().width.toFixed(1);
          rows.push({
            at: tag,
            card: cardW,
            venue,
            line: i + 1,
            text: el.textContent,
            measure,
            clientW: el.clientWidth,
            scrollW: el.scrollWidth,
            ink,
            slack: +(el.clientWidth - ink).toFixed(1),
            over: el.scrollWidth - el.clientWidth,
            clipped: el.scrollWidth > el.clientWidth + 1,
          });
        }
      }
      return rows;
    },
    GRID,
    tag,
  );
}

const allClip = [];

/* ═══════════════════════════════════════════════════════════════════════
   1440 — the whole argument
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n=== 1440x900 ===");
const { page, errors } = await open(1440, 900);

/* ── INTRO, watched from a fresh page the way a reader arms it. The card's
   aspect moved from 5/4 to 3:4.3 this pass, which moves every landing
   seat the flight measures — so this is a regression check with teeth. */
const trace = await page.evaluate(async () => {
  const sec = document.querySelector("#restaurants");
  const seen = new Set();
  let armed = false;
  for (let i = 0; i < 400 && !armed; i++) {
    window.scrollBy(0, 40);
    await new Promise((r) => requestAnimationFrame(() => r()));
    if (sec.dataset.assemblyArmed === "1") armed = true;
    const st = sec.dataset.assemblyStep;
    if (st != null) seen.add(Number(st));
  }
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
  "INTRO reached done after the aspect change",
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
      ratio: +(r.width / r.height).toFixed(4),
      opacity: +cs.opacity,
      transform: cs.transform,
      radius: getComputedStyle(p.querySelector('[class*="cardSurface"]'))
        .borderTopLeftRadius,
    };
  });
}, GRID);
const s0 = seats[0];
ok(
  "SHAPE eight cards, one size",
  seats.length === 8 &&
    seats.every((x) => Math.abs(x.w - s0.w) < 0.5 && Math.abs(x.h - s0.h) < 0.5),
  `n=${seats.length}  ${s0.w}x${s0.h}  heights=[${seats.map((x) => x.h).join(", ")}]`,
);
ok(
  "SHAPE the card is 3 : 4.3 with a 20px radius",
  Math.abs(s0.ratio - 3 / 4.3) < 0.005 && s0.radius === "20px",
  `ratio ${s0.ratio} (target ${(3 / 4.3).toFixed(4)}) · radius ${s0.radius}`,
);
ok(
  "INTRO every plate on its seat, opaque and untransformed",
  seats.every(
    (x) =>
      x.opacity === 1 &&
      (x.transform === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(x.transform)),
  ),
  `opacity=[${[...new Set(seats.map((x) => x.opacity))].join(",")}] transform=${[...new Set(seats.map((x) => x.transform))].join(" | ")}`,
);

await seatGrid(page);

/* ── CLIP at the 274px card ─────────────────────────────────────────── */
allClip.push(...(await clipTable(page, "1440 / 274px card")));

/* THE NEGATIVE CONTROL. A clip assertion that cannot be made to fail is
   not an assertion — so the address column is forced to 100px and the
   same measurement must now report clipping on every venue.
   THE FIRST VERSION OF THIS SQUEEZE DID NOTHING, and the reason is worth
   keeping: `max-width: calc(100% - 30px)` resolves the percentage
   against the column's CONTAINING BLOCK (the 242px row), not against the
   column's own 134–148px width, so it computed to 212px and was never a
   constraint at all. A squeeze has to be stated in absolute terms. */
await page.addStyleTag({
  content: `${GRID} [class*="_addr__"] { flex: 0 0 100px !important; width: 100px !important; }`,
});
await s(300);
const control = await clipTable(page, "control");
await page.evaluate(() => {
  const t = [...document.querySelectorAll("style")].pop();
  if (t && /flex: 0 0 100px/.test(t.textContent)) t.remove();
});
await s(300);
const controlHits = control.filter((r) => r.clipped);
ok(
  "CLIP the harness can actually detect a clip (column forced to 100px)",
  controlHits.length > 0,
  `${controlHits.length}/${control.length} lines clip when the column is forced to 100px — e.g. ${controlHits[0]?.venue} "${controlHits[0]?.text}" over by ${controlHits[0]?.over}px. The real table below is therefore measuring something.`,
);

/* ── RAMP: is the material genuinely photo-derived, and is it edgeless? */
const rampCss = await page.evaluate((sel) => {
  const c = document.querySelector(`${sel} > li`);
  const b = c.querySelector('[class*="rampBlur"]');
  const sc = c.querySelector('[class*="rampScrim"]');
  const card = c.querySelector('[class*="cardSurface"]');
  const cb = card.getBoundingClientRect();
  const bb = b.getBoundingClientRect();
  const cs = getComputedStyle(b);
  return {
    filter: cs.backdropFilter || cs.webkitBackdropFilter,
    mask: cs.maskImage || cs.webkitMaskImage,
    scrim: getComputedStyle(sc).backgroundImage,
    blurOpacity: +cs.opacity,
    scrimOpacity: +getComputedStyle(sc).opacity,
    share: +((bb.height / cb.height) * 100).toFixed(1),
    pointer: cs.pointerEvents + "/" + getComputedStyle(sc).pointerEvents,
    // the retired panel's tells — a --maroon tint and a top hairline
    blockBg: getComputedStyle(c.querySelector('[class*="glass"]'))
      .backgroundImage,
    blockBorderTop: getComputedStyle(c.querySelector('[class*="glass"]'))
      .borderTopWidth,
  };
}, GRID);
ok(
  "RAMP the blur is live and masked, the scrim is neutral black",
  /blur\(34px\)/.test(rampCss.filter) &&
    /saturate\(1\.5\)|saturate\(150%\)/.test(rampCss.filter) &&
    /linear-gradient/.test(rampCss.mask) &&
    /rgba\(0,\s*0,\s*0/.test(rampCss.scrim) &&
    rampCss.pointer === "none/none",
  `filter="${rampCss.filter}" · masked=${/linear-gradient/.test(rampCss.mask)} · share=${rampCss.share}% · pointer-events=${rampCss.pointer}`,
);
ok(
  "RAMP the retired panel is gone — no tint, no hairline on the block",
  rampCss.blockBg === "none" && parseFloat(rampCss.blockBorderTop) === 0,
  `block background=${rampCss.blockBg} · border-top=${rampCss.blockBorderTop}`,
);

/* the grid, settled, at 1440 — and the pixels every ramp assertion reads */
const grid1440 = await page.evaluate((sel) => {
  const g = document.querySelector(sel).getBoundingClientRect();
  return {
    grid: { x: g.x, y: g.y, w: g.width, h: g.height },
    cards: [...document.querySelectorAll(`${sel} > li`)].map((c) => {
      const el = c.querySelector('[class*="cardSurface"]');
      const r = el.getBoundingClientRect();
      const blk = c.querySelector('[class*="glass"]').getBoundingClientRect();
      return {
        venue:
          c
            .querySelector('[class*="cardLogo"]:not([class*="Mark"])')
            ?.getAttribute("aria-label") ?? "?",
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        blockH: +blk.height.toFixed(1),
        blockTopFrac: +(((blk.y - r.y) / r.height) * 100).toFixed(1),
      };
    }),
  };
}, GRID);

const img1440 = await shoot(page, "grid-1440.png");
await crop(img1440.buf, grid1440.grid, "grid-1440-crop.png");
await crop(
  img1440.buf,
  { x: grid1440.cards[0].x, y: grid1440.cards[0].y, w: grid1440.cards[0].w, h: grid1440.cards[0].h },
  "card-bintang-1440.png",
);
await crop(
  img1440.buf,
  { x: grid1440.cards[4].x, y: grid1440.cards[4].y, w: grid1440.cards[4].w, h: 90 },
  "mark-hoodwood-4x.png",
  4,
);

/* THE BLOCK'S HEIGHT — uniform, with no min-height propping it up */
const blockHs = grid1440.cards.map((c) => c.blockH);
ok(
  "BLOCK one height across the eight cards, with no min-height",
  Math.max(...blockHs) - Math.min(...blockHs) <= 1,
  `${Math.min(...blockHs)}–${Math.max(...blockHs)}px (${(
    (blockHs[0] / grid1440.cards[0].h) *
    100
  ).toFixed(1)}% of the card) · [${blockHs.join(", ")}]`,
);

/* RAMP — PHOTO-DERIVED. Sample the ramp's own band on every card, well
   away from any type, and compare HUES. A brand tint gives eight
   identical readings; a blur of eight different photographs cannot. */
const rampHues = grid1440.cards.map((c) => {
  // 46–56% down the card: inside the ramp (which starts at 42%) and above
  // the block (which starts around 66%)
  const y0 = c.y + c.h * 0.46;
  const y1 = c.y + c.h * 0.56;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 2)
    for (let x = c.x + 6; x < c.x + c.w - 6; x += 2) {
      const p = img1440.at(x, y);
      r += p[0];
      g += p[1];
      b += p[2];
      n++;
    }
  const mean = [r / n, g / n, b / n];
  const mx = Math.max(...mean);
  const mn = Math.min(...mean);
  // hue angle, 0–360; and chroma as max−min
  let hue = 0;
  const d = mx - mn;
  if (d > 0.5) {
    if (mx === mean[0]) hue = ((mean[1] - mean[2]) / d) % 6;
    else if (mx === mean[1]) hue = (mean[2] - mean[0]) / d + 2;
    else hue = (mean[0] - mean[1]) / d + 4;
    hue = ((hue * 60) % 360 + 360) % 360;
  }
  return {
    venue: c.venue,
    mean: mean.map((v) => Math.round(v)).join(","),
    hue: +hue.toFixed(0),
    chroma: +d.toFixed(1),
    L: +L(mean).toFixed(4),
  };
});
console.log("\nRAMP — the ramp's own band, averaged, per card");
console.table(rampHues);
const photoHues = rampHues.filter((h) => h.venue !== "Bunso");
const hueSpread = Math.max(...photoHues.map((h) => h.hue)) - Math.min(...photoHues.map((h) => h.hue));
ok(
  "RAMP the colour is the PHOTOGRAPH's, not a brand tint",
  hueSpread > 40 && new Set(photoHues.map((h) => h.mean)).size === photoHues.length,
  `hue spread across the seven photographed cards = ${hueSpread}° · ${photoHues
    .map((h) => `${h.venue} ${h.hue}°`)
    .join(" · ")}  (Bunso ${rampHues.find((h) => h.venue === "Bunso")?.hue}°, a flat ink field — exempt)`,
);

/* RAMP — NO VISIBLE BOUNDARY, AND THE CONTROL IS THE SAME CARD WITHOUT IT.
   Walk a column down the middle of each card through the ramp's extent
   and find the largest row-to-row luminance STEP. A panel with a top edge
   produces one large step at its boundary; a ramp produces a smooth
   series of small ones.

   THE FIRST VERSION OF THIS TEST WAS WRONG AND IS WORTH RECORDING. It
   compared the ramp's largest step against the largest step in the
   photograph ABOVE it — two different pieces of picture, so the
   comparison was meaningless, and it "failed" on four cards whose maxima
   were at 43–48% of the card, i.e. in the ramp's first few percent where
   the mask is still near zero and what is on screen is essentially raw
   photograph.

   THE HONEST CONTROL IS THE SAME PIXELS WITH THE RAMP TURNED OFF. The
   ramp can only blur and darken, so it cannot ADD a step unless it has an
   edge — which is exactly the thing under test. Both renders, same rows,
   same cards.
   The photo-less card is the second, independent proof: on Bunso there
   is no picture in the band at all, so whatever step is measured there is
   the ramp's own construction and nothing else. */
const rampOffCards = grid1440.cards;
await page.addStyleTag({
  content: `${GRID} [class*="rampBlur"], ${GRID} [class*="rampScrim"] { display: none !important; }`,
});
await s(400);
const imgNoRamp = await shoot(page, "ramp-off.png");
await page.evaluate(() => {
  const t = [...document.querySelectorAll("style")].pop();
  if (t && /rampBlur/.test(t.textContent)) t.remove();
});
await s(400);

const colStep = (img, c, y0, y1) => {
  let worst = 0;
  let at = null;
  for (let y = y0; y < y1; y++) {
    let a = 0;
    let b = 0;
    // average a 24px-wide row so a single dark object does not read as
    // an edge
    for (let x = c.x + c.w / 2 - 12; x < c.x + c.w / 2 + 12; x++) {
      a += L(img.at(x, y));
      b += L(img.at(x, y + 1));
    }
    const d = Math.abs(b - a) / 24;
    if (d > worst) {
      worst = d;
      at = +(((y - c.y) / c.h) * 100).toFixed(1);
    }
  }
  return { worst: +worst.toFixed(4), at };
};
const edges = rampOffCards.map((c) => {
  // 40% (just above the ramp's 42% start) to 64% (just above the block)
  const on = colStep(img1440, c, c.y + c.h * 0.4, c.y + c.h * 0.64);
  const off = colStep(imgNoRamp, c, c.y + c.h * 0.4, c.y + c.h * 0.64);
  return {
    venue: c.venue,
    withRamp: on.worst,
    at: on.at,
    sameRowsNoRamp: off.worst,
    added: +(on.worst - off.worst).toFixed(4),
  };
});
console.log(
  "\nRAMP — largest row-to-row luminance step over the same rows, ramp ON vs ramp OFF",
);
console.table(edges);
const bunsoEdge = edges.find((e) => e.venue === "Bunso");
ok(
  "RAMP no visible boundary — it adds no step the picture did not already have",
  edges.every((e) => e.added <= 0.004),
  edges
    .map((e) => `${e.venue} ${e.withRamp} vs ${e.sameRowsNoRamp} (${e.added >= 0 ? "+" : ""}${e.added})`)
    .join(" · "),
);
ok(
  "RAMP isolated on the photo-less card, the ramp's own largest step is invisible",
  bunsoEdge.withRamp < 0.005,
  `Bunso (flat ink field, no picture in the band): largest step ${bunsoEdge.withRamp} across the whole ramp — a JND on a mid grey is ~0.01`,
);

/* ── MARK: the boxes, the rendered ink, and the true ground ──────────── */
const markBoxes = await page.evaluate((sel) => {
  return [...document.querySelectorAll(`${sel} > li`)].map((c) => {
    const m = c.querySelector('[class*="cardLogoMark"]');
    const slot = c.querySelector('[class*="cardLogo"]:not([class*="Mark"])');
    const r = m.getBoundingClientRect();
    const cs = getComputedStyle(m);
    return {
      venue: slot?.getAttribute("aria-label"),
      boxW: +r.width.toFixed(1),
      boxH: +r.height.toFixed(1),
      maskPos: cs.maskPosition || cs.webkitMaskPosition,
      maskSize: cs.maskSize || cs.webkitMaskSize,
      x: r.x - 8,
      y: r.y - 8,
      w: r.width + 16,
      h: r.height + 16,
      slotX: +r.x.toFixed(1),
      slotY: +r.y.toFixed(1),
    };
  });
}, GRID);

const imgCream = await shoot(page, "mark-fill-cream.png");
await page.addStyleTag({
  content: `${GRID} [class*="cardLogoMark"] { background-color: #000 !important; }`,
});
await s(350);
const imgBlack = await shoot(page, "mark-fill-black.png");
await page.evaluate(() => {
  const t = [...document.querySelectorAll("style")].pop();
  if (t && /cardLogoMark/.test(t.textContent)) t.remove();
});
await s(300);

const CREAM = [244, 240, 228];
const markRows = [];
for (const b of markBoxes) {
  const W = Math.round(b.w);
  const H = Math.round(b.h);
  const alpha = new Float32Array(W * H);
  const ground = new Array(W * H);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const pc = imgCream.at(b.x + i, b.y + j);
      const pb = imgBlack.at(b.x + i, b.y + j);
      const a = Math.min(1, Math.max(0, (pc[1] - pb[1]) / CREAM[1]));
      alpha[j * W + i] = a;
      ground[j * W + i] =
        a > 0.98 ? null : pb.map((v) => Math.min(255, v / (1 - a)));
    }
  /* THE RENDERED INK BOX — the bounding box of every pixel the mask
     actually covers. This is what "sized by area" is measured on: the
     element's box is 104 × 38 for everyone, but the INK inside it is what
     a reader sees, and it is the thing the eight marks have to agree on. */
  let ix0 = 1e9;
  let iy0 = 1e9;
  let ix1 = -1;
  let iy1 = -1;
  let solid = 0;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      if (alpha[j * W + i] <= 0.08) continue;
      if (i < ix0) ix0 = i;
      if (i > ix1) ix1 = i;
      if (j < iy0) iy0 = j;
      if (j > iy1) iy1 = j;
      if (alpha[j * W + i] >= 0.8) solid++;
    }
  /* worst GROUND pixel within 2px of a solid MARK pixel. SOLID IS 0.8,
     NOT 0.99: five of the eight marks are scripts or thin serifs drawn
     from PNGs several hundred pixels wide into a 38px slot, and after
     that downsample a stroke can be two partial pixels with no fully
     opaque core. 0.08 is the coverage below which a pixel is ground. */
  let worst = -1;
  let worstPx = null;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      if (alpha[j * W + i] < 0.8) continue;
      for (let dj = -2; dj <= 2; dj++)
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
  const inkW = ix1 - ix0 + 1;
  const inkH = iy1 - iy0 + 1;
  markRows.push({
    venue: b.venue,
    box: `${b.boxW}x${b.boxH}`,
    ink: `${inkW}x${inkH}`,
    inkArea: inkW * inkH,
    // where the ink STARTS inside the box — the left-top anchoring proof
    inkLeftOffset: ix0 - 8,
    inkTopOffset: iy0 - 8,
    glyphPx: solid,
    contrast: worst < 0 ? null : +CR(CREAM, worstPx).toFixed(2),
    worstGroundPx: worstPx ? worstPx.join(",") : null,
  });
}
console.log("\nMARK — the eight boxes, their rendered ink, and the ground beside a glyph");
console.table(markRows);
const areas = markRows.map((r) => r.inkArea);
ok(
  "MARK the eight marks are visually comparable (rendered ink, not box)",
  Math.max(...areas) / Math.min(...areas) < 2.3,
  `ink areas ${Math.min(...areas)}–${Math.max(...areas)}px² (spread ${(
    Math.max(...areas) / Math.min(...areas)
  ).toFixed(2)}x) · widths ${markRows.map((r) => r.ink.split("x")[0]).join("/")}`,
);
/* LEFT-TOP ANCHORING, measured on the INK rather than on the box. The
   boxes are identical by construction, so the box proves nothing; what
   matters is where the first lit pixel lands.
   BUNSO IS EXCLUDED AND SAYS SO. Its card has no logo on file, so it
   wears /images/bunso.png — a bitmap trimmed to its own ink, with zero
   transparent margin, where the seven real marks carry 3.7–4.0% of
   padding on each edge of their canvas. It therefore starts at offset 0
   where they start at 2–4, and that is a fact about the asset, not about
   the layout. Fix the asset and the number joins the others. */
const anchored = markRows.filter((r) => r.venue !== "Bunso");
ok(
  "MARK anchored LEFT TOP — all seven marks start at the same corner of the box",
  markBoxes.every((b) => /^0(px|%)? 0(px|%)?$/.test(b.maskPos.trim())) &&
    Math.max(...anchored.map((r) => r.inkLeftOffset)) -
      Math.min(...anchored.map((r) => r.inkLeftOffset)) <=
      2 &&
    Math.max(...anchored.map((r) => r.inkTopOffset)) -
      Math.min(...anchored.map((r) => r.inkTopOffset)) <=
      2,
  `mask-position=${markBoxes[0].maskPos} size=${markBoxes[0].maskSize} · ink left offsets [${markRows
    .map((r) => `${r.venue.split(" ")[0]} ${r.inkLeftOffset}`)
    .join(", ")}] · top offsets [${markRows
    .map((r) => r.inkTopOffset)
    .join(",")}]  (Bunso: untrimmed bitmap, no canvas padding — excluded)`,
);
const markMin = Math.min(...markRows.map((r) => r.contrast ?? 99));
ok(
  "MARK cream survives every photograph (3:1, WCAG 1.4.11)",
  markRows.every((r) => r.glyphPx >= 12 && (r.contrast ?? 0) >= 3),
  `worst = ${markMin.toFixed(2)}:1 on ${markRows.find((r) => r.contrast === markMin)?.venue} · ` +
    markRows.map((r) => `${r.venue} ${r.contrast}`).join(" · "),
);

/* ── BLOCK: the type's contrast against its own composited ground ───── */
const typeSpec = await page.evaluate((sel) => {
  return [...document.querySelectorAll(`${sel} > li`)].map((c) => {
    const venue =
      c
        .querySelector('[class*="cardLogo"]:not([class*="Mark"])')
        ?.getAttribute("aria-label") ?? "?";
    const pick = (q) => {
      const el = c.querySelector(q);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        colour: getComputedStyle(el).color,
        size: getComputedStyle(el).fontSize,
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
      };
    };
    return {
      venue,
      area: pick('[class*="addrArea"]'),
      line: pick('[class*="addrLine"]'),
      stat: pick('[class*="statValue"]'),
    };
  });
}, GRID);

// hide the block's type so the composited GROUND under each band is what
// gets sampled — the ramp is left running
await page.addStyleTag({
  content: `${GRID} [class*="addrArea"], ${GRID} [class*="addrLine"], ${GRID} [class*="statValue"], ${GRID} [class*="statIcon"] { visibility: hidden !important; }`,
});
await s(350);
const imgBare = await shoot(page, "block-ground.png");
await page.evaluate(() => {
  const t = [...document.querySelectorAll("style")].pop();
  if (t && /addrArea/.test(t.textContent)) t.remove();
});
await s(300);

const typeRows = [];
for (const t of typeSpec) {
  const row = { venue: t.venue };
  for (const [key, spec] of Object.entries(t)) {
    if (key === "venue" || !spec) continue;
    const e = extremes(imgBare, spec, 0);
    row[`${key}Px`] = e.px ? e.px.map(Math.round).join(",") : null;
    row[`${key}CR`] = e.px ? +CR(rgb(spec.colour), e.px).toFixed(2) : null;
  }
  typeRows.push(row);
}
console.log("\nBLOCK — each element against the BRIGHTEST pixel of its own composited ground");
console.table(typeRows);
const worstType = Math.min(
  ...typeRows.flatMap((r) => [r.areaCR, r.lineCR, r.statCR].filter(Boolean)),
);
ok(
  "BLOCK every line of type clears 4.5:1 on the worst ground in the set",
  worstType >= 4.5,
  `worst = ${worstType.toFixed(2)}:1 · area ${typeRows.map((r) => r.areaCR).join("/")} · line ${typeRows
    .map((r) => r.lineCR)
    .join("/")} · stat ${typeRows.map((r) => r.statCR).filter(Boolean).join("/")}`,
);

/* ── CONTROLS ───────────────────────────────────────────────────────── */
const ctrl = await page.evaluate((sel) => {
  const ann = [];
  return {
    cards: [...document.querySelectorAll(`${sel} > li`)].map((c) => {
      const venue =
        c
          .querySelector('[class*="cardLogo"]:not([class*="Mark"])')
          ?.getAttribute("aria-label") ?? "?";
      const row = c.querySelector('[class*="actionRow"]');
      const btns = [...c.querySelectorAll('[class*="cardBtn"]')];
      const rowR = row?.getBoundingClientRect();
      return {
        venue,
        n: btns.length,
        labels: btns.map((b) => b.textContent.trim()).join(" | "),
        widths: btns
          .map((b) => +b.getBoundingClientRect().width.toFixed(1))
          .join(" | "),
        rowW: rowR ? +rowR.width.toFixed(1) : null,
        // stretched? a content-sized pill is well under the row
        maxShare: rowR
          ? +(
              (Math.max(...btns.map((b) => b.getBoundingClientRect().width)) /
                rowR.width) *
              100
            ).toFixed(1)
          : null,
        pushedRight:
          btns.length === 2
            ? getComputedStyle(btns[1]).marginLeft === "auto" ||
              Math.round(
                btns[1].getBoundingClientRect().right - rowR.right,
              ) === 0
            : getComputedStyle(btns[0]).marginLeft !== "auto",
        fills: btns.map((b) => getComputedStyle(b).backgroundColor).join(" | "),
        colours: btns.map((b) => getComputedStyle(b).color).join(" | "),
      };
    }),
    // ANNATTO ANYWHERE ON THE CARD? --saffron is #b0512c = rgb(176,81,44)
    annatto: (() => {
      const hits = [];
      for (const c of document.querySelectorAll(`${sel} > li`))
        for (const el of c.querySelectorAll("*")) {
          const cs = getComputedStyle(el);
          for (const p of [
            "color",
            "backgroundColor",
            "borderTopColor",
            "borderLeftColor",
            "backgroundImage",
            "outlineColor",
          ]) {
            const v = cs[p];
            if (/176,\s*81,\s*44|b0512c|138,\s*61,\s*31/i.test(v))
              hits.push(`${el.className}.${p}=${v}`);
          }
        }
      return hits.slice(0, 6);
    })(),
  };
}, GRID);
console.log("\nCONTROLS");
console.table(ctrl.cards);
ok(
  "CTRL two pills where there is a menu, one where there is not",
  ctrl.cards.filter((c) => c.n === 2).length === 4 &&
    ctrl.cards.filter((c) => c.n === 1).length === 4 &&
    ctrl.cards.every((c) => c.pushedRight),
  `two: ${ctrl.cards
    .filter((c) => c.n === 2)
    .map((c) => c.venue)
    .join(", ")} · one: ${ctrl.cards
    .filter((c) => c.n === 1)
    .map((c) => `${c.venue} (${c.labels})`)
    .join(", ")}`,
);
ok(
  "CTRL sized to content — never stretched to the block's width",
  ctrl.cards.every((c) => c.maxShare < 60),
  `widest pill takes ${Math.max(...ctrl.cards.map((c) => c.maxShare))}% of its row · ${ctrl.cards
    .map((c) => `${c.venue} ${c.widths}`)
    .join(" · ")}`,
);
ok(
  "CTRL no annatto anywhere on the card",
  ctrl.annatto.length === 0,
  ctrl.annatto.length ? ctrl.annatto.join(" | ") : "no --saffron/--saffron-ink in any computed colour on any card",
);

/* Bunso — no photograph, dark field, same treatment, "Opening soon" */
const bunso = ctrl.cards.find((c) => c.venue === "Bunso");
ok(
  'BUNSO dark field, same treatment, control reads "Opening soon"',
  bunso?.labels === "Opening soon" && bunso.n === 1,
  `labels="${bunso?.labels}" · block height ${grid1440.cards.find((c) => c.venue === "Bunso")?.blockH}px (grid ${Math.min(
    ...blockHs,
  )}–${Math.max(...blockHs)})`,
);

/* ── HOVER: the wipe opens and the plate does not move ──────────────── */
const c0 = grid1440.cards[0];
await page.mouse.move(c0.x - 200, c0.y + 20);
await s(120);
const rectBefore = await page.evaluate(
  (sel) => {
    const r = document
      .querySelector(`${sel} [data-plate="0"]`)
      .getBoundingClientRect();
    return [r.x, r.y, r.width, r.height].map((v) => +v.toFixed(2));
  },
  GRID,
);
await page.mouse.move(c0.x + 40, c0.y + 40);
await s(150);
const midWipe = await page.evaluate((sel) => {
  const v = document.querySelector(`${sel} > li video`);
  return v ? { cls: v.className, clip: getComputedStyle(v).clipPath, op: getComputedStyle(v).opacity } : null;
}, GRID);
await s(700);
const afterWipe = await page.evaluate((sel) => {
  const v = document.querySelector(`${sel} > li video`);
  const r = document
    .querySelector(`${sel} [data-plate="0"]`)
    .getBoundingClientRect();
  return {
    cls: v ? v.className : null,
    clip: v ? getComputedStyle(v).clipPath : null,
    op: v ? +getComputedStyle(v).opacity : null,
    wipeX: v ? v.style.getPropertyValue("--wipe-x") : null,
    rect: [r.x, r.y, r.width, r.height].map((v2) => +v2.toFixed(2)),
  };
}, GRID);
ok(
  "HOVER the film wipes open FROM THE CURSOR",
  !!afterWipe.wipeX && /hoverClipOn/.test(afterWipe.cls || "") && afterWipe.op === 1,
  `--wipe-x=${afterWipe.wipeX} class="${afterWipe.cls}" opacity=${afterWipe.op} clip=${afterWipe.clip}`,
);
ok(
  "HOVER the plate's rectangle does not move while it wipes",
  JSON.stringify(rectBefore) === JSON.stringify(afterWipe.rect),
  `before ${rectBefore.join(",")} → after ${afterWipe.rect.join(",")}`,
);
await page.mouse.move(c0.x - 200, c0.y + 20);
await s(400);

const REDUCED_MOTION_WARNING = /prefers-reduced-motion/i;
const newErrors = errors.filter((e) => !REDUCED_MOTION_WARNING.test(e));
ok(
  "CONSOLE no new errors (the pre-existing prefers-reduced-motion hydration warning excluded by name)",
  newErrors.length === 0,
  newErrors.length ? newErrors.slice(0, 4).join(" || ") : `${errors.length} excluded, 0 others`,
);
await page.close();

/* ═══════════════════════════════════════════════════════════════════════
   981 — the 4-up at its narrowest card (183px), where the container
   query does its work
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n=== 981x900 — the 4-up, 183px card ===");
const { page: p981 } = await open(981, 900);
await walk(p981);
await seatGrid(p981);
allClip.push(...(await clipTable(p981, "981 / 183px card")));

const four = await p981.evaluate((sel) => {
  return [...document.querySelectorAll(`${sel} > li`)].map((c) => {
    const card = c.querySelector('[class*="cardSurface"]').getBoundingClientRect();
    const mark = c.querySelector('[class*="cardLogoMark"]').getBoundingClientRect();
    const sticker = c.querySelector('[class*="stickerBadge"]');
    const btn = c.querySelector('[class*="cardBtn"]');
    const blk = c.querySelector('[class*="glass"]').getBoundingClientRect();
    const hours = c.querySelector('[data-stat="hours"]');
    return {
      venue:
        c
          .querySelector('[class*="cardLogo"]:not([class*="Mark"])')
          ?.getAttribute("aria-label") ?? "?",
      cardW: +card.width.toFixed(1),
      cardH: +card.height.toFixed(1),
      blockH: +blk.height.toFixed(1),
      blockShare: +((blk.height / card.height) * 100).toFixed(1),
      markW: +mark.width.toFixed(1),
      markH: +mark.height.toFixed(1),
      // COMPUTED height, not the bounding rect: the sticker carries an 8°
      // rotation, so its box measures 38 × (cos8 + sin8) = 42.9 and an
      // assertion written against the rect reads a 38px override as 42.9
      // and calls the container query dead. (It did, once.)
      stickerH: sticker ? parseFloat(getComputedStyle(sticker).height) : null,
      stickerBoxH: sticker
        ? +sticker.getBoundingClientRect().height.toFixed(1)
        : null,
      // the gap the crown's space-between leaves between the two
      gap: sticker
        ? +(sticker.getBoundingClientRect().x - mark.right).toFixed(1)
        : null,
      btnH: btn ? +getComputedStyle(btn).minHeight.replace("px", "") : null,
      hoursShown: hours ? getComputedStyle(hours).display !== "none" : null,
    };
  });
}, GRID);
console.log("\n4-UP — the narrowest card in the layout");
console.table(four);
const belly = four.find((f) => f.venue === "Belly");
ok(
  "CROWN Belly's sticker is clear of the mark at the narrowest card",
  belly && belly.gap > 20,
  `mark ${belly?.markW}x${belly?.markH} · sticker ${belly?.stickerH}px · clearance ${belly?.gap}px on a ${belly?.cardW}px card`,
);
ok(
  "4UP the container-query overrides still win on SOURCE ORDER",
  four.every((f) => f.btnH === 26) &&
    four.every((f) => f.hoursShown === false || f.hoursShown === null) &&
    belly.stickerH === 38,
  `cardBtn min-height ${[...new Set(four.map((f) => f.btnH))].join("|")}px (base clamp resolves to 30 here) · sticker ${belly.stickerH}px computed / ${belly.stickerBoxH}px rotated box (base clamp 44) · hours stat shown = ${[
    ...new Set(four.map((f) => f.hoursShown)),
  ].join("|")}`,
);
ok(
  "4UP the block stays a footer, not a caption block",
  four.every((f) => f.blockShare < 46),
  `${Math.min(...four.map((f) => f.blockShare))}–${Math.max(
    ...four.map((f) => f.blockShare),
  )}% of the card · ${four[0].cardW}x${four[0].cardH}`,
);
const img981 = await shoot(p981, "grid-981.png");
const g981 = await p981.evaluate((sel) => {
  const g = document.querySelector(sel).getBoundingClientRect();
  return { x: g.x, y: g.y, w: g.width, h: g.height };
}, GRID);
await crop(img981.buf, g981, "grid-981-crop.png");
await p981.close();

/* ═══════════════════════════════════════════════════════════════════════
   390 — the single column, 358px card
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n=== 390x844 — single column, 358px card ===");
const { page: p390 } = await open(390, 844);
await walk(p390);
await seatGrid(p390);
allClip.push(...(await clipTable(p390, "390 / 358px card")));
const img390 = await shoot(p390, "grid-390.png");
const g390 = await p390.evaluate((sel) => {
  const g = document.querySelector(sel).getBoundingClientRect();
  const c = document.querySelector(`${sel} > li`).getBoundingClientRect();
  return { grid: { x: g.x, y: g.y, w: g.width, h: Math.min(g.height, 820) }, card: c };
}, GRID);
await crop(img390.buf, g390.grid, "grid-390-crop.png");
await p390.close();

/* ═══════════════════════════════════════════════════════════════════════
   THE CLIP TABLE — the point of the pass
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n\nCLIP — every address line, every venue, three card widths");
for (const at of [...new Set(allClip.map((r) => r.at))]) {
  console.log(`\n  ${at}`);
  console.table(
    allClip
      .filter((r) => r.at === at)
      .map((r) => ({
        venue: r.venue,
        ln: r.line,
        text: r.text,
        measure: r.measure,
        clientW: r.clientW,
        textW: r.ink,
        slack: r.slack,
        clipped: r.clipped,
      })),
  );
}
const clipped = allClip.filter((r) => r.clipped);
const tightest = allClip.reduce((a, b) => (a.slack <= b.slack ? a : b));
ok(
  "CLIP no address line clips on any venue at 358 / 274 / 183",
  clipped.length === 0,
  clipped.length
    ? clipped
        .map((r) => `${r.at} ${r.venue} L${r.line} "${r.text}" over by ${r.over}px`)
        .join(" | ")
    : `${allClip.length} lines checked (8 venues x 3 lines x 3 widths); tightest slack ${tightest.slack}px — ${tightest.venue} L${tightest.line} "${tightest.text}" at ${tightest.at}`,
);
ok(
  "CLIP the tightest line still has real headroom, not a rounding win",
  tightest.slack >= 6,
  `tightest ${tightest.slack}px on ${tightest.venue} L${tightest.line} at ${tightest.at}; the three widest lines in the set are ` +
    [...allClip]
      .sort((a, b) => a.slack - b.slack)
      .slice(0, 3)
      .map((r) => `"${r.text}" ${r.ink}px in ${r.clientW}px (${r.at})`)
      .join(" · "),
);

await browser.close();

console.log("\n═══════════════════════════════════════════════════════════");
for (const r of R) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.n}`);
const failed = R.filter((r) => !r.pass);
console.log(`\n${R.length - failed.length}/${R.length} passed  ·  shots in ${OUT}`);
process.exit(failed.length ? 1 : 0);
