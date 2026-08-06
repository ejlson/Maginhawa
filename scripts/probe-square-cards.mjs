/* THE SQUARE VENUE CARD ON /restaurants — and the proof that sharing the
   card with the home grid did not move the home grid.

   This probe has TWO MODES and they are the two halves of one argument:

     --home     snapshot the HOME grid: every card's rectangle, the block's
                height, the ramp's height, and the computed style of every
                class the card is made of. Run once BEFORE the refactor and
                once after; `--diff a.json b.json` prints what moved. A
                screenshot proves the picture; this proves the numbers.

     (default)  verify /restaurants: the cards are SQUARE and all one size,
                each carries the bare mark, the three-line block with the
                name at 700, the stats and the right controls; no address
                line clips at the real widths the page produces; and the
                name / address / stats clear 4.5:1 against their OWN
                composited ground, sampled off the render rather than
                modelled. Plus the ramp's edgelessness — a luminance-step
                scan down the card — because a square card runs a much
                taller ramp and that is the number most likely to break.

   HARNESS NOTES, inherited from probe-discover-card.mjs and none of them
   negotiable: never networkidle0 (the hero clip loops, the page never
   idles) — domcontentloaded plus the is-loading class; Lenis keeps easing
   for seconds after a scrollTo; walk down in ~500px steps so every
   IntersectionObserver on the way arms; WAIT FOR data-assembly-step TO
   CLEAR before shooting the home grid; headless reports (hover: none) so
   hover is emulated through CDP (puppeteer's own emulateMediaFeatures
   rejects `hover`); page.screenshot({clip}) measures from the DOCUMENT
   origin, so shoot full and crop after.

   /restaurants NOTE: the grid is the page's SECOND view. It is mounted at
   all times (both views crossfade), but it is `pointer-events: none` and
   opacity 0 until the card toggle is pressed — so the probe presses it,
   by aria-label, and waits out the 0.5s crossfade.

   usage: node scripts/probe-square-cards.mjs [port] [outdir] [--home]
          node scripts/probe-square-cards.mjs --diff before.json after.json

   PASS THE PORT. The default below is only a default; this repo has had
   more than one `next dev` alive at a time and a wedged one answers
   static files instantly while hanging every page render, which looks
   exactly like a slow first compile. `lsof -nP -iTCP -sTCP:LISTEN | grep
   node` lists them; check the one you mean actually returns a page before
   reading anything this prints. */
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const argv = process.argv.slice(2);

/* ---- diff mode: no browser, just two snapshots ---- */
if (argv[0] === "--diff") {
  const a = JSON.parse(fs.readFileSync(argv[1], "utf8"));
  const b = JSON.parse(fs.readFileSync(argv[2], "utf8"));
  let moved = 0;
  const walk = (pa, pb, path) => {
    const keys = new Set([...Object.keys(pa ?? {}), ...Object.keys(pb ?? {})]);
    for (const k of keys) {
      const va = pa?.[k];
      const vb = pb?.[k];
      if (va && typeof va === "object") {
        walk(va, vb, `${path}.${k}`);
        continue;
      }
      // 0.5px of tolerance: a dev-server re-render can land a fractional
      // grid track a hair differently without anything having changed.
      const num = typeof va === "number" && typeof vb === "number";
      const same = num ? Math.abs(va - vb) <= 0.5 : String(va) === String(vb);
      if (!same) {
        moved++;
        console.log(`MOVED ${path}.${k}: ${va}  ->  ${vb}`);
      }
    }
  };
  walk(a, b, "");
  console.log(moved === 0 ? "\nIDENTICAL — the home grid did not move." : `\n${moved} value(s) moved.`);
  process.exit(moved === 0 ? 0 : 1);
}

