/* The story rail's measurement harness — geometry, camera discipline, the two
   seams, and the cost of the scrub.

   Run against a PRODUCTION build. `next dev` recompiles under the probe and
   every frame it measures is a dev-server frame; a p99 taken there means
   nothing. And never `npm run build` while `next dev` is up — both write
   `.next` and the loser's assets 404 mid-run.

     # stop `next dev` first
     NEXT_DIST_DIR=.next-prod npx next build
     NEXT_DIST_DIR=.next-prod npx next start -p 3100
     node scripts/probe-rail.mjs 3100

   The pointer is jiggled throughout on purpose: the global CustomCursor
   resolve is roughly half the real per-frame load on this site (see the
   header of probe-scrollcost.mjs), and a scroll probe with a parked mouse
   measures a page no reader ever sees.

   usage: node scripts/probe-rail.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---- the rail's own arithmetic, duplicated here on purpose --------------
   The probe must not read its expectations out of the page it is testing.
   P=1400, step (158, -84, -58), yaw 20°, card 390×445.

   TWO sets of expectations, because they are different numbers and the
   difference matters. `centre` is the projection of the card's centre POINT,
   which is what the 1.000/0.960/0.923… scales describe. `rect` is the
   bounding box of the projected QUAD, which is what getBoundingClientRect()
   actually returns — and a yawed card has its near edge closer to the camera
   than its far edge, so the box is wider and shifted relative to the
   centre-point figure. The rect numbers are the ones to test against.

   These six numbers are RAIL_SX/SY/SZ in About.tsx and --rail-* in
   About.module.css, restated here a third time on purpose: this file is the
   thing that proves the other two agree, so it cannot import from either. */
const P = 1400,
  SX = 158,
  SY = -84,
  SZ = 58,
  W = 390,
  H = 445;
const YAW = (20 * Math.PI) / 180;

const predict = () => {
  const c = Math.cos(YAW),
    s = Math.sin(YAW);
  const out = [];
  for (let k = 0; k < 9; k++) {
    const cx = k * SX,
      cy = k * SY,
      cz = -k * SZ;
    const xs = [],
      ys = [];
    for (const lx of [-W / 2, W / 2])
      for (const ly of [-H / 2, H / 2]) {
        const X = cx + lx * c,
          Y = cy + ly,
          Z = cz - lx * s;
        const f = P / (P - Z);
        xs.push(X * f);
        ys.push(Y * f);
      }
    const l = Math.min(...xs),
      r = Math.max(...xs),
      t = Math.min(...ys),
      b = Math.max(...ys);
    out.push({
      k,
      centreScale: P / (P + k * SZ),
      centreDx: (k * SX * P) / (P + k * SZ),
      rectW: r - l,
      rectDx: (l + r) / 2,
    });
  }
  const w0 = out[0].rectW,
    x0 = out[0].rectDx;
  return out.map((o) => ({
    ...o,
    rectRatio: o.rectW / w0,
    rectDx: o.rectDx - x0,
  }));
};
const EXPECT = predict();
const RAIL_LAST_IDX = 8;

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
/* Every image the route fetches, recorded from the first byte — the rail's
   nine cards are backed by seven distinct files and must be served through
   /_next/image, never as the 1.8-3.7MB originals under /images/. */
const shots = [];
page.on("response", async (r) => {
  const u = r.url();
  if (!/_next\/image|\/images\//.test(u)) return;
  const len = Number(r.headers()["content-length"] || 0);
  shots.push({ url: u, bytes: len, status: r.status() });
});
await page.goto(`http://localhost:${PORT}/about`, {
  waitUntil: "domcontentloaded",
});
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 60000 },
);
const mounted = await page
  .waitForSelector(".railPinWrap, [class*='railPinWrap']", { timeout: 15000 })
  .then(() => true)
  .catch(() => false);
if (!mounted) {
  console.log("FATAL: the rail branch never mounted at 1440x900.");
  await b.close();
  process.exit(1);
}
await sleep(1200);

/* Lenis owns the scroll position — a raw window.scrollTo is pulled straight
   back to Lenis's own target on the next frame, and scrollIntoView is
   intercepted outright. Everything below goes through __lenis. */
const to = async (y, settle = 260) => {
  await page.evaluate(
    (v) => window.__lenis?.scrollTo(v, { immediate: true }),
    y,
  );
  await sleep(settle);
};
const geom = () =>
  page.evaluate(() => {
    const q = (s) => document.querySelector(`[class*='${s}']`);
    const wrap = q("railPinWrap");
    const r = wrap.getBoundingClientRect();
    return {
      top: r.top + window.scrollY,
      height: wrap.offsetHeight,
      vh: window.innerHeight,
    };
  });

