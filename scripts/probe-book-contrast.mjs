/* THE CONTRAST THE BLEND USED TO HIDE, and the photograph the scrim used to eat.

   Under mix-blend-mode: difference every glyph's contrast was a function of
   whichever video frame sat behind it, so there was nothing stable to measure.
   With the blend gone the only variable left is the scrim, and that IS
   measurable: hide the copy, screenshot what is underneath, and take the
   BRIGHTEST composited pixel inside EACH TEXT NODE'S OWN RECT — the worst case
   that node's ink has to survive. A page average would let a dark heading band
   pay for a bright support line 130px below it.

   Three things are measured here:

     AC-1.1  every text node vs the scrim alone (video hidden) — the floor
             that holds no matter what the footage does
     AC-1.2  every text node vs the COMPOSITED backdrop (scrim over live
             frames) at 8 scroll stations, at desktop and phone
     AC-1.3  the scrim's composited ALPHA at the stage's four corners, solved
             from the same rgba(18,0,0,a) wash the stylesheet uses: rendered
             over pure white the channel reads 255 − 237a, so a = (255 − r)/237

   Plus one number that is not an AC but decides whether the design works: how
   far the saffron pill's fill sits from the backdrop immediately around it. A
   warm pill on warm footage can pass every contrast test and still vanish.

   usage: node scripts/probe-book-contrast.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "50853";
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const lin = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

let fails = 0;
const rec = (id, ok, detail) => {
  if (!ok) fails++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${id}  ${detail}`);
};

/* The four text nodes on the closing frame, and the ink each one paints.
   `.clock` and `.support` are cream at 0.88 alpha, so their effective ink
   depends on what is behind them — solved per-sample below.

   The PILL LABEL is measured differently and deliberately so. Its backdrop is
   not the scrim: it is the pill's own opaque fill, which sits between the two.
   Sampling the film behind the pill (the first version of this probe did) asks
   what maroon ink would score against a backdrop it never touches, and reports
   ~2:1 for a pairing that is actually 5.85:1. `bg: "fill"` says "read the
   backdrop off the button's computed background-color instead". */
const NODES = [
  { key: "clock", sel: '[class*="Reservations_clock"]', alpha: 0.88 },
  { key: "heading", sel: "#book h2", alpha: 1 },
  {
    key: "pill label",
    sel: '[class*="Reservations_actionLabel"]',
    alpha: 1,
    ink: [47, 0, 0],
    bg: "fill",
    fillSel: '[class*="Reservations_action"]',
  },
  { key: "support", sel: '[class*="Reservations_support"]', alpha: 0.88 },
];

// contrast of cream-at-`a`-over-backdrop `bg` against that same backdrop,
// where bg is given as an rgb triple
const inkRatio = (bg, alpha, ink = [250, 247, 241]) => {
  const mix = bg.map((c, i) => alpha * ink[i] + (1 - alpha) * c);
  const a = lum(mix[0], mix[1], mix[2]);
  const b = lum(bg[0], bg[1], bg[2]);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});

/* Screenshot the viewport once, then read every rect out of the same bitmap —
   NOT a `clip` screenshot per rect: puppeteer's clip is document-relative and
   re-renders from the document origin, which under Lenis hands back a shot of
   the top of the page. */
const sampleRects = async (p, rects) => {
  const b64 = await p.screenshot({ type: "png", encoding: "base64" });
  return p.evaluate(async (data, boxes) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const L = (v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
    return boxes.map((q) => {
      if (!q || q.w < 2 || q.h < 2) return null;
      const px = g.getImageData(q.x, q.y, q.w, q.h).data;
      let best = -1;
      let out = null;
      let sum = [0, 0, 0];
      let n = 0;
      for (let k = 0; k < px.length; k += 4) {
        const l = 0.2126 * L(px[k]) + 0.7152 * L(px[k + 1]) + 0.0722 * L(px[k + 2]);
        sum[0] += px[k]; sum[1] += px[k + 1]; sum[2] += px[k + 2]; n++;
        if (l > best) { best = l; out = [px[k], px[k + 1], px[k + 2]]; }
      }
      return { brightest: out, mean: sum.map((v) => v / n) };
    });
  }, b64, rects);
};

