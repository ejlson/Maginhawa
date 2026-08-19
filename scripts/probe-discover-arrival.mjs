/* THE RESTAURANTS CHAPTER ARRIVING, MEASURED — three mechanisms that all
 * claim to be driven by ONE observer, and none of which can be read off a
 * stylesheet.
 *
 *   1. THE HEADING'S WORD MASKS. "Our" and "restaurants" are parked 115%
 *      below their own clips and rise on `inView`. A column that never
 *      leaves 115% is a dead rise — which is the exact bug the component's
 *      own comment warns about, where an observer on the clipped word can
 *      never fire because its visible rect is empty. This proves the
 *      observer is on the SECTION and that the words take it.
 *
 *   2. THE CLIP WIPE. Each cell opens from `inset(0% 0% 100%)` to nothing.
 *      "Nothing" is the load-bearing word: a landed wipe must CLEAR its
 *      clip-path, not rest at `inset(0%)`, or the card's hover lift and its
 *      shadow are shorn off at the cell's edge for the life of the page.
 *      A run that ends with a computed clip-path of `inset(0%)` is a pass
 *      on the animation and a fail on the card.
 *
 *   3. THE PARALLAX. The photograph pans inside its frame while the card
 *      holds still. Two things have to hold at once: the pan must actually
 *      travel as the section crosses the viewport, and it must never exceed
 *      the overscan — (base − 1) × H / 2 — or the travel drags the frame's
 *      own edge into shot. This reports both, per plate, per step.
 *
 * AND ONE THING THAT MUST NOT HAVE CHANGED: /restaurants shares <VenueCard>
 * and sets neither variable, so its photos must still measure scale 1 and
 * no pan. That page is the regression surface for all of this.
 *
 * ⚠️ LENIS OVERRIDES window.scrollTo — drive it through window.__lenis, the
 *    same way scripts/probe-passage.mjs does. A probe that calls
 *    window.scrollTo here reads a page that never moved.
 *
 * usage: node scripts/probe-discover-arrival.mjs [port] [width] [height]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const W = +(process.argv[3] || 1440);
const H = +(process.argv[4] || 900);

/* kept in step with Discover.tsx — the probe asserts the component's own
   numbers, so a change there that is not mirrored here shows up as a fail
   rather than as a silently weaker test */
const PHOTO_OVERSCAN = 1.07;
const PHOTO_PAN_RATIO = 0.024;

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

const fail = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) fail.push(msg);
};

async function openPage({ reduce = false } = {}) {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H });
  if (reduce) {
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
  }
  /* NEVER networkidle0 on this site — the hero film and the hover clips
     loop, so the network never goes quiet. The loader's body class is the
     signal. */
  await page.goto(`http://localhost:${PORT}/`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => !document.body.classList.contains("is-loading"),
    { timeout: 60000 },
  );
  await new Promise((r) => setTimeout(r, 600));
  return page;
}

const seatTo = async (page, y) => {
  await page.evaluate((v) => {
    const l = window.__lenis;
    if (l) l.scrollTo(v, { immediate: true, force: true });
    else window.scrollTo(0, v);
  }, y);
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await new Promise((r) => setTimeout(r, 90));
};

