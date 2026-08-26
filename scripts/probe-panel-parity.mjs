/* DO THE TWO PICTURE PANELS OPEN AT THE SAME PLACE ON SCREEN?

   The home page reveals two big plates the same way — About's film on the
   left of its split, and the journal's featured story on the right of its
   row — and they are meant to read as one gesture. "The same gesture" is
   two claims, and only the first is checkable by reading the source:

     · SAME SHAPE — the mask, its duration and its curve, the drift under
       it, the shadow around it. Constants; grep answers it.
     · SAME ARRIVAL — the picture's top edge is at the same height on the
       reader's screen when the reveal FIRST MOVES. That is not a constant.
       It is a gate position plus a delay plus however far the page
       travelled during that delay, and the last term only exists at
       runtime.

   This measures the second. Both panels sit on one continuous scroll, so a
   single pass down the page catches them both under identical conditions.

   ⚠️ THE SCROLL IS WALL-CLOCK DRIVEN, NOT FRAME-COUNTED, and that is the
   whole reason this reports a real number. A `for` loop that teleports the
   page 100px at a time and waits gives every delayed animation the same
   free ride: the gate opens, the probe sleeps, and the panel starts moving
   at a position no reader scrolling at a human speed would ever see it
   start at. Here the target is `start + V * elapsed`, so a 450ms lead costs
   exactly 450ms of travel — which at 900px/s is 405px of page, and 405px is
   the entire difference this probe exists to find.

   ⚠️ AND IT IS RUN AT THREE SPEEDS. The lead's cost in pixels scales with
   velocity while a gate's cost does not, so two panels can agree at one
   speed and diverge at another. A parity claim that holds at 900px/s and
   nowhere else is not parity.

   ══════════ RUN IT ON A QUIET MACHINE, AND RUN IT TWICE ══════════
   The detection is per-frame, so the finest distinction this can draw is
   one frame of travel — 6.7px at 400px/s and 40px at 2400px/s, the latter
   being ~4.5 points of a 900px window. Drop a couple of frames and the
   figure moves by more than the thing being measured.

   MEASURED, ON IDENTICAL CODE, with two other `next dev` servers sharing
   the CPU: desktop at 2400px/s reported Δ −10.1 on one run and +6.6 on the
   next, and 900px/s moved from −0.1 to −7.8. On the same code with one
   server running, every cell of the grid came in inside ±1.0.

   SO: THE SIGN FLIPPING BETWEEN RUNS OR BETWEEN VIEWPORTS IS THE TELL. A
   real timing difference has a direction and keeps it. If the 2400px/s row
   disagrees while 400 and 900 match, suspect the machine before the code —
   check for other dev servers, and take the best of two runs rather than
   the first. The slow rows are the trustworthy ones on a busy box.

   usage: node scripts/probe-panel-parity.mjs [port]            */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || 3100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* px/s. 900 is an unhurried read; 2400 is a trackpad flick; 400 is someone
   picking their way down. The panel's arrival should be recognisably the
   same event at all three. */
const SPEEDS = [400, 900, 2400];

const VIEWPORTS = [
  { label: "desktop 1440x900", width: 1440, height: 900 },
  { label: "phone 390x844", width: 390, height: 844 },
];

/* The two plates, by what actually moves on them. Class names are hashed by
   CSS modules, so these match on the stable half of the generated name.

   BOTH READ `--sweep` NOW, and that is the point of the exercise: the two
   panels run the same feathered mask off the same custom property, About's
   driven by framer (MEDIA in AboutSplit.tsx) and the journal's by a keyframe
   (blogPlateSweep in Blog.module.css). One reader for both is the cheapest
   possible proof that neither has quietly gone back to something else — if a
   plate ever returns to `clip-path`, this probe reports it as "never moved"
   rather than silently measuring the wrong thing.

   ⚠️ `[class*="AboutSplit_media__"]` DOES NOT ALSO MATCH `mediaFrame`. CSS
   modules put the hash separator immediately after the class name, so the
   trailing `__` is what makes the two distinguishable.

   `seat` is the box whose top edge is the thing being placed on screen — the
   outer plate, not the masked frame inside it. */
const PANELS = [
  {
    key: "about",
    mover: '[class*="AboutSplit_mediaFrame__"]',
    seat: '[class*="AboutSplit_media__"]',
    read: (el) => getComputedStyle(el).getPropertyValue("--sweep").trim(),
  },
  {
    key: "blog",
    mover: '[class*="Blog_frontFrame__"]',
    seat: '[class*="Blog_frontPhoto__"]',
    read: (el) => getComputedStyle(el).getPropertyValue("--sweep").trim(),
  },
];