const PORT = argv.find((a) => /^\d+$/.test(a)) || "65366";
const OUT = argv.find((a) => a.startsWith("/")) || "/tmp/square-cards";
const HOME = argv.includes("--home");
const s = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const HOME_GRID = 'ul[aria-label="Our restaurants"]';
const REST_GRID = "[data-venue-grid]";

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
   wrong costs a whole run: a plain token comes back `rgb(244, 240, 228)`,
   but ANY color-mix() comes back `color(srgb 0.76 0.76 0.72)` — the same
   numbers on a 0–1 scale. Read naively every contrast is a fiction. */
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

async function open(w, h, path) {
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
  await page.goto(`http://localhost:${PORT}${path}`, {
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

/* the home grid lives a long way down a Lenis page and re-arms its
   assembly every time it is scrolled back to */
async function seatHomeGrid(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await s(140);
  }
  await s(1000);
  const y = await page.evaluate((sel) => {
    const g = document.querySelector(sel);
    return g ? Math.round(g.getBoundingClientRect().top + window.scrollY) : null;
  }, HOME_GRID);
  if (y == null) return false;
  await page.evaluate((v) => window.scrollTo(0, v - 70), y);
  await s(3000);
  await page
    .waitForFunction(
      () => !document.querySelector("#restaurants")?.dataset.assemblyStep,
      { timeout: 25000, polling: 100 },
    )
    .catch(() => console.log("  (warn: assembly still stepping after 25s)"));
  await s(1500);
  return true;
}

/* /restaurants opens on the WHEEL view; the grid is the other half of a
   crossfade and is inert until the toggle is pressed */
async function seatRestGrid(page) {
  const hit = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label="Card view"]');
    if (!b) return false;
    b.click();
    return true;
  });
  if (!hit) return false;
  await s(1400);
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
  const w = Math.max(1, Math.min(Math.round(box.w), meta.width - x));
  const h = Math.max(1, Math.min(Math.round(box.h), meta.height - y));
  let img = sharp(buf).extract({ left: x, top: y, width: w, height: h });
  if (zoom !== 1) img = img.resize({ width: w * zoom, kernel: sharp.kernel.nearest });
  await img.toFile(`${OUT}/${file}`);
}

/* ═══════════════════════════════════════════════════════════════════════
   THE SNAPSHOT. Everything the card's geometry and its computed style
   say about itself, in a shape two runs can be diffed on.

   ⚠️ EVERY SELECTOR IS A CLASS *SUBSTRING*, and that is the whole reason
   this probe can compare a before and an after across a refactor. CSS
   Modules hash the module's NAME into the class
   (`Discover_cardSurface__ab12` → `VenueCard_cardSurface__cd34`), so a
   literal class name would stop matching the moment the rule moved file
   and the diff would read as "everything vanished" rather than "nothing
   moved". The substring survives the move; the design token in the middle
   of the name is the stable part.
   ═══════════════════════════════════════════════════════════════════════ */
