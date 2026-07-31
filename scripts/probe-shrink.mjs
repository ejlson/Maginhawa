/* THE INTERLUDE → JOURNAL FLIGHT.
 *
 * Watches the "One family, seven kitchens." photograph shrink out of its
 * full-bleed band and land as the journal's first card, and checks the four
 * things that would make it look wrong:
 *
 *   TAKE-OFF   the flying copy must appear exactly over the band it replaces
 *              (any gap is a visible pop on the first frame)
 *   PATH       the distance to the seat must close smoothly, never jump
 *   REEL       the strip must be home before the photograph lands
 *   SETTLE     it must overshoot ONCE and come back — that is the weight —
 *              and finish exactly on the card's rectangle
 *
 * Run against a production build; dev's per-frame work drowns the signal.
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || 3100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FLYER = 'body > div[class*="Interlude_flyer"]';

const sample = () => {
  const flyer = document.querySelector(
    'body > div[class*="Interlude_flyer"]',
  );
  const band = document.querySelector('section[class*="Interlude_section"]');
  const plate = document.querySelector(
    '#blog div[class*="Blog_plate"]',
  );
  const shell = plate?.closest("#blog > div");
  const r = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) };
  };
  let shellX = null;
  if (shell) {
    const m = new DOMMatrixReadOnly(getComputedStyle(shell).transform);
    shellX = Math.round(m.m41);
  }
  return {
    y: Math.round(window.scrollY),
    flyer: r(flyer),
    band: r(band),
    plate: r(plate),
    shellX,
    holding: !!plate?.hasAttribute("data-holding"),
  };
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#blog", { timeout: 60000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 60000 },
);
await sleep(1200);

// park with the interlude band resting on the bottom of the screen — the
// flight's zero
await page.evaluate(() => {
  const band = document.querySelector('section[class*="Interlude_section"]');
  const b = band.getBoundingClientRect();
  window.__lenis?.scrollTo(window.scrollY + b.bottom - innerHeight, {
    immediate: true,
  });
});
await sleep(1400);

/* Catch the take-off on the frame it happens. Sampling on a timer always
   reads the copy already in flight, which cannot tell a clean hand-over
   from a pop — this reads both rects the instant the flying copy is
   inserted, which is the only moment the two are supposed to be identical. */
await page.evaluate(() => {
  window.__takeoff = null;
  new MutationObserver((records) => {
    if (window.__takeoff) return;
    for (const rec of records) {
      for (const node of rec.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (!/Interlude_flyer/.test(node.className || "")) continue;
        const f = node.getBoundingClientRect();
        const b = document
          .querySelector('section[class*="Interlude_section"]')
          .getBoundingClientRect();
        window.__takeoff = {
          x: +(f.left - b.left).toFixed(1),
          y: +(f.top - b.top).toFixed(1),
          w: +(f.width - b.width).toFixed(1),
          h: +(f.height - b.height).toFixed(1),
        };
      }
    }
  }).observe(document.body, { childList: true });
});

// start the frame meter
await page.evaluate(() => {
  window.__f = [];
  let last = performance.now();
  const tick = (t) => {
    window.__f.push(t - last);
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const track = [];
track.push({ step: -1, ...(await page.evaluate(sample)) });

// walk one viewport of scroll in even bites — the reader's hand, roughly
const STEP = 55;
const STEPS = 18;
for (let i = 0; i < STEPS; i++) {
  await page.evaluate(
    (d) => window.__lenis?.scrollTo(window.scrollY + d, { immediate: true }),
    STEP,
  );
  await sleep(110);
  track.push({ step: i, ...(await page.evaluate(sample)) });
}

/* Then the case the bounce actually lives in: the reader FLICKS past. The
   scrub's target snaps to 1 while the spring still has velocity, so it
   carries a fraction past the seat and comes back. Re-park at the flight's
   zero and jump most of a viewport in one go. */
await page.evaluate(() => {
  const band = document.querySelector('section[class*="Interlude_section"]');
  const b = band.getBoundingClientRect();
  window.__lenis?.scrollTo(window.scrollY + b.bottom - innerHeight, {
    immediate: true,
  });
});
await sleep(1500);
await page.evaluate(() =>
  window.__lenis?.scrollTo(window.scrollY + 980, { immediate: true }),
);

const settle = [];
for (let i = 0; i < 40; i++) {
  await sleep(35);
  settle.push(await page.evaluate(sample));
}

const frames = await page.evaluate(() => window.__f.slice(2));

// ---------- read the flight ----------
const dist = (s) =>
  s.flyer && s.plate
    ? Math.round(
        Math.hypot(
          s.flyer.x + s.flyer.w / 2 - (s.plate.x + s.plate.w / 2),
          s.flyer.y + s.flyer.h / 2 - (s.plate.y + s.plate.h / 2),
        ),
      )
    : null;

console.log("\nFLIGHT — flyer box, seat box, distance to seat\n");
for (const s of track) {
  const f = s.flyer
    ? `${s.flyer.w}x${s.flyer.h} @${s.flyer.x},${s.flyer.y}`
    : "—";
  const p = s.plate ? `${s.plate.w}x${s.plate.h} @${s.plate.x},${s.plate.y}` : "—";
  console.log(
    `  y=${String(s.y).padStart(5)}  flyer ${f.padEnd(26)} seat ${p.padEnd(24)} d=${String(dist(s) ?? "—").padStart(5)}  reelX=${String(s.shellX ?? "—").padStart(5)}  holding=${s.holding ? "y" : "n"}`,
  );
}

// TAKE-OFF: measured on the insertion frame, not on a timer
const t = await page.evaluate(() => window.__takeoff);
console.log(
  `\ntake-off, on the frame the flying copy appears — offset from the band it replaces: x${t?.x} y${t?.y} w${t?.w} h${t?.h}  (all 0 = the same pixels in the same place)`,
);

// PATH: strictly closing, no jumps
const ds = track.map(dist).filter((v) => v !== null);
const rises = ds.slice(1).filter((v, i) => v > ds[i] + 2).length;
console.log(`path: ${ds.join(" → ")}`);
console.log(`  steps that moved AWAY from the seat: ${rises}  (0 = one clean arc)`);

// REEL: home before the landing
const airborne = track.filter((s) => s.flyer);
const lastAir = airborne[airborne.length - 1];
console.log(
  `reel at the last airborne sample: translateX ${lastAir?.shellX}px  (0 = seated)`,
);

// SETTLE: one overshoot, then rest, then the card takes over
/* Signed, not absolute: the overshoot is the flyer going SMALLER than the
   card, so the size difference has to keep its sign or the bounce reads as
   just another step of the approach. */
const gap = (s) => (s.flyer && s.plate ? s.flyer.w - s.plate.w : null);
const sd = settle.map(gap);
console.log(
  `\nsettle (flyer width − card width):\n  ${sd.map((v) => (v === null ? "land" : v)).join(" → ")}`,
);
const seen = sd.filter((v) => v !== null);
const under = seen.filter((v) => v < -1).length;
console.log(
  `  frames past the seat (negative): ${under}  — a handful = it carried through and came back; 0 = it just stopped`,
);
const last = settle[settle.length - 1];
console.log(
  `  ended: flyer ${last.flyer ? "still up" : "retired"}, card holding=${last.holding ? "y" : "n"}  (retired + n = the card owns its picture)`,
);

const worst = Math.max(...frames);
const janky = frames.filter((f) => f > 32).length;
console.log(
  `\nframes: ${frames.length} | worst ${worst.toFixed(0)}ms | >32ms ${janky} (${((janky / frames.length) * 100).toFixed(0)}%)`,
);

await browser.close();
