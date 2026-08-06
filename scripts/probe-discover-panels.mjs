/* Phase 2b verification — the split card. Proves, on the real page:
     · all 8 cards render photo plate + information panel (name at display
       scale, metadata strip, exactly ONE control)
     · the plates are STAGGERED (5:4 / 9:8 / 1:1 by venue)
     · hovering a tile wipes the film open AND brings the mark in at the
       top-left, with the plate rect never moving (layoutId re-measure bug)
     · Belly's panel sits on the ink, the other seven on the straw
     · Bunso's status chip rests visible and does NOT yield on hover
       (nothing arrives to take its seat)
   Screenshots at 1440 / 981 / 390 land in the scratchpad.

   Usage: node scripts/probe-discover-panels.mjs [port]   (default 51365)

   Harness notes carried from the older probes: never networkidle0 (the
   looping film never idles); wait out Lenis after any scrollTo; arm
   IntersectionObservers by stepping the scroll; headless reports
   (hover: none), so hover is emulated straight through CDP (puppeteer's
   emulateMediaFeatures rejects "hover"); Chrome does not resolve circle()
   percentages to px in computed style; hover needs TWO mouse moves.

   The assembly intro that used to run in front of this grid was removed,
   and with it `data-assembly-armed` / `data-assembly-step`. The waits that
   rode it out are gone; the grid is ordinary content and only has to be
   scrolled into view. `data-plate` survives as the card's probe hook. */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "51365";
const OUT =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/1fc8ec40-c8ba-4c1f-8e2d-89c2ff0d34ec/scratchpad";
const s = (ms) => new Promise((r) => setTimeout(r, ms));

// slug order mirrors ITEMS; ratios mirror PLATE_RATIO in Discover.tsx
const RATIO = [5 / 4, 9 / 8, 1, 9 / 8, 1, 1, 5 / 4, 1];
const SLUGS = [
  "bintang", "guanabana", "mamasons", "ramo",
  "hoodwood", "cafemama", "belly", "bunso",
];

let fails = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"} — ${msg}`);
  if (!ok) fails++;
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});

async function openPage(w, h) {
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
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://localhost:${PORT}/`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 15000,
    })
    .catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    return true;
  });
  await s(1800);
  return { page, errors };
}

/* Put the grid on screen. Stepping down rather than jumping is what arms
   every IntersectionObserver between the hero and the chapter; Lenis keeps
   easing for a while after the last scrollTo returns, hence the settle. */
async function seatGrid(page, offset = 120) {
  await page.waitForSelector('[data-plate="0"]', { timeout: 20000 });
  const top = await page.evaluate(() => {
    const el = document.querySelector('[data-plate="0"]');
    return el.getBoundingClientRect().top + window.scrollY;
  });
  for (let y = 0; y < top; y += 400) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await s(150);
  }
  await page.evaluate((v) => window.scrollTo(0, v), Math.max(0, top - offset));
  await s(2600);
  return top;
}

/* ================= PHASE A — 1440: the staggered seats and their panels */
console.log("\n== 1440x900: panels ==");
const { page, errors } = await openPage(1440, 900);

await seatGrid(page);

// settle fully, then interrogate the resting grid
await s(1200);
const grid = await page.evaluate((slugs) => {
  const cells = [
    ...document.querySelectorAll('ul[aria-label="Our restaurants"] > li'),
  ];
  return cells.map((li, i) => {
    const plate = li.querySelector("[data-plate]");
    const pr = plate.getBoundingClientRect();
    // the panel is the li's LAST element child (plate button is first)
    const panelEl = li.lastElementChild;
    const ps = getComputedStyle(panelEl);
    const name = li.querySelector("h3");
    // interactive inventory: anchors anywhere in the cell + the plate button
    const anchors = [...li.querySelectorAll("a")];
    const buttons = [...li.querySelectorAll("button")];
    const metaP = panelEl.querySelector("p");
    return {
      slug: slugs[i],
      plate: { w: pr.width, h: pr.height, opacity: getComputedStyle(plate).opacity },
      panelBg: ps.backgroundColor,
      name: name?.textContent?.trim() || "",
      nameFont: name ? getComputedStyle(name).fontFamily : "",
      metaCount: metaP ? metaP.querySelectorAll("span > span").length : 0,
      metaText: metaP?.textContent?.trim() || "",
      // divider proof: second cell's computed left border
      divider:
        metaP && metaP.querySelectorAll("span > span")[1]
          ? getComputedStyle(metaP.querySelectorAll("span > span")[1])
              .borderLeftWidth
          : "none",
      anchors: anchors.length,
      buttons: buttons.length,
      actionText: anchors[0]?.textContent?.trim() || "",
    };
  });
}, SLUGS);

