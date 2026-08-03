/* THE RESTAURANT WHEEL, DRAGGED — behaviour, physics and frame cost.
 *
 * Everything here is dispatched as real Pointer/Touch input through CDP, not
 * simulated by poking scrollTop, because the whole point of the change is what
 * the browser does with a gesture: capture, thresholds, click suppression and
 * `touch-action` are all invisible to a JS-only test.
 *
 * WHAT IT ASKS
 *   1. TRACKING     does the list follow the pointer 1:1 once committed?
 *   2. THRESHOLD    does a sub-8px press still select the name under it?
 *   3. HORIZONTAL   does a sideways gesture leave the list alone?
 *   4. MOMENTUM     does a flick coast PAST where it was released, and land
 *                   snapped to a name rather than between two?
 *   5. INTERRUPT    does a grab mid-glide take over from the on-screen value
 *                   instead of finishing the old animation first?
 *   6. FRAMES       p50/p95/p99/max rAF delta through a flick and its settle.
 *   7. KEYBOARD     chevrons, arrow keys, and Enter on a focused name.
 *   8. REDUCED      no drag, a natively scrollable list, instant selection.
 *   9. ROUND TRIP   /restaurants -> /restaurants/belly -> back: the page still
 *                   scrolls and the wheel still drags. That regression has
 *                   shipped on this component twice.
 *  10. ACTIONS      Visit/Book/Menu animate on selection and settle at rest.
 *
 * usage: node scripts/probe-wheel-drag.mjs [port] [w] [h]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [PORT = "3261", W = "1440", H = "900"] = process.argv.slice(2);
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
await page.setViewport({ width: +W, height: +H, deviceScaleFactor: 1 });
const cdp = await page.target().createCDPSession();

const ready = async (route = "/restaurants") => {
  await page.goto(`http://localhost:${PORT}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1600);
};

const wheelBox = () =>
  page.evaluate(() => {
    const el = document.querySelector('[class*="scroller"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      w: r.width,
      h: r.height,
      top: r.top,
      left: r.left,
      scrollTop: el.scrollTop,
      touchAction: getComputedStyle(el).touchAction,
    };
  });

const state = () =>
  page.evaluate(() => {
    const el = document.querySelector('[class*="scroller"]');
    const act = document.querySelector('[class*="name"][aria-current="true"]');
    return {
      scrollTop: el ? +el.scrollTop.toFixed(2) : null,
      active: act ? act.textContent.trim() : null,
    };
  });

/* Pointer input through CDP. `pointerType: mouse` so the same path a trackpad
   takes is exercised; the touch variant is run separately for touch-action. */
const pd = (x, y) =>
  cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x,
    y,
    button: "left",
    buttons: 1,
    clickCount: 1,
    pointerType: "mouse",
  });
const pm = (x, y) =>
  cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x,
    y,
    button: "left",
    buttons: 1,
    pointerType: "mouse",
  });
const pu = (x, y) =>
  cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x,
    y,
    button: "left",
    buttons: 0,
    clickCount: 1,
    pointerType: "mouse",
  });

/* A drag with a real cadence. `stepMs` is the wall time between moves — the
   release velocity is read from the last 90ms of pointer history, so a drag
   dispatched with no delays reports an infinite speed and proves nothing. */
const drag = async (x, y, dy, steps, stepMs, { release = true } = {}) => {
  await pd(x, y);
  const per = dy / steps;
  for (let i = 1; i <= steps; i++) {
    await pm(x, y + per * i);
    await sleep(stepMs);
  }
  if (release) await pu(x, y + dy);
  return { x, y: y + dy };
};

// ---- frame instrumentation -------------------------------------------------
/* Frame deltas WITH the wall clock and the selected name attached, so a spike
   can be attributed rather than merely counted. The suspicion this is built to
   test: `active` changing is a React re-render of 77 rows AND a new src on the
   background video, and that is a very different thing from the spring's own
   per-frame cost. */
