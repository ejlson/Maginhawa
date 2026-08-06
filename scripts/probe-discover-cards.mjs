/* THE REDESIGNED RESTAURANT CARD — one full-bleed photograph, a frosted
   panel in its bottom edge, the venue's mark top-left, a soft shadow.
   (Local variable names below still say `pill`; the element is the same
   one, it simply no longer has a chip under it. Renaming them would churn
   half this file for nothing.)

   Nine things are checked, in the order they can break:

     SIZE     all eight cards render at IDENTICAL width AND height. The
              per-venue PLATE_RATIO stagger is what this pass reverses, so
              this is the assertion the whole change stands on.
     PARTS    every card has: a venue mark top-left (Bunso included), a
              glass panel with a live backdrop-filter, a metadata row, and
              EXACTLY ONE control. More than one control means a second
              source of truth crept back in beside primaryAction().
              The mark used to ride a frosted cream pill and be MAROON;
              the pill was removed on 2026-08-04 (second pass) and the
              mark is cream directly on the photograph. The two assertions
              that named the old arrangement are updated, not deleted —
              whether the mark exists on every card is still worth
              asserting. Its legibility without the pill is measured in
              scripts/probe-discover-darkglass.mjs, which is the probe for
              that pass.
     CROWN    the mark and the Michelin sticker do not overlap, measured
              at the NARROWEST card in the layout (the 4-up column).
     SEATED   every plate rests on its seat: opaque, untransformed, and
              all eight the same size. This used to be the tail of an
              INTRO assertion that rode the assembly sequence out first;
              the sequence was removed, so the residual it reported has
              no source any more and only the resting state is measured.
     HOVER    the film still wipes open from the cursor (clip-path really
              transitions), and the plate rect does NOT move while it
              does. The plate carries a layoutId; a React render mid-hover
              is a re-measure, and a re-measure is the documented
              off-screen bug.
     FRAMES   dropped frames while the glass panels fade up, because
              backdrop-filter under an animating opacity is the expensive
              case and eight of them share the settle.
     EXPAND   the App Store morph still opens from the card and closes on
              Escape, and its plate still wears the card's 4:5 — every
              piece of card furniture moved INSIDE the layoutId box and
              the press target moved from a wrapper to a layer, either of
              which could have left the card unpressable.
     REDUCE   under prefers-reduced-motion the eight cards are still
              there, identically sized, with their furniture visible (the
              staging opacities are all gated on `reduce`), and the card
              itself holds still.
     SHOTS    1440 / 981 / 390, plus hover, expanded and reduced-motion.

   usage: node scripts/probe-discover-cards.mjs [port] */
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "51365";
const OUT = process.argv[3] || "/tmp/discover-cards";
const s = (ms) => new Promise((r) => setTimeout(r, ms));
const GRID = 'ul[aria-label="Our restaurants"]';
fs.mkdirSync(OUT, { recursive: true });

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

/* HEADLESS REPORTS (hover: none), and the card gates its film — and every
   hover rule — on `(hover: hover) and (pointer: fine)`. Straight to CDP:
   puppeteer's own emulateMediaFeatures keeps an allowlist that rejects
   `hover` outright, but the protocol underneath accepts it. */
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
  // NEVER networkidle0 — the hero clip loops and the page never idles
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

/* walk down in ~500px steps so every IntersectionObserver on the way
   arms, then settle — Lenis keeps easing well after scrollTo returns */
async function walk(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await s(140);
  }
  await s(1200);
}

async function seatGrid(page) {
  const y = await page.evaluate((sel) => {
    const g = document.querySelector(sel);
    return g ? Math.round(g.getBoundingClientRect().top + window.scrollY) : null;
  }, GRID);
  if (y == null) return false;
  await page.evaluate((v) => window.scrollTo(0, v - 90), y);
  await s(3900); // Lenis keeps easing well after scrollTo returns
  return true;
}

