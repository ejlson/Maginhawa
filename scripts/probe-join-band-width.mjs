/* Careers hero — does the film reach the corner labels' measure, and does the
   split still keep it out of the type on every frame?

   Two readings per viewport:

     rest    after the entrance has settled: the labels' outer ink edges
             ("CAREERS" left, "KENTISH TOWN & SOHO, LONDON" right), the band
             (the untransformed box), the frame (the visible film, transforms
             included) on all four edges, and the frame's resting scale.
     frames  every rAF from load to settle: the frame's rect against the two
             lines' REAL caps ink (baseline from a strut, cap height from
             canvas), so the minimum clearance is the one a reader could see.
             And, off the same samples:
               seam        `lineBot.top − lineTop.bottom`. Its minimum is the
                           closed couplet: 0.28·fs when the two fattened ink
                           boxes meet (`seamExpect`). `seamHeld` is its median
                           over the zero-width stretch, so a one-frame
                           transient undercutting the minimum shows as a
                           disagreement. Not the LAST zero-width frame: the
                           ceiling holds the film at zero through the first
                           2·SPLIT_AIR of opening, so the lines have parted.
               steps       the film's frame-to-frame width change: the largest
                           DECREASE from its last zero-width frame on, and the
                           largest step in the 300ms before it first reaches
                           the band's width, with that window's longest frame
                           so a dropped frame reads as one.
               lastIsBand  whether the final sample is the band's width. A run
                           where it is not stopped sampling before the settle
                           and is VOID: re-run it, or raise SAMPLE_MS.
               firstVisibleMs  the first frame the film has width AND opacity.
                           `firstSizedMs` is width alone, which counts the
                           server-rendered seed scale sitting at opacity 0.

   Modes, all optional:
     REDUCED=1   emulate prefers-reduced-motion: reduce, and add the mask
                 count, the inline transform, document.getAnimations() and
                 whether the frame holds a <video>.
     RESIZE=WxH  resize to WxH mid-entrance, on the first frame the lit film
                 is RESIZE_AT (default 0.3) of the band's width. The rest
                 reading is at WxH, and so are the ink offsets, so clearance
                 is only taken on frames already at WxH's band width;
                 `preResize` counts the frames left out. Width steps there are
                 mostly the band's own; `maxScaleDrop` is the film's against
                 its band.
     SCROLL=px   after the rest reading, wheel down px and read the frame's
                 scale, transform and edges, and the pan's transform, again.
     TAB=n       after the rest reading, Tab n times from the top of the page
                 and list where focus lands.
     SHOT=path   a rest-state screenshot per viewport, `${SHOT}-WxH.png`.
     SAMPLE_MS   how long the sampler runs from document start (6500).

   Run against a dev server. Prints a table; asserts nothing. */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = process.env.URL || "http://localhost:3000/careers";
const SHOT = process.env.SHOT || "";
const REDUCED = process.env.REDUCED === "1";
const RESIZE = process.env.RESIZE ? process.env.RESIZE.split("x").map(Number) : null;
const RESIZE_AT = Number(process.env.RESIZE_AT || 0.3);
const SCROLL = Number(process.env.SCROLL || 0);
const TAB = Number(process.env.TAB || 0);
const SAMPLE_MS = Number(process.env.SAMPLE_MS || 6500);
const VIEWPORTS = process.env.VIEWPORTS
  ? process.env.VIEWPORTS.split(",").map((s) => s.split("x").map(Number))
  : [[2000, 1250], [1920, 1080], [1512, 982], [1440, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844]];

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
if (REDUCED) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);

await page.evaluateOnNewDocument((ms) => {
  window.__s = [];
  window.__done = false;
  const t0 = (window.__t0 = performance.now());
  const q = (s) => document.querySelector(s);
  const tick = () => {
    const frame = q('[class*="heroFrame"]');
    const band = q('[class*="heroBand"]');
    const top = q('[class*="heroLineTop"]');
    const bot = q('[class*="heroLineBot"]');
    if (frame && band && top && bot) {
      const r = (el) => { const x = el.getBoundingClientRect(); return [x.left, x.top, x.right, x.bottom]; };
      window.__s.push({
        t: performance.now() - t0, f: r(frame), a: r(top), b: r(bot),
        bw: band.getBoundingClientRect().width, o: +getComputedStyle(frame).opacity,
      });
    }
    if (performance.now() - t0 < ms) requestAnimationFrame(tick);
    else window.__done = true;
  };
  requestAnimationFrame(tick);
}, SAMPLE_MS);