const startFrames = () =>
  page.evaluate(() => {
    window.__f = [];
    window.__marks = [];
    let last = performance.now();
    let prevName = null;
    /* Long tasks are what separates "the main thread was busy" from "the
       compositor missed a beat". A long frame WITH a long task under it is
       JS — a React commit, a video element mounting. A long frame WITHOUT
       one is raster or decode, and no amount of rewriting the spring will
       touch it. */
    window.__lt = [];
    try {
      window.__ltObs = new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          window.__lt.push({ t: e.startTime, d: e.duration });
      });
      window.__ltObs.observe({ entryTypes: ["longtask"] });
    } catch {}
    const tick = () => {
      const n = performance.now();
      const cur =
        document
          .querySelector('[class*="name"][aria-current="true"]')
          ?.textContent?.trim() ?? null;
      if (cur !== prevName) {
        window.__marks.push({ t: n, name: cur });
        prevName = cur;
      }
      window.__f.push({ t: n, d: n - last });
      last = n;
      window.__fid = requestAnimationFrame(tick);
    };
    window.__fid = requestAnimationFrame(tick);
  });
const stopFrames = () =>
  page.evaluate(() => {
    cancelAnimationFrame(window.__fid);
    const raw = window.__f.slice(2);
    if (!raw.length) return null;
    const f = raw.map((r) => r.d).sort((a, b) => a - b);
    const at = (p) =>
      +f[Math.min(f.length - 1, Math.floor(f.length * p))].toFixed(2);
    try {
      window.__ltObs?.disconnect();
    } catch {}
    // attribute every frame over 20ms: to a long task if one overlaps it, and
    // to the nearest selection change either way
    const spikes = raw
      .filter((r) => r.d > 20)
      .map((r) => {
        const m = window.__marks.reduce(
          (best, mk) =>
            Math.abs(mk.t - r.t) < Math.abs((best?.t ?? -1e9) - r.t) ? mk : best,
          null,
        );
        const lt = window.__lt.find(
          (e) => e.t + e.d > r.t - r.d - 2 && e.t < r.t + 2,
        );
        return {
          d: +r.d.toFixed(1),
          longTask: lt ? +lt.d.toFixed(1) : null,
          nearestSelChange: m ? +(r.t - m.t).toFixed(0) : null,
          name: m?.name ?? null,
        };
      });
    return {
      n: f.length,
      p50: at(0.5),
      p95: at(0.95),
      p99: at(0.99),
      max: +f[f.length - 1].toFixed(2),
      over32: f.filter((v) => v > 32).length,
      over20: f.filter((v) => v > 20).length,
      spikes,
      selChanges: window.__marks.length,
    };
  });

const log = (t, pass, detail) =>
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${t.padEnd(30)} ${detail}`);

/* UNWRAPPED TRAVEL. Every raw scrollTop comparison in this file used to be a
   lie waiting to happen: the list is eleven identical copies and the component
   folds scrollTop back into the middle one whenever it drifts a whole copy, so
   a real 420px throw can read as +10px and a 60px pull as −408px. This
   accumulates 16ms samples and treats any single-sample jump larger than half
   a copy as a fold rather than as movement. */
const travelOn = async () => {
  const copyH = await page.evaluate(() => {
    const el = document.querySelector('[class*="scroller"]');
    const rowH = el.querySelector("li").getBoundingClientRect().height;
    const names = new Set(
      [...el.querySelectorAll("button")].map((b2) => b2.dataset.real),
    ).size;
    return rowH * names;
  });
  await page.evaluate((ch) => {
    window.__ch = ch;
    window.__trav = 0;
    window.__prev = document.querySelector('[class*="scroller"]').scrollTop;
    clearInterval(window.__travId);
    window.__travId = setInterval(() => {
      const s = document.querySelector('[class*="scroller"]').scrollTop;
      let d = s - window.__prev;
      if (d > ch / 2) d -= ch;
      if (d < -ch / 2) d += ch;
      window.__trav += d;
      window.__prev = s;
    }, 16);
  }, copyH);
  return copyH;
};
const travel = () => page.evaluate(() => window.__trav);
const travelOff = () =>
  page.evaluate(() => {
    clearInterval(window.__travId);
    return window.__trav;
  });

console.log(`\n############ ${W}x${H}  port ${PORT} ############`);
await ready();

const box = await wheelBox();
console.log(
  `\nwheel box  ${Math.round(box.w)}x${Math.round(box.h)} at (${Math.round(box.left)},${Math.round(box.top)})   touch-action: ${box.touchAction}   (viewport ${W} wide -> ${Math.round((box.w / +W) * 100)}% of it)`,
);