const R = [];
const ok = (n, pass, detail) => {
  R.push({ n, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${n}  ${detail}`);
};

/* ═══ 1. a fresh page, the SEATED grid measured ═══ */
{
  const { page, errors } = await open(1440, 900);
  await walk(page);
  await seatGrid(page);

  /* every plate on its seat: each [data-plate] must be a real, visible,
     identically-sized rectangle with no transform parked on it. */
  const seats = await page.evaluate((sel) => {
    const plates = [...document.querySelectorAll(`${sel} [data-plate]`)];
    return plates.map((p) => {
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
  const t0 = seats[0];
  const sameSize = seats.every(
    (x) => Math.abs(x.w - t0.w) < 0.5 && Math.abs(x.h - t0.h) < 0.5,
  );
  ok(
    "SIZE all 8 identical (1440)",
    seats.length === 8 && sameSize,
    `n=${seats.length} ${t0.w}x${t0.h}  heights=[${seats.map((x) => x.h).join(", ")}]`,
  );
  const settled = seats.every(
    (x) => x.opacity === 1 && (x.transform === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(x.transform)),
  );
  ok(
    "SEATED plates resting on their seats",
    settled,
    `opacities=[${seats.map((x) => x.opacity).join(",")}] transforms=${[...new Set(seats.map((x) => x.transform))].join(" | ")}`,
  );

  /* ═══ 2. PARTS ═══ */
  const parts = await page.evaluate((sel) => {
    const cells = [...document.querySelectorAll(`${sel} > li`)];
    return cells.map((c) => {
      const card = c.querySelector("[data-plate]");
      const cr = card.getBoundingClientRect();
      const pill = c.querySelector('[class*="cardLogo"]');
      const mark = c.querySelector('[class*="cardLogoMark"]');
      const glass = c.querySelector('[class*="glass"]');
      const meta = c.querySelector('[class*="metaRow"]');
      const sticker = c.querySelector('[class*="stickerBadge"]');
      const gs = glass ? getComputedStyle(glass) : null;
      const pr = pill ? pill.getBoundingClientRect() : null;
      const sr = sticker ? sticker.getBoundingClientRect() : null;
      const gr = glass ? glass.getBoundingClientRect() : null;
      return {
        name: c.querySelector("h3")?.textContent?.trim(),
        // "exactly one control" = one <a> or <button> that is not the
        // full-card plate hit layer
        controls: [...c.querySelectorAll("a,button")].filter(
          (e) => !/plateHit/.test(e.className),
        ).length,
        controlLabel:
          [...c.querySelectorAll("a")].map((a) => a.textContent.trim())[0] ??
          null,
        hasPill: !!pill,
        markUrl: mark ? getComputedStyle(mark).maskImage.slice(0, 60) : null,
        markColor: mark ? getComputedStyle(mark).backgroundColor : null,
        hasGlass: !!glass,
        glassBackdrop: gs ? gs.backdropFilter || gs.webkitBackdropFilter : null,
        glassAtBottom: gr ? Math.round(cr.bottom - gr.bottom) : null,
        glassPct: gr ? Math.round((gr.height / cr.height) * 100) : null,
        metaCells: meta ? meta.children.length : 0,
        metaText: meta ? meta.textContent.replace(/\s+/g, " ").trim() : null,
        // top-left: the pill's left edge relative to the card's
        pillInsetL: pr ? Math.round(pr.left - cr.left) : null,
        pillInsetT: pr ? Math.round(pr.top - cr.top) : null,
        stickerRight: sr ? Math.round(cr.right - sr.right) : null,
        // negative gap = overlap
        crownGap: pr && sr ? Math.round(sr.left - pr.right) : null,
      };
    });
  }, GRID);
  console.table(parts);
  ok(
    "PARTS venue mark on every card",
    parts.every((p) => p.hasPill),
    parts.map((p) => `${p.name}:${p.hasPill ? "y" : "n"}`).join(" "),
  );
  ok(
    "PARTS glass panel with a live backdrop-filter",
    parts.every((p) => p.hasGlass && /blur/.test(p.glassBackdrop || "")),
    `${parts[0].glassBackdrop} | seated ${[...new Set(parts.map((p) => p.glassAtBottom))].join(",")}px off the card's bottom, ${[...new Set(parts.map((p) => p.glassPct))].sort().join("/")}% of its height`,
  );
  ok(
    "PARTS metadata row",
    parts.every((p) => p.metaCells >= 2),
    parts.map((p) => `${p.name}:${p.metaCells}`).join(" "),
  );
  ok(
    "PARTS exactly ONE control per card",
    parts.every((p) => p.controls === 1),
    parts.map((p) => `${p.name}=${p.controls}(${p.controlLabel})`).join(" "),
  );
  ok(
    // cream since the pill came off — the mask's ink is the only colour
    // the mark has now, and maroon on an unlit photograph is unreadable
    "PARTS mark is cream, bare on the photograph",
    parts.every((p) => p.markColor === "rgb(244, 240, 228)"),
    [...new Set(parts.map((p) => p.markColor))].join(" | "),
  );

  await seatGrid(page);
  await page.screenshot({ path: `${OUT}/cards-1440.png`, fullPage: false });
  // a tight crop of the grid, taken from a FULL shot (page.screenshot's
  // clip measures from the DOCUMENT origin, not the viewport, so the rect
  // has to be re-read after the scroll that put the grid on screen)
  const gridBox = await page.evaluate((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return { x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height };
  }, GRID);
  await page.screenshot({
    path: `${OUT}/grid-1440.png`,
    clip: {
      x: Math.max(0, gridBox.x - 10),
      y: Math.max(0, gridBox.y - 10),
      width: gridBox.w + 20,
      height: Math.min(gridBox.h + 20, 2200),
    },
  });

  ok(
    "no console errors",
    errors.length === 0,
    errors.slice(0, 3).join(" || ") || "clean",
  );
  await page.close();
}

/* ═══ 3. HOVER: the wipe still opens, the plate does not move ═══ */
{
  const { page, errors } = await open(1440, 900);
  await walk(page);
  await seatGrid(page);

  const box = await page.evaluate((sel) => {
    for (const c of document.querySelectorAll(`${sel} > li`)) {
      if (c.querySelector("video")) {
        const r = c.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      }
    }
    return null;
  }, GRID);

  if (!box) {
    ok("HOVER film", false, "no card with a clip on screen");
  } else {
    // PAGE coordinates — a viewport rect would report the smooth scroller
    // still settling as a "move"
    const plateRect = () =>
      page.evaluate((sel) => {
        const v = document.querySelector(`${sel} video`);
        const r = v
          .closest("li")
          .querySelector("[data-plate]")
          .getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y + window.scrollY),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      }, GRID);
    const before = await plateRect();
    const enterX = Math.round(box.x + box.w * 0.22);
    const enterY = Math.round(box.y + box.h * 0.18);
    // TWO MOVES: a single move from the origin can land without Chrome
    // ever synthesising the mouseenter the card listens for
    await page.mouse.move(Math.round(box.x - 40), Math.round(box.y - 40));
    await s(140);
    await page.mouse.move(enterX, enterY);

    /* Chrome does NOT resolve circle() percentages to px in computed
       style, so the clip-path string alone cannot prove motion. Sampled
       over the wipe's 520ms and compared as strings: two DIFFERENT values
       during the window is the wipe running. */
    const clips = [];
    for (let i = 0; i < 12; i++) {
      clips.push(
        await page.evaluate((sel) => {
          const v = document.querySelector(`${sel} video`);
          const cs = getComputedStyle(v);
          return `${cs.clipPath}|${cs.opacity}`;
        }, GRID),
      );
      await s(60);
    }
    await s(700);
    const after = await plateRect();
    const uniq = [...new Set(clips)];
    ok(
      "HOVER film wipes open",
      uniq.length > 1 && clips[clips.length - 1].split("|")[1] === "1",
      `${uniq.length} distinct clip states, last=${clips[clips.length - 1]}`,
    );
    ok(
      "HOVER plate rect does not move",
      before.x === after.x &&
        before.y === after.y &&
        before.w === after.w &&
        before.h === after.h,
      `${before.x},${before.y} ${before.w}x${before.h} → ${after.x},${after.y} ${after.w}x${after.h}`,
    );
    await page.screenshot({ path: `${OUT}/hover-1440.png` });

    /* AND AGAIN ON THE BRIGHTEST CARD. The hover blurb is cream copy on
       an ink wash, the one arrangement on this card whose legibility is a
       fact about the photograph; the shade's band is shaped for it (see
       .hoverShade). Café Mama's pink shopfront is the brightest picture
       in the set, so it is the one worth looking at. */
    const bright = await page.evaluate((sel) => {
      const c = [...document.querySelectorAll(`${sel} > li`)].find((n) =>
        /Café Mama/.test(n.textContent || ""),
      );
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }, GRID);
    if (bright) {
      await page.mouse.move(
        Math.round(bright.x - 40),
        Math.round(bright.y - 40),
      );
      await s(140);
      await page.mouse.move(
        Math.round(bright.x + bright.w * 0.5),
        Math.round(bright.y + bright.h * 0.3),
      );
      await s(1400);
      await page.screenshot({ path: `${OUT}/hover-bright-1440.png` });
    }
  }
  ok(
    "no console errors (hover pass)",
    errors.length === 0,
    errors.slice(0, 3).join(" || ") || "clean",
  );
  await page.close();
}