/* what one sample of the chapter looks like */
const sample = (page) =>
  page.evaluate(() => {
    const sec = document.querySelector("#restaurants");
    if (!sec) return null;
    const words = [...sec.querySelectorAll('[class*="titleWord"]')].map((e) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(e).transform);
      return {
        text: e.textContent.trim(),
        on: e.dataset.on ?? null,
        lit: e.dataset.lit ?? null,
        // as a percentage of the word's own box, which is how it is authored
        pct: e.offsetHeight ? (m.m42 / e.offsetHeight) * 100 : null,
        color: getComputedStyle(e).color,
      };
    });
    const cells = [...sec.querySelectorAll("li")].map((li) => ({
      wiping: li.getAttribute("data-wiping"),
      wipe: li.style.getPropertyValue("--wipe").trim(),
      computed: getComputedStyle(li).clipPath,
    }));
    const plates = [...sec.querySelectorAll("[data-plate]")].map((seat) => {
      const img = seat.querySelector("img");
      const cs = img ? getComputedStyle(img) : null;
      return {
        h: Math.round(seat.getBoundingClientRect().height),
        base: seat.style.getPropertyValue("--photo-base").trim(),
        pan:
          parseFloat(
            (seat.style.getPropertyValue("--photo-translate").trim().split(/\s+/)[1]) || "0",
          ) || 0,
        scale: cs ? cs.scale : null,
        translate: cs ? cs.translate : null,
      };
    });
    /* THE LEDE, word by word. `lineTop` groups the masks into visual lines
       so the probe can assert WHERE the line breaks, not just that the copy
       is present — SplitWords' 0.24em margin is narrower than a natural
       space, so swapping plain text for masks can move the break. */
    const ledeEl = sec.querySelector('[class*="lede"]');
    const lede = ledeEl
      ? [...ledeEl.querySelectorAll('[class*="mask"]')].map((m) => {
          const inner = m.firstElementChild;
          const mm = inner
            ? new DOMMatrixReadOnly(getComputedStyle(inner).transform)
            : null;
          return {
            text: m.textContent.trim(),
            lineTop: Math.round(m.getBoundingClientRect().top),
            pct:
              inner && inner.offsetHeight && mm
                ? (mm.m42 / inner.offsetHeight) * 100
                : null,
          };
        })
      : [];
    return {
      lede,
      ledeText: ledeEl ? ledeEl.textContent.replace(/\s+/g, " ").trim() : "",
      top: Math.round(sec.getBoundingClientRect().top + scrollY),
      h2: sec.querySelector("h2")?.textContent ?? "",
      words,
      cells,
      plates,
    };
  });

// ── 1 · ordinary motion ────────────────────────────────────────────────
console.log(`\n═══ ${W}×${H} · ordinary motion ═══\n`);
const page = await openPage();

const geom = await sample(page);
if (!geom) {
  console.log("#restaurants not in the DOM.");
  await b.close();
  process.exit(1);
}

/* park well above the chapter so nothing has fired yet. The entrance
   observer carries rootMargin -16%, so "one viewport clear" is honest. */
await seatTo(page, Math.max(0, geom.top - H * 1.8));
const parked = await sample(page);

ok(
  parked.h2.includes("Our restaurants"),
  `heading textContent is "Our restaurants" (real U+0020 between the masks) — got "${parked.h2.trim()}"`,
);
ok(
  parked.words.length === 2,
  `two word masks — got ${parked.words.length}`,
);
ok(
  parked.words.every((w) => w.pct > 100),
  `both words parked below their clips — got ${parked.words.map((w) => `${w.text} ${w.pct?.toFixed(1)}%`).join(", ")}`,
);
ok(
  parked.cells.every((c) => /100%/.test(c.computed)),
  `all ${parked.cells.length} cells start fully clipped — first: ${parked.cells[0]?.computed}`,
);
ok(
  parked.lede.length === 15,
  `the lede is split into 15 masks — got ${parked.lede.length}`,
);
ok(
  parked.ledeText ===
    "Explore our family of restaurants and stores, where tradition is served with a modern twist.",
  `the lede's textContent survives the split with real spaces — got "${parked.ledeText}"`,
);
ok(
  parked.lede.every((w) => w.pct > 100),
  `every lede word is parked below its clip — got ${parked.lede.filter((w) => !(w.pct > 100)).length} standing`,
);
ok(
  parked.plates.every((p) => p.base === String(PHOTO_OVERSCAN)),
  `every plate carries --photo-base ${PHOTO_OVERSCAN}`,
);

// ── the arrival ────────────────────────────────────────────────────────
await seatTo(page, geom.top - H * 0.35);
/* Long enough for the SLOWEST cell plus the colour's beat. The sweep closes
   at GRID_LEAD_S + 1×ROW + 3×COL + DURATION ≈ 1.92s — the row term is spent
   ONCE because eight cards at GRID_COLS 4 is two rows — and the warming
   settles at ≈1.55s. 3200 leaves real headroom, so a failure here means the
   animation did not run rather than that the probe was impatient. */
