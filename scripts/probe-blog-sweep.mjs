/* Does the journal's lede plate actually sweep, and can a reader see it?

   The browser pane cannot answer this: it reports document.hidden and runs
   zero rAF frames, so framer's scroll values never update and `data-in`
   never flips. This drives a real Chrome instead.

   WHAT IT MEASURES, in one pass down the page:
     · the scroll position at which `#blog` gains `data-plate` — the head
       runs on `data-in` a third of the approach earlier, so reading the
       wrong attribute reports the wrong moment and the wrong geometry
     · where the plate is on screen at that moment (the whole point — a
       sweep that fires below the fold is a sweep nobody sees)
     · the clip-path at intervals afterwards, to prove the reveal edge
       actually travels rather than snapping

   usage: node scripts/probe-blog-sweep.mjs [port]                        */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const VH = 900;

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: VH });
await p.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 60000 });

/* Lenis owns the wheel, so a raw window.scrollTo is pulled back to its own
   target on the next frame. Drive its instance instead — the capture
   scripts in this directory all do the same, which is why __lenis is
   exposed in lib/SmoothScroll.tsx. */
const jump = async (y) => {
  await p.evaluate((to) => {
    const l = window.__lenis;
    if (l) l.scrollTo(to, { immediate: true });
    else window.scrollTo(0, to);
  }, y);
  await new Promise((r) => setTimeout(r, 90));
};

const read = () =>
  p.evaluate(() => {
    const s = document.querySelector("#blog");
    if (!s) return { err: "no #blog" };
    const pic = s.querySelector('[class*="frontPhoto"]');
    const r = pic.getBoundingClientRect();
    return {
      y: Math.round(window.scrollY),
      dataIn: s.getAttribute("data-in"),
      plated: s.getAttribute("data-plate"),
      clip: getComputedStyle(pic).clipPath,
      picTop: Math.round(r.top),
      picBottom: Math.round(r.bottom),
      sectionTop: Math.round(s.getBoundingClientRect().top),
    };
  });

await new Promise((r) => setTimeout(r, 3000));
const blogTop = await p.evaluate(
  () => document.querySelector("#blog").getBoundingClientRect().top + scrollY,
);
console.log(`#blog layout top: ${Math.round(blogTop)}px\n`);

/* walk the approach: section top from the foot of the screen to the top */
console.log("── the approach ──");
let firedAt = null;
for (let i = 0; i <= 20; i++) {
  const progress = i / 20;
  await jump(blogTop - VH + progress * VH);
  const s = await read();
  if (!firedAt && s.plated) firedAt = s;
  if (i % 4 === 0 || (s.plated && !firedAt)) {
    console.log(
      `  p=${progress.toFixed(2)}  scrollY=${s.y}  head=${s.dataIn ?? "—"} plate=${s.plated ?? "—"}` +
        `  plate ${s.picTop}→${s.picBottom}  clip=${s.clip}`,
    );
  }
}

if (!firedAt) {
  console.log("\n⚠️  data-plate NEVER FIRED across the whole approach.");
  await b.close();
  process.exit(1);
}

console.log(
  `\n✔ fired at scrollY=${firedAt.y}, plate on screen at ` +
    `${firedAt.picTop}→${firedAt.picBottom} of a ${VH}px viewport`,
);
const visible =
  firedAt.picTop < VH && firedAt.picBottom > 0
    ? Math.round(
        (Math.min(firedAt.picBottom, VH) - Math.max(firedAt.picTop, 0)) /
          ((firedAt.picBottom - firedAt.picTop) / 100),
      )
    : 0;
console.log(`  ${visible}% of the plate was on screen when it fired`);

/* hold still and watch the reveal edge travel */
console.log("\n── the reveal, held still ──");
await p.evaluate(() => {
  const s = document.querySelector("#blog");
  s.removeAttribute("data-plate");
  void s.offsetWidth;
  s.setAttribute("data-plate", "on");
});
for (const t of [0, 200, 400, 700, 1000, 1500]) {
  await new Promise((r) => setTimeout(r, t === 0 ? 0 : 200));
  const c = await p.evaluate(
    () =>
      getComputedStyle(
        document.querySelector('#blog [class*="frontPhoto"]'),
      ).clipPath,
  );
  console.log(`  ~${t}ms  ${c}`);
}

await b.close();