/* The backdrop each text node sits on: for the three that sit on the film,
   the brightest composited pixel inside that node's OWN inked rect (a Range,
   not the element box — a centred block's box is mostly empty air), clamped to
   the film and the viewport, with the copy hidden. For the pill label, the
   button's computed fill, which is opaque and hides the film entirely. */
const takeBackdrop = async (p) => {
  const { rects, fills } = await p.evaluate((nodes) => {
    const film = document.querySelector("#book").getBoundingClientRect();
    const book = document.querySelector('[class*="Reservations_book"]');
    const fills = nodes.map(({ bg, fillSel }) => {
      if (bg !== "fill") return null;
      const el = document.querySelector(fillSel);
      if (!el) return null;
      const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      return m ? m.slice(0, 3).map(Number) : null;
    });
    const rects = nodes.map(({ sel, bg }) => {
      if (bg === "fill") return null;
      const el = document.querySelector(sel);
      if (!el) return null;
      const rg = document.createRange();
      rg.selectNodeContents(el);
      const q = rg.getBoundingClientRect();
      const x = Math.max(0, Math.round(q.left));
      const y = Math.max(0, Math.round(Math.max(q.top, film.top)));
      const r = Math.min(window.innerWidth, Math.round(q.right));
      const bm = Math.min(window.innerHeight, Math.round(Math.min(q.bottom, film.bottom)));
      return { x, y, w: r - x, h: bm - y };
    });
    book.style.visibility = "hidden";
    return { rects, fills };
  }, NODES);
  const got = await sampleRects(p, rects);
  await p.evaluate(() => {
    document.querySelector('[class*="Reservations_book"]').style.visibility = "";
  });
  return got.map((g, i) => (fills[i] ? { brightest: fills[i], mean: fills[i] } : g));
};