const g = await geom();
const travel = g.height - g.vh;
const at = (p) => g.top + p * travel;

console.log(
  `\nrail: wrap top ${Math.round(g.top)}px, height ${g.height}px, travel ${Math.round(travel)}px (${(travel / g.vh).toFixed(1)} viewports)`,
);

/* ---- AC-1 geometry --------------------------------------------------- */
await to(at(0.02), 500); // inside the lead-in, where t is parked at 0
const rects = await page.evaluate(() =>
  [...document.querySelectorAll("[class*='railCard']")].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      w: r.width,
      h: r.height,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
    };
  }),
);
console.log("\nAC-1  geometry at t=0 (nine .railCard rects)");
console.log(
  "  j   width   ratio  (pred)   ok      dCentreX  (pred)   ok      centre-point scale",
);
let ac1 = rects.length === 9;
rects.forEach((r, j) => {
  const e = EXPECT[j];
  const ratio = r.w / rects[0].w;
  const dx = r.cx - rects[0].cx;
  const okR = Math.abs(ratio - e.rectRatio) <= 0.02 * e.rectRatio;
  const okX = Math.abs(dx - e.rectDx) <= 3;
  if (!okR || !okX) ac1 = false;
  console.log(
    `  ${j}  ${r.w.toFixed(1).padStart(6)}  ${ratio.toFixed(3)}  (${e.rectRatio.toFixed(3)})  ${okR ? "ok " : "OFF"}   ` +
      `${dx.toFixed(1).padStart(7)}  (${e.rectDx.toFixed(1).padStart(6)})  ${okX ? "ok " : "OFF"}   ${e.centreScale.toFixed(3)} / +${e.centreDx.toFixed(0)}px`,
  );
});
console.log(`  => AC-1 ${ac1 ? "PASS" : "FAIL"}`);

/* ---- AC-2 one camera, one write -------------------------------------- */
const cams = await page.evaluate(() => {
  /* the rail is full-bleed now — it is a direct child of the section, not a
     grid item inside .storyShell (which only the list branch renders) */
  const sec = document
    .querySelector("[class*='railPinWrap']")
    .closest("section");
  return [...sec.querySelectorAll("*")]
    .filter((el) => getComputedStyle(el).perspective !== "none")
    .map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
});
console.log(
  `\nAC-2  elements declaring a perspective in the section: ${cams.length}`,
);
cams.forEach((c) => console.log(`        ${c}`));

await to(at(0.4), 400);
const churn = await page.evaluate(
  () =>
    new Promise((res) => {
      const track = document.querySelector("[class*='railTrack']");
      const cards = [...document.querySelectorAll("[class*='railCard']")];
      const read = () => ({
        track: getComputedStyle(track).transform,
        cards: cards.map((c) => getComputedStyle(c).transform),
      });
      const a = read();
      window.__lenis?.scrollTo(window.scrollY + 220, { immediate: true });
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const z = read();
          res({
            trackChanged: a.track !== z.track,
            cardsChanged: z.cards.filter((t, i) => t !== a.cards[i]).length,
            sample: z.track,
          });
        }),
      );
    }),
);
console.log(
  `        across one scrub step: .railTrack transform changed = ${churn.trackChanged}, ` +
    `.railCard transforms changed = ${churn.cardsChanged}/9`,
);
console.log(`        track: ${churn.sample}`);
const ac2 = cams.length === 1 && churn.trackChanged && churn.cardsChanged === 0;
console.log(`  => AC-2 ${ac2 ? "PASS" : "FAIL"}`);