for (let i = 0; i < grid.length; i++) {
  const g = grid[i];
  const ar = g.plate.h / g.plate.w;
  const want = RATIO[i];
  check(
    Math.abs(ar - want) < 0.01,
    `${g.slug}: plate aspect ${ar.toFixed(3)} (wants ${want.toFixed(3)})`,
  );
}
check(
  grid.every((g) => g.plate.opacity === "1"),
  "all 8 plates at opacity 1 (none left hidden by a staging style)",
);
check(
  grid.every((g) => g.name.length > 0),
  `all 8 panels carry a name (${grid.map((g) => g.name).join(" / ")})`,
);
/* the display face by TOKEN, not by name — --font-display currently
   resolves through --font-display-loaded, which the font trial points at
   whatever face is being auditioned (Gilda Display today, Contralto by
   default). The panel is correct iff its computed family EQUALS the
   chapter heading's, since both state var(--font-display). */
const titleFont = await page.evaluate(() => {
  const h2 = [...document.querySelectorAll("h2")].find((e) =>
    /Our\s*Restaurants/i.test(e.textContent),
  );
  return h2 ? getComputedStyle(h2).fontFamily : "";
});
check(
  titleFont.length > 0 && grid.every((g) => g.nameFont === titleFont),
  `names share the chapter heading's display face (${grid[0].nameFont.split(",")[0]})`,
);
check(
  grid.every((g) => g.metaCount >= 2),
  `metadata strips present (cells: ${grid.map((g) => g.metaCount).join(",")})`,
);
check(
  grid.every((g) => g.divider === "1px"),
  "hairline dividers drawn between metadata cells (1px border)",
);
check(
  grid.every((g) => g.anchors === 1 && g.buttons === 1),
  `exactly ONE control per card beside the plate button (anchors: ${grid
    .map((g) => g.anchors)
    .join(",")})`,
);
const belly = grid[6];
const others = grid.filter((_, i) => i !== 6);
check(
  belly.panelBg === "rgb(23, 37, 27)",
  `Belly's panel on the ink (${belly.panelBg})`,
);
check(
  others.every(
    (g) => g.panelBg === "rgba(0, 0, 0, 0)" || g.panelBg === "transparent",
  ),
  "the other seven panels on the straw (transparent over the page's cream)",
);
console.log(
  "  actions:",
  grid.map((g) => `${g.slug}:${g.actionText}`).join(" "),
);
console.log("  meta:", grid.map((g) => `[${g.metaText}]`).join(" "));

/* ---- hover: film wipe + the mark's return, plate rect pinned ---- */
console.log("\n== hover: wipe + mark, no re-measure ==");
// bintang — has a small film and a mark; belly's 25MB clip can outlast
// the sampling window on a cold cache
const headTop = await page.evaluate(() => {
  const el = document.querySelector('[data-plate="0"]');
  return el ? el.getBoundingClientRect().top + window.scrollY : 0;
});
await page.evaluate((v) => window.scrollTo(0, v - 140), headTop);
await s(3200); // Lenis settle — measured stale-coordinate trap in old probes

const box = await page.evaluate(() => {
  const r = document.querySelector('[data-plate="0"]').getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
});
const plateRect = () =>
  page.evaluate(() => {
    const r = document
      .querySelector('[data-plate="0"]')
      .getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
    };
  });