for (const [W, H] of [[1920, 1080], [390, 844]]) {
  const p = await b.newPage();
  await p.setViewport({ width: W, height: H });
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 });
  await p.evaluate(() => document.fonts.ready);
  await s(2500);

  console.log(`\n########## ${W}x${H} ##########`);

  const park = (f) =>
    p.evaluate((v) => {
      const el = document.querySelector("#book");
      const y = el.getBoundingClientRect().top + window.scrollY + v * el.offsetHeight * 0.9;
      window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
    }, f);

  /* ---- AC-1.1 — the scrim alone, video hidden ---- */
  await park(0);
  await s(900);
  await p.evaluate(() => {
    document.querySelectorAll("#book video").forEach((v) => (v.style.visibility = "hidden"));
    document.querySelector('[class*="Reservations_bg"]').style.background = "#fff";
  });
  await s(400);
  console.log(`\n----- AC-1.1  scrim over a BLOWN-WHITE plate (video hidden) -----`);
  {
    const got = await takeBackdrop(p);
    got.forEach((g, i) => {
      if (!g) return rec("AC-1.1", false, `${NODES[i].key}: no rect`);
      const r = inkRatio(g.brightest, NODES[i].alpha, NODES[i].ink);
      rec("AC-1.1", r >= 4.5,
        `${NODES[i].key.padEnd(10)} brightest backdrop rgb(${g.brightest.map(Math.round).join(",")}) → ${r.toFixed(2)}:1`);
    });
  }

  /* ---- AC-1.3 — composited scrim alpha at the stage's four corners ---- */
  {
    const corners = await p.evaluate(() => {
      const q = document.querySelector('[class*="Reservations_stage"]').getBoundingClientRect();
      const x0 = Math.max(0, Math.round(q.left)) + 1;
      const x1 = Math.min(window.innerWidth, Math.round(q.right)) - 5;
      const y0 = Math.max(0, Math.round(q.top)) + 1;
      const y1 = Math.min(window.innerHeight, Math.round(q.bottom)) - 5;
      return [
        { x: x0, y: y0, w: 4, h: 4 },
        { x: x1, y: y0, w: 4, h: 4 },
        { x: x0, y: y1, w: 4, h: 4 },
        { x: x1, y: y1, w: 4, h: 4 },
      ];
    });
    const got = await sampleRects(p, corners);
    // the plate under the scrim is forced to #fff above, so alpha solves
    // exactly: rgba(18,0,0,a) over white renders r = 255 − 237a
    const alphas = got.map((g) => (255 - g.mean[0]) / 237);
    const worst = Math.max(...alphas);
    rec("AC-1.3", worst <= 0.45,
      `corner alphas TL ${alphas[0].toFixed(3)}  TR ${alphas[1].toFixed(3)}  BL ${alphas[2].toFixed(3)}  BR ${alphas[3].toFixed(3)}  (was 0.826 uniformly; floor ≤0.45)`);
  }

  await p.evaluate(() => {
    document.querySelectorAll("#book video").forEach((v) => (v.style.visibility = ""));
    document.querySelector('[class*="Reservations_bg"]').style.background = "";
  });

  /* ---- AC-1.2 — composited over live frames, 8 stations ---- */
  console.log(`\n----- AC-1.2  scrim over LIVE footage, 8 stations -----`);
  const worst = {};
  for (let i = 0; i < 8; i++) {
    const frac = i / 7;
    await park(frac);
    await s(700);
    const got = await takeBackdrop(p);
    const line = got.map((g, k) => {
      if (!g) return `${NODES[k].key}: off-screen`;
      const r = inkRatio(g.brightest, NODES[k].alpha, NODES[k].ink);
      if (!(NODES[k].key in worst) || r < worst[NODES[k].key]) worst[NODES[k].key] = r;
      return `${NODES[k].key} ${r.toFixed(2)}`;
    });
    console.log(`  station ${i} (${frac.toFixed(2)})  ${line.join("  |  ")}`);
  }
  for (const [k, v] of Object.entries(worst)) {
    rec("AC-1.2", v >= 4.5, `${k.padEnd(10)} worst across the traverse ${v.toFixed(2)}:1`);
  }

  /* ---- not an AC: does the saffron pill actually separate from the film? ---- */
  await park(0);
  await s(900);
  {
    const box = await p.evaluate(() => {
      const a = document.querySelector('[class*="Reservations_action"]');
      const q = a.getBoundingClientRect();
      // a 24px collar around the pill — its immediate surround, which is what
      // the eye compares the fill against
      const pad = 24;
      a.closest('[class*="Reservations_book"]').style.visibility = "hidden";
      return {
        x: Math.max(0, Math.round(q.left - pad)),
        y: Math.max(0, Math.round(q.top - pad)),
        w: Math.round(q.width + pad * 2),
        h: Math.round(q.height + pad * 2),
      };
    });
    const [g] = await sampleRects(p, [box]);
    await p.evaluate(() => {
      document.querySelector('[class*="Reservations_book"]').style.visibility = "";
    });
    const fill = await p.evaluate(() =>
      getComputedStyle(document.querySelector('[class*="Reservations_action"]')).backgroundColor);
    const rgb = fill.match(/\d+/g).map(Number);
    const lf = lum(rgb[0], rgb[1], rgb[2]);
    const lm = lum(g.mean[0], g.mean[1], g.mean[2]);
    const lb = lum(g.brightest[0], g.brightest[1], g.brightest[2]);
    const sep = (a2, b2) => ((Math.max(a2, b2) + 0.05) / (Math.min(a2, b2) + 0.05)).toFixed(2);
    console.log(`\n----- pill separation (not an AC — the "does it pop" number) -----`);
    console.log(`  fill ${fill} L ${lf.toFixed(4)}`);
    console.log(`  surround mean rgb(${g.mean.map(Math.round).join(",")}) L ${lm.toFixed(4)}  →  ${sep(lf, lm)}:1`);
    console.log(`  surround brightest rgb(${g.brightest.join(",")}) L ${lb.toFixed(4)}  →  ${sep(lf, lb)}:1`);
    console.log(`  (below ~1.6:1 against the MEAN the pill reads as part of the photograph)`);
  }

  await p.close();
}

await b.close();
console.log(`\n${fails === 0 ? "ALL PASS" : `${fails} FAILURE(S)`}`);
process.exit(fails === 0 ? 0 : 1);