/* ═══ 4. the NARROWEST card: 4-up at the 981px breakpoint ═══ */
for (const [w, h, label] of [
  [981, 900, "981"],
  // the 4-up column grows from 183px to 274px between 981 and 1440, and
  // the panel's container query switches inside that range — both sides
  // of the switch get measured
  [1100, 900, "1100"],
  [1280, 900, "1280"],
  [390, 844, "390"],
]) {
  const { page, errors } = await open(w, h);
  await walk(page);
  await seatGrid(page);
  const m = await page.evaluate((sel) => {
    const cells = [...document.querySelectorAll(`${sel} > li`)];
    const cards = cells.map((c) => {
      const card = c.querySelector("[data-plate]");
      const cr = card.getBoundingClientRect();
      const pill = c.querySelector('[class*="cardLogo"]');
      const st = c.querySelector('[class*="stickerBadge"]');
      const glass = c.querySelector('[class*="glass"]');
      const gr = glass.getBoundingClientRect();
      return {
        name: c.querySelector("h3")?.textContent?.trim(),
        w: +cr.width.toFixed(2),
        h: +cr.height.toFixed(2),
        pillW: pill ? Math.round(pill.getBoundingClientRect().width) : null,
        crownGap:
          pill && st
            ? Math.round(
                st.getBoundingClientRect().left -
                  pill.getBoundingClientRect().right,
              )
            : null,
        glassH: Math.round(gr.height),
        glassOverflowsCard: gr.bottom - cr.bottom > 0.6 || gr.top < cr.top,
        /* WHERE THE CONTROL SITS IN THE PANEL, as a fraction of the
           panel's height — its TOP edge, which is its lightest ground.
           The glass is a vertical gradient from 58% cream at its top to
           80% at its bottom. --saffron-ink clears 4.5:1 against a black
           photograph at a 66% tint (4.52:1) and the ring clears 3:1 at
           64% (3.08:1 at 66%), so 66% is the binding floor, and
           58 + 22f >= 66 puts it at f >= 0.37 of the panel's height.
           The flex order is what keeps the control below that line; this
           is the assertion that says so out loud. */
        actionTopPct: (() => {
          const a = c.querySelector('[class*="actionRow"]');
          if (!a) return null;
          return Math.round(
            ((a.getBoundingClientRect().top - gr.top) / gr.height) * 100,
          );
        })(),
        controls: [...c.querySelectorAll("a,button")].filter(
          (e) => !/plateHit/.test(e.className),
        ).length,
      };
    });
    return {
      cols: getComputedStyle(document.querySelector(sel)).gridTemplateColumns
        .split(" ")
        .length,
      cards,
    };
  }, GRID);
  const c0 = m.cards[0];
  ok(
    `SIZE all 8 identical (${label}, ${m.cols}-up)`,
    m.cards.every(
      (x) => Math.abs(x.w - c0.w) < 0.5 && Math.abs(x.h - c0.h) < 0.5,
    ),
    `${c0.w}x${c0.h}  heights=[${[...new Set(m.cards.map((x) => x.h))].join(", ")}]`,
  );
  const withBoth = m.cards.filter((x) => x.crownGap != null);
  ok(
    `CROWN mark vs sticker clear (${label})`,
    withBoth.every((x) => x.crownGap > 0),
    withBoth.length
      ? withBoth.map((x) => `${x.name} gap=${x.crownGap}px`).join(" ")
      : "no card carries both here",
  );
  ok(
    `GLASS inside the card (${label})`,
    m.cards.every((x) => !x.glassOverflowsCard),
    `panel ${[...new Set(m.cards.map((x) => x.glassH))].sort((a, b) => a - b).join("/")}px tall on a ${c0.h}px card`,
  );
  /* THE PHOTOGRAPH MUST STILL BE THE CARD. "Full-bleed image with a
     little glass at the bottom" is the whole brief; a panel over ~45% of
     the card is a block of type with a picture above it, which is the
     arrangement this pass exists to undo. */
  const pct = m.cards.map((x) => Math.round((x.glassH / x.h) * 100));
  ok(
    `GLASS is a panel, not half the card (${label})`,
    Math.max(...pct) <= 45,
    `${Math.min(...pct)}–${Math.max(...pct)}% of the card`,
  );
  ok(
    `ONE control (${label})`,
    m.cards.every((x) => x.controls === 1),
    m.cards.map((x) => x.controls).join(""),
  );
  const tops = m.cards.map((x) => x.actionTopPct).filter((x) => x != null);
  ok(
    `CONTRAST control sits in the panel's dense half (${label})`,
    tops.every((x) => x >= 37),
    `action tops at ${Math.min(...tops)}–${Math.max(...tops)}% of the panel (needs ≥37%; the number is a GEOMETRIC invariant of the panel's flex order, and the tint it has to reach was re-derived when the panel went ink — see the budget note on .glass)`,
  );
  await page.screenshot({ path: `${OUT}/cards-${label}.png` });
  const gb = await page.evaluate((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return { x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height };
  }, GRID);
  await page.screenshot({
    path: `${OUT}/grid-${label}.png`,
    clip: {
      x: Math.max(0, gb.x - 8),
      y: Math.max(0, gb.y - 8),
      width: gb.w + 16,
      height: Math.min(gb.h + 16, 3000),
    },
  });
  ok(
    `no console errors (${label})`,
    errors.length === 0,
    errors.slice(0, 3).join(" || ") || "clean",
  );
  await page.close();
}