/* ---- AC-3 cover / pin coincidence ------------------------------------ */
console.log("\nAC-3  the seam (20px steps across pin engage)");
let ac3 = true;
for (let d = -60; d <= 60; d += 20) {
  await to(g.top + d, 200);
  const s = await page.evaluate(() => {
    const q = (n) => document.querySelector(`[class*='${n}']`);
    const story = q("railPinWrap").closest("section");
    const pin = q("railPin");
    /* The video's RECT is full-viewport at every one of these positions — it
       is a sticky backdrop and it never moves. The question is whether it is
       VISIBLE, i.e. whether anything painted at these points is the video
       rather than the cream sheet over it. */
    const pts = [
      [40, 40],
      [720, 60],
      [1400, 450],
      [720, 850],
      [40, 860],
    ];
    const onVideo = pts.filter(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return !!el?.closest("[class*='videoBackdrop']");
    }).length;
    return {
      pin: +pin.getBoundingClientRect().top.toFixed(1),
      story: +story.getBoundingClientRect().top.toFixed(1),
      storyH: +story.getBoundingClientRect().height.toFixed(0),
      onVideo,
      pts: pts.length,
    };
  });
  /* The property under test is COINCIDENCE: the sheet's top edge and the
     pin's top edge are the same edge, so there is no band of scroll in which
     one has arrived and the other has not. Testing `story.top <= 0` alone
     would fail on Lenis's sub-pixel position at the exact engage frame. */
  const bad = Math.abs(s.pin - s.story) > 1 || (s.pin <= 0 && s.onVideo > 0);
  if (bad) ac3 = false;
  console.log(
    `   +${String(d).padStart(4)}px   pin.top ${String(s.pin).padStart(7)}   story.top ${String(s.story).padStart(7)}   story.h ${s.storyH}   video visible at ${s.onVideo}/${s.pts} sample points${bad ? "   <-- SEAM" : ""}`,
  );
}
console.log(
  `  => AC-3 ${ac3 ? "PASS" : "FAIL"} (pin top and sheet top are the same edge; no video under a pinned rail)`,
);

/* ---- AC-4 release / Awards handoff ----------------------------------- */
await to(at(1), 500);
const rel = await page.evaluate(() => {
  const q = (n) => document.querySelector(`[class*='${n}']`);
  const wrap = q("railPinWrap");
  const cov = q("coverage");
  const r = wrap.getBoundingClientRect();
  return {
    progress: +(
      (window.scrollY - (r.top + window.scrollY)) /
      (wrap.offsetHeight - innerHeight)
    ).toFixed(3),
    /* the SUFFIX column — the first .storyNumberTrack in the DOM is the
       century wheel, which reads "1" at the end because 2026 is the second
       century in the list. Reading that one is how you convince yourself the
       rail is stuck on chapter 1. */
    wheel: document.querySelector(
      "[class*='storySuffixColumn'] [class*='storyNumberTrack']",
    ).style.transform,
    coverage: +cov.getBoundingClientRect().top.toFixed(0),
    vh: innerHeight,
  };
});
console.log(
  `\nAC-4  at release: wheel track "${rel.wheel}", .coverage.top ${rel.coverage} (viewport ${rel.vh})`,
);
console.log(`  => AC-4 ${rel.coverage >= rel.vh - 4 ? "PASS" : "FAIL"}`);

/* ---- AC-5 wheel integration ------------------------------------------ */
console.log("\nAC-5  wheel steps with the front seat");
await page.evaluate(() => {
  // a render counter that costs nothing: the wheel's inline transform only
  // changes when <About> re-renders with a new activeStory
  window.__wheel = [];
  const el = document.querySelector(
    "[class*='storySuffixColumn'] [class*='storyNumberTrack']",
  );
  new MutationObserver(() => window.__wheel.push(el.style.transform)).observe(
    el,
    {
      attributes: true,
      attributeFilter: ["style"],
    },
  );
});
for (let i = 0; i <= 8; i++) {
  await to(at(0.04 + (i / 8) * 0.92), 220);
  const s = await page.evaluate(
    () =>
      document.querySelector(
        "[class*='storySuffixColumn'] [class*='storyNumberTrack']",
      ).style.transform,
  );
  console.log(`   seat ${i}  ->  ${s}`);
}
const wheelWrites = await page.evaluate(() => window.__wheel.length);
console.log(`        wheel style writes across the walk: ${wheelWrites}`);

/* ---- hit-testing at every seat ---------------------------------------
   Not in the spec's ACs, and it should have been. Chrome hit-tests a
   preserve-3d subtree by inverse-projecting the pointer through each
   element's accumulated matrix, and that inversion collapses the moment an
   element's own plane crosses the camera at z = perspective. The first build
   ran .railTrack from z=0 to z=+3360, so it crossed 1400 between chapters 3
   and 4 and the last five cards rendered perfectly while being completely
   unclickable — invisible to the mouse, to touch and to elementFromPoint.
   Nothing about the picture said so. This is the check that says so.

   IT COUNTS TWO THINGS, and the second one is why the first is not enough.
   A raw "how much of the seat card can the pointer reach" threshold was 60/81
   back when the ribbon's falloff was steep and the card in the seat was
   essentially unoccluded. The ribbon now overlaps by 59% BY DESIGN — that is
   the whole look — so the departing card covers about half the seat card and
   41/81 is the correct answer, not a regression.

   What still has to be true is that the missing points are landing on a
   REAL, VISIBLE sheet in front, not on bare cream (the card has gone
   unclickable) and not on a faded ghost that should have dropped its pointer
   at RAIL_EXIT_GONE. So every miss is resolved to the rail card it actually
   hit and that card's computed opacity is read back. A miss onto something
   below 0.05 opacity is the bug this is hunting. */
