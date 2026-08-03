/* THE DARKENED BAND — does a cream mark clear 3:1 over the photograph
   underneath it, per chapter and per depth?

   This exists because the mat stopped being a flat colour. When it was maroon
   / cream / saffron the contrast of a mark against it was a property of two
   hex values and could be computed once. It is now a scrim over NINE
   DIFFERENT PHOTOGRAPHS, several of them bright storefronts, so the answer is
   per chapter and the only honest way to get it is to read the rendered
   pixels back.

   HOW. Park the deck at each seat in turn; for every card at or behind the
   seat, take the mark's own projected box, clip it to the part actually
   exposed above the card in front, and screenshot. Twice: once with the marks
   hidden, which gives the brightest patch of BAND the mark has to sit on, and
   once with them shown, which is only used to confirm the mark is really
   there. The mark's own luminance is computed rather than sampled — it is
   cream through a mask, composited under the veil, and sampling it would
   measure the mask's antialiased edges as much as its ink.

   TWO STATISTICS ON THE BACKGROUND, and reporting only one of them was a
   mistake worth recording. The first version took the single brightest pixel
   under the ink, on the reasoning that a mark is unreadable over its
   brightest patch rather than over its average one. That is true, and on a
   photograph it is also unstable: a 1px shift in where the deck settles can
   land the sample on a specular highlight, and the same chapter at the same
   depth came back 2.55:1 on one run and 3.83:1 on the next. A number that
   moves 50% between runs is not measuring the design.

   So both are reported: p95, which is what the eye integrates over a 28px
   mark, and max, which is the strictest reading available. The verdict is
   taken on p95 and the max is printed beside it so a chapter carrying one
   blown highlight is visible rather than hidden.

   usage: node scripts/probe-mat.mjs [port] [width] [height] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const VW = +(process.argv[3] || 1440);
const VH = +(process.argv[4] || 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* sRGB relative luminance, WCAG 2.x */
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (r, g, b) =>
  0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
/* source-over of `fg` at alpha a onto `bg`, in sRGB — which is what the
   browser does for an opacity layer, gamma and all */
const over = (fg, bg, a) => fg.map((c, i) => c * a + bg[i] * (1 - a));