const before = await plateRect();
await page.mouse.move(Math.round(box.x - 40), Math.round(box.y - 40));
await s(140);
await page.mouse.move(
  Math.round(box.x + box.w * 0.3),
  Math.round(box.y + box.h * 0.3),
);
const samples = [];
for (let i = 0; i < 16; i++) {
  await s(70);
  samples.push(
    await page.evaluate(() => {
      const li = document.querySelector('[data-plate="0"]').closest("li");
      const v = li.querySelector("video");
      const logo = [...li.querySelectorAll("span")].find((el) =>
        (el.getAttribute("style") || "").includes("--ov-logo-url"),
      );
      const vs = v ? getComputedStyle(v) : null;
      return {
        clip: vs?.clipPath || "",
        playing: v ? !v.paused : false,
        logoOpacity: logo ? getComputedStyle(logo).opacity : "absent",
      };
    }),
  );
}
const radii = samples
  .map((f) => {
    const m = /circle\(([\d.]+)(px|%)/.exec(f.clip || "");
    return m ? Number(m[1]) : null;
  })
  .filter((r) => r !== null);
const min = Math.min(...radii);
const opened =
  radii.length > 2 && radii[radii.length - 1] > min + 40;
check(
  opened,
  `film wiped open (radii ${radii[0]?.toFixed(0)} → min ${min.toFixed(0)} → ${radii[radii.length - 1]?.toFixed(0)})`,
);
check(
  samples.some((f) => f.playing),
  "film actually playing under the wipe",
);
const logoIn = Number(samples[samples.length - 1].logoOpacity) > 0.85;
check(
  logoIn,
  `hover mark arrived (opacity ${samples[samples.length - 1].logoOpacity})`,
);
/* Two rect assertions, because the DESIGNED hover response includes a
   composited scale(1.01) lift on the plate's wrapper — the rect grows
   ~1% about its centre while hovered, and that is a transform, not the
   layout re-measure this check exists to catch. So: DURING hover the
   delta must stay inside the lift's envelope (a re-measure bug threw
   plates whole viewports away); AFTER the pointer leaves, the rect must
   return to its resting box exactly. */
const during = await plateRect();
const lift =
  Math.abs(during.w - before.w) <= Math.ceil(before.w * 0.012) + 1 &&
  Math.abs(during.x - before.x) <= Math.ceil(before.w * 0.006) + 1 &&
  Math.abs(during.y - before.y) <= Math.ceil(before.w * 0.012) + 1;
check(
  lift,
  `in-hover delta is the 1.01 lift only ${JSON.stringify({ before, during })}`,
);
await page.mouse.move(Math.round(box.x - 60), Math.round(box.y - 60));
await s(900); // the lift's 400ms drawer transition, fully out
const after = await plateRect();
const moved =
  Math.abs(after.x - before.x) > 1 ||
  Math.abs(after.y - before.y) > 1 ||
  Math.abs(after.w - before.w) > 1;
check(
  !moved,
  `plate rect back on its resting box after hover ${JSON.stringify({ before, after })}`,
);

/* ---- Bunso: status chip rests visible, does NOT yield (no mark) ---- */
const bunso = await page.evaluate(() => {
  const li = document.querySelector('[data-plate="7"]')?.closest("li");
  const chip = li?.querySelector('[class*="statusBadgeInner"]');
  return chip
    ? { text: chip.textContent.trim(), opacity: getComputedStyle(chip).opacity }
    : null;
});
check(
  bunso?.text === "Coming soon" && bunso.opacity === "1",
  `Bunso status chip resting visible (${bunso?.text} @ ${bunso?.opacity})`,
);
// hover it — the yield is :has(.hoverLogo)-scoped, so it must NOT fire here
const bunsoBox = await page.evaluate(() => {
  const r = document.querySelector('[data-plate="7"]').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top };
});
if (bunsoBox.y > 0 && bunsoBox.y < 900) {
  await page.mouse.move(bunsoBox.x - 200, bunsoBox.y - 200);
  await s(120);
  await page.mouse.move(bunsoBox.x, bunsoBox.y);
  await s(700);
  const chipHover = await page.evaluate(() => {
    const chip = document
      .querySelector('[data-plate="7"]')
      ?.closest("li")
      ?.querySelector('[class*="statusBadgeInner"]');
    return chip ? getComputedStyle(chip).opacity : null;
  });
  check(chipHover === "1", `status chip holds under hover with no arriving mark (${chipHover})`);
}

// park the pointer off the grid so the still is the RESTING state, not
// the tail of the bunso hover test
await page.mouse.move(4, 500);
await s(900);
await page.screenshot({ path: `${OUT}/panels-1440.png` });
console.log(`console errors during 1440 run: ${errors.length}`);
errors.slice(0, 6).forEach((e) => console.log("  !", e));
check(errors.length === 0, "no console errors through load, scroll and hover");
await page.close();

/* ================= PHASE B — 981: settled grid ======================= */
console.log("\n== 981x900: settled 4-up ==");
{
  const { page: p2, errors: e2 } = await openPage(981, 900);
  await seatGrid(p2, 160);
  await p2.mouse.move(4, 500);
  await s(500);
  const cols = await p2.evaluate(() => {
    const cells = [
      ...document.querySelectorAll('ul[aria-label="Our restaurants"] > li'),
    ];
    const tops = new Set(
      cells.map((c) => Math.round(c.getBoundingClientRect().top)),
    );
    return { cells: cells.length, rows: tops.size };
  });
  check(
    cols.cells === 8 && cols.rows === 2,
    `981 grid is 4-up over two rows (rows of tops: ${cols.rows})`,
  );
  await p2.screenshot({ path: `${OUT}/panels-981.png` });
  check(e2.length === 0, `no console errors at 981 (${e2.length})`);
  await p2.close();
}