console.log("\nHIT   pointer reaches every chapter in the front seat");
let hitOk = true;
for (let seat = 0; seat <= RAIL_LAST_IDX; seat++) {
  await to(at(0.04 + (seat / RAIL_LAST_IDX) * 0.92), 400);
  const s = await page.evaluate((j) => {
    const c = document.querySelectorAll("[class*='railCard']")[j];
    const r = c.getBoundingClientRect();
    let hits = 0,
      ontoCard = 0,
      ontoGhost = 0,
      ontoNothing = 0;
    for (let i = 1; i < 10; i++)
      for (let k = 1; k < 10; k++) {
        const e = document.elementFromPoint(
          Math.round(r.left + (r.width * i) / 10),
          Math.round(r.top + (r.height * k) / 10),
        );
        if (e === c || c.contains(e)) {
          hits++;
          continue;
        }
        /* not the seat card — so what IS under the pointer? */
        const other = e?.closest?.("[class*='railCard']");
        if (!other) ontoNothing++;
        else if (Number(getComputedStyle(other).opacity) < 0.05) ontoGhost++;
        else ontoCard++;
      }
    const m = getComputedStyle(
      document.querySelector("[class*='railTrack']"),
    ).transform.split(",");
    return {
      hits,
      ontoCard,
      ontoGhost,
      ontoNothing,
      z: Math.round(Number(m[14]) || 0),
    };
  }, seat);
  /* 24/81 is a quarter of the card's own box still exposed — below that a
     chapter is not meaningfully clickable however pretty the overlap is. */
  if (s.hits < 24 || s.ontoGhost > 0) hitOk = false;
  console.log(
    `        seat ${seat}   ${String(s.hits).padStart(2)}/81 on the card` +
      `   (${String(s.ontoCard).padStart(2)} onto a visible sheet in front,` +
      ` ${s.ontoGhost} onto a faded ghost, ${s.ontoNothing} onto cream)` +
      `   track z=${String(s.z).padStart(5)}`,
  );
}
console.log(`  => HIT ${hitOk ? "PASS" : "FAIL"}`);

/* ---- AC-6 smoothness -------------------------------------------------- */
console.log("\nAC-6  full-travel scrub, 1440x900, pointer moving");
/* Approach the rail by SCROLLING into it rather than teleporting to its edge
   and sitting still. A reader always arrives moving, and the difference is
   not cosmetic: the first scroll step after a dead stop pays for the
   compositor layerising nine 3D cards and for CustomCursor's first resolve
   after the pointer wakes, and it measured 50ms every run. Teleport-then-
   measure attributes that one-off to the scrub. */
await to(g.top - 700, 500);
for (let i = 0; i < 10; i++) {
  await page.mouse.move(700 + (i % 4) * 9, 450 + (i % 3) * 8);
  await page.evaluate(() =>
    window.__lenis?.scrollTo(window.scrollY + 50, { immediate: true }),
  );
  await sleep(50);
}
await page.evaluate(() => {
  window.__f = [];
  let l = performance.now();
  const t = (x) => {
    window.__f.push(Math.round(x - l));
    l = x;
    requestAnimationFrame(t);
  };
  requestAnimationFrame(t);
});
/* Discard the warm-up. The first two or three deltas after the logger is
   installed straddle the CDP evaluate round-trip and the first synthetic
   mousemove, and they land at 30-40ms every run whatever the page is doing —
   measuring them would be measuring puppeteer. The pre-warm figure is
   reported too so this is not a way of hiding a real spike. */