// ---- 1. tracking -----------------------------------------------------------
console.log("\n--- 1. tracking (1:1 while dragged) ---");
{
  const a = await state();
  await pd(box.x, box.y);
  await pm(box.x, box.y - 4); // under the threshold: nothing should move
  await sleep(60);
  const mid = await state();
  await pm(box.x, box.y - 40);
  await sleep(120);
  const during = await state();
  await pm(box.x, box.y - 100);
  await sleep(120);
  const during2 = await state();
  await pu(box.x, box.y - 100);
  await sleep(900);
  log(
    "sub-threshold is inert",
    Math.abs(mid.scrollTop - a.scrollTop) < 0.6,
    `moved ${(mid.scrollTop - a.scrollTop).toFixed(2)}px on a 4px press`,
  );
  // after the re-anchor at commit, 40->100 is 60px of travel = 60px of scroll
  const tracked = during2.scrollTop - during.scrollTop;
  log(
    "tracks 1:1 after commit",
    Math.abs(tracked - 60) < 6,
    `60px of pointer -> ${tracked.toFixed(1)}px of list`,
  );
}

// ---- 2. threshold / tap ----------------------------------------------------
console.log("\n--- 2. a press is still a click ---");
{
  const before = await state();
  // press a name two rows below centre and release without moving
  const y = box.y + Math.round(box.h / 5) * 2;
  await pd(box.x, y);
  await pm(box.x, y + 2);
  await pu(box.x, y + 2);
  await sleep(1000);
  const after = await state();
  log(
    "tap selects the name",
    after.active !== before.active,
    `${before.active} -> ${after.active}`,
  );
}

// ---- 3. horizontal intent --------------------------------------------------
console.log("\n--- 3. a sideways gesture is handed back ---");
{
  const before = await state();
  await pd(box.x, box.y);
  for (let i = 1; i <= 8; i++) {
    await pm(box.x + i * 9, box.y + i * 2);
    await sleep(14);
  }
  await pu(box.x + 72, box.y + 16);
  await sleep(700);
  const after = await state();
  log(
    "horizontal leaves the list",
    Math.abs(after.scrollTop - before.scrollTop) < 1,
    `moved ${(after.scrollTop - before.scrollTop).toFixed(2)}px`,
  );
}

// ---- 4. momentum -----------------------------------------------------------
/* THE COAST CANNOT BE MEASURED AS A scrollTop DIFFERENCE. The list is eleven
   identical copies and the component folds scrollTop back into the middle one
   whenever it drifts a whole copy — so a genuine 420px throw reads as +10px if
   a fold happened during it. Travel is accumulated from 16ms samples with the
   fold unwrapped: any single-sample jump larger than half a copy is a fold,
   not a movement. */
console.log("\n--- 4. a flick coasts past the release point ---");
const rowPitch = await page.evaluate(
  () =>
    document.querySelector('[class*="scroller"] li').getBoundingClientRect()
      .height,
);

/* A flick, measured. `hideFilm` removes the background video layer from the
   compositor for the duration — see the note where it is called. */
const doFlick = async (label, hideFilm) => {
  if (hideFilm) {
    await page.evaluate(() => {
      document.querySelectorAll("video").forEach((v) => v.pause());
      const bg = document.querySelector('[class*="showcase_bg"], [class*="_bg__"]');
      if (bg) bg.style.visibility = "hidden";
    });
    await sleep(600);
  }
  await travelOn();
  await startFrames();
  const vids0 = await page.evaluate(() => {
    window.__vidCount = document.querySelectorAll("video").length;
    return window.__vidCount;
  });
  await pd(box.x, box.y);
  const STEPS = 12;
  const DY = -180;
  for (let i = 1; i <= STEPS; i++) {
    await pm(box.x, box.y + (DY / STEPS) * i);
    await sleep(9);
  }
  const dragged = await travel();
  await pu(box.x, box.y + DY);
  await sleep(1500);
  const total = await travelOff();
  const f = await stopFrames();
  const after = await state();
  const base = await page.evaluate(() => {
    const el = document.querySelector('[class*="scroller"]');
    const li = el.querySelector("li");
    const r = li.getBoundingClientRect();
    const rr = el.getBoundingClientRect();
    return r.top - rr.top + el.scrollTop + r.height / 2 - rr.height / 2;
  });
  const off =
    Math.abs(((after.scrollTop - base) % rowPitch) + rowPitch) % rowPitch;
  return {
    label,
    dragged,
    coast: total - dragged,
    snapErr: Math.min(off, rowPitch - off),
    f,
    vids0,
  };
};