const CREAM = [250, 247, 241];
const VEIL_INK = [13, 2, 2]; // #0d0202, .railVeil

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
    "--use-gl=angle",
  ],
});
const p = await b.newPage();
await p.setViewport({ width: VW, height: VH });
await p.goto(`http://localhost:${PORT}/about`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await p
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await p.evaluate(() => document.fonts.ready);
await sleep(2500);

const geom = await p.evaluate(() => {
  const w = document.querySelector('[class*="railPinWrap"]');
  if (!w) return null;
  const r = w.getBoundingClientRect();
  return { top: r.top + scrollY, height: r.height, vh: innerHeight };
});
if (!geom) {
  console.log("NO DECK IN THE DOM");
  await b.close();
  process.exit(1);
}
const travel = geom.height - geom.vh;

/* the same dwell arithmetic StoryDeck uses, so each stop is the MIDDLE of a
   chapter's hold rather than a frame from its swap */
const LEAD = 0.04;
const STEP = 0.92 / 8;
const DWELL = 0.55;

const settle = () =>
  p.evaluate(async () => {
    const cards = [...document.querySelectorAll('[class*="railCard"]')];
    const snap = () =>
      cards.map((c) => JSON.stringify(c.getBoundingClientRect())).join("|");
    let last = snap();
    let stable = 0;
    for (let i = 0; i < 150; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = snap();
      stable = now === last ? stable + 1 : 0;
      last = now;
      if (i >= 8 && stable >= 4) return;
    }
  });

/* draw screenshots back into the page and read pixels out of them. Going
   through the page rather than decoding the PNG in node keeps this
   dependency-free — there is no image decoder in the standard library and
   this file is not worth one.

   TWO SHOTS, AND THE DIFF IS THE POINT. `.railMark` is a FULL-WIDTH box with
   the logo `contain`-fitted inside it, so most of that box is band the mark
   never touches — Bintang's ink is 48px of a ~356px box. Taking the brightest
   pixel of the whole box therefore reports the brightest patch of PHOTOGRAPH
   ANYWHERE ON THE STRIP as if the mark were sitting on it, and the first run
   of this probe did exactly that: it read 1.80:1 on chapter 4 at k = 2 while
   reporting 3.00 at k = 3, a depth ordering that cannot physically happen and
   is the tell that the two samples were not measuring the same pixels.

   So the mark is shot ON and OFF and the pixels that CHANGED are the ink. The
   background reported is the brightest of those and only those — the actual
   worst pixel the actual mark actually covers. */
const shoot = () => p.screenshot({ encoding: "base64" });

const sampleMasked = (on, off, rects) =>
  p.evaluate(
    async (a, b, boxes) => {
      const load = async (s) => {
        const img = new Image();
        img.src = `data:image/png;base64,${s}`;
        await img.decode();
        const cv = new OffscreenCanvas(img.width, img.height);
        const cx = cv.getContext("2d", { willReadFrequently: true });
        cx.drawImage(img, 0, 0);
        return { cx, w: img.width, h: img.height };
      };
      const A = await load(a);
      const B = await load(b);
      return boxes.map((r) => {
        const x = Math.max(0, Math.round(r.x));
        const y = Math.max(0, Math.round(r.y));
        const w = Math.min(A.w - x, Math.round(r.w));
        const h = Math.min(A.h - y, Math.round(r.h));
        if (w < 2 || h < 2) return null;
        const da = A.cx.getImageData(x, y, w, h).data;
        const db = B.cx.getImageData(x, y, w, h).data;
        const ink = [];
        for (let i = 0; i < da.length; i += 4) {
          /* 40 rather than a hairline threshold: the mask's own antialiased
             rim moves a pixel by only a few levels, and a rim pixel is not
             where a mark is read. This keeps the sample to the ink's core. */
          const d =
            Math.abs(da[i] - db[i]) +
            Math.abs(da[i + 1] - db[i + 1]) +
            Math.abs(da[i + 2] - db[i + 2]);
          if (d < 40) continue;
          ink.push([
            0.2126 * db[i] + 0.7152 * db[i + 1] + 0.0722 * db[i + 2],
            db[i],
            db[i + 1],
            db[i + 2],
          ]);
        }
        /* fewer than 30 ink pixels is a mark the reader cannot see either —
           report nothing rather than a ratio built on a dozen samples */
        if (ink.length < 30) return null;
        ink.sort((u, v) => u[0] - v[0]);
        const at = (q) => {
          const s = ink[Math.min(ink.length - 1, Math.floor(ink.length * q))];
          return [s[1], s[2], s[3]];
        };
        return { p95: at(0.95), max: at(1) };
      });
    },
    on,
    off,
    rects,
  );

/* the plain form, for the strip-boundary sweep where there is nothing to mask
   against and the whole sample rect is the measurement */
const sampleRects = async (rects) => {
  const shot = await shoot();
  return p.evaluate(
    async (b64, boxes) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const cv = new OffscreenCanvas(img.width, img.height);
      const cx = cv.getContext("2d", { willReadFrequently: true });
      cx.drawImage(img, 0, 0);
      return boxes.map((r) => {
        const x = Math.max(0, Math.round(r.x));
        const y = Math.max(0, Math.round(r.y));
        const w = Math.min(img.width - x, Math.round(r.w));
        const h = Math.min(img.height - y, Math.round(r.h));
        if (w < 2 || h < 2) return null;
        const d = cx.getImageData(x, y, w, h).data;
        let sr = 0,
          sg = 0,
          sb = 0,
          n = 0;
        for (let i = 0; i < d.length; i += 4) {
          sr += d[i];
          sg += d[i + 1];
          sb += d[i + 2];
          n++;
        }
        return [sr / n, sg / n, sb / n];
      });
    },
    shot,
    rects,
  );
};

console.log(`\n=== the mark over the darkened photograph — ${VW}x${VH} ===`);
console.log(
  "cream mark : band under it, as p95/max — contrast ratio by depth\n" +
    "chapter                    k=0        k=1        k=2        k=3        k=4        k=5",
);

const rows = new Map();
let worstNear = Infinity;
let worstNearAt = "";