await new Promise((r) => setTimeout(r, 3200));
const landed = await sample(page);

ok(
  landed.words.every((w) => w.on === "on"),
  `both words switched on — got ${landed.words.map((w) => w.on).join(", ")}`,
);
ok(
  landed.words.every((w) => Math.abs(w.pct) < 1),
  `both words risen to 0% — got ${landed.words.map((w) => `${w.text} ${w.pct?.toFixed(2)}%`).join(", ")}`,
);
const restaurants = landed.words.find((w) => w.text === "restaurants");
ok(
  restaurants?.lit === "on" && restaurants.color !== landed.words[0].color,
  `"restaurants" warmed to saffron — ${restaurants?.color} vs "Our" ${landed.words[0].color}`,
);
ok(
  landed.lede.every((w) => Math.abs(w.pct) < 1),
  `every lede word has risen — ${landed.lede.filter((w) => Math.abs(w.pct) >= 1).length} still parked`,
);
/* THE CLAUSE BREAK — the sentence must turn AFTER "stores,", never inside
   the clause, at whatever line count the width produces.

   Not "line 1 ends on stores,": that only holds where the lede sets as two
   lines. Below the grid breakpoint it sets as four and the turn moves to
   line 2, which is still correct — and it is where the masks measurably
   differ from plain text. An inline-block's margin-right does NOT collapse
   at a line end the way a real space does, so a line of masks fits one word
   fewer: at 390 plain text breaks "…and stores, where / tradition is served
   with a…" and the masked version breaks "…and stores, / where tradition is
   served…". Same four lines, and the turn lands on the clause instead of
   inside it. Recorded because it is a real typographic change at narrow
   widths, not an accident, and because a future retune of .lede's measure
   should be checked against THIS, not against the plain-text wrap. */
{
  const lines = [...new Set(landed.lede.map((w) => w.lineTop))].sort((a, b) => a - b);
  const enders = lines.map(
    (t) => landed.lede.filter((w) => w.lineTop === t).at(-1)?.text,
  );
  ok(
    enders.includes("stores,"),
    `the lede turns after "stores," — ${lines.length} line(s), ending on ${JSON.stringify(enders)}`,
  );
}
ok(
  landed.cells.every((c) => c.wiping === null),
  `every landed cell dropped data-wiping — ${landed.cells.filter((c) => c.wiping !== null).length} still on`,
);
ok(
  landed.cells.every((c) => c.computed === "none"),
  `every landed cell computes clip-path: none (not inset(0%)) — first: ${landed.cells[0]?.computed}`,
);

// ── the pan, walked past the viewport ──────────────────────────────────
console.log("\n── parallax, per step (pan px on plate 0 / min / max) ──");
const steps = 9;
const from = geom.top - H * 0.9;
const to = geom.top + H * 0.9;
const travel = [];
for (let i = 0; i < steps; i++) {
  await seatTo(page, Math.round(from + ((to - from) * i) / (steps - 1)));
  const s = await sample(page);
  const pans = s.plates.map((p) => p.pan);
  travel.push(pans);
  console.log(
    `  step ${i}  plate0 ${pans[0].toFixed(2).padStart(6)}   ` +
      `min ${Math.min(...pans).toFixed(2).padStart(6)}   ` +
      `max ${Math.max(...pans).toFixed(2).padStart(6)}`,
  );
}

const flat = travel.flat();
ok(
  new Set(travel.map((t) => t[0].toFixed(2))).size > 4,
  `the pan actually travels across the walk (${new Set(travel.map((t) => t[0].toFixed(2))).size} distinct values on plate 0)`,
);
const last = await sample(page);
/* THE CHECK THAT MATTERS: every sample, on every plate, against THAT
   plate's own overscan. A single global peak cannot catch this — the pan
   and the room both scale with height, so the question is never "how many
   pixels" but "how many of ITS pixels". */
