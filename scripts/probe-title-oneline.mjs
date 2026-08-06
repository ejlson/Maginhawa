/* ONE LINE, RIGHT-RANGED — the settled head, proven on the real page.

   Two claims to verify after the Discover head rework, neither by eye:

   1. "Our Restaurants." reads as ONE line box once the intro has fully
      settled. The two word spans must share a line (equal tops and
      bottoms, side by side with no overlap) and the h2 must be one line
      tall — checked at the FITTED size the intro leaves behind AND at the
      CLAMP size a return visit renders (inline font-size stripped in
      place, measured, restored), since the clamp is the wider of the two.

   2. The standfirst sits on the RIGHT of the content width: left edge in
      the right-hand half of the head band, right edge on the band's own
      right edge.

   Plus the thing the rework must NOT have broken: the intro's split
   choreography. The word masks are sampled through the whole sequence —
   the left mask must travel left and the right mask right (the split),
   then both must leave through their screen edges (the depart).

   The main run drives the full intro at 1440x900. A responsive sweep then
   loads fresh pages at 460 / 700 / 980 / 981 / 1100 / 1280 and measures
   the SETTLED layout without scrolling — legitimate because the settled
   section is mounted at full size under the stage overlay the whole time,
   so its boxes are real before the sequence ever runs.

   Probe gotchas honoured (learned previously, do not rediscover):
   - waitUntil "domcontentloaded", never networkidle0 — looping video
     means the network never goes idle
   - Lenis smooths programmatic scrolls: creep in steps and give the
     glide 2-3s to die before measuring
   - step the whole approach rather than teleporting, so scroll-armed
     observers actually fire

   usage: node scripts/probe-title-oneline.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "51365";

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

async function freshPage(w, h) {
  const page = await b.newPage();
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://localhost:${PORT}/`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => !document.body.classList.contains("is-loading"),
    { timeout: 120000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 800));
  return page;
}

/* the settled head's full geometry, plus the same head re-measured at the
   clamp size (inline fitted font stripped in place, then restored) */
function measureHead(page) {
  return page.evaluate(() => {
    const sec = document.getElementById("restaurants");
    if (!sec) return { err: "no section" };
    const h2 = Array.from(sec.querySelectorAll("h2")).find(
      (n) => !n.closest("[aria-hidden]"),
    );
    if (!h2) return { err: "no settled h2" };
    const head = h2.parentElement;
    const caption = head.querySelector("p");

    const read = () => {
      const spans = Array.from(h2.children).map((s) => {
        const r = s.getBoundingClientRect();
        return {
          text: (s.textContent || "").trim(),
          top: +r.top.toFixed(1),
          bottom: +r.bottom.toFixed(1),
          left: +r.left.toFixed(1),
          right: +r.right.toFixed(1),
        };
      });
      const hb = h2.getBoundingClientRect();
      const font = parseFloat(getComputedStyle(h2).fontSize);
      const [a, z] = [spans[0], spans[spans.length - 1]];
      return {
        font: +font.toFixed(2),
        h2H: +hb.height.toFixed(1),
        spans,
        oneLine:
          spans.length === 2 &&
          Math.abs(a.top - z.top) <= 1 &&
          Math.abs(a.bottom - z.bottom) <= 1 &&
          a.right <= z.left &&
          hb.height < font * 1.6,
      };
    };

    const fitted = read();
    // the return-visit rendering: same element, same seat, clamp size
    const inline = h2.style.fontSize;
    h2.style.fontSize = "";
    const clamp = read();
    h2.style.fontSize = inline;

    const headB = head.getBoundingClientRect();
    const capB = caption ? caption.getBoundingClientRect() : null;
    return {
      headLeft: +headB.left.toFixed(1),
      headRight: +headB.right.toFixed(1),
      headW: +headB.width.toFixed(1),
      headMid: +(headB.left + headB.width / 2).toFixed(1),
      fitted,
      fittedInlinePx: inline || null,
      clamp,
      caption: capB
        ? {
            left: +capB.left.toFixed(1),
            right: +capB.right.toFixed(1),
            top: +capB.top.toFixed(1),
            bottom: +capB.bottom.toFixed(1),
            w: +capB.width.toFixed(1),
            leftInRightHalf: capB.left > headB.left + headB.width / 2,
            rightOnBandEdge: Math.abs(capB.right - headB.right) <= 2,
          }
        : null,
      /* collision is judged on the TYPE'S INK, not the h2's grid box: the
         heading's item stretches across all nine tracks, and at ≥981 the
         caption's seat deliberately shares track 9, so the h2 BOX overlaps
         the caption box by design while the line's last glyph ends far
         short of it. A box overlap of unpainted track is not a defect
         (probe trap learned before: unpainted-box overlaps lie); the ink
         edge is what a reader can see collide. */
      collide: capB
        ? (() => {
            const spans = Array.from(h2.children).map((s) =>
              s.getBoundingClientRect(),
            );
            const inkRight = Math.max(...spans.map((r) => r.right));
            const inkLeft = Math.min(...spans.map((r) => r.left));
            const inkTop = Math.min(...spans.map((r) => r.top));
            const inkBottom = Math.max(...spans.map((r) => r.bottom));
            return !(
              inkRight <= capB.left ||
              capB.right <= inkLeft ||
              inkBottom <= capB.top ||
              capB.bottom <= inkTop
            );
          })()
        : false,
    };
  });
}