const SNAP = (sel) =>
  ((s2) => {
    const cards = [...document.querySelectorAll(`${s2} > li, ${s2} > article`)];
    const r1 = (n) => Math.round(n * 10) / 10;
    const box = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { w: r1(b.width), h: r1(b.height) };
    };
    const S = {
      surface: '[class*="cardSurface"]',
      glass: '[class*="glass"]',
      rampBlur: '[class*="rampBlur"]',
      rampScrim: '[class*="rampScrim"]',
      crown: '[class*="cardCrown"]',
      logo: '[class*="cardLogo"]:not([class*="Mark"])',
      logoMark: '[class*="cardLogoMark"]',
      area: '[class*="addrArea"]',
      line: '[class*="addrLine"]',
      statValue: '[class*="statValue"]',
      blockRule: '[class*="blockRule"]',
      btn: '[class*="cardBtn"]',
      sticker: '[class*="stickerBadge"]',
    };
    // the computed properties that carry the design: anything a careless
    // move between stylesheets could drop on the floor
    const WATCH = {
      surface: [
        "borderTopLeftRadius",
        "boxShadow",
        "containerType",
        "display",
        "flexDirection",
        "overflow",
      ],
      ramp: ["height", "backdropFilter", "maskImage", "background"],
      scrimEl: ["height", "backgroundImage"],
      crown: ["top", "left", "right", "display", "justifyContent", "zIndex"],
      logo: ["height", "flex", "minWidth"],
      logoMark: ["width", "maskImage", "backgroundColor"],
      glass: ["gap", "padding", "zIndex", "pointerEvents"],
      area: ["fontSize", "fontWeight", "lineHeight", "color", "whiteSpace"],
      line: ["fontSize", "fontWeight", "lineHeight", "color", "whiteSpace"],
      statv: ["fontSize", "fontWeight", "color"],
      rule: ["height", "background"],
      btn: ["minHeight", "padding", "fontSize", "borderRadius"],
      fill: ["backgroundColor", "color"],
      ghost: ["borderColor", "color"],
    };
    const pick = (el, keys) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      const o = {};
      for (const k of keys) o[k] = c[k];
      return o;
    };
    const first = cards[0];
    const q = (root, name) => root?.querySelector(S[name]) ?? null;
    return {
      count: cards.length,
      cards: cards.map((c) => ({
        card: box(q(c, "surface")),
        block: box(q(c, "glass")),
        ramp: box(q(c, "rampScrim")),
        logo: box(q(c, "logoMark")),
        sticker: box(q(c, "sticker")),
        btns: [...c.querySelectorAll(S.btn)].map((b) => b.textContent.trim()),
        name: q(c, "area")?.textContent ?? null,
      })),
      style: first
        ? {
            surface: pick(q(first, "surface"), WATCH.surface),
            rampBlur: pick(q(first, "rampBlur"), WATCH.ramp),
            rampScrim: pick(q(first, "rampScrim"), WATCH.scrimEl),
            crown: pick(q(first, "crown"), WATCH.crown),
            crownWash: (() => {
              const el = q(first, "crown");
              if (!el) return null;
              const c = getComputedStyle(el, "::before");
              return { height: c.height, background: c.backgroundImage };
            })(),
            logo: pick(q(first, "logo"), WATCH.logo),
            logoMark: pick(q(first, "logoMark"), WATCH.logoMark),
            glass: pick(q(first, "glass"), WATCH.glass),
            area: pick(q(first, "area"), WATCH.area),
            line: pick(q(first, "line"), WATCH.line),
            statv: pick(q(first, "statValue"), WATCH.statv),
            blockRule: pick(q(first, "blockRule"), WATCH.rule),
            btn: pick(q(first, "btn"), WATCH.btn),
          }
        : null,
    };
  })(sel);

/* ═══ THE CLIP TABLE — every address line on every card, at whatever
   width this viewport actually produces. scrollWidth > clientWidth by
   more than a pixel IS the ellipsis firing, i.e. a clipped line. ═══ */
const CLIPS = (sel) =>
  ((s2) =>
    [...document.querySelectorAll(`${s2} > li, ${s2} > article`)].map((c) => {
      const name = c.querySelector('[class*="addrArea"]');
      const lines = [...c.querySelectorAll('[class*="addrLine"]')];
      const one = (el) =>
        el
          ? {
              t: el.textContent,
              over: Math.round((el.scrollWidth - el.clientWidth) * 10) / 10,
            }
          : null;
      return {
        venue: name?.textContent ?? "?",
        lines: [one(name), ...lines.map(one)],
      };
    }))(sel);

/* ═══ THE RAMP HAS NO LOCATABLE EDGE.
   Scan one column of pixels down a card and take the largest row-to-row
   luminance step INSIDE the ramp, then the largest step in the band of
   equal height directly ABOVE it — which is pure photograph. A gradient
   that arrives without a boundary cannot produce a step the picture it
   is laid over does not already produce; a hard edge produces one several
   times larger. Comparing the two bands is what makes this a test rather
   than a threshold pulled out of the air: every photograph has its own
   contrast and a fixed number would only measure which venue it was run
   on.

   ⚠️ RUN THIS ON THE BARE RENDER (type, marks, rules and pills hidden).
   A glyph edge is a 0.45 luminance step and it is not a ramp edge; the
   first version of this probe reported exactly that and called it a
   failure. ═══ */