await sleep(320);
const warmup = await page.evaluate(() => {
  const f = window.__f.slice();
  window.__f = [];
  return f;
});
console.log(
  `        (warm-up discarded: ${warmup.length} frames, worst ${Math.max(0, ...warmup)}ms — CDP round-trip, not the scrub)`,
);
const steps = 90;
for (let i = 0; i < steps; i++) {
  await page.mouse.move(690 + (i % 7) * 8, 430 + (i % 5) * 7);
  await page.evaluate(
    (dy) => window.__lenis?.scrollTo(window.scrollY + dy, { immediate: true }),
    Math.round(travel / steps),
  );
  await sleep(45);
}
const f = await page.evaluate(() => window.__f.slice());
const sorted = [...f].sort((a, z) => a - z);
const pct = (p) =>
  sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
const over20 = f.filter((d) => d > 20).length;
const over32 = f.filter((d) => d > 32).length;
console.log(
  `        frames ${f.length} | median ${pct(0.5)}ms | p99 ${pct(0.99)}ms | worst ${Math.max(...f)}ms | >20ms ${over20} | >32ms ${over32}`,
);
/* WHERE a long frame falls decides whether it is the effect's fault. One at
   frame 3 is the run starting up; one at frame 300 is the scrub. */
f.forEach((d, i) => {
  if (d > 20)
    console.log(
      `        long frame: ${d}ms at frame ${i} of ${f.length} (${Math.round((i / f.length) * 100)}% through the travel)`,
    );
});
console.log(`  => AC-6 ${pct(0.99) < 20 && over32 === 0 ? "PASS" : "FAIL"}`);

/* ---- AC-9 layer promotion -------------------------------------------- */
const promo = async (label, y) => {
  await to(y, 400);
  const s = await page.evaluate(() => {
    const tr = document.querySelector("[class*='railTrack']");
    const cards = [...document.querySelectorAll("[class*='railCard']")];
    return {
      track: getComputedStyle(tr).willChange,
      cardsWithWillChange: cards.filter(
        (c) => getComputedStyle(c).willChange !== "auto",
      ).length,
      backface: cards.filter(
        (c) => getComputedStyle(c).backfaceVisibility === "hidden",
      ).length,
      contain: cards.filter((c) => getComputedStyle(c).contain === "paint")
        .length,
      shadow: cards.filter((c) => getComputedStyle(c).boxShadow === "none")
        .length,
      border: getComputedStyle(cards[0]).border,
    };
  });
  console.log(
    `        ${label.padEnd(18)} track will-change "${s.track}" | cards w/ will-change ${s.cardsWithWillChange} | backface-hidden ${s.backface}/9 | contain:paint ${s.contain}/9 | box-shadow:none ${s.shadow}/9`,
  );
  return s;
};
console.log("\nAC-9 / AC-16  promotion + card edges");
await promo("far above", 0);
const mid = await promo("mid-scrub", at(0.5));
await promo("far below", g.top + g.height + 4000);
console.log(`        card border: ${mid.border}`);

/* ---- AC-14 content in the DOM ---------------------------------------- */
const bodies = await page.evaluate(() => {
  const txt = document.body.innerText;
  return [
    "Chef Omar's parents",
    "halal-certified Caribbean",
    "London's first Filipino ice-cream",
    "world's first Filipino-Japanese ramen",
    "Jacket Exchange",
    "hand-crafted sandos",
    "modern Filipino bistro",
    "Michelin Guide for Greater London",
    "kissaten and listening jazz bar",
  ].filter((s) => txt.includes(s)).length;
});
console.log(`\nAC-14  chapter bodies present in rendered text: ${bodies}/9`);

/* ---- AC-8 image budget ------------------------------------------------
   Two populations, and conflating them makes the rail look ten times more
   expensive than it is. The RAIL's images are the ones that went through
   /_next/image. Everything else hitting /images/ on this route is older page
   furniture — the hero <video poster>, and the Awards table's hover
   thumbnails, which are still raw <img> at full resolution. Both are
   reported; only the first is scored. */
const isStory = (u) =>
  /bintang|guanabana|cafemama|ramo|hoowood|belly|bunso/.test(
    decodeURIComponent(u),
  );