/* ================= PHASE C — 390: single column ====================== */
console.log("\n== 390x844: single column ==");
{
  const { page: p3, errors: e3 } = await openPage(390, 844);
  const top = await p3.evaluate(() => {
    const el = document.querySelector('[data-plate="0"]');
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  });
  // arm observers on the way down
  for (let y = 0; y < top; y += 500) {
    await p3.evaluate((v) => window.scrollTo(0, v), y);
    await s(80);
  }
  await p3.evaluate((v) => window.scrollTo(0, v - 80), top);
  await s(2400);
  const m = await p3.evaluate(() => {
    const cells = [
      ...document.querySelectorAll('ul[aria-label="Our restaurants"] > li'),
    ];
    const first = cells[0].getBoundingClientRect();
    // the wrap-safe divider: on the narrowest tile the strip may wrap —
    // assert no cell's rule hangs at a wrapped line's start by checking
    // every cell either follows another on its line or sits flush left
    const overhangs = [];
    cells.forEach((li, i) => {
      const p = li.querySelector("h3")?.parentElement?.parentElement;
      const clip = li.lastElementChild.querySelector("p");
      if (!clip) return;
      const cl = clip.getBoundingClientRect().left;
      [...clip.querySelectorAll("span > span")].forEach((cell) => {
        const r = cell.getBoundingClientRect();
        // a line-leading cell: nothing to its left on the same row
        const leading = ![...clip.querySelectorAll("span > span")].some(
          (o) =>
            o !== cell &&
            Math.abs(o.getBoundingClientRect().top - r.top) < 4 &&
            o.getBoundingClientRect().right <= r.left + 1,
        );
        if (leading) {
          // its 1px rule must be OUTSIDE the clip (r.left - 9 < clip left)
          if (r.left - cl > 2) overhangs.push({ i, left: r.left - cl });
        }
      });
    });
    return {
      cells: cells.length,
      firstW: first.width,
      vw: window.innerWidth,
      overhangs,
    };
  });
  check(
    m.cells === 8 && m.firstW > m.vw * 0.8,
    `390 grid is one column (first cell ${Math.round(m.firstW)}px of ${m.vw})`,
  );
  check(
    m.overhangs.length === 0,
    `no orphaned divider at any wrapped line start (${JSON.stringify(m.overhangs.slice(0, 3))})`,
  );
  await p3.screenshot({ path: `${OUT}/panels-390.png` });
  check(e3.length === 0, `no console errors at 390 (${e3.length})`);
  await p3.close();
}

/* ================= PHASE D — reduced motion ========================= */
console.log("\n== 1440, prefers-reduced-motion: reduce ==");
{
  const p4 = await browser.newPage();
  await p4.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const cdp4 = await p4.createCDPSession();
  await cdp4.send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [
      { name: "hover", value: "hover" },
      { name: "pointer", value: "fine" },
      { name: "prefers-reduced-motion", value: "reduce" },
    ],
  });
  await p4.goto(`http://localhost:${PORT}/`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await p4
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 15000,
    })
    .catch(() => {});
  await s(1500);
  const top4 = await p4.evaluate(() => {
    const el = document.querySelector('[data-plate="0"]');
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  });
  for (let y = 0; y < top4; y += 500) {
    await p4.evaluate((v) => window.scrollTo(0, v), y);
    await s(70);
  }
  await p4.evaluate((v) => window.scrollTo(0, v - 140), top4);
  await s(2200);
  const rm = await p4.evaluate(() => {
    const cells = [
      ...document.querySelectorAll('ul[aria-label="Our restaurants"] > li'),
    ];
    return {
      films: document.querySelectorAll(
        'ul[aria-label="Our restaurants"] video',
      ).length,
      platesUp: cells.every(
        (li) =>
          getComputedStyle(li.querySelector("[data-plate]")).opacity === "1",
      ),
      namesUp: cells.every((li) => {
        const h = li.querySelector("h3");
        const rise = h?.querySelector("span > span");
        return rise
          ? !/matrix.*,\s*(?!0\))\d+\.?\d*\)$/.test(
              getComputedStyle(rise).transform,
            ) || getComputedStyle(rise).transform === "none" ||
              /matrix\(1, 0, 0, 1, 0, 0\)/.test(getComputedStyle(rise).transform)
          : false;
      }),
    };
  });
  check(rm.films === 0, `reduced motion: no hover films mounted (${rm.films})`);
  check(rm.platesUp, "reduced motion: all plates standing at opacity 1");
  check(rm.namesUp, "reduced motion: panel names standing (no parked masks)");
  await p4.close();
}

await browser.close();
console.log(`\n${fails === 0 ? "ALL PASS" : `${fails} FAILURES`}`);
process.exit(fails ? 1 : 0);