function rampStep(img, cardBox, rampH, xFrac) {
  const x = Math.round(cardBox.x + cardBox.w * xFrac);
  const rampTop = Math.round(cardBox.y + cardBox.h - rampH);
  const scan = (y0, y1) => {
    let worst = 0;
    let at = 0;
    let prev = null;
    for (let y = Math.max(0, y0); y < Math.min(img.h, y1); y++) {
      if (x < 0 || x >= img.w) break;
      const l = L(img.at(x, y));
      if (prev != null && Math.abs(l - prev) > worst) {
        worst = Math.abs(l - prev);
        at = y - cardBox.y;
      }
      prev = l;
    }
    return { worst: +worst.toFixed(4), at: Math.round(at) };
  };
  return {
    // 2px in from the bottom: the card's own radius curves away there
    ramp: scan(rampTop, Math.round(cardBox.y + cardBox.h) - 2),
    // the same height of untouched photograph above it, clamped into the
    // card (on a 70% ramp there are only 30% of the card left, so the
    // control band is shorter than the ramp — that is fine, it only has
    // to be a fair sample of the picture)
    photo: scan(Math.round(cardBox.y) + 2, rampTop),
  };
}

/* THE BRIGHTEST GROUND under a box, read off the BARE render — the same
   frame with every glyph, mark, rule and pill set to `visibility: hidden`
   so the layout is untouched and only the card's material is left. That
   is the only honest way to sample what cream type sits on: on the normal
   render the brightest pixel inside a line of cream text IS the text,
   which reports a 1:1 contrast for every card in the set. */
function brightestGround(img, b) {
  let max = -1;
  let px = [0, 0, 0];
  for (let y = Math.ceil(b.y) + 1; y < b.y + b.h - 1; y++) {
    for (let x = Math.ceil(b.x) + 1; x < b.x + b.w - 1; x++) {
      if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
      const p = img.at(x, y);
      const l = L(p);
      if (l > max) {
        max = l;
        px = p;
      }
    }
  }
  return px;
}

/* everything that is INK on the card, hidden without moving anything.
   `visibility` rather than `display` so every box the contrast pass
   measured is still exactly where it was. */
const BARE = `[class*="addrArea"],[class*="addrLine"],[class*="statValue"],
  [class*="statIcon"],[class*="cardLogoMark"],[class*="stickerBadge"],
  [class*="blockRule"],[class*="statRule"],[class*="cardBtn"],
  /* THE PAGE'S OWN FURNITURE, not the card's, and it has to go for the
     same reason the glyphs do: /restaurants seats the walk-in note and
     the view toggle over the bottom corner of the sheet, and below 981px
     the grid SCROLLS CARDS UNDER THEM. Left visible, the note's own type
     lands inside a card's box and the edge scan reports a 0.087 step at
     y+315 — which is a letterform, not a ramp boundary. (The overlap
     itself is by design; the note inverts its colour against whatever it
     is over. See .walkIn in RestaurantsShowcase.module.css.) */
  [class*="walkIn"],[class*="viewToggle"],nav,header`;