for (let seat = 0; seat <= 8; seat++) {
  const pin =
    LEAD + STEP * (seat + (seat < 8 ? DWELL / 2 : 0));
  await p.evaluate(
    (y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
    geom.top + travel * pin,
  );
  await settle();
  await sleep(180);

  /* the visible part of each mark's box, plus the veil opacity that is
     sitting over it */
  const targets = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('[class*="railCard"]')];
    const out = [];
    cards.forEach((c, j) => {
      const mk = c.querySelector('[class*="railMark"]');
      if (!mk) return;
      const r = mk.getBoundingClientRect();
      /* clip to what the card in front leaves exposed — sampling the hidden
         part would report a contrast the reader can never see */
      const front = j > 0 ? cards[j - 1].getBoundingClientRect() : null;
      const bottom = front ? Math.min(r.bottom, front.top) : r.bottom;
      if (bottom - r.top < 3 || r.top > innerHeight || bottom < 0) return;
      const veil = c.querySelector('[class*="railVeil"]');
      out.push({
        j,
        x: r.left,
        y: Math.max(0, r.top),
        w: r.width,
        h: bottom - Math.max(0, r.top),
        veil: +getComputedStyle(veil).opacity,
      });
    });
    return out;
  });
  if (!targets.length) continue;

  const on = await shoot();
  // marks off -> the band the mark has to sit on
  await p.evaluate(() => {
    document
      .querySelectorAll('[class*="railMark"]')
      .forEach((m) => (m.style.opacity = "0"));
  });
  await sleep(120);
  const off = await shoot();
  await p.evaluate(() => {
    document
      .querySelectorAll('[class*="railMark"]')
      .forEach((m) => (m.style.opacity = ""));
  });
  const bg = await sampleMasked(on, off, targets);

  targets.forEach((t, i) => {
    const px = bg[i];
    if (!px) return;
    const k = t.j - seat;
    if (k < 0) return;
    const markPx = over(VEIL_INK, CREAM, t.veil);
    const lMark = lum(markPx[0], markPx[1], markPx[2]);
    const cr = ratio(lMark, lum(...px.p95));
    const crMax = ratio(lMark, lum(...px.max));
    if (!rows.has(t.j)) rows.set(t.j, {});
    rows.get(t.j)[k] = { p95: cr, max: crMax };
    if (k <= 2 && cr < worstNear) {
      worstNear = cr;
      worstNearAt = `chapter ${t.j + 1} at k=${k}`;
    }
  });
}

const NAMES = [
  "1 Bintang",
  "2 Guanabana",
  "3 Mamasons",
  "4 Ramo Ramen",
  "5 Hoodwood",
  "6 Cafe Mama",
  "7 Belly",
  "8 Belly/Michelin",
  "9 Bunso (no mark)",
];
for (let j = 0; j <= 8; j++) {
  const r = rows.get(j);
  if (!r) {
    console.log(`  ${NAMES[j].padEnd(20)}  —  no mark on this card`);
    continue;
  }
  const cells = [0, 1, 2, 3, 4, 5]
    .map((k) =>
      r[k]
        ? `${r[k].p95.toFixed(1)}/${r[k].max.toFixed(1)}`.padStart(10)
        : "         —",
    )
    .join(" ");
  console.log(`  ${NAMES[j].padEnd(20)} ${cells}`);
}
console.log(
  `\n  worst p95 at k<=2 (the depths a mark is actually read at): ${worstNear.toFixed(2)}:1  — ${worstNearAt}   ${worstNear >= 3 ? "PASS" : "FAIL"}`,
);

/* ---- STRIP SEPARATION. The card border is gone, so the only thing keeping
   one strip from bleeding into the next is the ramp inside the band itself.
   Measured as the luminance step across each boundary: the DARK foot of one
   strip against the LIGHT head of the next. ---- */