const shipped = await doFlick("as shipped", false);
log(
  "coasts after release",
  shipped.coast > 40,
  `dragged ${shipped.dragged.toFixed(0)}px (${(shipped.dragged / rowPitch).toFixed(1)} names), then coasted a further ${shipped.coast.toFixed(0)}px (${(shipped.coast / rowPitch).toFixed(1)} names)`,
);
log(
  "lands snapped to a name",
  shipped.snapErr < 1.2,
  `${shipped.snapErr.toFixed(2)}px off the row grid (row pitch ${rowPitch.toFixed(1)}px)`,
);

const show = (r) =>
  console.log(
    `  ${r.label.padEnd(22)} n=${String(r.f.n).padStart(3)}  p50 ${String(r.f.p50).padStart(5)}  p95 ${String(r.f.p95).padStart(5)}  p99 ${String(r.f.p99).padStart(5)}  max ${String(r.f.max).padStart(5)}  (>20ms: ${r.f.over20}, >32ms: ${r.f.over32})  longTasks under spikes: ${r.f.spikes.filter((s) => s.longTask).length}/${r.f.spikes.length}`,
  );

console.log("\n  FRAMES THROUGH THE FLICK AND ITS SETTLE");
show(shipped);

/* THE SAME FLICK WITH THE FILM OUT OF THE COMPOSITOR. The background is a
   full-bleed clip that crossfades when the selection settles, and two of them
   decode at once for the length of that fade. That is a property of the page's
   assets, not of the gesture — so the two runs bracket exactly what the drag,
   the spring and the per-frame shading actually cost. */
const bare = await doFlick("film hidden", true);
show(bare);
for (const s of shipped.f.spikes.slice(0, 4))
  console.log(
    `    shipped spike ${s.d}ms — long task ${s.longTask ?? "none"}${s.longTask ? "ms" : ""}, ${s.nearestSelChange}ms from the selection becoming ${s.name}`,
  );
for (const s of bare.f.spikes.slice(0, 4))
  console.log(
    `    bare    spike ${s.d}ms — long task ${s.longTask ?? "none"}${s.longTask ? "ms" : ""}`,
  );
await ready();

// ---- 5. interruptibility ---------------------------------------------------
console.log("\n--- 5. a grab mid-glide takes over ---");
{
  const box5 = await wheelBox();
  await travelOn();
  await pd(box5.x, box5.y);
  for (let i = 1; i <= 12; i++) {
    await pm(box5.x, box5.y - 16 * i);
    await sleep(9);
  }
  await pu(box5.x, box5.y - 192);
  await sleep(60);
  const preA = await travel();
  await sleep(110); // still coasting hard — this is the control
  const preB = await travel();
  await pd(box5.x, box5.y); // GRAB — this must stop it dead
  const atGrab = await travel();
  await sleep(110);
  const afterGrab = await travel();
  const coastingRate = Math.abs(preB - preA);
  const grabbedRate = Math.abs(afterGrab - atGrab);
  // the FIRST move past the threshold only commits and re-anchors — the
  // hysteresis is the point, so the pull has to be several moves long
  for (let i = 1; i <= 6; i++) {
    await pm(box5.x, box5.y + 12 * i);
    await sleep(16);
  }
  const pulled = await travel();
  await pu(box5.x, box5.y + 72);
  await sleep(1200);
  await travelOff();
  /* Compared against the SAME window of coasting immediately before, not
     against zero: the travel sampler runs at 16ms, so up to one sample of a
     fast glide can land on the wrong side of the grab and that is the
     instrument, not the wheel. What matters is that the glide effectively
     stops — under a tenth of the distance it was covering a moment earlier. */
  log(
    "grab freezes the glide",
    grabbedRate < Math.max(8, coastingRate * 0.12),
    `it was covering ${coastingRate.toFixed(1)}px per 110ms and covered ${grabbedRate.toFixed(1)}px in the 110ms after the grab`,
  );
  log(
    "and reverses immediately",
    pulled - afterGrab < -40,
    `then went ${(pulled - afterGrab).toFixed(1)}px the OTHER way while the finger pulled down`,
  );
}