// the film against its band, for the readings taken after the rest one
const readFilm = () => {
  const q = (s) => document.querySelector(s);
  const band = q('[class*="heroBand"]').getBoundingClientRect();
  const el = q('[class*="heroFrame"]');
  const f = el.getBoundingClientRect();
  return {
    y: Math.round(window.scrollY),
    scale: +(f.width / band.width).toFixed(4),
    transform: getComputedStyle(el).transform,
    edge: +Math.max(Math.abs(f.left - band.left), Math.abs(f.right - band.right),
      Math.abs(f.top - band.top), Math.abs(f.bottom - band.bottom)).toFixed(2),
    pan: getComputedStyle(q('[class*="heroPan"]')).transform,
  };
};

const measure = async (width, height) => {
  await page.setViewport({ width, height });
  let resized = null;
  if (RESIZE) {
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    resized = await page.waitForFunction((at) => {
      const f = document.querySelector('[class*="heroFrame"]');
      const bd = document.querySelector('[class*="heroBand"]');
      if (!f || !bd || !(+getComputedStyle(f).opacity > 0)) return false;
      const k = f.getBoundingClientRect().width / bd.getBoundingClientRect().width;
      return k >= at && k < 1 && { ms: Math.round(performance.now() - window.__t0), scale: +k.toFixed(3) };
    }, { polling: "raf", timeout: 30000 }, RESIZE_AT).then((h) => h.jsonValue());
    await page.setViewport({ width: RESIZE[0], height: RESIZE[1] });
  } else {
    await page.goto(URL, { waitUntil: "networkidle2" });
  }
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 6000));
  await page.waitForFunction(() => window.__done, { timeout: 30000 });
  if (SHOT) await page.screenshot({ path: `${SHOT}-${width}x${height}.png` });
  const m = await page.evaluate((reduced, resizing) => {
    const q = (s) => document.querySelector(s);
    const hero = q('[class*="hero"]');
    const labels = q('[class*="heroLabels"]');
    const band = q('[class*="heroBand"]');
    const frame = q('[class*="heroFrame"]');
    const top = q('[class*="heroLineTop"]');
    const bot = q('[class*="heroLineBot"]');

    const inkX = (el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      const rects = [...r.getClientRects()].filter((x) => x.width > 0 && x.height > 1);
      return [Math.min(...rects.map((x) => x.left)), Math.max(...rects.map((x) => x.right))];
    };
    /* the caps ink, relative to the line box's own top — invariant under the
       split's translateY, so it can be re-applied to every sampled frame */
    const capsInk = (el) => {
      const cs = getComputedStyle(el);
      const strut = document.createElement("span");
      strut.style.cssText = "display:inline-block;width:0;height:0;overflow:hidden";
      el.appendChild(strut);
      const box = el.getBoundingClientRect();
      const baseline = strut.getBoundingClientRect().top;
      strut.remove();
      const c = document.createElement("canvas").getContext("2d");
      c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const text = el.textContent.trim().replace(/\s+/g, " ");
      const m = c.measureText(cs.textTransform === "uppercase" ? text.toUpperCase() : text);
      return {
        inkTop: baseline - m.actualBoundingBoxAscent - box.top,
        inkBot: baseline + m.actualBoundingBoxDescent - box.top,
      };
    };
    const ms = (t) => (t === null ? null : Math.round(t));

    const spans = [...labels.querySelectorAll("span")];
    const [labL] = inkX(spans[0]);
    const [, labR] = inkX(spans[spans.length - 1]);
    const bandR = band.getBoundingClientRect();
    const frameR = frame.getBoundingClientRect();
    const ta = capsInk(top);
    const tb = capsInk(bot);
    const fs = parseFloat(getComputedStyle(top).fontSize);

    // every sampled frame: clearance between the film and each line's ink
    const s = window.__s;
    let minTop = Infinity, minBot = Infinity, minTopT = 0, minBotT = 0;
    let firstSized = null, firstVisible = null, preResize = 0;
    for (const x of s) {
      const [fl, ft, fr, fb] = x.f;
      if (fr - fl < 2) continue;
      if (resizing && Math.abs(x.bw - bandR.width) > 0.5) { preResize++; continue; }
      if (firstSized === null) firstSized = x.t;
      if (firstVisible === null && x.o > 0) firstVisible = x.t;
      const aInkBot = x.a[1] + ta.inkBot;
      const bInkTop = x.b[1] + tb.inkTop;
      if (ft - aInkBot < minTop) { minTop = ft - aInkBot; minTopT = x.t; }
      if (bInkTop - fb < minBot) { minBot = bInkTop - fb; minBotT = x.t; }
    }
    const last = s[s.length - 1];
    const widths = s.map((x) => x.f[2] - x.f[0]);

    // the seam between the two line boxes: its minimum is the closed couplet
    let minSeam = Infinity, minSeamT = 0;
    for (const x of s) {
      if (x.b[1] - x.a[3] < minSeam) { minSeam = x.b[1] - x.a[3]; minSeamT = x.t; }
    }

    /* the film's width, frame to frame. Once the geometry is measured the
       ceiling parks it at zero (before that it sits at the server-rendered
       seed scale, wider and invisible); `open` is its first nonzero frame
       after that stretch, so every step from `open - 1` on is the split's */
    const zero = widths.findIndex((w) => w < 0.5);
    const open = zero < 0 ? -1 : widths.findIndex((w, i) => i > zero && w >= 0.5);
    let maxShrink = 0, maxShrinkT = null, zeroAgainT = null, maxStep = 0, maxStepT = null;
    let maxScaleDrop = 0, maxScaleDropT = null;
    let reach = -1, lateStep = 0, lateStepT = null, lateDt = 0;
    if (open > 0) {
      for (let i = open; i < s.length; i++) {
        const d = widths[i] - widths[i - 1];
        if (-d > maxShrink) { maxShrink = -d; maxShrinkT = s[i].t; }
        const k = widths[i - 1] / s[i - 1].bw - widths[i] / s[i].bw;
        if (k > maxScaleDrop) { maxScaleDrop = k; maxScaleDropT = s[i].t; }
        if (Math.abs(d) > maxStep) { maxStep = Math.abs(d); maxStepT = s[i].t; }
        if (widths[i] < 0.5 && zeroAgainT === null) zeroAgainT = s[i].t;
        if (reach < 0 && Math.abs(widths[i] - s[i].bw) <= 0.5) reach = i;
      }
      for (let i = reach; reach > 0 && i >= open && s[reach].t - s[i].t <= 300; i--) {
        const d = Math.abs(widths[i] - widths[i - 1]);
        if (d > lateStep) { lateStep = d; lateStepT = s[i].t; }
        lateDt = Math.max(lateDt, s[i].t - s[i - 1].t);
      }
    }

    const out = {
      fs: +fs.toFixed(1),
      bandAir: getComputedStyle(hero).getPropertyValue("--band-air").trim(),
      labelsSeated: getComputedStyle(labels).position === "absolute",
      labelsL: +labL.toFixed(1),
      labelsR: +labR.toFixed(1),
      bandL: +bandR.left.toFixed(1),
      bandR: +bandR.right.toFixed(1),
      bandT: +bandR.top.toFixed(1),
      bandB: +bandR.bottom.toFixed(1),
      frameL: +frameR.left.toFixed(1),
      frameR: +frameR.right.toFixed(1),
      frameT: +frameR.top.toFixed(1),
      frameB: +frameR.bottom.toFixed(1),
      edgeDelta: +Math.max(Math.abs(frameR.left - bandR.left), Math.abs(frameR.right - bandR.right),
        Math.abs(frameR.top - bandR.top), Math.abs(frameR.bottom - bandR.bottom)).toFixed(2),
      insetL: +(frameR.left - labL).toFixed(1),
      insetR: +(labR - frameR.right).toFixed(1),
      restScale: +((frameR.right - frameR.left) / bandR.width).toFixed(4),
      frameTransform: getComputedStyle(frame).transform,
      restAirTop: +(frameR.top - (top.getBoundingClientRect().top + ta.inkTop + (ta.inkBot - ta.inkTop))).toFixed(1),
      restAirBot: +((bot.getBoundingClientRect().top + tb.inkTop) - frameR.bottom).toFixed(1),
      samples: s.length,
      firstSizedMs: ms(firstSized),
      firstVisibleMs: ms(firstVisible),
      maxWidth: +Math.max(...widths).toFixed(1),
      bandW: +bandR.width.toFixed(1),
      lastWidth: last && +(last.f[2] - last.f[0]).toFixed(1),
      lastIsBand: !!last && Math.abs(last.f[2] - last.f[0] - bandR.width) <= 0.5,
      minClearTop: +minTop.toFixed(1),
      minClearTopMs: Math.round(minTopT),
      minClearBot: +minBot.toFixed(1),
      minClearBotMs: Math.round(minBotT),
      minSeam: +minSeam.toFixed(1),
      minSeamMs: Math.round(minSeamT),
      seamHeld: open > 0
        ? +s.slice(zero, open).map((x) => x.b[1] - x.a[3]).sort((p, q) => p - q)[(open - zero) >> 1].toFixed(1)
        : null,
      seamExpect: +(0.28 * fs).toFixed(1),
      openMs: open > 0 ? Math.round(s[open].t) : null,
      maxShrink: +maxShrink.toFixed(2),
      maxShrinkMs: ms(maxShrinkT),
      maxScaleDrop: +maxScaleDrop.toFixed(4),
      maxScaleDropMs: ms(maxScaleDropT),
      zeroAgainMs: ms(zeroAgainT),
      maxStep: +maxStep.toFixed(2),
      maxStepMs: ms(maxStepT),
      reachBandMs: reach > 0 ? Math.round(s[reach].t) : null,
      landStep: reach > 0 ? +(widths[reach] - widths[reach - 1]).toFixed(2) : null,
      lateMaxStep: +lateStep.toFixed(2),
      lateMaxStepMs: ms(lateStepT),
      lateMaxDt: +lateDt.toFixed(1),
    };
    if (resizing) out.preResize = preResize;
    if (reduced) Object.assign(out, {
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      masksInTop: top.querySelectorAll('[class*="mask"]').length,
      hasVideo: !!frame.querySelector("video"),
      inlineTransform: frame.style.transform || "(unset)",
      animations: document.getAnimations().length,
    });
    return out;
  }, REDUCED, !!RESIZE);

  if (resized) Object.assign(m, { resizedAtMs: resized.ms, resizedAtScale: resized.scale });
  if (SCROLL) {
    const vp = page.viewport();
    const s0 = await page.evaluate(readFilm);
    await page.mouse.move(vp.width / 2, vp.height / 2);
    await page.mouse.wheel({ deltaY: SCROLL });
    await new Promise((r) => setTimeout(r, 2500));
    const s1 = await page.evaluate(readFilm);
    Object.assign(m, {
      scrollY: `${s0.y} -> ${s1.y}`, panBefore: s0.pan, panAfter: s1.pan,
      scaleAfter: s1.scale, transformAfter: s1.transform, edgeAfter: s1.edge,
    });
  }
  if (TAB) {
    await page.evaluate(() => {
      window.__lenis?.scrollTo(0, { immediate: true, force: true });
      if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    });
    const seen = [];
    for (let i = 0; i < TAB; i++) {
      await page.keyboard.press("Tab");
      seen.push(await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return "(body)";
        const band = document.querySelector('[class*="heroBand"]');
        const where = band?.contains(el) ? " IN-FILM"
          : band?.closest("section")?.contains(el) ? " hero"
          : el.closest("nav") ? " nav" : "";
        const name = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32);
        return `${el.tagName.toLowerCase()}${where} "${name}"`;
      }));
    }
    m.tabOrder = seen.map((x, i) => `\n    ${String(i + 1).padStart(2)}. ${x}`).join("");
  }
  return m;
};

for (const [w, h] of VIEWPORTS) {
  const m = await measure(w, h);
  console.log(`\n---- ${w}x${h}${RESIZE ? ` -> ${RESIZE.join("x")}` : ""}${REDUCED ? " (reduced)" : ""} ----`);
  for (const [k, v] of Object.entries(m)) console.log(`  ${k.padEnd(15)} ${v}`);
}
await b.close();
