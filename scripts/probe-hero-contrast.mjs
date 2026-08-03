/* THE HERO HAS TO BE READABLE, AND ONLY A SCREENSHOT CAN SAY SO.

   The About hero sets cream type over a playing video. Nothing about that is
   checkable from the stylesheet: `mix-blend-mode: difference` makes every
   glyph's colour a function of whichever frame happens to sit behind it, and
   a scrim's effectiveness depends on the footage it is covering. So this
   samples the RENDERED PIXELS — ink and ground — for each hero line, at
   several points in the video, and reports WCAG contrast.

   METHOD. For one element:
     - screenshot its box (plus a 12px skirt) at DPR 2;
     - the INK is the darkest-or-lightest extreme, whichever the type is:
       we take the 4th-percentile luminance for dark ink and the 96th for
       light ink, and pick whichever is further from the median. That is
       robust against antialiasing, which otherwise drags a pure sample
       toward the ground;
     - the GROUND is the median of the pixels OUTSIDE any glyph — taken from
       the skirt ring, which is the same scrim and the same footage but
       carries no type.
   Contrast is then the standard (L1+0.05)/(L2+0.05).

   SEVERAL FRAMES, not one. The video is seeked to a spread of times and the
   whole sample repeats, because `difference` fails in the MIDDLE of the
   tonal range — a build can measure fine on a dark frame and vanish on a
   mid-tone one two seconds later. The reported figure is the WORST frame.

   usage: node scripts/probe-hero-contrast.mjs [port] [w] [h] */
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [PORT = "3100", W = "1440", H = "900", MODE = "hero"] = process.argv.slice(2);

/* THE SAME MEASUREMENT, POINTED AT A DIFFERENT SCREEN. The hero is not the
   only cream type on this film: the statement and the whole chef block scroll
   over the same pinned video under the same flat scrim, and the failure mode
   there is identical — small cream print over footage whose brightness the
   stylesheet cannot know. `anchor` is the element to centre before sampling. */
const MODES = {
  hero: { anchor: null, targets: [
    ["MAGINHAWA", '[class*="heroLineTop"]'],
    ["GROUP?", '[class*="heroLineBottom"]'],
    ["lede", '[class*="heroLede"]'],
    ["kicker", '[class*="heroKicker"]'],
  ]},
  /* THE EM PHRASES ARE MEASURED SEPARATELY, and they are the reason this mode
     exists at all. The sentence is cream and comfortable; `comfortable` and
     `every kitchen we run` are SAFFRON, sitting where the shared gradient's
     45% stop makes the film its lightest, and averaging them into the block
     hides them behind eighteen cream words. */
  statement: { anchor: '[class*="statementText"]', targets: [
    ["statement", '[class*="statementText"]'],
    ["statement-em", '[class*="statementText"] [class*="emItalic"]'],
  ]},
  chef: { anchor: '[class*="chefGrid"]', targets: [
    ["chefQuote", '[class*="chefQuote"]'],
    ["chefName", '[class*="chefName"]'],
    ["chefBody", '[class*="chefBody"]'],
    ["eyebrow", '[class*="About_eyebrow"]'],
  ]},
};
const OUT = "/tmp/mgnhw_contrast";
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
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const page = await b.newPage();
await page.setViewport({ width: +W, height: +H, deviceScaleFactor: 2 });
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
await sleep(3200); // the hero entrance is ~1.5s of staggered rises

/* the video has to have DECODED something or every frame samples the poster */
await page
  .waitForFunction(
    () => {
      const v = document.querySelector("video");
      return v && v.readyState >= 2;
    },
    { timeout: 20000 },
  )
  .catch(() => console.log("  ! video never reached readyState 2"));

const { anchor: ANCHOR, targets: TARGETS } = MODES[MODE] ?? MODES.hero;

/* A FIFTH ARGUMENT THAT REMOVES ONE LAYER, so "the scrim helped" stops being
   an assertion and becomes a difference. Run the same mode twice — once
   plain, once with the scrim hidden — and the two numbers bracket exactly
   what that element is worth on this footage. It hides rather than deletes,
   so nothing about the layout moves between the two runs.

   usage: node scripts/probe-hero-contrast.mjs 3100 1440 900 statement noscrim */