// ---- 6. keyboard -----------------------------------------------------------
console.log("\n--- 6. keyboard ---");
{
  const before = await state();
  await page.evaluate(() => {
    const el = document.querySelector('[class*="scroller"]');
    el.focus?.();
  });
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('[class*="scroller"] button')];
    const mid = btns.find((b) => b.getAttribute("aria-current") === "true");
    mid?.focus();
  });
  await sleep(500);
  await page.keyboard.press("ArrowDown");
  await sleep(900);
  const afterDown = await state();
  log(
    "ArrowDown steps one name",
    afterDown.active !== before.active,
    `${before.active} -> ${afterDown.active}`,
  );
  await page.keyboard.press("ArrowUp");
  await sleep(900);
  const backUp = await state();
  log(
    "ArrowUp steps back",
    backUp.active === before.active,
    `${afterDown.active} -> ${backUp.active}`,
  );

  const chev = await page.evaluate(() => {
    const b2 = document.querySelector('button[aria-label="Next restaurant"]');
    if (!b2) return null;
    b2.click();
    return true;
  });
  await sleep(900);
  const afterChev = await state();
  log(
    "chevron still steps",
    !!chev && afterChev.active !== backUp.active,
    `${backUp.active} -> ${afterChev.active}`,
  );
}

// ---- 7. the actions animate ------------------------------------------------
/* SAMPLED, not snapshotted at a guessed instant. The selection does not change
   the moment the chevron is clicked — it changes when the spring carries the
   next name past the centre line, ~180ms later — so a single reading at a
   fixed delay proves nothing either way. This records the whole flight and
   reports its extremes, including the minimum y, which is what says whether
   the spring overshot its resting position. */
console.log("\n--- 7. the actions arrive ---");
{
  await page.evaluate(() => {
    window.__act = [];
    const els = () => [...document.querySelectorAll('[class*="actions"] > *')];
    const readY = (t) => {
      const m = /matrix\(1, 0, 0, 1, [-\d.]+, ([-\d.]+)\)/.exec(t);
      return m ? +m[1] : t === "none" ? 0 : NaN;
    };
    window.__actStop = setInterval(() => {
      const e = els()[0];
      if (!e) return;
      const cs = getComputedStyle(e);
      window.__act.push({
        t: performance.now(),
        o: +cs.opacity,
        y: readY(cs.transform),
      });
    }, 16);
    document.querySelector('button[aria-label="Next restaurant"]').click();
  });
  await sleep(1400);
  const trace = await page.evaluate(() => {
    clearInterval(window.__actStop);
    const a = window.__act;
    const last = [...document.querySelectorAll('[class*="actions"] > *')].map(
      (e) => {
        const cs = getComputedStyle(e);
        return { o: +cs.opacity, t: cs.transform };
      },
    );
    return {
      minO: Math.min(...a.map((p) => p.o)),
      maxY: Math.max(...a.map((p) => p.y)),
      minY: Math.min(...a.map((p) => p.y)),
      n: a.length,
      rest: last,
    };
  });
  log(
    "it arrives rather than appears",
    trace.minO < 0.9 && trace.maxY > 4,
    `opacity dipped to ${trace.minO.toFixed(2)}, rose from y=${trace.maxY.toFixed(1)}px`,
  );
  log(
    "no overshoot past its seat",
    trace.minY > -0.6,
    `lowest y reached was ${trace.minY.toFixed(2)}px (below 0 would be past the resting position)`,
  );
  log(
    "all actions rest at 1 / none",
    trace.rest.every((r) => r.o > 0.995),
    trace.rest.map((r) => `${r.o.toFixed(2)} ${r.t}`).join(" | "),
  );
}

// ---- 8. the route round trip ----------------------------------------------
/* THE REGRESSION THIS GUARDS has shipped on this component twice: an unpaired
   `lenis.stop()` on unmount left the WHOLE SITE unscrollable after leaving
   this route, and a cancelled-but-uncleared rAF id left the wheel dead after
   arriving on it. So the trip is measured from both ends.
 *
 * One correction to the obvious test: /restaurants is exactly one viewport
 * tall (the hero is sticky, and nothing — not even a Footer — follows it), so
 * "does the page scroll" is meaningless ON this route and reads 0 -> 0 -> 0
 * whether Lenis is alive or dead. Scroll is therefore asserted on the routes
 * either side of it, and the wheel is asserted here. */
const canScroll = () =>
  page.evaluate(async () => {
    const doc = document.documentElement;
    const room = doc.scrollHeight - innerHeight;
    if (room < 50) return { room, y1: 0, scrollable: false, n_a: true };
    if (window.__lenis) window.__lenis.scrollTo(600, { immediate: true });
    else window.scrollTo(0, 600);
    await new Promise((r) => setTimeout(r, 500));
    const y1 = window.scrollY;
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
    return { room, y1, scrollable: y1 > 200, n_a: false };
  });