/* ═══ 5. FRAMES during the settle — backdrop-filter under an animating
       opacity is the expensive case, and eight panels share the beat ═══ */
{
  const { page } = await open(1440, 900);
  const frames = await page.evaluate(async () => {
    const sec = document.querySelector("#restaurants");
    const gaps = [];
    let last = performance.now();
    let stop = false;
    const tick = (t) => {
      gaps.push(t - last);
      last = t;
      if (!stop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    /* scroll until the grid's top edge enters the viewport — that is the
       frame the glass panels start fading up on, and the window this
       measurement is about. (It used to stop on `data-assembly-armed`;
       with the assembly gone the loop would otherwise run all 300 steps
       and sample 12000px of page well past the chapter.) */
    for (let i = 0; i < 300; i++) {
      window.scrollBy(0, 40);
      await new Promise((r) => requestAnimationFrame(() => r()));
      const top = sec?.getBoundingClientRect().top ?? Infinity;
      if (top < window.innerHeight * 0.5 && i > 30) break;
    }
    // the settle itself: furniture + captions beats, ~2.5s
    await new Promise((r) => setTimeout(r, 5200));
    stop = true;
    const settle = gaps.slice(-300);
    const long = settle.filter((g) => g > 24).length;
    return {
      n: settle.length,
      long,
      p95: +settle.slice().sort((a, b) => a - b)[Math.floor(settle.length * 0.95)].toFixed(1),
      max: +Math.max(...settle).toFixed(1),
    };
  });
  ok(
    "FRAMES no stall while the glass fades up",
    frames.long / frames.n < 0.1,
    `${frames.long}/${frames.n} frames >24ms, p95 ${frames.p95}ms, max ${frames.max}ms`,
  );
  await page.close();
}

/* ═══ 6. THE EXPANSION still morphs out of the card ═══ */
/* The card's furniture (crown, glass, the anchor on it) all moved INSIDE
   the box that carries the layoutId, and the press target went from a
   <button> wrapping that box to a layer inside it. Both are exactly the
   kind of change that can leave the plate un-pressable or the morph
   measuring the wrong rectangle, so: press a card, get the dialog, and
   get the same venue back. */
{
  const { page, errors } = await open(1440, 900);
  await walk(page);
  await seatGrid(page);
  const target = await page.evaluate((sel) => {
    const c = [...document.querySelectorAll(`${sel} > li`)].find((n) =>
      /Belly/.test(n.querySelector("h3")?.textContent || ""),
    );
    if (!c) return null;
    const r = c.querySelector("[data-plate]").getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + 40) };
  }, GRID);
  if (!target) {
    ok("EXPAND opens", false, "no Belly card on screen");
  } else {
    // press the PHOTOGRAPH, not the panel — the anchor lives down there
    await page.mouse.click(target.x, target.y);
    await s(1400);
    const open1 = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return null;
      const m = d.querySelector("[style*='aspect-ratio']");
      const r = m?.getBoundingClientRect();
      return {
        label: d.getAttribute("aria-label"),
        mediaW: r ? Math.round(r.width) : null,
        mediaH: r ? Math.round(r.height) : null,
        // the morph target must still be the tile's 4:5
        ratio: r ? +(r.height / r.width).toFixed(3) : null,
      };
    });
    ok(
      "EXPAND opens from the card",
      Boolean(open1) && open1.label === "Belly",
      open1
        ? `dialog "${open1.label}", media ${open1.mediaW}x${open1.mediaH} (${open1.ratio} vs PLATE_RATIO 1.25)`
        : "no dialog",
    );
    ok(
      "EXPAND keeps the card's aspect (no two-axis stretch mid-morph)",
      Boolean(open1) && Math.abs((open1.ratio ?? 0) - 1.25) < 0.02,
      `${open1?.ratio}`,
    );
    await page.screenshot({ path: `${OUT}/expanded-1440.png` });
    await page.keyboard.press("Escape");
    await s(1200);
    const closed = await page.evaluate(
      () => !document.querySelector('[role="dialog"]'),
    );
    ok("EXPAND closes on Escape", closed, closed ? "gone" : "still mounted");
  }
  ok(
    "no console errors (expand pass)",
    errors.length === 0,
    errors.slice(0, 3).join(" || ") || "clean",
  );
  await page.close();
}