/* ───────────────────────── HOME BASELINE ───────────────────────── */
if (HOME) {
  const out = {};
  for (const [w, h] of [
    [1440, 900],
    [981, 800],
    [390, 844],
  ]) {
    const { page, errors } = await open(w, h, "/");
    await seatHomeGrid(page);
    const snap = await page.evaluate(SNAP, HOME_GRID);
    out[`${w}x${h}`] = snap;
    const img = await shoot(page, `home-${w}.png`);
    const gb = await page.evaluate((sel) => {
      const g = document.querySelector(sel);
      if (!g) return null;
      const b = g.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, HOME_GRID);
    if (gb) await crop(img.buf, gb, `home-grid-${w}.png`);
    if (!snap.count) {
      console.log(`home ${w}: NO CARDS FOUND — the grid did not render`);
    } else {
      const c0 = snap.cards[0];
      const intoRamp = c0.ramp ? ((c0.ramp.h - c0.block.h) / c0.ramp.h) * 100 : NaN;
      console.log(
        `home ${w}: cards=${snap.count} card=${c0.card.w}x${c0.card.h} block=${c0.block.h} (${((c0.block.h / c0.card.h) * 100).toFixed(1)}% of card) ramp=${c0.ramp.h} (${((c0.ramp.h / c0.card.h) * 100).toFixed(1)}%) blockTop=${intoRamp.toFixed(1)}% into ramp  mark=${c0.logo?.w}x${c0.logo?.h} wash=${snap.style.crownWash?.height}`,
      );
    }
    const real = errors.filter((e) => !/prefers-reduced-motion/i.test(e));
    if (real.length) console.log(`  console errors: ${real.length}\n   ${real.slice(0, 4).join("\n   ")}`);
    await page.close();
  }
  const file = `${OUT}/home-snapshot.json`;
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`\nwrote ${file}`);
  await browser.close();
  process.exit(0);
}