const room = (h) => ((PHOTO_OVERSCAN - 1) * h) / 2;
const breaches = travel.flatMap((pans, step) =>
  pans
    .map((pan, i) => ({ step, i, pan, room: room(last.plates[i]?.h ?? 0) }))
    .filter((s) => Math.abs(s.pan) > s.room + 0.01),
);
ok(
  breaches.length === 0,
  `no sample overruns its own plate's overscan — ${breaches.length} breach(es)` +
    (breaches[0]
      ? `, worst ${breaches[0].pan.toFixed(2)}px into ${breaches[0].room.toFixed(2)}px`
      : ""),
);

/* THE OVERSCAN CHECK, which is the one that stops a visible frame edge.
   (base − 1) × H / 2 is how much picture hangs past each end of the plate;
   the pan may not spend more than that. */
const worst = last.plates.reduce(
  (acc, p) => (p.h < acc.h ? { h: p.h } : acc),
  { h: Infinity },
);
ok(
  PHOTO_PAN_RATIO <= (PHOTO_OVERSCAN - 1) / 2,
  `the ratio itself is inside the ceiling: ${PHOTO_PAN_RATIO} <= ${((PHOTO_OVERSCAN - 1) / 2).toFixed(4)} — ` +
    `shortest plate here ${worst.h}px, so ${(worst.h * PHOTO_PAN_RATIO).toFixed(1)}px of pan into ${room(worst.h).toFixed(1)}px of room`,
);
ok(
  last.plates.every((p) => p.scale === String(PHOTO_OVERSCAN)),
  `photos compute scale ${PHOTO_OVERSCAN} — got ${last.plates[0]?.scale}`,
);
ok(
  last.plates.every((p) => /px/.test(p.translate ?? "")),
  `photos compute a translate — got ${last.plates[0]?.translate}`,
);
await page.close();

// ── 2 · reduced motion ─────────────────────────────────────────────────
console.log(`\n═══ ${W}×${H} · prefers-reduced-motion: reduce ═══\n`);
const rm = await openPage({ reduce: true });
const rmGeom = await sample(rm);
await seatTo(rm, Math.max(0, rmGeom.top - H * 1.8));
const rmParked = await sample(rm);

ok(
  rmParked.words.every((w) => Math.abs(w.pct) < 1),
  `words stand from the first paint, without waiting on any observer — got ${rmParked.words.map((w) => `${w.pct?.toFixed(2)}%`).join(", ")}`,
);
ok(
  rmParked.cells.every((c) => c.wiping === null && c.computed === "none"),
  `reduced motion never clips a cell at all — first: ${rmParked.cells[0]?.computed}`,
);
ok(
  rmParked.plates.every((p) => p.base === "" && p.pan === 0),
  `no overscan and no pan is written at all under reduced motion`,
);
ok(
  rmParked.plates.every((p) => p.scale === "1" || p.scale === "none"),
  `photos sit at scale 1 — got ${rmParked.plates[0]?.scale}`,
);
await rm.close();

// ── 3 · the shared card, on /restaurants ───────────────────────────────
console.log(`\n═══ /restaurants — the shared <VenueCard> must be untouched ═══\n`);
const other = await b.newPage();
await other.setViewport({ width: W, height: H });
await other.goto(`http://localhost:${PORT}/restaurants`, {
  waitUntil: "domcontentloaded",
});
await other
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await new Promise((r) => setTimeout(r, 900));
const showcase = await other.evaluate(() =>
  [...document.querySelectorAll("img")]
    .filter((i) => /photo/i.test(i.className))
    .slice(0, 8)
    .map((i) => ({
      scale: getComputedStyle(i).scale,
      translate: getComputedStyle(i).translate,
    })),
);
ok(showcase.length > 0, `found ${showcase.length} venue photos on /restaurants`);
ok(
  showcase.every((p) => p.scale === "1" || p.scale === "none"),
  `/restaurants photos still measure scale 1 — got ${showcase[0]?.scale}`,
);
ok(
  showcase.every((p) => p.translate === "none"),
  `/restaurants photos compute translate: none — no stacking context added — got ${showcase[0]?.translate}`,
);
await other.close();

await b.close();
console.log(
  `\n${fail.length ? `✗ ${fail.length} FAILED` : "✓ all checks passed"}\n`,
);
process.exit(fail.length ? 1 : 0);