console.log("\n--- 8. round trip ---");
{
  const here = await canScroll();
  console.log(
    `    /restaurants itself: ${here.room.toFixed(0)}px of scroll room — it is one viewport tall by design, so scroll is asserted either side`,
  );

  // (a) an IN-APP nav out through the menu, which is PageTransition's router
  //     push — the path that unmounts this component the way a reader does
  await page.evaluate(() => {
    const t = [...document.querySelectorAll("button")].find((b2) =>
      /menu/i.test(b2.getAttribute("aria-label") ?? ""),
    );
    t?.click();
  });
  await sleep(900);
  const wentTo = await page.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find(
      (x) => x.getAttribute("href") === "/about",
    );
    if (!a) return null;
    a.click();
    return "/about";
  });
  await sleep(3400);
  const afterOut = await canScroll();
  log(
    "the site still scrolls after leaving",
    afterOut.scrollable,
    `in-app nav to ${wentTo} (now ${page.url().replace(/^https?:\/\/[^/]+/, "")}): scrollY reached ${afterOut.y1} of ${afterOut.room.toFixed(0)}px`,
  );

  // (b) the literal trip the brief names, by URL
  await ready("/restaurants");
  await page.goto(`http://localhost:${PORT}/restaurants/belly`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(2600);
  const onDetail = await canScroll();
  log(
    "/restaurants/belly scrolls",
    onDetail.scrollable,
    `scrollY reached ${onDetail.y1} of ${onDetail.room.toFixed(0)}px`,
  );
  await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
  await sleep(2800);
  console.log(`    back on ${page.url().replace(/^https?:\/\/[^/]+/, "")}`);

  const box2 = await wheelBox();
  if (box2) {
    const before = await state();
    await drag(box2.x, box2.y, -120, 10, 12);
    await sleep(1400);
    const after = await state();
    log(
      "wheel still drags after the trip",
      after.active !== before.active,
      `${before.active} -> ${after.active}`,
    );
    // and the notch, which is the other thing the rAF latch used to kill
    const bn = await state();
    await page.mouse.move(box2.x, box2.y);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel({ deltaY: 120 });
      await sleep(30);
    }
    await sleep(1200);
    const an = await state();
    log(
      "wheel notch still works after the trip",
      an.active !== bn.active,
      `${bn.active} -> ${an.active}`,
    );
  } else {
    log("wheel still drags after the trip", false, "scroller not found");
  }
}

// ---- 9. reduced motion -----------------------------------------------------
console.log("\n--- 9. prefers-reduced-motion: reduce ---");
{
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await ready();
  const box3 = await wheelBox();
  console.log(`    touch-action is now: ${box3.touchAction}`);
  const before = await state();
  await drag(box3.x, box3.y, -120, 10, 10);
  await sleep(900);
  const afterDrag = await state();
  log(
    "no pointer drag installed",
    Math.abs(afterDrag.scrollTop - before.scrollTop) < 1,
    `moved ${(afterDrag.scrollTop - before.scrollTop).toFixed(2)}px on a 120px drag`,
  );

  // a chevron must land INSTANTLY, not travel
  const t0 = await state();
  await page.evaluate(() =>
    document.querySelector('button[aria-label="Next restaurant"]').click(),
  );
  await sleep(50);
  const t1 = await state();
  await sleep(900);
  const t2 = await state();
  log(
    "selection lands instantly",
    Math.abs(t1.scrollTop - t2.scrollTop) < 1 && t1.active === t2.active,
    `50ms after the click it is already at ${t1.scrollTop} (${t1.active}); 950ms later ${t2.scrollTop} (${t2.active})`,
  );

  // and the list is natively scrollable
  const nat = await page.evaluate(async () => {
    const el = document.querySelector('[class*="scroller"]');
    const a = el.scrollTop;
    el.scrollTop = a + 90;
    await new Promise((r) => setTimeout(r, 60));
    return { a, b: el.scrollTop };
  });
  log(
    "list is natively scrollable",
    Math.abs(nat.b - nat.a) > 40,
    `scrollTop ${nat.a} -> ${nat.b}`,
  );
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
}

// ---- 10. console -----------------------------------------------------------
const errs = [];
page.on("console", (m) => {
  if (m.type() === "error") errs.push(m.text());
});
await ready();
await sleep(1200);
console.log(`\nconsole errors after a fresh load: ${errs.length}`);
errs.slice(0, 6).forEach((e) => console.log(`   ! ${e}`));

await page.close();
b.disconnect();
process.exit(0);