/* ═══ 7. REDUCED MOTION ═══ */
/* Under reduce the plate drops its layoutId and the card must hold still.
   The cards still have to be there, identically sized, with their
   furniture visible — the staging
   opacities are all gated on `reduce` and a mistake there leaves eight
   invisible panels. */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [
      { name: "prefers-reduced-motion", value: "reduce" },
      { name: "hover", value: "hover" },
      { name: "pointer", value: "fine" },
    ],
  });
  const errors = [];
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
  await s(1500);
  await walk(page);
  await seatGrid(page);
  const rm = await page.evaluate((sel) => {
    const cells = [...document.querySelectorAll(`${sel} > li`)];
    return cells.map((c) => {
      const card = c.querySelector("[data-plate]");
      const r = card.getBoundingClientRect();
      const glass = c.querySelector('[class*="glass"]');
      const pill = c.querySelector('[class*="cardLogo"]');
      const surf = c.querySelector('[class*="cardSurface"]');
      return {
        w: +r.width.toFixed(2),
        h: +r.height.toFixed(2),
        plate: +getComputedStyle(card).opacity,
        glass: +getComputedStyle(glass).opacity,
        pill: pill ? +getComputedStyle(pill.parentElement).opacity : null,
        surfTransition: getComputedStyle(surf).transitionProperty,
      };
    });
  }, GRID);
  const r0 = rm[0];
  ok(
    "REDUCE all 8 identical and visible",
    rm.length === 8 &&
      rm.every(
        (x) =>
          Math.abs(x.w - r0.w) < 0.5 &&
          Math.abs(x.h - r0.h) < 0.5 &&
          x.plate === 1 &&
          x.glass === 1 &&
          (x.pill === null || x.pill === 1),
      ),
    `${r0.w}x${r0.h}, plate/glass/mark opacities ${[...new Set(rm.map((x) => `${x.plate}/${x.glass}/${x.pill}`))].join(" ")}`,
  );
  ok(
    "REDUCE the card does not scale",
    rm.every((x) => !/transform/.test(x.surfTransition)),
    `transition-property = ${[...new Set(rm.map((x) => x.surfTransition))].join(" | ")}`,
  );
  await page.screenshot({ path: `${OUT}/reduced-1440.png` });
  /* ONE KNOWN, PRE-EXISTING WARNING is excluded by name, not by
     loosening the check. Under prefers-reduced-motion React logs a
     hydration mismatch: useReducedMotion() is false on the server and
     true on the client, so any component branching on it renders
     differently on the first client pass. Verified against the previous
     revision of Discover.tsx/.module.css (git stash, same emulation,
     byte-identical message), so it is not this pass's doing — and it is
     not fixable from inside this component, which is why it is named
     here rather than silently tolerated. Anything ELSE still fails. */
  const HYDRATION =
    /Hydration failed because the server rendered HTML didn't match/;
  const known = errors.filter((e) => HYDRATION.test(e));
  const unknown = errors.filter((e) => !HYDRATION.test(e));
  ok(
    "no NEW console errors (reduced motion)",
    unknown.length === 0,
    unknown.slice(0, 3).join(" || ") ||
      `clean (${known.length} pre-existing hydration warning${known.length === 1 ? "" : "s"} excluded by name)`,
  );
  await page.close();
}

await browser.close();
const failed = R.filter((r) => !r.pass);
console.log(
  `\n${R.length - failed.length}/${R.length} passed. shots in ${OUT}`,
);
process.exit(failed.length ? 1 : 0);
