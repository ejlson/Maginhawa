/* THE FRAME BUDGET — p99 < 20ms, zero frames over 32ms, production build.

   Three legs, because the page has three different kinds of motion and
   averaging them together hides whichever one is bad:

     entrance — the hero laying itself out. Nine prints crossing the paint
                threshold on a staggered ramp, plus the words. This is the
                only stretch with a real burst of compositing, and it is
                measured from a COLD LOAD, since that is the only time it
                happens.
     hero     — sitting on the settled hero doing nothing but drifting. Nine
                infinite CSS animations on transform; if this leg is not flat
                the drift is not on the compositor.
     scroll   — wheel-driven sweep down through the hero, the index and the
                form and back up, which is the reader's actual path.

   The method is deck-check's: sample rAF deltas, discard the first nine
   frames (the loop's own warm-up), report median / p99 / worst / counts.

   THE LAST TWO ARGUMENTS ARE DIAGNOSTICS, and they are how an intermittent
   long frame gets a cause rather than a position. `noprints` hides the nine
   hero photographs and nothing else; `noreveal` pins every scroll Reveal to
   its shown state, which removes the shared component's blur-filter
   transition from the sweep. And `route` points the identical harness at a
   DIFFERENT page of the same site: if /restaurants throws the same spike in
   the same place, the cause is the shell — hydration, Lenis, Reveal — and
   not this page.

   `shallow` bounds the sweep to the hero and the role index and never
   reaches the form or the dark footer. Every long frame this harness has
   found on /careers sits at y≈2120–2230 — which at 1440x900 is the
   form/DarkZone boundary, and is where the untouched /contact throws a
   583ms frame under the identical sweep. `shallow` is the control that
   turns that correlation into an answer: if the legs I actually built are
   clean when the footer is never painted, the footer is the cost.

   usage: node scripts/probe-join-frames.mjs [port] [runs] [w] [h] [diag] [route]
          diag  = none | noprints | noreveal | shallow  (default none)
          route = /careers | any other path         (default /careers) */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3187";
const RUNS = +(process.argv[3] || 3);
const VW = +(process.argv[4] || 1440);
const VH = +(process.argv[5] || 900);
const DIAG = process.argv[6] || "none";
const ROUTE = process.argv[7] || "/careers";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu", "--use-gl=angle"],
});

/* every sample carries scrollY, so a long frame gets a PLACE and not just a
   number — "83ms somewhere in the sweep" is unactionable, "83ms at y=4200"
   names the teleport that caused it */