const walk = async (page, speed) =>
  page.evaluate(
    async (speed, PANELS) => {
      const found = PANELS.map((p) => ({
        ...p,
        moverEl: document.querySelector(p.mover),
        seatEl: document.querySelector(p.seat),
      }));
      const missing = found.filter((p) => !p.moverEl || !p.seatEl);
      if (missing.length) {
        return { error: `no element for ${missing.map((m) => m.key)}` };
      }

      /* the reader is shipped across as source and rebuilt here — a function
         cannot survive the structured clone into the page context */
      const readers = PANELS.map((p) => new Function("el", `return (${p.read})(el)`));

      const scrollTo = (y) => {
        const l = window.__lenis;
        if (l) l.scrollTo(y, { immediate: true });
        else window.scrollTo(0, y);
      };

      /* park above both chapters and let anything mid-flight settle, so the
         first frame of the walk is a genuinely still page */
      scrollTo(0);
      await new Promise((r) => setTimeout(r, 900));

      const parked = found.map((p, i) => readers[i](p.moverEl));
      const hits = found.map(() => null);
      const end = document.documentElement.scrollHeight - innerHeight;

      const t0 = performance.now();
      await new Promise((done) => {
        const frame = () => {
          const elapsed = (performance.now() - t0) / 1000;
          const y = Math.min(end, speed * elapsed);
          scrollTo(y);

          found.forEach((p, i) => {
            if (hits[i]) return;
            if (readers[i](p.moverEl) === parked[i]) return;
            const r = p.seatEl.getBoundingClientRect();
            hits[i] = {
              key: p.key,
              /* where the plate's top edge sits, as a fraction of the
                 window — the number the two panels have to agree on */
              topPct: +(r.top / innerHeight).toFixed(3),
              topPx: Math.round(r.top),
              scrollY: Math.round(y),
              /* how much of the plate the reader can already see when it
                 starts to open; 1 = entirely on screen */
              onScreen: +(
                Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) /
                Math.max(1, r.height)
              ).toFixed(3),
            };
          });

          if (hits.every(Boolean) || y >= end) return done();
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });

      return { parked, hits };
    },
    speed,
    PANELS.map((p) => ({ ...p, read: p.read.toString() })),
  );

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 600000,
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

for (const vp of VIEWPORTS) {
  console.log(`\n══════ ${vp.label} ══════`);
  for (const speed of SPEEDS) {
    const page = await b.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    /* ⚠️ A FRESH CONTEXT PER RUN, NOT A RELOAD. The journal parks its whole
       cascade finished off a sessionStorage key once the plate has opened
       (PLAYED_KEY in Blog.tsx), so the second pass in one context measures
       an animation that never ran. */
    await page.evaluateOnNewDocument(() => {
      try {
        sessionStorage.clear();
      } catch {}
    });
    await page.goto(`http://localhost:${PORT}/`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page
      .waitForFunction(
        () =>
          !document.body.classList.contains("is-loading") &&
          !document.querySelector('[class*="Loader_overlay__"]'),
        { timeout: 45000 },
      )
      .catch(() => console.warn("! loader gate timed out"));
    await sleep(1200);

    const out = await walk(page, speed);
    if (out.error) {
      console.log(`  ${speed}px/s  ✗ ${out.error}`);
    } else {
      const row = Object.fromEntries(out.hits.filter(Boolean).map((h) => [h.key, h]));
      const fmt = (h) =>
        h
          ? `top ${String(h.topPx).padStart(5)}px = ${(h.topPct * 100)
              .toFixed(1)
              .padStart(5)}% of window   (${(h.onScreen * 100).toFixed(0)}% of the plate visible)`
          : "never moved";
      console.log(`  ${String(speed).padStart(4)}px/s`);
      console.log(`     about  ${fmt(row.about)}`);
      console.log(`     blog   ${fmt(row.blog)}`);
      if (row.about && row.blog) {
        const gap = (row.about.topPct - row.blog.topPct) * 100;
        console.log(
          `     Δ      ${gap >= 0 ? "+" : ""}${gap.toFixed(1)} points of window height` +
            `  (${Math.abs(gap) < 3 ? "matched" : "NOT matched"})`,
        );
      }
    }
    await page.close();
  }
}

await b.close();
