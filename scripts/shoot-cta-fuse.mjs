/* A FILMSTRIP OF THE HOUSE ACTION FUSING — PillCta's pill and disc closing
   on each other, sampled at fixed fractions of the move and cropped tight
   on the join so the meniscus is actually visible at reading size.

   HOW IT SAMPLES. It stretches --cta-dur to 12s on the control itself,
   hovers, and then waits for each frame BY READING THE CLIP-PATH rather
   than by counting milliseconds. The easing is a function of the fraction,
   so a shape caught at p is the true shape at that point of the real 950ms
   move — 12× the slack on every sample.

   ⚠️ IT MUST NOT PACE OFF THE WALL CLOCK, and that is the whole reason
   this file is shaped the way it is. A CSS transition advances on the
   document's ANIMATION clock, which only ticks when frames are produced —
   and a 3×-DPR full-page capture of a page this heavy stalls frame
   production for seconds at a time. Pacing off Date.now() had the strip
   running about half as far as it thought it had: nine frames labelled up
   to f=1.0 that were really the first half of the move, with the last one
   captioned "one clean pill" over a picture of the neck.

   WHAT TO LOOK FOR, in order:
     f=0.00  two crisp cells with clear air between them. Any smear across
             the gap means --cta-goo is too large for --cta-gap.
     f=0.00  the disc's top and bottom flush with the pill's. A visibly
             SHORT disc is the threshold eroding a curve (σ²/2r) and means
             --cta-goo is too large full stop.
     f≈0.55  the bodies touch. Before it the neck should already be there.
     f≈0.6-0.8  a smooth concave bridge that widens. A sharp V is the
             filter not reaching; a pinched waist that never opens is the
             filter being asked to close the gap (it must not be).
     f=1.00  ONE pill. Any seam, notch or bump at the right cap means the
             R = a + b equation has been broken.

   Usage: node scripts/shoot-cta-fuse.mjs <port> [path] [nth] */

import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const PATHNAME = process.argv[3] || "/";
const NTH = Number(process.argv[4] || 0);
const OUT = process.env.SHOT_DIR || "shots";
const SEL = '[class*="PillCta_cta__"]';
const SLOW = 12000;
/* fraction of the duration → the progress --ease-fuse is at there, read
   off the same table the curve is sampled from in PillCta.module.css.
   These are what the strip waits ON. */
const FRAMES = [
  [0.25, 0.042],
  [0.45, 0.147],
  [0.55, 0.212], // contact
  [0.62, 0.314],
  [0.7, 0.5],
  [0.78, 0.732],
  [0.88, 0.94],
  [1.0, 0.999],
];
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
/* 3× so a sub-pixel erosion at the disc's poles is a visible 3px in the
   crop rather than something to be argued about */
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 3 });
const cdp = await page.createCDPSession();
await cdp.send("Emulation.setEmulatedMedia", {
  media: "screen",
  features: [
    { name: "hover", value: "hover" },
    { name: "pointer", value: "fine" },
  ],
});

await page.goto(`http://localhost:${PORT}${PATHNAME}`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 20000,
  })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);
await s(1800);
await page.waitForSelector(SEL, { timeout: 20000 });

/* park it mid-screen and let the smooth scroller stop moving before
   anything is measured — see the note in shoot-indent-hover.mjs */
await page.evaluate(
  (q, n) => {
    const el = document.querySelectorAll(q)[n];
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 400);
  },
  SEL,
  NTH
);
let last = -1;
for (let i = 0; i < 40; i++) {
  await s(100);
  const y = await page.evaluate(() => Math.round(window.scrollY));
  if (y === last) break;
  last = y;
}
await s(900);

const read = () =>
  page.evaluate(
    (q, n, slow) => {
      const el = document.querySelectorAll(q)[n];
      el.style.setProperty("--cta-dur", `${slow}ms`);
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        label: el.textContent.trim(),
        h: cs.getPropertyValue("--cta-h").trim(),
        gap: cs.getPropertyValue("--cta-gap").trim(),
        close: cs.getPropertyValue("--cta-close").trim(),
        goo: cs.getPropertyValue("--cta-goo").trim(),
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        hovered: el.matches(":hover"),
        scroll: { x: window.scrollX, y: window.scrollY },
      };
    },
    SEL,
    NTH,
    SLOW
  );

let geom = await read();
console.log(
  `#${NTH} "${geom.label}"  h=${geom.h} gap=${geom.gap} close=${geom.close} goo=${geom.goo}`
);

/* ⚠️ AIM, THEN CHECK, THEN RE-AIM. Parking the scroll does not PIN it —
   the hero's dolly and the chapter entrances both keep moving for a while
   after scrollY stops changing, and a pointer sent to a rect measured a
   second earlier lands on whatever has drifted into that spot. A filmstrip
   shot from a control that was never hovered is nine photographs of a
   pill at rest, and they look perfectly plausible. */
