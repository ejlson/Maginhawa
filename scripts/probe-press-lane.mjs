/* THE RENDERED INK HEIGHT OF EVERY MASTHEAD IN THE LIVE LANE.

   probe-press-ink.mjs measures each SVG in isolation and says what `scale`
   OUGHT to be. This measures what actually reaches the screen, which is the
   only number that settles "they look different sizes" — the seat height,
   `.logo`'s max-width cap and `object-fit: contain` all sit between the
   multiplier and the pixels, and the cap in particular can silently shrink a
   wide mark below its own base size.

   HOW IT GETS EVERY SEAT ON SCREEN. The track is one long flex row inside an
   `overflow: hidden` lane, so most seats are off-stage at any moment and
   `elementHandle.screenshot()` cannot scroll to them. Instead the drift is
   frozen and the track's transform is DRIVEN in steps; at each step the
   seats fully inside the lane are photographed and measured, and each seat
   is measured once (first sighting wins). The lane's edge mask is switched
   off for the same reason — it fades the outer 10% to transparent, which
   would eat the ink of anything measured near an edge.

   The doubled track means every mark appears twice; only the first copy
   (the one that is not aria-hidden) is measured.

   INK = a pixel that differs from the cream ground by more than 10/255 on
   any channel, ground sampled from the crop's own top-left corner. The lane
   renders at 0.72 alpha through grayscale(1), so a black mark lands around
   luminance 68 on a 243 ground — far outside the threshold — and Time Out's
   hollow letterforms are caught by their outlines, which bound the same
   extent as a solid mark would.

   Usage: node scripts/probe-press-lane.mjs [port] [tag]  */
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const TAG = process.argv[3] || "now";
const OUT =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/082df041-cd16-47f8-81ae-892042eaee11/scratchpad";
const DIR = `${OUT}/lane-${TAG}`;
mkdirSync(DIR, { recursive: true });
const DPR = 2;
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: DPR });
await page.goto(`http://localhost:${PORT}/`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 20000,
  })
  .catch(() => console.log("! loader never cleared is-loading"));
await page.evaluate(() => document.fonts.ready);
await s(2000);

/* arm the reveals — the lane fades in on an IntersectionObserver and a
   teleport past it photographs an opacity-0 row */
const h = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < h; y += 500) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await s(110);
}
await s(700);

const setup = await page.evaluate(() => {
  const track = document.querySelector("ul[class*='PressWall_track']");
  if (!track) return { error: "no track" };
  const lane = track.parentElement;
  const section = lane.closest("section");
  // park the section so the lane sits in the middle of the window
  const r = section.getBoundingClientRect();
  window.scrollTo(0, r.top + window.scrollY - 220);
  return { ok: true };
});
if (setup.error) throw new Error(setup.error);
await s(1200);

const meta = await page.evaluate(() => {
  const track = document.querySelector("ul[class*='PressWall_track']");
  const lane = track.parentElement;
  /* freeze the drift and take the transform over by hand */
  track.getAnimations().forEach((a) => a.cancel());
  track.style.animation = "none";
  /* the edge mask would eat the ink of anything near a lane edge */
  lane.style.maskImage = "none";
  lane.style.webkitMaskImage = "none";
  const seats = [...track.children];
  const rows = seats.map((li, i) => {
    const img = li.querySelector("img");
    return {
      i,
      copy: li.getAttribute("aria-hidden") === "true" ? 1 : 0,
      name: img.getAttribute("alt") || "",
      src: (img.getAttribute("src") || "").split("/").pop(),
      left: li.offsetLeft,
      seatW: li.getBoundingClientRect().width,
      seatH: li.getBoundingClientRect().height,
      imgW: img.getBoundingClientRect().width,
      imgH: img.getBoundingClientRect().height,
      natW: img.naturalWidth,
      natH: img.naturalHeight,
      s: getComputedStyle(li).getPropertyValue("--s").trim(),
      maxW: getComputedStyle(img).maxWidth,
    };
  });
  const lr = lane.getBoundingClientRect();
  return {
    rows,
    lane: { x: lr.x, y: lr.y, w: lr.width, h: lr.height },
    seatBase: getComputedStyle(track.children[0]).height,
    trackW: track.scrollWidth,
  };
});

/* name the copy-0 seats off the doubled list — copy 1 carries alt="" */
const half = meta.rows.length / 2;
meta.rows.forEach((r, i) => {
  if (r.copy === 1) r.name = meta.rows[i - half]?.name ?? r.src;
});

console.log(
  `lane ${meta.lane.w.toFixed(0)}x${meta.lane.h.toFixed(1)} at y=${meta.lane.y.toFixed(0)}` +
    `  track=${meta.trackW}px  seat base(computed)=${meta.seatBase}`,
);

/* ---- walk the track, photographing whatever is fully in the lane ---- */
const want = new Map(meta.rows.filter((r) => r.copy === 0).map((r) => [r.i, r]));
const done = new Map();
/* HALF A LANE PER STEP, not most of one. At 0.8 the widest seat (The
   Independent, 385px once its ink matches the row) straddled every stop —
   off-stage right at one and off-stage left at the next — and reported as
   unmeasured. Half a lane guarantees any seat narrower than half the lane
   lands fully inside at some step. */
