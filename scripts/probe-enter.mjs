/* THE ASSEMBLY — does the deck build itself on the way in, and does it come
   apart and go back together without stranding a card?

   The entrance is a scalar on each card's own j·Sy / j·Sz step (see
   RAIL_ENTER_* in About.tsx), driven by the wrapper's top edge travelling from
   the viewport's bottom to its top. Three things have to hold and none of them
   are visible in a screenshot:

     1. it is FINISHED before the pin engages — every item transform is exactly
        0/0 at the top of the pin (card 0 carries only the upright drop,
        53/165), or the scrub starts from a deck that is not the geometry
        everything else here is derived from;
     2. it is REVERSIBLE and IDEMPOTENT — scroll down, up, and down again and
        the same offsets come back, to the pixel;
     3. card 0 never moves — j = 0 zeroes both terms, which is what guarantees
        chapter 1 is the front-most card at every point of the entrance.

   It also checks the two branches where the deck must not exist at all:
   reduced motion and the narrow viewport both fall back to `storyList`, and
   all nine chapter bodies ship in the SERVER HTML either way — the reason this
   section is CSS 3D and not a canvas.

   usage: node scripts/probe-enter.mjs [port]   (default 3100) */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const OUT = "/tmp/mgnhw_enter";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
  ],
});

const open = async (page) => {
  await page.goto(`http://localhost:${PORT}/about`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(2200);
};

const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await open(p);

const g = await p.evaluate(() => {
  const w = document.querySelector('[class*="railPinWrap"]');
  const r = w.getBoundingClientRect();
  return { top: r.top + scrollY, h: r.height };
});
const travel = g.h - 900;

/* fractions are of the VIEWPORT when negative (the approach, where the
   assembly lives) and of the pin's travel when positive */
const goto = async (frac) => {
  const y = frac < 0 ? g.top + frac * 900 : g.top + travel * frac;
  await p.evaluate(
    (yy) => window.__lenis?.scrollTo(yy, { immediate: true }) ?? scrollTo(0, yy),
    y,
  );
  await sleep(1500);
  return p.evaluate(() =>
    [...document.querySelectorAll('[class*="railItem"]')].map((i) => {
      const m = new DOMMatrix(getComputedStyle(i).transform);
      return `${m.m42.toFixed(0)}/${m.m43.toFixed(0)}`;
    }),
  );
};

console.log(
  `pin ${Math.round(g.top)}..${Math.round(g.top + travel)}   assembly range ${Math.round(g.top - 900)}..${Math.round(g.top)}\n`,
);

const seq = [-1, -0.75, -0.5, -0.25, 0, 0.02, 0.2];
const first = {};
for (const f of seq) {
  first[f] = await goto(f);
  console.log(`  down  ${String(f).padStart(5)}  ${first[f].join("  ")}`);
}

/* back up, then down again — same positions, same numbers, or a card has been
   stranded somewhere in between */
console.log("");
let drift = 0;
for (const f of [...seq].reverse()) {
  const again = await goto(f);
  const same = again.join() === first[f].join();
  if (!same) drift++;
  console.log(
    `  up    ${String(f).padStart(5)}  ${again.join("  ")}${same ? "" : "  <-- DRIFT"}`,
  );
}
for (const f of seq) {
  const again = await goto(f);
  if (again.join() !== first[f].join()) drift++;
}

/* CARD 0'S RESTING PAIR IS DERIVED, NOT TYPED. It used to be the literal
   "53/165" — the upright drop and forward push of a 560px card, back when
   every card was 560px. The cards now carry a size VARIANT and a breakpoint
   SCALE, so the correct pair is a function of card 0's own rendered height
   ((h/2)(1-cos36) and (h/2)sin36). Reading the height back off the DOM is
   also a stronger check than a literal was: it fails if the stylesheet and
   About.tsx ever disagree about how tall this card is, which is exactly the
   drift the CSS/JS mirror rule exists to catch. */
const seatPair = await p.evaluate(() => {
  const h = document.querySelector('[class*="railCard"]').offsetHeight;
  const rad = (36 * Math.PI) / 180;
  return `${(h / 2 - (h / 2) * Math.cos(rad)).toFixed(0)}/${((h / 2) * Math.sin(rad)).toFixed(0)}`;
});
const settled = first[0].every((v, i) =>
  i === 0 ? v === seatPair : v === "0/0",
);
console.log(
  `\n  assembled by the top of the pin      ${settled ? "PASS" : `FAIL (${first[0].join(" ")}, expected card 0 at ${seatPair})`}`,
);
console.log(
  `  reversible / idempotent              ${drift ? `FAIL (${drift} mismatches)` : "PASS"}`,
);
/* card 0 over the ASSEMBLY's own range only. Past the top of the pin the
   scrub owns it and 953/520 at f = 0.2 is the fly-forward doing its job — a
   blanket "card 0 never moves" would fail on the exit and say nothing about
   the entrance. */
console.log(
  `  card 0 stationary through assembly   ${seq.filter((f) => f <= 0.02).every((f) => first[f][0] === seatPair) ? "PASS" : "FAIL"}`,
);

/* ---- the shots: the deck coming together ---- */
for (const [n, f] of [
  [0, -1],
  [1, -0.6],
  [2, -0.35],
  [3, -0.15],
  [4, 0],
]) {
  await goto(f);
  await p.screenshot({ path: `${OUT}/enter-0${n}.png` });
}

/* ---- the two branches where the deck must NOT be mounted ---- */
const reduced = await b.newPage();
await reduced.setViewport({ width: 1440, height: 900 });
await reduced.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "reduce" },
]);
await open(reduced);
const r1 = await reduced.evaluate(() => ({
  deck: !!document.querySelector('[class*="railPinWrap"]'),
  list: !!document.querySelector('[class*="storyList"]'),
}));
console.log(
  `\n  reduced motion   deck ${r1.deck ? "MOUNTED" : "absent"}, list ${r1.list ? "present" : "MISSING"}   ${!r1.deck && r1.list ? "PASS" : "FAIL"}`,
);

const narrow = await b.newPage();
await narrow.setViewport({ width: 1100, height: 900 });
await open(narrow);
const r2 = await narrow.evaluate(() => ({
  deck: !!document.querySelector('[class*="railPinWrap"]'),
  list: !!document.querySelector('[class*="storyList"]'),
}));
console.log(
  `  narrow 1100px    deck ${r2.deck ? "MOUNTED" : "absent"}, list ${r2.list ? "present" : "MISSING"}   ${!r2.deck && r2.list ? "PASS" : "FAIL"}`,
);

const html = await (await fetch(`http://localhost:${PORT}/about`)).text();
const bodies = [
  "parents open the original",
  "halal-certified Caribbean",
  "first Filipino ice-cream parlour",
  "first Filipino-Japanese ramen",
  "Caribbean takeaway opens with the Jacket Exchange",
  "bakery brings hand-crafted sandos",
  "modern Filipino bistro opens in Kentish Town",
  "added to the Michelin Guide",
  "youngest of the family",
];
const missing = bodies.filter((s) => !html.includes(s));
console.log(
  `  server HTML      nine chapter bodies ${missing.length ? `FAIL — missing ${JSON.stringify(missing)}` : "9/9 PASS"}`,
);
console.log(`\n  shots -> ${OUT}`);
await b.close();