for (let i = 0; i < 6; i++) {
  await page.mouse.move(geom.cx, geom.cy);
  await s(120);
  geom = await read();
  if (geom.hovered) break;
  await s(300);
  geom = await read();
}
if (!geom.hovered) throw new Error("could not land the pointer on the control");

/* crop the control plus a little air, in DOCUMENT space — a clip is
   measured from the top of the page while a rect is measured from the top
   of the viewport, and the two are thousands of pixels apart here. Widened
   left by the close so the crop still holds the whole control once it has
   shortened by 2 × --cta-close. */
const PAD = 20;
const clip = {
  x: geom.rect.x + geom.scroll.x - PAD,
  y: geom.rect.y + geom.scroll.y - PAD,
  width: geom.rect.w + PAD * 2,
  height: geom.rect.h + PAD * 2,
};

/* the rest frame has to be shot with the pointer OFF the control, and the
   control has to be back at rest before it is taken — 20s, the stretched
   duration, plus a beat */
await page.mouse.move(geom.rect.x - 240, geom.rect.y - 120);
await s(SLOW + 600);
await page.screenshot({ path: `${OUT}/cta-fuse-f000-rest.png`, clip });
console.log(`  f=0.000  rest`);

/* ── THE TWO ENDS OF THE CLIP, IN PIXELS ──
   getPropertyValue on an UNREGISTERED custom property hands back the token
   stream it was written as — "clamp(34px, 2.6vw, 40px)" — not a length, so
   parseFloat gives NaN and every wait silently falls through to its
   timeout. (It did: the first run of this strip spaced its frames 47
   seconds apart and reported p=NaN nine times.) Assigning the var to a real
   property on a throwaway child is what makes the engine resolve it. */
const ends = await page.evaluate(
  (q, n) => {
    const el = document.querySelectorAll(q)[n];
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;display:block";
    el.appendChild(probe);
    const as = (v) => {
      probe.style.width = `var(${v})`;
      return parseFloat(getComputedStyle(probe).width);
    };
    const out = { h: as("--cta-h"), gap: as("--cta-gap"), close: as("--cta-close") };
    probe.remove();
    return { r0: out.h + out.gap, r1: out.close * 2, ...out };
  },
  SEL,
  NTH
);
console.log(
  `  resolved: h=${ends.h}px gap=${ends.gap}px close=${ends.close}px  clip ${ends.r0} → ${ends.r1}`
);

/* progress read straight off the body's clip */
const progress = () =>
  page.evaluate(
    (q, n, r0, r1) => {
      const el = document.querySelectorAll(q)[n];
      const now = parseFloat(
        getComputedStyle(el.querySelector('[class*="PillCta_body__"]'))
          .clipPath.match(/[\d.]+px/g)[1]
      );
      return (r0 - now) / (r0 - r1);
    },
    SEL,
    NTH,
    ends.r0,
    ends.r1
  );

await page.mouse.move(geom.cx, geom.cy);
const t0 = Date.now();
for (const [f, target] of FRAMES) {
  let p = await progress();
  /* a ceiling of twice the stretched duration — long enough to absorb the
     capture stalls, short enough that a wait which is never going to
     resolve says so instead of quietly shooting the wrong frame */
  for (let i = 0; i < SLOW / 10 && p < target; i++) {
    await s(20);
    p = await progress();
  }
  if (!(p >= target)) throw new Error(`f=${f}: progress stalled at ${p} (want ${target})`);
  const tag = String(Math.round(f * 1000)).padStart(3, "0");
  await page.screenshot({ path: `${OUT}/cta-fuse-f${tag}.png`, clip });
  console.log(
    `  f=${f.toFixed(3)}  p=${(await progress()).toFixed(3)} (want ${target})  +${Date.now() - t0}ms`
  );
}

const end = await page.evaluate(
  (q, n) => {
    const el = document.querySelectorAll(q)[n];
    const g = (c) => el.querySelector(`[class*="PillCta_${c}__"]`);
    const box = (e) => {
      const r = e.getBoundingClientRect();
      return { l: +r.left.toFixed(2), r: +r.right.toFixed(2), h: +r.height.toFixed(2) };
    };
    return {
      hovered: el.matches(":hover"),
      body: box(g("body")),
      discCell: box(g("discCell")),
      clip: getComputedStyle(g("body")).clipPath,
      filter: getComputedStyle(g("cells")).filter,
      blur: getComputedStyle(g("field")).filter,
    };
  },
  SEL,
  NTH
);
console.log(JSON.stringify(end, null, 2));
if (!end.hovered) throw new Error("the control is not hovered — nothing was photographed");

await browser.close();