await p.evaluate(
  (y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
  geom.top + travel * (LEAD + STEP * (2 + DWELL / 2)),
);
await settle();
await sleep(180);

const edges = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('[class*="railCard"]')];
  const out = [];
  for (let j = 1; j < cards.length; j++) {
    const r = cards[j].getBoundingClientRect();
    const front = cards[j - 1].getBoundingClientRect();
    if (r.width < 2 || front.top - r.top < 8 || r.top < 0) continue;
    /* a 3px band just BELOW this card's own top edge (the light head of its
       strip) and a 3px band just ABOVE the front card's top edge (the dark
       foot of the same strip) — the boundary the eye has to find */
    const x = r.left + r.width * 0.5 - 40;
    out.push({
      j,
      head: { x, y: r.top + 2, w: 80, h: 3 },
      foot: { x, y: front.top - 5, w: 80, h: 3 },
    });
  }
  return out;
});
const flat = edges.flatMap((e) => [e.head, e.foot]);
const px = await sampleRects(flat);
console.log("\n=== strip boundaries with no card border (t = 2) ===");
edges.forEach((e, i) => {
  const h = px[i * 2];
  const f = px[i * 2 + 1];
  if (!h || !f) return;
  const lh = lum(h[0], h[1], h[2]);
  const lf = lum(f[0], f[1], f[2]);
  console.log(
    `  card ${e.j}  head L ${lh.toFixed(4)}  foot L ${lf.toFixed(4)}  step ${ratio(lh, lf).toFixed(2)}:1`,
  );
});

/* ---- THE RAMP ITSELF, read back off the render.

   The band's job is measured everywhere else in this file (does the mark
   clear 3:1, does the strip stay covered). What was NOT measured, and what
   the "too solid / too abrupt" report was about, is its SHAPE — and shape is
   invisible in a contrast number.

   So: paint the seat card's photograph flat white, then sample straight down
   its centre. Over white, the composited pixel gives the effective alpha
   directly, and the column is then the profile the eye is actually reading.
   White rather than the real photograph because a photograph's own tones are
   the thing that would hide a kink.

   Reported with the SLOPE between samples, because "abrupt" is a statement
   about the derivative, not the value: a curve whose slope jumps by 3x at one
   stop reads as an edge there however smooth the numbers look. ---- */
await p.evaluate(
  (y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
  geom.top + travel * (LEAD + STEP * (2 + DWELL / 2)),
);
await settle();
await sleep(200);
/* the MARK has to go too, and the first run of this proved why: sampling the
   card's centre column put the cream logo (11..39px) inside the first two
   samples and read them back as alpha 0.54 and 0.85, a spike and a recovery
   in the one region the profile is most sensitive in. The column is also
   moved off-centre below — belt and braces, since the widest mark is 149px on
   a 393px card. */
await p.addStyleTag({
  content: '[class*="railCard"] img { visibility: hidden !important; }' +
    '[class*="railPhoto"] { background: #fff !important; }' +
    '[class*="railMark"] { display: none !important; }',
});
await sleep(400);

const ramp = await p.evaluate(() => {
  const act = [...document.querySelectorAll('[class*="railPanel"]')].findIndex(
    (a) => !a.hasAttribute("inert"),
  );
  const card = [...document.querySelectorAll('[class*="railCard"]')][act];
  const mat = card.querySelector('[class*="railMat"]');
  const r = card.getBoundingClientRect();
  const mr = mat.getBoundingClientRect();
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    matH: mr.height,
    /* card-local, not screen: the seat card is upright and magnified by a
       constant, so screen depth / that constant is the card-local depth the
       stops are written in */
    scale: mr.height / parseFloat(getComputedStyle(mat).height),
  };
});

{
  const rows = [];
  for (let f = 0; f <= 1.0001; f += 1 / 16)
    rows.push({
      f,
      x: ramp.left + 18,
      y: Math.round(ramp.top + ramp.matH * Math.min(f, 0.999)) + 1,
      w: 50,
      h: 2,
    });
  const px = await sampleRects(rows);
  console.log(
    `\n=== the ramp, over a white photograph — element ${Math.round(ramp.matH / ramp.scale)} card-local px ===`,
  );
  console.log("   depth(card px)   effective alpha   slope per 10px");
  let prev = null;
  px.forEach((v, i) => {
    if (!v) return;
    /* red channel: scrim ink is (10,2,2) over white, so
       observed = 255(1-a) + 10a  ->  a = (255 - observed) / 245 */
    const a = Math.max(0, Math.min(1, (255 - v[0]) / 245));
    const d = (rows[i].f * ramp.matH) / ramp.scale;
    const slope = prev ? ((a - prev.a) / (d - prev.d)) * 10 : null;
    console.log(
      `   ${d.toFixed(0).padStart(6)}          ${a.toFixed(3)}${slope === null ? "" : `            ${slope.toFixed(4)}`}`,
    );
    prev = { a, d };
  });
}

await b.close();