const SAMPLER = () => {
  window.__ts = [];
  window.__stop = false;
  const tick = (t) => {
    window.__ts.push([t, window.scrollY]);
    if (!window.__stop) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const startSampling = (page) => page.evaluate(SAMPLER);

const stopSampling = (page) =>
  page.evaluate(() => {
    window.__stop = true;
    const raw = window.__ts;
    const d = [];
    for (let i = 9; i < raw.length; i++)
      d.push({ ms: raw[i][0] - raw[i - 1][0], y: raw[i][1] });
    if (!d.length) return null;
    const s = d.map((x) => x.ms).sort((a, b) => a - b);
    const q = (p) => +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1);
    return {
      n: d.length,
      median: q(0.5),
      p99: q(0.99),
      worst: +s[s.length - 1].toFixed(1),
      over20: s.filter((x) => x > 20).length,
      over32: s.filter((x) => x > 32).length,
      where: d
        .filter((x) => x.ms > 32)
        .map((x) => `${x.ms.toFixed(0)}ms@y${Math.round(x.y)}`),
    };
  });

const line = (label, v) =>
  `  ${label.padEnd(9)} n ${String(v.n).padStart(4)}  median ${String(v.median).padStart(5)}  p99 ${String(v.p99).padStart(5)}  worst ${String(v.worst).padStart(6)}  >20ms ${String(v.over20).padStart(3)}  >32ms ${v.over32}  ${v.where.join(" ")}`;

/* WARM THE IMAGE PIPELINE FIRST. `next start` optimizes on demand, and the
   hero's nine sources include six 1.8–3.7MB venue photographs. The very
   first request for the page pays for nine sharp resizes, and that cost
   lands in the entrance leg of run 1 as a pair of 33ms frames that never
   reappear in runs 2 and 3. That is a server cost, not a page cost, and
   measuring it as if it were the animation's is dishonest in both
   directions. */
const warm = await b.newPage();
await warm.setViewport({ width: VW, height: VH });
await warm.goto(`http://localhost:${PORT}${ROUTE}`, { waitUntil: "networkidle0", timeout: 120000 });
await warm.close();

console.log(`\n=== ${ROUTE}   ${VW}x${VH}   ${RUNS} runs   diag=${DIAG}   production build ===`);
const agg = { entrance: [], hero: [], scroll: [] };

for (let r = 0; r < RUNS; r++) {
  const page = await b.newPage();
  await page.setViewport({ width: VW, height: VH });

  /* ENTRANCE. The sampler has to be installed BEFORE the hero's CSS
     animations start, so it goes in as an init script rather than after a
     navigation that has already finished laying nine prints out. */
  // the SAME sampler as the other two legs — an inline copy here drifted out
  // of shape when scrollY was added and quietly reported null for a whole run
  await page.evaluateOnNewDocument(SAMPLER);
  /* the diagnostic has to be in place BEFORE the first paint, or the
     entrance leg measures the very thing it is meant to remove */
  if (DIAG === "noprints")
    await page.evaluateOnNewDocument(() => {
      const s = document.createElement("style");
      s.textContent = '[class*="heroPrint"]{display:none!important}';
      document.addEventListener("DOMContentLoaded", () => document.head.append(s));
    });
  if (DIAG === "noreveal")
    await page.evaluateOnNewDocument(() => {
      const s = document.createElement("style");
      /* SCOPED TO THE ROLE LIST. The first version of this diagnostic was
         `*{opacity:1!important;filter:none!important}`, and it made every
         number WORSE — a document-wide !important override that Motion's
         inline writes keep losing to forces a full style recalc on every
         frame Motion touches anything. A diagnostic that changes the cost
         it is measuring is not a diagnostic. Six list items is the
         hypothesis; six list items is what it pins. */
      s.textContent =
        '[class*="roleList"] > *{opacity:1!important;filter:none!important;transform:none!important}';
      document.addEventListener("DOMContentLoaded", () => document.head.append(s));
    });
  await page.goto(`http://localhost:${PORT}${ROUTE}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 })
    .catch(() => {});
  // the ramp is 140ms + 8*90ms + 1000ms ≈ 1.9s; sample a little past it
  await sleep(2600);
  const entrance = await stopSampling(page);
  if (entrance) agg.entrance.push(entrance);

  // HERO AT REST — the nine infinite drifts and nothing else
  await sleep(400);
  await startSampling(page);
  await sleep(3000);
  const hero = await stopSampling(page);
  if (hero) agg.hero.push(hero);

  /* SCROLL — the reader's path, down through everything and back up.

     THE TELEPORT IS OUTSIDE THE SAMPLED WINDOW. Parking the page at y=4200
     with `lenis.scrollTo(immediate)` paints the form, the footer and the
     full-bleed MAGINHAWA wordmark on a single frame, and that frame is 80ms
     — which is real, and is also something no reader ever experiences,
     because a reader arrives there by scrolling. Sampling across it made
     every run report an over-32 that had nothing to do with this page's
     motion. Both ends are warmed first, then the sweep runs continuously. */
  await page.mouse.move(VW / 2, VH / 2);
  await page.evaluate(
    (y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
    4200,
  );
  await sleep(1200);
  await page.evaluate(
    (y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
    0,
  );
  await sleep(1200);

  await startSampling(page);
  const STEPS = DIAG === "shallow" ? 17 : 38;
  for (const dy of [110, -110]) {
    for (let i = 0; i < STEPS; i++) {
      await page.mouse.wheel({ deltaY: dy });
      await page.mouse.move(VW / 2 + (i % 7) * 11, VH / 2 + (i % 5) * 9);
      await sleep(28);
    }
    await sleep(300);
  }
  const scroll = await stopSampling(page);
  if (scroll) agg.scroll.push(scroll);

  console.log(`  run ${r + 1}`);
  console.log(line("entrance", entrance));
  console.log(line("hero", hero));
  console.log(line("scroll", scroll));
  await page.close();
}

console.log("\n  --- worst across runs ---");
let bad = 0;
for (const k of ["entrance", "hero", "scroll"]) {
  const p99 = Math.max(...agg[k].map((v) => v.p99));
  const worst = Math.max(...agg[k].map((v) => v.worst));
  const o32 = agg[k].reduce((n, v) => n + v.over32, 0);
  if (p99 >= 20 || o32 > 0) bad++;
  console.log(
    `  ${k.padEnd(9)} p99 ${String(p99).padStart(5)}   worst ${String(worst).padStart(6)}   frames >32ms ${o32}   ${p99 < 20 && o32 === 0 ? "OK" : "OVER BUDGET"}`,
  );
}
console.log(`\n  ${bad === 0 ? "WITHIN BUDGET (p99 < 20ms, zero frames > 32ms)" : `${bad} LEG(S) OVER BUDGET`}\n`);

const shutdown = async () => {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    proc?.kill("SIGKILL");
  } catch {}
  process.exit(0);
};
await shutdown();