/* ───────────────────────── /restaurants ───────────────────────── */
const summary = {};
for (const [w, h] of [
  [1440, 900],
  [981, 800],
  [390, 844],
]) {
  console.log(`\n══════════ /restaurants @ ${w}x${h} ══════════`);
  const { page, errors } = await open(w, h, "/restaurants");
  const seated = await seatRestGrid(page);
  ok(`${w} grid view opens`, seated, seated ? "card toggle pressed" : "no toggle found");
  if (!seated) {
    await page.close();
    continue;
  }

  const snap = await page.evaluate(SNAP, REST_GRID);
  summary[w] = snap;

  /* SHAPE — square, and one size for all eight */
  const ars = snap.cards.map((c) => +(c.card.w / c.card.h).toFixed(3));
  const worstAr = Math.max(...ars.map((a) => Math.abs(a - 1)));
  ok(
    `${w} cards are square`,
    worstAr <= 0.01,
    `aspect ${Math.min(...ars)}–${Math.max(...ars)} (card ${snap.cards[0].card.w}x${snap.cards[0].card.h})`,
  );
  const ws = snap.cards.map((c) => c.card.w);
  const hs = snap.cards.map((c) => c.card.h);
  ok(
    `${w} cards are one size`,
    Math.max(...ws) - Math.min(...ws) <= 1 && Math.max(...hs) - Math.min(...hs) <= 1,
    `w ${Math.min(...ws)}–${Math.max(...ws)}  h ${Math.min(...hs)}–${Math.max(...hs)}`,
  );
  const blocks = snap.cards.map((c) => c.block.h);
  ok(
    `${w} block height is a constant`,
    Math.max(...blocks) - Math.min(...blocks) <= 1,
    `${Math.min(...blocks)}–${Math.max(...blocks)}px = ${((blocks[0] / hs[0]) * 100).toFixed(1)}% of the card`,
  );
  const rampFrac = snap.cards[0].ramp.h / hs[0];
  ok(
    `${w} ramp clears the block`,
    snap.cards[0].ramp.h > blocks[0],
    `ramp ${snap.cards[0].ramp.h}px = ${(rampFrac * 100).toFixed(1)}% of the card; block sits at ${(((snap.cards[0].ramp.h - blocks[0]) / snap.cards[0].ramp.h) * 100).toFixed(1)}% into it`,
  );

  /* FURNITURE — the mark is bare and top-left, the name is 700 */
  const marks = snap.cards.filter((c) => c.logo).length;
  ok(`${w} every card carries its mark`, marks === snap.count, `${marks}/${snap.count}`);
  ok(
    `${w} name is weight 700`,
    snap.style.area.fontWeight === "700",
    `${snap.style.area.fontWeight} @ ${snap.style.area.fontSize}`,
  );
  ok(
    `${w} address pair is quiet + nowrap`,
    snap.style.line.whiteSpace === "nowrap" && snap.style.line.fontWeight === "400",
    `${snap.style.line.fontSize} / ${snap.style.line.color}`,
  );
  ok(
    `${w} ramp blur is live`,
    /blur\(/.test(snap.style.rampBlur.backdropFilter),
    snap.style.rampBlur.backdropFilter,
  );

  /* CONTROLS — the primary from primaryAction(), Menu only where there
     are pages. No dead control anywhere. */
  const ctl = snap.cards.map((c) => `${c.name}: ${c.btns.join(" + ") || "—"}`);
  console.log("  controls\n    " + ctl.join("\n    "));
  const bad = snap.cards.filter((c) => c.btns.length === 0 || c.btns.length > 2);
  ok(`${w} one or two controls per card`, bad.length === 0, `${snap.cards.map((c) => c.btns.length).join("")}`);

  /* CLIP TABLE */
  const clips = await page.evaluate(CLIPS, REST_GRID);
  const over = [];
  for (const c of clips)
    for (const l of c.lines) if (l && l.over > 1) over.push(`${c.venue} "${l.t}" +${l.over}px`);
  console.log(`  clip table @ card ${snap.cards[0].card.w}px`);
  for (const c of clips)
    console.log(
      `    ${c.venue.padEnd(18)} ${c.lines.map((l) => (l ? `${l.over > 1 ? "CLIP" : "ok"}(${l.over})` : "—")).join("  ")}`,
    );
  ok(`${w} no address line clips`, over.length === 0, over.length ? over.join("; ") : "all lines fit");

  /* CONTRAST + RAMP EDGE, off the render */
  await shoot(page, `rest-${w}.png`);
  const boxes = await page.evaluate((sel) => {
    const cards = [...document.querySelectorAll(`${sel} > li, ${sel} > article`)];
    const b = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    return cards.map((c) => ({
      venue: c.querySelector('[class*="addrArea"]')?.textContent ?? "?",
      card: b(c.querySelector('[class*="cardSurface"]')),
      area: b(c.querySelector('[class*="addrArea"]')),
      line: b(c.querySelector('[class*="addrLine"]')),
      statv: b(c.querySelector('[class*="statValue"]')),
      mark: b(c.querySelector('[class*="cardLogoMark"]')),
      ramp: b(c.querySelector('[class*="rampScrim"]')),
      colors: {
        area: getComputedStyle(c.querySelector('[class*="addrArea"]')).color,
        line: getComputedStyle(c.querySelector('[class*="addrLine"]')).color,
        statv: c.querySelector('[class*="statValue"]')
          ? getComputedStyle(c.querySelector('[class*="statValue"]')).color
          : null,
        /* THE MARK'S INK IS READ OFF AN ELEMENT, NOT OFF THE TOKEN.
           `getPropertyValue("--cream")` hands back the AUTHORED value —
           a hex — and the rgb() helper here pulls decimal runs out of a
           string, so "#faf7f1" parsed as (7, 1, 0) and every mark in the
           table came back at 1.3:1. The address's first line is
           `color: var(--cream)` and computes to a real rgb() triple, so
           it is the same ink already resolved. */
        cream: getComputedStyle(c.querySelector('[class*="addrArea"]')).color,
      },
    }));
  }, REST_GRID);

  /* THE BARE RENDER — same frame, every glyph and mark hidden. See the
     note on brightestGround for why the contrast pass cannot use the
     normal one. */
  await page.evaluate((sel) => {
    const s = document.createElement("style");
    s.id = "vc-bare";
    s.textContent = `${sel}{visibility:hidden}`;
    document.head.appendChild(s);
  }, BARE);
  await s(250);
  const bare = await shoot(page, `rest-bare-${w}.png`);

  console.log("  contrast against each card's OWN composited ground (worst pixel in the line's band, type hidden)");
  let worstCr = 99;
  let worstWho = "";
  let worstMark = 99;
  let worstMarkWho = "";
  for (const b of boxes) {
    if (!b.card || b.card.y + b.card.h > bare.h || b.card.y < 0) continue;
    const row = [];
    for (const k of ["area", "line", "statv"]) {
      if (!b[k] || !b.colors[k]) continue;
      const cr = +CR(rgb(b.colors[k]), brightestGround(bare, b[k])).toFixed(2);
      row.push(`${k} ${cr}`);
      if (cr < worstCr) {
        worstCr = cr;
        worstWho = `${b.venue}/${k}`;
      }
    }
    // the MARK answers to 1.4.11's 3:1 rather than to a text bar — a
    // logotype is a graphical object and 1.4.3 exempts it outright
    if (b.mark) {
      const mcr = +CR(rgb(b.colors.cream), brightestGround(bare, b.mark)).toFixed(2);
      row.push(`mark ${mcr}`);
      if (mcr < worstMark) {
        worstMark = mcr;
        worstMarkWho = b.venue;
      }
    }
    console.log(`    ${b.venue.padEnd(18)} ${row.join("   ")}`);
  }
  ok(`${w} type clears 4.5:1 on its own ground`, worstCr >= 4.5, `worst ${worstCr}:1 (${worstWho})`);
  ok(`${w} mark clears 3:1 on its own ground`, worstMark >= 3, `worst ${worstMark}:1 (${worstMarkWho})`);

  /* ═══ THE EDGE TEST, ON A FLAT GROUND.
     The photograph is hidden and the card's own surface is forced to a
     mid grey, so what is left painting inside the card is EXACTLY the two
     ramp layers and the mark's corner wash. On a flat ground every
     row-to-row luminance step IS the material, which is the only way to
     ask this question without a photograph's own edges answering it: the
     first version of this probe compared the ramp band against the band
     of picture above it and reported a doorway in Belly's photograph as a
     0.6 ramp edge.

     WHERE THE THRESHOLD COMES FROM, since a number pulled out of the air
     would make this theatre. Mid grey is #9a9a9a, L≈0.3185, and one sRGB
     level there is ΔL≈0.0036. The gradient's own arithmetic gives at most
     ~0.0012 per row (0.22 of ink spread over 26% of a 228px ramp), but
     Chrome DITHERS gradients to hide banding, and that dither is ±1–2
     levels of spatial noise — up to ~0.011 between adjacent rows, which is
     what this actually measures on a clean card and why the first
     threshold here (0.01) failed all eight.
     A REAL edge is an order of magnitude above that: the smallest one any
     of these gradients could produce is its outermost stop cut off by its
     own box, i.e. 22% of ink over this grey = ΔL 0.070. 0.02 sits between
     the two with room on both sides.

     Two columns per card: 12% of the width, which runs down through the
     mark's corner wash and is where a wash/ramp seam would show, and 55%,
     which is clear of it. ═══ */
  const EDGE_MAX = 0.02;
  await page.evaluate((sel) => {
    const s2 = document.createElement("style");
    s2.id = "vc-flat";
    s2.textContent = `${sel}{visibility:hidden}
      [class*="cardSurface"]{background:#9a9a9a !important}`;
    document.head.appendChild(s2);
  }, '[class*="photo"],[class*="fallback"],[class*="hoverClip"]');
  await s(400);
  const flat = await shoot(page, `rest-flat-${w}.png`);
  const edgeFail = [];
  const edgeRows = [];
  for (const b of boxes) {
    if (!b.card || b.card.y + b.card.h > flat.h || b.card.y < 0) continue;
    for (const xf of [0.12, 0.55]) {
      const st = rampStep(flat, b.card, b.ramp.h, xf);
      edgeRows.push(
        `    ${b.venue.padEnd(18)} x${(xf * 100).toFixed(0)}%  step ${st.ramp.worst} @y+${st.ramp.at}`,
      );
      if (st.ramp.worst > EDGE_MAX)
        edgeFail.push(`${b.venue}@${(xf * 100).toFixed(0)}% ${st.ramp.worst} at y+${st.ramp.at}`);
    }
  }
  console.log("  ramp edge on a FLAT ground — largest row-to-row luminance step inside the ramp");
  console.log(edgeRows.join("\n"));
  const edgeWorst = Math.max(...edgeRows.map((r) => parseFloat(r.split("step ")[1])));
  ok(
    `${w} ramp has no locatable edge`,
    edgeFail.length === 0,
    edgeFail.length
      ? edgeFail.join("; ")
      : `worst step ${edgeWorst} on a flat ground, against ${EDGE_MAX} (a real edge would be ~0.07)`,
  );

  await page.evaluate(() => {
    document.getElementById("vc-bare")?.remove();
    document.getElementById("vc-flat")?.remove();
  });
  await s(250);
  const img = await shoot(page, null);
  const onScreen = boxes.find((b) => b.card && b.card.y >= 0 && b.card.y + b.card.h <= img.h);
  if (onScreen) await crop(img.buf, onScreen.card, `rest-card-${w}.png`, 2);

  const gb = await page.evaluate((sel) => {
    const g = document.querySelector(sel);
    const b = g.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  }, REST_GRID);
  await crop(img.buf, gb, `rest-grid-${w}.png`);

  /* ═══ THE HOVER RESPONSE STILL FIRES, and this is the one assertion
     that exists because of HOW the card was shared rather than what it
     looks like. Discover.module.css writes the lift as
     `.cell:hover .cardSurface` — it can, because `.cell` is its own grid's
     class. A module shared by two grids has no such class to name, so
     these are re-keyed to `.cardSurface:hover .photo` and
     `.cardSurface:hover`. Equivalent in every layout that ships (the
     cell, the seat and the card are one box), and silently inert if the
     selector is ever wrong — hence a measurement.

     TWO MOUSE MOVES, one outside and one inside: a single move to a point
     the cursor is already notionally at does not generate an enter. And
     headless reports `(hover: none)`, which is why open() emulates the
     feature through CDP — puppeteer's own emulateMediaFeatures REJECTS
     `hover`. ═══ */
  const hoverBox = boxes.find((b) => b.card && b.card.y >= 0 && b.card.y + b.card.h <= img.h);
  if (hoverBox) {
    await page.mouse.move(2, 2);
    await page.mouse.move(hoverBox.card.x + hoverBox.card.w / 2, hoverBox.card.y + 40);
    await s(700);
    const hv = await page.evaluate((sel) => {
      const c = document.querySelector(`${sel} [class*="cardSurface"]`);
      return {
        card: getComputedStyle(c).transform,
        photo: getComputedStyle(c.querySelector('[class*="photo"]')).transform,
      };
    }, REST_GRID);
    const scaled = (m) => {
      const n = (m.match(/-?[\d.]+/g) || []).map(Number);
      return n.length >= 4 ? +n[0].toFixed(3) : 1;
    };
    ok(
      `${w} hover lifts the card and zooms its photograph`,
      scaled(hv.card) > 1.001 && scaled(hv.photo) > 1.001,
      `card scale ${scaled(hv.card)}, photo scale ${scaled(hv.photo)}`,
    );
    await page.mouse.move(2, 2);
  }

  const real = errors.filter((e) => !/prefers-reduced-motion/i.test(e));
  ok(`${w} no console errors`, real.length === 0, real.length ? real.slice(0, 3).join(" | ") : "clean");
  await page.close();
}

fs.writeFileSync(`${OUT}/rest-snapshot.json`, JSON.stringify(summary, null, 2));
const failed = R.filter((r) => !r.pass);
console.log(`\n${R.length - failed.length}/${R.length} passed`);
if (failed.length) for (const f of failed) console.log(`  FAIL ${f.n}: ${f.detail}`);
console.log(`shots in ${OUT}`);
await browser.close();
process.exit(failed.length ? 1 : 0);