/* A SIXTH ARGUMENT THAT ADDS one, for the same reason the fifth removes one.
   `trail` parks every node of the hero's cursor trail (see HeroTrail in
   About.tsx) at peak opacity directly under the four display lines — the worst
   arrangement a pointer could ever produce, and one it never actually will,
   since a real wake is spread along the path the hand took.

   The trail is mounted UNDER .heroScrim precisely so it cannot cost the type
   anything; this is what turns that claim into a difference. Run the mode
   twice, once with and once without, and the two numbers bracket what seven
   photographs at 0.5 alpha are worth beneath a scrim that was fitted to the
   type's own footprint.

   usage: node scripts/probe-hero-contrast.mjs 3151 1440 900 hero '' trail */
const ADD = process.argv[7];
if (ADD === "trail") {
  await page.evaluate(() => {
    const host = document.querySelector('[class*="heroTrail"]');
    if (!host) return console.log("no trail host");
    const nodes = [...host.children];
    // the peak comes from the component, never from a number typed here
    const peak = host.dataset.trailPeak || "0.5";
    const box = host.getBoundingClientRect();
    const top = document.querySelector('[class*="heroLineTop"]').getBoundingClientRect();
    const lede = document.querySelector('[class*="heroLede"]').getBoundingClientRect();
    nodes.forEach((n, i) => {
      n.getAnimations().forEach((a) => a.cancel());
      const x = top.left - box.left + (top.width * (i + 0.5)) / nodes.length;
      const y = (top.top + lede.bottom) / 2 - box.top;
      n.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(-6deg)`;
      n.style.opacity = peak;
    });
  });
  console.log("  + cursor trail forced on, parked under the type");
}

const KILL = process.argv[6];
if (KILL) {
  const sel =
    KILL === "noscrim"
      ? '[class*="statementScrim"],[class*="heroScrim"],[class*="chefScrim"]'
      : KILL;
  await page.evaluate((s) => {
    document
      .querySelectorAll(s)
      .forEach((e) => (e.style.display = "none"));
  }, sel);
  console.log(`  ! layer hidden for this run: ${sel}`);
  await sleep(400);
}

if (ANCHOR) {
  await page.evaluate((sel) => {
    const e = document.querySelector(sel);
    if (!e) return;
    const r = e.getBoundingClientRect();
    const y = r.top + scrollY - (innerHeight - r.height) / 2;
    window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y);
  }, ANCHOR);
  await sleep(1800);
}

const lum = (r, g, bl) => {
  const f = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
};
/* cream, --cream #faf7f1 — the ink every hero line is set in once the
   difference blend is gone */
const L_CREAM = 0.9318;
const ratio = (a, b2) => {
  const [hi, lo] = a > b2 ? [a, b2] : [b2, a];
  return (hi + 0.05) / (lo + 0.05);
};

/* Decode a PNG buffer through the page itself — no image library needed.
   Via atob + Blob rather than `fetch("data:...")`: the app ships a CSP that
   does not list `data:` as a connect-src, so the fetch form throws. */
const decode = async (b64) =>
  page.evaluate(async (b64) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: "image/png" });
    const bmp = await createImageBitmap(blob);
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const x = c.getContext("2d");
    x.drawImage(bmp, 0, 0);
    const d = x.getImageData(0, 0, bmp.width, bmp.height).data;
    return { w: bmp.width, h: bmp.height, d: Array.from(d) };
  }, b64);

/* THE GROUND IS MEASURED WHERE THE GLYPH IS, not beside it.

   A ring median was the first method and it flatters this hero badly: the
   footage under MAGINHAWA's "A" is a lit plate while the skirt two rows above
   it is a dark tablecloth, and averaging the second tells you nothing about
   the first. So each line is shot TWICE — once as it renders and once with
   `visibility: hidden` on the element — and the two are differenced.

   That gives, per pixel: the ink actually painted, the ground actually behind
   it, and a coverage figure (how far the pixel moved) that separates glyph
   cores from antialiasing. Only pixels above COVER are counted, so the
   reported ratio is the type's, not its fringe.

   The headline number is the 5th percentile over the glyph mask — the
   worst-lit twentieth of the letterforms. A minimum would be one pixel of
   subpixel noise; a median would hide the one word that has vanished. */
const SKIRT = 6;
/* A GLYPH CORE, defined per element per frame rather than by a fixed
   threshold. Coverage (how far a pixel moved between the two shots) is
   near-zero on background, maximal inside a stem and everything in between
   along an antialiased edge. A fixed cut-off cannot serve both a 200px
   display cap and a 16px lede: at 16px MOST of the ink is edge, so a low cut
   reports the fringe's contrast and calls the line illegible on frames where
   the letterforms are plainly readable.

   So the cut is relative — 55% of the 95th-percentile coverage in that same
   sample. On any frame that is "the pixels a reader would call ink". */
const COVER_FLOOR = 12; // below this a pixel is background, not fringe
const CORE_FRAC = 0.55; // share of p95 coverage a pixel must reach to count
const CELL = 44; // device px (22 CSS px at DPR 2) — one patch of letterform

const shoot = async (sel, hide) => {
  await page.evaluate(
    (s, h) => {
      const e = document.querySelector(s);
      if (e) e.style.visibility = h ? "hidden" : "";
    },
    sel,
    hide,
  );
};

const sample = async (sel) => {
  /* PAGE COORDINATES, NOT VIEWPORT ONES. `page.screenshot({clip})` captures
     beyond the viewport by default, so its clip is measured from the top of
     the DOCUMENT. getBoundingClientRect() is viewport-relative, and the two
     agree only while scrollY is 0 — which is why the hero measured correctly
     and every band below it silently sampled the hero instead. */
  const box = await page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return {
      x: r.left + scrollX,
      y: r.top + scrollY,
      w: r.width,
      h: r.height,
      vx: r.left,
      vy: r.top,
    };
  }, sel);
  if (!box) return null;
  /* still has to be ON SCREEN — a clip over un-composited page is captured,
     but position:sticky backdrops render where the viewport is, not where the
     clip is, so an off-screen sample would measure type over nothing */
  if (box.vy + box.h < 0 || box.vy > +H) return null;

  const x0 = Math.max(0, Math.floor(box.x - SKIRT));
  const y0 = Math.max(0, Math.floor(box.y - SKIRT));
  const clip = {
    x: x0,
    y: y0,
    width: Math.ceil(box.w + SKIRT * 2),
    height: Math.ceil(box.h + SKIRT * 2),
  };
  if (clip.width < 4 || clip.height < 4) return null;

  const lit = await decode(await page.screenshot({ clip, encoding: "base64" }));
  await shoot(sel, true);
  const bare = await decode(await page.screenshot({ clip, encoding: "base64" }));
  await shoot(sel, false);

  const { w, h } = lit;
  const rows = [];
  for (let i = 0; i < w * h; i++) {
    const j = i * 4;
    const px = i % w;
    const py = (i / w) | 0;
    const a = [lit.d[j], lit.d[j + 1], lit.d[j + 2]];
    const b2 = [bare.d[j], bare.d[j + 1], bare.d[j + 2]];
    const cover =
      Math.abs(a[0] - b2[0]) + Math.abs(a[1] - b2[1]) + Math.abs(a[2] - b2[2]);
    if (cover < COVER_FLOOR) continue;
    rows.push({
      ink: a,
      ground: b2,
      cover,
      cell: ((py / CELL) | 0) * 10000 + ((px / CELL) | 0),
      r: ratio(lum(...a), lum(...b2)),
    });
  }
  if (rows.length < 40) return null;
  const covs = rows.map((r) => r.cover).sort((x, y) => x - y);
  const p95 = covs[Math.floor(covs.length * 0.95)];
  const cores = rows.filter((r) => r.cover >= p95 * CORE_FRAC);
  if (cores.length < 25) return null;
  cores.sort((p1, p2) => p1.r - p2.r);
  const at = (f) =>
    cores[Math.min(cores.length - 1, Math.floor(cores.length * f))];

  /* THE WORST PATCH, not the worst percentile. A percentile taken over the
     whole line cannot fail a build where one LETTER has vanished — 150px of
     a 1400px word is 4% of the ink and a p5 steps straight over it. The eye
     does not: an unreadable A in MAGINHAWA is an unreadable headline.

     So the mask is bucketed into CELL-square patches, each patch is reduced
     to the median contrast of its own core pixels, and the reported figure is
     the worst patch carrying enough ink to judge. That is the same question a
     reader asks, asked once per square centimetre. */
  const byCell = new Map();
  for (const r of cores) {
    if (!byCell.has(r.cell)) byCell.set(r.cell, []);
    byCell.get(r.cell).push(r);
  }
  const patches = [];
  for (const list of byCell.values()) {
    if (list.length < 24) continue;
    list.sort((p1, p2) => p1.r - p2.r);
    patches.push(list[list.length >> 1]);
  }
  patches.sort((p1, p2) => p1.r - p2.r);
  const worstPatch = patches[0] ?? at(0.05);

  /* WHAT CREAM WOULD DO HERE, which is the number that sizes a scrim.
     The ratios above describe the ink this build happens to paint; this one
     describes the GROUND on its own — the brightest hundredth of it under the
     letterforms — and therefore how much contrast solid cream could reach if
     the blend were dropped. It is the design input, measured rather than
     guessed, and it is directly comparable before and after a scrim change. */
  const gl = cores.map((r) => lum(...r.ground)).sort((x, y) => x - y);
  const gP99 = gl[Math.floor(gl.length * 0.99)];
  const gP50 = gl[Math.floor(gl.length * 0.5)];

  return {
    ink: worstPatch.ink,
    ground: worstPatch.ground,
    ratio: +worstPatch.r.toFixed(2),
    median: +at(0.5).r.toFixed(2),
    creamWorst: +ratio(L_CREAM, gP99).toFixed(2),
    creamMed: +ratio(L_CREAM, gP50).toFixed(2),
    patches: patches.length,
    px: cores.length,
  };
};

const TIMES = [0, 1.4, 2.6, 3.2, 4.4, 5.5, 6.8, 8.0, 9.5, 11.0, 13.5, 16.0, 19.0];
const worst = {};
const creamWorst = {};

for (const t of TIMES) {
  await page.evaluate((tt) => {
    const v = document.querySelector("video");
    if (!v) return;
    v.pause();
    try {
      v.currentTime = tt;
    } catch {}
  }, t);
  await sleep(700);
  const dur = await page.evaluate(() => {
    const v = document.querySelector("video");
    return v ? [v.duration, v.currentTime, v.readyState] : null;
  });
  console.log(
    `\n--- video t=${t}s  (dur ${dur?.[0]?.toFixed?.(1)}, at ${dur?.[1]?.toFixed?.(2)}, rs ${dur?.[2]}) ---`,
  );
  for (const [name, sel] of TARGETS) {
    const r = await sample(sel);
    if (!r) {
      console.log(`  ${name.padEnd(11)} (not found)`);
      continue;
    }
    console.log(
      `  ${name.padEnd(11)} ink(${r.ink.join(",")})  ground(${r.ground.join(",")})   worst ${String(r.ratio).padStart(6)}:1  med ${String(r.median).padStart(6)}:1  | cream-on-ground worst ${String(r.creamWorst).padStart(6)}:1  med ${r.creamMed}:1`,
    );
    if (!worst[name] || r.ratio < worst[name].ratio) worst[name] = { ...r, t };
    if (!creamWorst[name] || r.creamWorst < creamWorst[name].creamWorst)
      creamWorst[name] = { ...r, t };
  }
  await page.screenshot({ path: `${OUT}/${MODE}-t${t}.png` });
}

console.log("\n=== WORST FRAME PER LINE ===");
for (const [name] of TARGETS) {
  const w2 = worst[name];
  if (!w2) continue;
  const c2 = creamWorst[name];
  /* 3:1 is the large-text floor (>=24px, or >=18.66px bold); everything else
     is held to 4.5. chefQuote and statement are display type, chefName is
     24px+ at every band this is run at. */
  /* `statement-em` is the statement's own display type, only in saffron — so
     it takes the large-text floor (3:1), not the 4.5:1 the name would suggest
     if it were mistaken for inline emphasis in body copy. */
  const LARGE = new Set([
    "MAGINHAWA",
    "GROUP?",
    "statement",
    "statement-em",
    "chefQuote",
    "chefName",
  ]);
  const floor = LARGE.has(name) ? 3 : 4.5;
  console.log(
    `  ${name.padEnd(11)} as-rendered ${String(w2.ratio).padStart(6)}:1 (t=${w2.t}s)  need ${floor}  ${w2.ratio >= floor ? "PASS" : "FAIL"}` +
      `   | cream-on-ground ${String(c2?.creamWorst ?? "-").padStart(6)}:1 (t=${c2?.t}s) ${(c2?.creamWorst ?? 0) >= floor ? "PASS" : "FAIL"}`,
  );
}
writeFileSync(`${OUT}/worst.json`, JSON.stringify(worst, null, 1));
console.log(`\n shots -> ${OUT}`);
await b.close();