/* ============ MAIN RUN: the full intro at 1440x900 ============ */
console.log("=== MAIN RUN @1440x900 — full intro, then the settled head ===");
const page = await freshPage(1440, 900);

// creep the whole approach in ~500px steps so every scroll-armed observer
// on the way actually fires, and stop the moment the sequence arms
let armed = false;
for (let i = 0; i < 24 && !armed; i++) {
  await page.evaluate(() => window.scrollBy(0, 500));
  await new Promise((r) => setTimeout(r, 350));
  armed = await page.evaluate(
    () =>
      document.getElementById("restaurants")?.dataset.assemblyArmed === "1",
  );
}
console.log(`armed: ${armed}`);
if (!armed) {
  console.log("FAIL — the intro never armed; nothing below is meaningful");
  await b.close();
  process.exit(1);
}

/* sample the choreography for its whole 9.5s cue sheet: the two intro word
   masks' translateX (the split, then the depart) and the step attribute */
const trace = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const sec = document.getElementById("restaurants");
      const intro = Array.from(sec.querySelectorAll("h2")).find((n) =>
        /introTitle/.test(n.className),
      );
      const masks = intro ? Array.from(intro.children) : [];
      const tx = (el) => {
        const t = getComputedStyle(el).transform;
        if (!t || t === "none") return 0;
        const m = t.match(/matrix\(([^)]+)\)/);
        return m ? parseFloat(m[1].split(",")[4]) : 0;
      };
      const rows = [];
      const t0 = performance.now();
      const tick = () => {
        const el = performance.now() - t0;
        rows.push({
          t: Math.round(el),
          step: sec.dataset.assemblyStep ?? "done",
          l: masks[0] ? Math.round(tx(masks[0])) : null,
          r: masks[1] ? Math.round(tx(masks[1])) : null,
        });
        if (el < 12000) requestAnimationFrame(tick);
        else resolve(rows);
      };
      requestAnimationFrame(tick);
    }),
);

const sampled = trace.filter((r) => r.l !== null);
const minL = Math.min(...sampled.map((r) => r.l));
const maxR = Math.max(...sampled.map((r) => r.r));
const steps = [...new Set(trace.map((r) => r.step))];
console.log(`choreography samples: ${sampled.length} frames carried masks`);
console.log(
  `  left word min translateX:  ${minL}px (split pushes left, depart exits left)`,
);
console.log(
  `  right word max translateX: ${maxR}px (split pushes right, depart exits right)`,
);
console.log(`  steps seen: ${steps.join(" -> ")}`);
console.log(
  `  SPLIT RAN: ${minL < -40 && maxR > 40 ? "YES" : "NO"} (both words cleared 40px in opposite directions)`,
);

// the sequence is over; give the settle travel's scroll exchange and the
// Lenis handover a clear 2.5s to die before measuring anything
await new Promise((r) => setTimeout(r, 2500));

const main = await measureHead(page);
console.log("\n--- settled head @1440 (after the intro) ---");
console.log(JSON.stringify(main, null, 2));

const capOK =
  main.caption && main.caption.leftInRightHalf && main.caption.rightOnBandEdge;
console.log(
  `\nVERDICT @1440: title one line (fitted ${main.fitted.font}px): ${main.fitted.oneLine ? "PASS" : "FAIL"}` +
    ` | one line (clamp ${main.clamp.font}px): ${main.clamp.oneLine ? "PASS" : "FAIL"}` +
    ` | caption right-seated: ${capOK ? "PASS" : "FAIL"}` +
    ` | title/caption collide: ${main.collide ? "FAIL" : "no (PASS)"}`,
);
await page.close();

/* ============ RESPONSIVE SWEEP — settled layout, fresh page each ============ */
console.log("\n=== RESPONSIVE SWEEP (fresh page per width, settled boxes) ===");
for (const w of [460, 700, 980, 981, 1100, 1280]) {
  const p = await freshPage(w, 900);
  const m = await measureHead(p);
  const grid = w >= 981;
  const one = grid
    ? `oneLine fitted:${m.fitted.oneLine ? "Y" : "N"} clamp:${m.clamp.oneLine ? "Y" : "N"}`
    : `stacked (fitted font ${m.fitted.font}px)`;
  const cap = m.caption
    ? `capL ${m.caption.left} vs mid ${m.headMid} (rightHalf:${m.caption.leftInRightHalf ? "Y" : "N"})` +
      ` capR ${m.caption.right} vs bandR ${m.headRight} (edge:${m.caption.rightOnBandEdge ? "Y" : "N"})`
    : "no caption";
  console.log(
    `  ${String(w).padStart(4)}px  ${one}  |  ${cap}  |  collide:${m.collide ? "YES-FAIL" : "no"}`,
  );
}

await b.close();