const STEP = Math.floor(meta.lane.w * 0.5);
/* START NEGATIVE. The first seat sits at offsetLeft 0, so at off=0 it is
   flush with the lane's left edge and the "fully inside" test rejects it —
   and every later step has already carried it off-stage. Nudging the track
   right by a tenth of a lane brings it into play. */
const START = -Math.floor(meta.lane.w * 0.1);
for (
  let off = START;
  off < meta.trackW / 2 + meta.lane.w && done.size < want.size;
  off += STEP
) {
  await page.evaluate((o) => {
    const t = document.querySelector("ul[class*='PressWall_track']");
    t.style.transform = `translate3d(${-o}px,0,0)`;
  }, off);
  await s(160);
  /* WHOLE VIEWPORT, THEN INDEX INTO IT — not `screenshot({clip})`. Puppeteer
     takes clip in DOCUMENT coordinates while getBoundingClientRect gives
     VIEWPORT ones, and the lane sits ~2000px down the page: passing the rect
     straight through photographed a band near the top of the document and
     every logo measured as "no ink". */
  const shot = `${DIR}/step-${String(off + 10000).padStart(6, "0")}.png`;
  await page.screenshot({ path: shot });
  const raw = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
  const { data, info } = raw;
  const bandTop = Math.round(meta.lane.y * DPR);
  const bandBot = Math.min(
    info.height,
    Math.round((meta.lane.y + meta.lane.h) * DPR),
  );
  for (const [i, r] of want) {
    if (done.has(i)) continue;
    const vx = r.left - off;
    if (vx < 1 || vx + r.seatW > meta.lane.w - 1) continue;
    // the img is centred in the seat by the track's align-items
    const px = Math.round((meta.lane.x + vx) * DPR);
    const pw = Math.round(r.seatW * DPR);
    const gi = (bandTop * info.width + px) * info.channels;
    const ground = [0, 1, 2].map((c) => data[gi + c]);
    let top = -1,
      bot = -1,
      left = -1,
      right = -1;
    for (let y = bandTop; y < bandBot; y++) {
      for (let x = px; x < Math.min(px + pw, info.width); x++) {
        const o = (y * info.width + x) * info.channels;
        if (
          Math.abs(data[o] - ground[0]) > 10 ||
          Math.abs(data[o + 1] - ground[1]) > 10 ||
          Math.abs(data[o + 2] - ground[2]) > 10
        ) {
          if (top < 0) top = y;
          bot = y;
          if (left < 0 || x < left) left = x;
          if (x > right) right = x;
        }
      }
    }
    if (top < 0) continue;
    done.set(i, {
      ...r,
      inkH: (bot - top + 1) / DPR,
      inkW: (right - left + 1) / DPR,
      // y positions are re-based to the lane's own top edge
      inkTopY: (top - bandTop) / DPR,
      inkMidY: ((top + bot) / 2 - bandTop) / DPR,
      laneH: (bandBot - bandTop) / DPR,
    });
  }
}

const got = [...done.values()].sort((a, b) => a.i - b.i);
console.log(
  "\nname                  --s    seat    imgW    maxW-binds  inkH    inkMid",
);
for (const r of got) {
  const natAspect = r.natW / r.natH;
  const wouldBe = r.seatH * natAspect;
  console.log(
    `${r.name.padEnd(21)} ${(r.s || "1").padEnd(6)} ${r.seatH.toFixed(1).padStart(6)} ` +
      `${r.imgW.toFixed(0).padStart(6)}  ${(wouldBe > r.imgW + 0.5 ? "CLAMPED " + wouldBe.toFixed(0) : "-").padEnd(12)}` +
      `${r.inkH.toFixed(2).padStart(6)} ${r.inkMidY.toFixed(2).padStart(7)}`,
  );
}
const hs = got.map((r) => r.inkH);
const mean = hs.reduce((a, b) => a + b, 0) / hs.length;
const sd = Math.sqrt(hs.reduce((a, b) => a + (b - mean) ** 2, 0) / hs.length);
console.log(
  `\nmeasured ${got.length}/${want.size}   ink min=${Math.min(...hs).toFixed(2)} ` +
    `max=${Math.max(...hs).toFixed(2)} mean=${mean.toFixed(2)} sd=${sd.toFixed(2)} ` +
    `spread=${(Math.max(...hs) / Math.min(...hs)).toFixed(2)}x`,
);
const mids = got.map((r) => r.inkMidY);
console.log(
  `ink centre y: min=${Math.min(...mids).toFixed(2)} max=${Math.max(...mids).toFixed(2)} ` +
    `(lane ${got[0].laneH.toFixed(1)} tall)`,
);
writeFileSync(`${DIR}/lane.json`, JSON.stringify(got, null, 2));
console.log(`\nwrote ${DIR}`);
await browser.close();