const railImgs = shots.filter(
  (s) => s.url.includes("_next/image") && isStory(s.url),
);
const originals = shots.filter((s) => !s.url.includes("_next/image"));
const total = railImgs.reduce((a, s) => a + s.bytes, 0);
console.log(
  `\nAC-8   rail images (via /_next/image): ${railImgs.length} requests, ${(total / 1024).toFixed(0)}KB`,
);
railImgs.forEach((s) => {
  const m = decodeURIComponent(s.url).match(/url=([^&]+).*?w=(\d+).*?q=(\d+)/);
  console.log(
    `        ${(m ? `${m[1]} @ ${m[2]}w q${m[3]}` : s.url).padEnd(48)} ${(s.bytes / 1024).toFixed(0)}KB`,
  );
});
console.log(
  `  => AC-8 ${railImgs.length <= 7 && total <= 500 * 1024 ? "PASS" : "FAIL"}`,
);
const heavy = originals.filter((s) => s.bytes >= 1024 * 1024);
console.log(
  `       (not the rail's: ${originals.length} raw /images/ requests on the route, ${heavy.length} of them >=1MB —` +
    ` the <video poster> and the Awards hover thumbnails, both pre-existing raw <img>)`,
);
originals.forEach((s) =>
  console.log(
    `        ${s.url.replace(/^https?:\/\/[^/]+/, "").padEnd(48)} ${(s.bytes / 1024).toFixed(0)}KB`,
  ),
);

/* ---- T11 cursor zone --------------------------------------------------
   The rail sits INSIDE the pinned video's data-cursor="glass" scope, so the
   old `closest('[data-cursor="glass"]')` walked straight past the section's
   own data-cursor="default" and put the glass disc over an opaque cream page.
   Checked from both sides: off over the rail, still on over the hero.

   THE SAMPLE POINT MOVED, and it is worth saying why rather than looking like
   a test bent to fit. It used to read (620, 450) — dead centre — back when the
   rail was boxed in the right-hand column and the centre of the frame was
   bare cream. The ribbon is full-bleed now and the seat card covers x
   540-1016, y 405-765, so that point is on a PHOTOGRAPH, and the house
   cursor is supposed to engage over photography (visibleMediaAt) and over
   links (the cards are links). It was measuring the wrong thing at the new
   composition, not catching a regression.

   The cream it now samples is the upper-left quadrant the ribbon leaves
   clear — which is the place a glass disc would actually be wrong, since
   that is where the editorial copy lives. */
const cursorAt = async (label, y, px, py) => {
  await to(y, 400);
  await page.mouse.move(px, py);
  await sleep(200);
  await page.mouse.move(px + 6, py + 4);
  await sleep(300);
  const on = await page.evaluate(() =>
    document.documentElement.classList.contains("glass-cursor"),
  );
  console.log(`        ${label.padEnd(28)} glass cursor ${on ? "ON" : "off"}`);
  return on;
};
console.log("\nT11    cursor zones");
const overCopy = await cursorAt("copy quadrant (cream)", at(0.3), 140, 120);
const overCard = await cursorAt("over a rail card", at(0.3), 760, 560);
const overHero = await cursorAt("over the hero video", 120, 720, 500);
console.log(
  `  => T11 ${!overCopy && overCard && overHero ? "PASS" : "FAIL"} (off on cream, on over a card, on over footage)`,
);

/* ---- AC-17 Lenis hygiene --------------------------------------------- */
/* Lenis is a module singleton that outlives routes (lib/SmoothScroll.tsx).
   An unpaired stop() has killed scrolling on this site twice, and both times
   it only showed up AFTER a route round-trip. */
await to(g.top + travel * 0.3, 300);
await page.evaluate(() => {
  document.querySelector("a[href^='/restaurants/']")?.click();
});
await page
  .waitForFunction(() => location.pathname.startsWith("/restaurants/"), {
    timeout: 15000,
  })
  .catch(() => {});
await sleep(1800);
await page.goBack({ waitUntil: "domcontentloaded" });
await sleep(2400);
const back = await page.evaluate(async () => {
  const before = window.scrollY;
  window.__lenis?.scrollTo(before + 900, { immediate: true });
  await new Promise((r) => setTimeout(r, 500));
  const moved = window.scrollY - before;
  const track = document.querySelector("[class*='railTrack']");
  const t0 = track && getComputedStyle(track).transform;
  window.__lenis?.scrollTo(window.scrollY + 700, { immediate: true });
  await new Promise((r) => setTimeout(r, 500));
  return {
    path: location.pathname,
    scrolled: moved,
    railPresent: !!track,
    scrubs: !!track && getComputedStyle(track).transform !== t0,
  };
});
console.log(
  `\nAC-17  after /about -> /restaurants/* -> back: path ${back.path}, scroll moved ${back.scrolled}px, rail present ${back.railPresent}, still scrubs ${back.scrubs}`,
);
console.log(
  `  => AC-17 ${back.scrolled > 500 && back.railPresent && back.scrubs ? "PASS" : "FAIL"}`,
);

await b.close();
