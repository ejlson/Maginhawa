/* INDEPENDENT AUDIT OF THE ARCHIVE TIMELINE — Agent 3.

   Written because scripts/probe-timeline.mjs (authored by the agent under
   test) checks several criteria with assertions that cannot fail:

     * AC3.9 reads getComputedStyle(time).color while a sibling is hovered.
       An ancestor's `opacity` NEVER enters a descendant's computed `color`,
       so that check passes identically whether .year sits inside or outside
       the dimmed wrapper — it does not test the criterion at all. Here the
       year is tested three ways: DOM containment, the multiplied opacity
       chain up to the <ol>, and rendered pixels.

     * AC8.2 calls .focus() programmatically. Under :focus-within that always
       matches, so it proves nothing about :focus-visible or about a real Tab
       walk. Here the focus path is walked with actual Tab keypresses, and a
       mouse CLICK is tested separately for a latched spotlight.

     * AC5.4, AC4.5, AC4.3, AC8.3, AC8.4, AC8.5 and AC1.4 have no check at
       all in that file.

   NOTE ON METHOD — Lenis owns the scroll on this page and animates (or
   swallows) scrollIntoView, and the timeline starts ~3,000px down an
   ~8,700px document. Teleporting to an item leaves the entrance observer
   unfired and the parallax at zero, which reads as a defect and is not one.
   Everything below therefore travels in real ~180px steps, like a reader.

   usage: node scripts/probe-timeline-audit.mjs [port]                      */

import puppeteer from "puppeteer-core";
import { readFile } from "node:fs/promises";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const PAGE = `http://localhost:${PORT}/about`;
const LI = '[class*="timeline"] > li';

const R = [];
const ok = (ac, name, pass, detail = "") =>
  R.push({ ac, name, pass: pass === null ? null : !!pass, detail: String(detail) });
const step = (s) => process.stderr.write(`  · ${s}\n`);

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
const consoleMsgs = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning" || /hydrat/i.test(m.text()))
    consoleMsgs.push(m.type() + ": " + m.text());
});
page.on("pageerror", (e) => consoleMsgs.push("pageerror: " + e.message));
/* THE SCRATCH PAGE LIVES IN A SEPARATE BROWSER. In one browser it becomes
   the foreground tab, which backgrounds the page under test — and a
   backgrounded tab has its rAF and its IntersectionObserver callbacks
   throttled to nothing. The symptom is a timeline that never enters, never
   parallaxes and reports every transition frozen at its start value: a
   whole page of failures that are the harness's, not the code's. */
const sb = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 240000,
  args: ["--no-sandbox"],
});
const scratch = await sb.newPage();
await scratch.setContent("<canvas id=c></canvas>");
await page.bringToFront();

async function load(width, height, opts = {}) {
  await page.setViewport({ width, height, ...opts });
  await page.goto(PAGE, { waitUntil: "networkidle2" });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 })
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 700));
}

/* travel to a scroll position the way a reader does */
async function travelTo(y, stepPx = 180) {
  let cur = await page.evaluate("Math.round(scrollY)");
  const dir = y > cur ? 1 : -1;
  let guard = 0;
  while (Math.abs(cur - y) > stepPx && guard++ < 600) {
    await page.evaluate((d) => window.scrollBy(0, d), dir * stepPx);
    await new Promise((r) => setTimeout(r, 22));
    const next = await page.evaluate("Math.round(scrollY)");
    if (next === cur && guard > 4) break; // hit an end stop
    cur = next;
  }
  // let Lenis land and the observers/rAF catch up
  let prev = -1;
  for (let i = 0; i < 25 && prev !== cur; i++) {
    prev = cur;
    await new Promise((r) => setTimeout(r, 120));
    cur = await page.evaluate("Math.round(scrollY)");
  }
  await new Promise((r) => setTimeout(r, 900));
}
const centreOf = (i) =>
  page.evaluate(
    `(() => { const r = document.querySelectorAll('${LI}')[${i}].getBoundingClientRect();
       return Math.max(0, Math.round(scrollY + r.top + r.height/2 - innerHeight/2)); })()`,
  );
async function centre(i) {
  await travelTo(await centreOf(i));
}
/* a point on the item guaranteed to be inside the viewport */
const hoverPoint = (i) =>
  page.evaluate(
    `(() => { const r = document.querySelectorAll('${LI}')[${i}].querySelector('[class*="frame"]').getBoundingClientRect();
       const y = Math.min(Math.max(r.y + 24, 40), innerHeight - 40);
       return { x: Math.round(r.x + r.width/2), y: Math.round(y), rect:[r.x,r.y,r.width,r.height].map(Math.round) }; })()`,
  );

/* diff two screenshots of the same clip — with the ink, then without it */
async function inkVsGround(clip, hideCss, settle = 140) {
  const A = await page.screenshot({ clip, captureBeyondViewport: false, encoding: "base64" });
  await page.addStyleTag({ content: hideCss });
  await new Promise((r) => setTimeout(r, settle));
  const B = await page.screenshot({ clip, captureBeyondViewport: false, encoding: "base64" });
  await page.evaluate((css) => {
    document.querySelectorAll("style").forEach((s) => {
      if (s.textContent === css) s.remove();
    });
  }, hideCss);
  await new Promise((r) => setTimeout(r, settle));
  const out = await scratch.evaluate(
    async (a, bb) => {
      const draw = async (b64) => {
        const img = new Image();
        img.src = "data:image/png;base64," + b64;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext("2d", { willReadFrequently: true });
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, img.width, img.height).data;
      };
      const A = await draw(a),
        B = await draw(bb);
      let n = 0, ar = 0, ag = 0, ab = 0, br = 0, bg = 0, bl = 0;
      for (let i = 0; i < A.length; i += 4) {
        if (
          Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) >
          14
        ) {
          n++;
          ar += A[i]; ag += A[i + 1]; ab += A[i + 2];
          br += B[i]; bg += B[i + 1]; bl += B[i + 2];
        }
      }
      return n
        ? { n, ink: [ar / n, ag / n, ab / n].map(Math.round), ground: [br / n, bg / n, bl / n].map(Math.round) }
        : null;
    },
    A,
    B,
  );
  await page.bringToFront();
  return out;
}
const lum = (r, g, bl) => {
  const f = (v) => ((v /= 255), v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
};
const ratio = (a, c) => {
  const [hi, lo] = a > c ? [a, c] : [c, a];
  return (hi + 0.05) / (lo + 0.05);
};
const CHAIN = `(el) => { let o = 1, n = el;
  while (n && n.tagName !== "OL") { o *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; }
  return o; }`;

/* ================================ AC1.4 — seat invariants, pure arithmetic */
{
  const src = await readFile(new URL("../components/About.tsx", import.meta.url), "utf8");
  const block = src.slice(src.indexOf("const SEATS"), src.indexOf("const STORY"));
  const seats = [
    ...block.matchAll(/span:\s*([\d.]+),\s*offset:\s*(-?[\d.]+),\s*ratio:\s*([\d.]+)[^}]*drift:\s*(-?\d+)/g),
  ].map((m) => ({ span: +m[1], offset: +m[2], ratio: +m[3], drift: +m[4] }));
  ok("AC1.4", "nine seats parsed from SEATS", seats.length === 9, seats.length);
  const edges = seats.map((s, i) => ({
    i: i + 1,
    left: +(0.5 + s.offset - s.span / 2).toFixed(4),
    right: +(0.5 + s.offset + s.span / 2).toFixed(4),
  }));
  const bad = edges.filter((e) => e.right > 0.7001 || e.left < 0.0499);
  ok("AC1.4", "0.05 <= left, right <= 0.70 for all nine", bad.length === 0, bad.length ? JSON.stringify(bad) : `L ${edges.map((e) => e.left).join(",")} | R ${edges.map((e) => e.right).join(",")}`);
  ok("§6.3", "no two adjacent seats share a span", seats.every((s, i) => !i || s.span !== seats[i - 1].span), seats.map((s) => s.span).join(","));
  ok("§6.3", "no two adjacent seats share a ratio", seats.every((s, i) => !i || s.ratio !== seats[i - 1].ratio), seats.map((s) => s.ratio).join(","));
  ok("§9.7", "parallax amplitude <= 96px", Math.max(...seats.map((s) => Math.abs(s.drift))) <= 96, `max |drift| = ${Math.max(...seats.map((s) => Math.abs(s.drift)))}`);
  {
    const bySpan = seats.map((s, i) => ({ i, span: s.span, d: Math.abs(s.drift) })).sort((a, c) => a.span - c.span);
    ok("§6.3", "drift rises monotonically with span", bySpan.every((s, i) => !i || s.d >= bySpan[i - 1].d), bySpan.map((s) => `${s.span}->${s.d}`).join(" "));
  }
}

/* ================================ desktop 1440 */
step("load 1440");
await load(1440, 900);

const struct = await page.evaluate(() => {
  const items = [...document.querySelectorAll('[class*="timeline"] > li')];
  const story = document.querySelector('section[class*="story"]');
  return {
    n: items.length,
    ols: document.querySelectorAll('[class*="timeline"]').length,
    ol: document.querySelector('[class*="timeline"]')?.tagName,
    years: items.map((li) => li.querySelector("time")?.textContent).join(","),
    dt: items.map((li) => li.querySelector("time")?.getAttribute("datetime")).join(","),
    ariaHiddenYears: items.filter((li) => li.querySelector("time")?.hasAttribute("aria-hidden")).length,
    markerHidden: items.filter((li) => li.querySelector('[class*="marker"]')?.hasAttribute("aria-hidden")).length,
    yearInsideBody: items.filter((li) => !!li.querySelector('[class*="itemBody"] time')).length,
    markerInsideBody: items.filter((li) => !!li.querySelector('[class*="itemBody"] [class*="marker"]')).length,
    h2: story?.querySelector("h2")?.textContent,
    headings: [...(story?.querySelectorAll("h1,h2,h3,h4,h5,h6") || [])].map((h) => h.tagName).join(","),
    pageHeadings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => h.tagName + ":" + (h.textContent || "").trim().slice(0, 26)).join(" | "),
    links: story?.querySelectorAll('[class*="timeline"] a').length,
    hrefs: [...(story?.querySelectorAll('[class*="timeline"] a') || [])].map((a) => a.getAttribute("href")).join(","),
    sectionChildren: story ? [...story.children].map((c) => c.tagName).join(",") : "",
    titles: items.map((li) => li.querySelector("h3")?.textContent).join(" | "),
    unenteredClip: getComputedStyle(items[8].querySelector('[class*="frame"]')).clipPath,
    entered: items.map((li) => (/entered/.test(li.className) ? 1 : 0)).join(""),
    aspect: items.map((li) => getComputedStyle(li.querySelector('[class*="frame"]')).aspectRatio).join(","),
  };
});
ok("AC2.1", "exactly one <ol>, nine <li> @1440", struct.ols === 1 && struct.n === 9 && struct.ol === "OL", `ols=${struct.ols} li=${struct.n} ${struct.ol}`);
ok("AC2.2", "years chronological 1987→2026", struct.years === "1987,2007,2017,2018,2019,2025,2025,2026,2026", struct.years);
ok("AC2.10", "nine <time datetime>, none aria-hidden", struct.dt.split(",").filter(Boolean).length === 9 && struct.ariaHiddenYears === 0, `dt=${struct.dt} ariaHidden=${struct.ariaHiddenYears}`);
ok("AC8.7", "years programmatically inside their own <li>", struct.n === 9 && struct.dt.split(",").length === 9, struct.dt);
ok("AC2.5", "nine chapter links to /restaurants/*", struct.links === 9 && struct.hrefs.split(",").every((h) => h.startsWith("/restaurants/")), struct.hrefs);
ok("AC2.6", "Bunso renders the (Coming soon) sub-line", /Bunso\(Coming soon\)|Bunso \(Coming soon\)/.test(struct.titles.replace(/\s+/g, " ")), struct.titles.split("|").pop());
ok("AC2.9", "section <h2> reads 'Our Story'", struct.h2 === "Our Story", struct.h2);
ok("AC8.1", "story outline = H2 then 9×H3", struct.headings === "H2,H3,H3,H3,H3,H3,H3,H3,H3,H3", struct.headings);
ok("AC2.7", "section children are exactly H2 + OL", struct.sectionChildren === "H2,OL", struct.sectionChildren);
ok("AC3.9", "STRUCTURAL: no <time> inside the dimmed .itemBody", struct.yearInsideBody === 0, `${struct.yearInsideBody}/9`);
ok("AC3.9", "STRUCTURAL: no marker inside .itemBody", struct.markerInsideBody === 0, `${struct.markerInsideBody}/9`);
ok("§5r24", "marker aria-hidden on all nine", struct.markerHidden === 9, struct.markerHidden);
ok("AC4.1", "un-entered frame parked at 100% bottom inset", /100%/.test(struct.unenteredClip), struct.unenteredClip);
ok("AC4.5", "every frame declares aspect-ratio before load", struct.aspect.split(",").every((a) => a && a !== "auto"), struct.aspect);

/* ---- AC4.1 catch the wipe mid-flight ---------------------------------- */
step("entrance wipe");
{
  const y0 = await centreOf(0);
  await travelTo(y0 - 700);
  // creep the last stretch and sample fast
  const seen = [];
  for (let i = 0; i < 26; i++) {
    await page.evaluate(() => window.scrollBy(0, 60));
    seen.push(
      await page.evaluate(`(() => { const li = document.querySelectorAll('${LI}')[0];
        return { e: /entered/.test(li.className), c: getComputedStyle(li.querySelector('[class*="frame"]')).clipPath }; })()`),
    );
    await new Promise((r) => setTimeout(r, 45));
  }
  const mid = seen.filter((s) => s.e && /\d/.test(s.c) && !/100%/.test(s.c) && !/^inset\(0px round/.test(s.c));
  ok("AC4.1", "entrance is a clip-path wipe with a live bottom inset", mid.length > 0, mid.length ? mid[0].c : `states seen: ${[...new Set(seen.map((s) => s.c))].join(" | ")}`);
  ok("AC4.1", "entrance is NOT an opacity fade", await page.evaluate(`getComputedStyle(document.querySelectorAll('${LI}')[0].querySelector('[class*="frame"]')).transitionProperty`) === "clip-path", await page.evaluate(`getComputedStyle(document.querySelectorAll('${LI}')[0].querySelector('[class*="frame"]')).transitionProperty`));
}

/* ---- AC5.2 parallax at ONE scroll position ---------------------------- */
step("parallax");
await centre(3);
const par = await page.evaluate(`(() => {
  const items=[...document.querySelectorAll('${LI}')];
  const q=(l,c)=>l.querySelector('[class*="'+c+'"]');
  return { all: items.map(li => getComputedStyle(q(li,'parallax')).transform),
           frames: items.map(li => getComputedStyle(q(li,'frame')).transform) };
})()`);
const visible = par.all.filter((t) => t !== "none");
ok("AC5.2", "items drift at different rates at one scroll position", new Set(visible).size >= 3, par.all.join(" | "));
ok("AC3.3", "parallax rides .parallax; every .frame transform is none", par.frames.every((t) => t === "none"), par.frames.join(","));

/* ---- AC3.2/3.3/3.4/3.9 with a sibling genuinely hovered --------------- */
step("hover spotlight / shutter / title");
const resting = await page.evaluate(`(() => { const s = getComputedStyle(document.querySelectorAll('${LI}')[2].querySelector('[class*="titleInner"]'));
  return {tr:s.transform, dur:s.transitionDuration, delay:s.transitionDelay, ease:s.transitionTimingFunction}; })()`);
const hp = await hoverPoint(3);
await page.mouse.move(hp.x, hp.y);
const flight = [];
for (const gap of [70, 130, 200, 300]) {
  await new Promise((r) => setTimeout(r, gap));
  flight.push(await page.evaluate(`(() => { const s = getComputedStyle(document.querySelectorAll('${LI}')[3].querySelector('[class*="frame"]')); return {clip:s.clipPath, tr:s.transform}; })()`));
}
await new Promise((r) => setTimeout(r, 1200));
const hov = await page.evaluate(`(() => {
  const chain = ${CHAIN};
  const items=[...document.querySelectorAll('${LI}')];
  const q=(l,c)=>l.querySelector('[class*="'+c+'"]');
  const sib = items[2], self = items[3];
  return {
    hovered: items.map(li => li.matches(':hover') ? 1 : 0).join(''),
    sibBody: getComputedStyle(q(sib,'itemBody')).opacity,
    selfBody: getComputedStyle(q(self,'itemBody')).opacity,
    bodyTrans: getComputedStyle(q(sib,'itemBody')).transitionDuration + ' ' + getComputedStyle(q(sib,'itemBody')).transitionProperty,
    sibYearChain: chain(sib.querySelector('time')),
    sibFrameChain: chain(q(sib,'frame')),
    sibMarkerChain: chain(q(sib,'marker')),
    selfClip: getComputedStyle(q(self,'frame')).clipPath,
    selfFrameTr: getComputedStyle(q(self,'frame')).transform,
    selfInner: getComputedStyle(q(self,'titleInner')).transform,
    selfDur: getComputedStyle(q(self,'titleInner')).transitionDuration,
    selfDelay: getComputedStyle(q(self,'titleInner')).transitionDelay,
    titleClip: getComputedStyle(self.querySelector('h3')).clipPath,
  };
})()`);
ok("AC3.2", "hover registers on exactly one item", hov.hovered === "000100000", hov.hovered);
ok("AC3.2", "sibling .itemBody dims to 0.3", Math.abs(+hov.sibBody - 0.3) < 0.02, hov.sibBody);
ok("AC3.2", "hovered .itemBody at 1", +hov.selfBody === 1, hov.selfBody);
ok("§5r1", "spotlight transition is opacity 750ms", /0\.75s/.test(hov.bodyTrans) && /opacity/.test(hov.bodyTrans), hov.bodyTrans);
ok("AC3.9", "EFFECTIVE: dimmed sibling's YEAR opacity chain = 1.0", Math.abs(hov.sibYearChain - 1) < 0.001, `year=${hov.sibYearChain} frame=${hov.sibFrameChain} marker=${hov.sibMarkerChain}`);
ok("AC3.9", "EFFECTIVE: dimmed sibling's FRAME opacity chain = 0.3", Math.abs(hov.sibFrameChain - 0.3) < 0.02, hov.sibFrameChain);
ok("AC3.9", "EFFECTIVE: dimmed sibling's MARKER opacity chain = 1.0", Math.abs(hov.sibMarkerChain - 1) < 0.001, hov.sibMarkerChain);
ok("AC3.3", "shutter settles at a 5% clip inset", /5%/.test(hov.selfClip), hov.selfClip);
ok("AC3.3", "frame transform 'none' through the ENTIRE hover", flight.every((f) => f.tr === "none") && hov.selfFrameTr === "none", flight.map((f) => f.tr).join(",") + " -> " + hov.selfFrameTr);
ok("AC3.3", "clip-path animates (intermediate values observed)", flight.some((f) => /\d/.test(f.clip) && !/^inset\(0px round/.test(f.clip) && !/5% round|5% 5%/.test(f.clip)), flight.map((f) => f.clip).join(" | "));
ok("AC3.4", "title rises to translateY(0) on hover", hov.selfInner === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(hov.selfInner), hov.selfInner);
ok("AC3.4", "800ms in / 600ms out with a 200ms delay both ways", hov.selfDur.includes("0.8s") && resting.dur.includes("0.6s") && hov.selfDelay.includes("0.2s") && resting.delay.includes("0.2s"), `in ${hov.selfDur}+${hov.selfDelay} / out ${resting.dur}+${resting.delay}`);
ok("AC3.4", "resting title parked off-mask", /matrix\(1, 0, 0, 1, 0, ([1-9]\d|\d\.)/.test(resting.tr), resting.tr);
ok("§5r12", "title mask bleeds vertically (ascenders/descenders survive)", /-\d+(\.\d+)?px -?\d/.test(hov.titleClip), hov.titleClip);

/* ---- AC3.5 no clipped ascenders/descenders --------------------------- */
{
  const g = await page.evaluate(`(() => {
    const out = [];
    for (const li of document.querySelectorAll('${LI}')) {
      const h3 = li.querySelector('h3'), inner = li.querySelector('[class*="titleInner"]');
      const cs = getComputedStyle(h3);
      const m = cs.clipPath.match(/-?[\\d.]+/g);
      out.push({ t: (h3.textContent||'').trim().slice(0,22), fs: parseFloat(cs.fontSize),
                 lh: h3.getBoundingClientRect().height, innerH: inner.getBoundingClientRect().height,
                 bleed: m ? Math.abs(parseFloat(m[0])) : 0 });
    }
    return out;
  })()`);
  // an em box is ~1.0em; Contralto ascender+descender fits within ~1.2em.
  // line-height 0.92 means the box is SHORTER than the glyphs by ~0.28em,
  // i.e. 0.14em top and bottom — the -0.3em bleed must exceed that.
  const need = g.map((x) => ({ ...x, needed: 0.14 * x.fs }));
  ok("AC3.5", "vertical mask bleed exceeds the ascender/descender overhang", need.every((x) => x.bleed >= x.needed), need.map((x) => `${x.t}: bleed ${x.bleed.toFixed(1)}px vs needed ${x.needed.toFixed(1)}px`).join(" | "));
  const gb = g.find((x) => /Guanabana/.test(x.t)), cm = g.find((x) => /Caf/.test(x.t));
  ok("AC3.5", "'Guanabana' and 'Café Mama & Sons' specifically", !!gb && !!cm && gb.bleed >= 0.14 * gb.fs && cm.bleed >= 0.14 * cm.fs, `${gb?.t} ${gb?.bleed.toFixed(1)}px | ${cm?.t} ${cm?.bleed.toFixed(1)}px`);
}

/* ---- AC3.9 in PIXELS: is a dimmed sibling's year still inked? --------- */
step("AC3.9 pixels");
{
  const yb = await page.evaluate(`(() => { const r = document.querySelectorAll('${LI}')[2].querySelector('time').getBoundingClientRect();
     if (r.top < 0 || r.bottom > innerHeight) return null;   // a clip must be on screen AND in page coordinates
     return { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), width: Math.round(r.width), height: Math.round(r.height) }; })()`);
  if (yb && yb.width > 8 && yb.height > 8) {
    const d = await inkVsGround(yb, `[class*="timeline"] time { visibility: hidden !important }`);
    if (d) {
      const c = ratio(lum(...d.ink), lum(...d.ground));
      ok("AC3.9", "PIXELS: dimmed sibling's year is still inked", d.n > 60, `${d.n} ink px, ink=rgb(${d.ink}) ground=rgb(${d.ground})`);
      ok("AC3.9", "PIXELS: that year reads at >=3:1 while a sibling is hovered", c >= 3, `${c.toFixed(2)}:1`);
    } else ok("AC3.9", "PIXELS: dimmed sibling's year is still inked", false, "ZERO ink pixels — the year is invisible");
  } else ok("AC3.9", "PIXELS year sample", null, `rect ${JSON.stringify(yb)}`);
}

/* ---- the :focus-within deviation: does a MOUSE CLICK latch it? -------- */
step("mouse-click latch");
await page.mouse.move(4, 4);
await new Promise((r) => setTimeout(r, 1300));
await page.evaluate(`document.querySelectorAll('${LI}')[3].querySelector('a').addEventListener('click', e => e.preventDefault(), true)`);
const linkPt = await page.evaluate(`(() => { const r = document.querySelectorAll('${LI}')[3].querySelector('a').getBoundingClientRect();
   return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), inView: r.y > 0 && r.bottom < innerHeight }; })()`);
let latched = null;
if (linkPt.inView) {
  await page.mouse.click(linkPt.x, linkPt.y);
  await page.mouse.move(4, 4);
  await new Promise((r) => setTimeout(r, 1400));
  latched = await page.evaluate(`(() => {
     const items=[...document.querySelectorAll('${LI}')]; const q=(l,c)=>l.querySelector('[class*="'+c+'"]');
     const a = document.activeElement;
     return { active: a.tagName + ':' + (a.textContent||'').trim().slice(0,18),
              focusVisible: a.matches ? a.matches(':focus-visible') : null,
              anyHover: items.some(li => li.matches(':hover')),
              sib: getComputedStyle(q(items[2],'itemBody')).opacity,
              self: getComputedStyle(q(items[3],'itemBody')).opacity,
              inner: getComputedStyle(q(items[3],'titleInner')).transform,
              clip: getComputedStyle(q(items[3],'frame')).clipPath }; })()`);
  ok("dev4", "a mouse click leaves the chapter link focused", /^A:/.test(latched.active), latched.active);
  ok("dev4", ":focus-visible does NOT match a mouse-focused link", latched.focusVisible === false, `matches(':focus-visible')=${latched.focusVisible}`);
  ok("dev4", "spotlight releases when the cursor leaves (no :focus-within latch)", Math.abs(+latched.sib - 1) < 0.02, `pointer off the list, yet sibling .itemBody=${latched.sib}, clicked item=${latched.self}, its title=${latched.inner}, its frame=${latched.clip}`);
} else ok("dev4", "mouse-click latch", null, `link off-screen ${JSON.stringify(linkPt)}`);

/* ---- AC8.2/8.3/8.4 keyboard walk with real Tab keys ------------------- */
step("keyboard walk");
await page.reload({ waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 700));
await centre(0);
await page.evaluate(`document.querySelectorAll('${LI}')[0].querySelector('a').focus()`);
await page.keyboard.press("Tab");
await page.keyboard.down("Shift");
await page.keyboard.press("Tab");
await page.keyboard.up("Shift");
await new Promise((r) => setTimeout(r, 1400));
const walk = [];
for (let i = 0; i < 9; i++) {
  walk.push(
    await page.evaluate(`(() => {
      const chain = ${CHAIN};
      const a = document.activeElement, li = a.closest('li');
      const items=[...document.querySelectorAll('${LI}')]; const idx = items.indexOf(li);
      const q=(l,c)=>l && l.querySelector('[class*="'+c+'"]');
      const other = items[(idx + 4) % 9];
      const cs = getComputedStyle(a), r = a.getBoundingClientRect();
      const h3 = li && li.querySelector('h3'); const hb = h3 && h3.getBoundingClientRect();
      return { idx, text:(a.textContent||'').trim().slice(0,30), focusVisible: a.matches(':focus-visible'),
        selfBody: li ? getComputedStyle(q(li,'itemBody')).opacity : null,
        selfChain: li ? chain(a) : null,
        otherBody: getComputedStyle(q(other,'itemBody')).opacity,
        inner: li ? getComputedStyle(q(li,'titleInner')).transform : null,
        clip: li ? getComputedStyle(q(li,'frame')).clipPath : null,
        outline: cs.outlineColor + ' ' + cs.outlineWidth + ' ' + cs.outlineStyle + ' off ' + cs.outlineOffset,
        inView: r.top > -8 && r.bottom < innerHeight + 8,
        gaps: hb ? { l: Math.round(r.x - hb.x), r: Math.round(hb.right - r.right), t: Math.round(r.y - hb.y), b: Math.round(hb.bottom - r.bottom) } : null,
        h3clip: h3 ? getComputedStyle(h3).clipPath : null, fs: h3 ? parseFloat(getComputedStyle(h3).fontSize) : null };
    })()`),
  );
  if (i < 8) {
    await page.keyboard.press("Tab");
    await new Promise((r) => setTimeout(r, 1350));
  }
}
ok("AC8.3", "Tab order is DOM order 1987→2026", walk.map((w) => w.idx).join(",") === "0,1,2,3,4,5,6,7,8", walk.map((w) => `${w.idx}:${w.text}`).join(" > "));
ok("AC8.3", "each focused chapter is scrolled into view", walk.every((w) => w.inView), walk.map((w, i) => `${i}:${w.inView}`).join(" "));
ok("AC8.2", ":focus-visible matches on a real Tab walk", walk.every((w) => w.focusVisible), walk.map((w) => w.focusVisible).join(","));
ok("AC8.2", "keyboard focus dims siblings to 0.3 — same spotlight as hover", walk.every((w) => Math.abs(+w.otherBody - 0.3) < 0.02), walk.map((w) => w.otherBody).join(","));
ok("AC8.2", "keyboard focus holds its own body at 1", walk.every((w) => +w.selfBody === 1), walk.map((w) => w.selfBody).join(","));
ok("AC8.2", "keyboard focus reveals the title", walk.every((w) => w.inner === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(w.inner)), walk.map((w, i) => `${i}:${w.inner}`).join(" | "));
ok("AC8.2", "keyboard focus runs the shutter", walk.every((w) => /5%/.test(w.clip || "")), walk.map((w, i) => `${i}:${w.clip}`).join(" | "));
ok("AC8.4", "focused item is never one of the 0.3-dimmed (chain = 1)", walk.every((w) => Math.abs(w.selfChain - 1) < 0.001), walk.map((w) => w.selfChain).join(","));
ok("AC8.4", "focus ring is cream, not the global maroon", walk.every((w) => /250, 247, 241/.test(w.outline)), walk[0].outline);
{
  const need = 5; // 2px ring + 3px offset
  const rows = walk.map((w) => {
    const m = (w.h3clip || "").match(/-?[\d.]+/g) || [0, 0];
    const v = Math.abs(parseFloat(m[0])), h = Math.abs(parseFloat(m[1] ?? m[0]));
    return { i: w.idx, ok: w.gaps ? w.gaps.l + h >= need && w.gaps.r + h >= need && w.gaps.t + v >= need && w.gaps.b + v >= need : true, v, h, g: w.gaps };
  });
  ok("AC8.4", "the h3 mask does not shear the focus ring", rows.every((r) => r.ok), rows.filter((r) => !r.ok).map((r) => `item ${r.i}: bleed v${r.v.toFixed(1)}/h${r.h.toFixed(1)} gaps ${JSON.stringify(r.g)}`).join(" ; ") || "all clear");
}

/* ---- AC8.5 measured contrast across the video's own frames ------------ */
step("contrast");
{
  await page
    .waitForFunction(() => { const v = document.querySelector("video"); return v && v.readyState >= 2 && isFinite(v.duration); }, { timeout: 40000 })
    .catch(() => {});
  const vid = await page.evaluate(`(() => { const v=document.querySelector('video'); return v ? {dur:v.duration, rs:v.readyState} : null; })()`);
  step(`video ${JSON.stringify(vid)}`);
  await centre(3);
  await page.evaluate(`document.querySelectorAll('${LI}')[3].querySelector('a').focus()`);
  await new Promise((r) => setTimeout(r, 1400));
  const times = vid && isFinite(vid.dur) && vid.dur > 1 ? [0.02, 0.25, 0.5, 0.75, 0.95].map((f) => +(f * vid.dur).toFixed(2)) : [null];
  const S = [];
  for (const t of times) {
    if (t !== null) {
      await page.evaluate(`(() => { const v=document.querySelector('video'); v.pause(); v.currentTime=${t};
        return new Promise(r => { const d=()=>r(1); v.addEventListener('seeked', d, {once:true}); setTimeout(d, 2500); }); })()`);
      await new Promise((r) => setTimeout(r, 450));
    }
    for (const [label, sel, hide] of [
      ["year", "time", `[class*="timeline"] time { visibility: hidden !important }`],
      ["title", "h3", `[class*="timeline"] h3 { visibility: hidden !important }`],
    ]) {
      const rect = await page.evaluate(`(() => { const e = document.querySelectorAll('${LI}')[3].querySelector('${sel}'); const r = e.getBoundingClientRect();
        if (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) return null;
        return { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), width: Math.round(r.width), height: Math.round(r.height) }; })()`);
      if (!rect || rect.width < 8 || rect.height < 8) continue;
      const d = await inkVsGround(rect, hide);
      if (d) S.push({ t, label, c: ratio(lum(...d.ink), lum(...d.ground)), ink: d.ink, ground: d.ground, gl: lum(...d.ground), n: d.n });
    }
    step(`t=${t}: ` + S.slice(-2).map((s) => `${s.label} ${s.c.toFixed(2)}:1 ink=${s.ink} gnd=${s.ground}`).join(" | "));
  }
  await page.evaluate(`(() => { const v=document.querySelector('video'); if (v) v.play().catch(()=>{}); })()`);
  const yS = S.filter((s) => s.label === "year"), tS = S.filter((s) => s.label === "title");
  const wy = yS.slice().sort((a, b) => a.c - b.c)[0], dy = yS.slice().sort((a, b) => a.gl - b.gl)[0];
  const wt = tS.slice().sort((a, b) => a.c - b.c)[0], dtk = tS.slice().sort((a, b) => a.gl - b.gl)[0];
  if (wy) ok("AC8.5/§9.5", "YEAR >= 3:1 (large text) on its worst video frame", wy.c >= 3, `worst ${wy.c.toFixed(2)}:1 ink=rgb(${wy.ink}) gnd=rgb(${wy.ground}); darkest frame ${dy.c.toFixed(2)}:1 on rgb(${dy.ground}); all=${yS.map((s) => s.c.toFixed(2)).join("/")}`);
  else ok("AC8.5", "year contrast", null, "no sample");
  if (wt) {
    ok("AC8.5", "TITLE >= 4.5:1 on its worst video frame", wt.c >= 4.5, `worst ${wt.c.toFixed(2)}:1 ink=rgb(${wt.ink}) gnd=rgb(${wt.ground}); darkest frame ${dtk.c.toFixed(2)}:1; all=${tS.map((s) => s.c.toFixed(2)).join("/")}`);
    ok("AC8.5", "TITLE >= 3:1 (large-text floor)", wt.c >= 3, `${wt.c.toFixed(2)}:1`);
  } else ok("AC8.5", "title contrast", null, "no sample");
}

/* ---- AC4.2 the frame is never empty ---------------------------------- */
{
  const bg = await page.evaluate(`getComputedStyle(document.querySelectorAll('${LI}')[0].querySelector('[class*="frame"]')).backgroundColor`);
  const img0 = await page.evaluate(`getComputedStyle(document.querySelectorAll('${LI}')[0].querySelector('img')).transitionDuration`);
  ok("AC4.2", "frame carries a backing colour before the photo paints", /rgba\(250, 247, 241/.test(bg), bg);
  ok("§5r23", "photo cross-fades in over 500ms", img0.includes("0.5s"), img0);
}

/* ---- AC4.3 served image widths --------------------------------------- */
step("image widths");
{
  const reqs = [];
  page.on("request", (r) => { if (r.url().includes("/_next/image")) reqs.push(r.url()); });
  await page.goto(PAGE, { waitUntil: "networkidle2" });
  for (let i = 0; i < 90; i++) { await page.evaluate(() => window.scrollBy(0, 220)); await new Promise((r) => setTimeout(r, 35)); }
  await new Promise((r) => setTimeout(r, 2500));
  const widths = await page.evaluate(`[...document.querySelectorAll('${LI}')].map(li => Math.round(li.querySelector('[class*="frame"]').getBoundingClientRect().width))`);
  const served = [...new Set(reqs.map((u) => +new URL(u, "http://x").searchParams.get("w")).filter(Boolean))].sort((a, b) => a - b);
  ok("AC4.3", "sized /_next/image variants requested", served.length > 0, `frames=${widths.join(",")} served=${served.join(",")}`);
  ok("AC4.3", "served width within one deviceSizes step of the frame (max frame 515px → <=750)", served.every((w) => w <= 750), served.join(","));
}

/* ---- AC6.1 wide viewport, COARSE pointer ------------------------------ */
step("wide + coarse pointer");
{
  const p2 = await b.newPage();
  const cdp = await p2.createCDPSession();
  await cdp.send("Emulation.setEmitTouchEventsForMouse", { enabled: true, configuration: "mobile" });
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "pointer", value: "coarse" },
      { name: "any-pointer", value: "coarse" },
      { name: "hover", value: "none" },
      { name: "any-hover", value: "none" },
    ],
  });
  await p2.setViewport({ width: 1440, height: 900, hasTouch: true });
  await p2.goto(PAGE, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 900));
  const c = await p2.evaluate(`(() => {
    const items=[...document.querySelectorAll('${LI}')]; const q=(l,c)=>l.querySelector('[class*="'+c+'"]');
    return { mq: matchMedia('(hover: hover) and (pointer: fine)').matches,
      inners: items.map(li => getComputedStyle(q(li,'titleInner')).transform),
      clips: items.map(li => getComputedStyle(li.querySelector('h3')).clipPath),
      bodies: items.map(li => getComputedStyle(q(li,'itemBody')).opacity),
      boxes: items.map(li => { const r = li.querySelector('h3').getBoundingClientRect(); return r.width > 20 && r.height > 8; }),
      years: items.every(li => li.querySelector('time').getBoundingClientRect().width > 0),
      pos: getComputedStyle(items[0].querySelector('h3')).position }; })()`);
  ok("AC6.1", "wide+coarse: (hover:hover) and (pointer:fine) does NOT match", c.mq === false, c.mq);
  ok("AC6.1", "wide+coarse: NO title parked at translateY(130%)", c.inners.every((t) => t === "none"), c.inners.join(" | "));
  ok("AC6.1", "wide+coarse: no title mask clip", c.clips.every((x) => x === "none"), c.clips[0]);
  ok("AC6.1", "wide+coarse: nothing dimmed to 0.3", c.bodies.every((o) => +o === 1), c.bodies.join(","));
  ok("AC6.1", "wide+coarse: all nine titles have a rendered box", c.boxes.every(Boolean), c.boxes.join(","));
  ok("AC6.3", "wide+coarse: years still visible", c.years, c.years);
  ok("§8", "wide+coarse: the scatter layout is retained", c.pos === "absolute", c.pos);
  await p2.close();
}

/* ---- narrow / touch --------------------------------------------------- */
step("narrow 375");
await load(375, 812, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const nar = await page.evaluate(`(() => {
  const items=[...document.querySelectorAll('${LI}')]; const q=(l,c)=>l.querySelector('[class*="'+c+'"]');
  const f = q(items[0],'frame').getBoundingClientRect(), bd = q(items[0],'itemBody').getBoundingClientRect();
  return { n: items.length, inners: items.map(li => getComputedStyle(q(li,'titleInner')).transform).join('|'),
    pos: getComputedStyle(items[0].querySelector('h3')).position,
    bodies: items.map(li => getComputedStyle(q(li,'itemBody')).opacity).join(','),
    frameFrac: f.width / bd.width,
    yearColor: getComputedStyle(items[0].querySelector('time')).color,
    yearFs: getComputedStyle(items[0].querySelector('time')).fontSize,
    years: items.every(li => li.querySelector('time').getBoundingClientRect().width > 0),
    flush: items.every(li => Math.abs(q(li,'itemBody').getBoundingClientRect().x - q(items[0],'itemBody').getBoundingClientRect().x) < 1),
    titleClip: getComputedStyle(items[0].querySelector('h3')).clipPath,
    overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth }; })()`);
ok("AC2.1", "nine items @375", nar.n === 9, nar.n);
ok("AC6.1", "narrow: no title translated", /^(none\|)*none$/.test(nar.inners), nar.inners.slice(0, 60));
ok("AC6.1", "narrow: title in flow, no mask", nar.pos !== "absolute" && nar.titleClip === "none", `${nar.pos} / ${nar.titleClip}`);
ok("AC6.1", "narrow: nothing dimmed", nar.bodies.split(",").every((o) => +o === 1), nar.bodies);
ok("AC6.2", "narrow: frame centred at 72% of column @375 (§8 ≤600px)", Math.abs(nar.frameFrac - 0.72) < 0.02, nar.frameFrac.toFixed(3));
ok("AC6.2", "narrow: offset neutralised, all bodies flush", nar.flush, nar.flush);
ok("AC6.3", "narrow: year cream@0.40, all nine visible", /0\.4\)/.test(nar.yearColor) && nar.years, `${nar.yearColor} fs=${nar.yearFs}`);

/* ---- AC6.5 overflow sweep -------------------------------------------- */
step("overflow sweep");
for (const w of [320, 375, 768, 980, 981, 1280, 1440, 1920]) {
  await page.setViewport({ width: w, height: 800 });
  await page.goto(PAGE, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 350));
  const o = await page.evaluate(`(() => ({ ok: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
     sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, n: document.querySelectorAll('${LI}').length }))()`);
  ok("AC6.5", `no h-overflow @${w} (${o.n} items)`, o.ok && o.n === 9, `scrollWidth=${o.sw} clientWidth=${o.cw}`);
}

/* ---- AC6.4 / AC5.3 reduced motion ------------------------------------ */
step("reduced motion");
await page.setViewport({ width: 1440, height: 900 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(PAGE, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 900));
const rmTop = await page.evaluate(`(() => {
  const items=[...document.querySelectorAll('${LI}')]; const q=(l,c)=>l.querySelector('[class*="'+c+'"]');
  return { clips: items.map(li => getComputedStyle(q(li,'frame')).clipPath),
    pars: items.map(li => getComputedStyle(q(li,'parallax')).transform),
    inners: items.map(li => getComputedStyle(q(li,'titleInner')).transform),
    titleClip: getComputedStyle(items[0].querySelector('h3')).clipPath,
    bodies: items.map(li => getComputedStyle(q(li,'itemBody')).opacity),
    entered: items.map(li => /entered/.test(li.className)?1:0).join('') }; })()`);
ok("AC6.4", "reduced: every frame open with NO scrolling at all", rmTop.clips.every((c) => /inset\(0(px|%)/.test(c)), `entered=${rmTop.entered} clips=${rmTop.clips[0]}`);
ok("AC5.3", "reduced: every parallax transform is none", rmTop.pars.every((t) => t === "none"), rmTop.pars.join(","));
ok("AC6.4", "reduced: no title translate and no mask", rmTop.inners.every((t) => t === "none") && rmTop.titleClip === "none", `${rmTop.inners[0]} / ${rmTop.titleClip}`);
ok("AC6.4", "reduced: nothing dimmed at rest", rmTop.bodies.every((o) => +o === 1), rmTop.bodies.join(","));
await travelTo(await centreOf(3));
const rmPt = await hoverPoint(3);
await page.mouse.move(rmPt.x, rmPt.y);
await new Promise((r) => setTimeout(r, 1100));
const rmH = await page.evaluate(`(() => { const items=[...document.querySelectorAll('${LI}')]; const q=(l,c)=>l.querySelector('[class*="'+c+'"]');
  return { anyHover: items.some(li=>li.matches(':hover')), sib: getComputedStyle(q(items[2],'itemBody')).opacity,
    clip: getComputedStyle(q(items[3],'frame')).clipPath, inner: getComputedStyle(q(items[3],'titleInner')).transform,
    par: getComputedStyle(q(items[3],'parallax')).transform }; })()`);
ok("AC6.4", "reduced: a real hover produces NO dim, NO shutter, NO title travel", rmH.anyHover && +rmH.sib === 1 && !/5%/.test(rmH.clip) && rmH.inner === "none", JSON.stringify(rmH));
ok("AC5.3", "reduced: parallax still none after scrolling the item past", rmH.par === "none", rmH.par);
await page.evaluate(`document.querySelectorAll('${LI}')[3].querySelector('a').focus()`);
await new Promise((r) => setTimeout(r, 700));
const rmF = await page.evaluate(`(() => { const items=[...document.querySelectorAll('${LI}')]; const q=(l,c)=>l.querySelector('[class*="'+c+'"]');
  return { sib: getComputedStyle(q(items[2],'itemBody')).opacity, inner: getComputedStyle(q(items[3],'titleInner')).transform }; })()`);
ok("AC6.4", "reduced: keyboard focus dims nothing", +rmF.sib === 1 && rmF.inner === "none", JSON.stringify(rmF));

/* ---- console / hydration --------------------------------------------- */
step("console");
await page.emulateMediaFeatures([]);
consoleMsgs.length = 0;
await page.goto(PAGE, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2000));
ok("AC7.5", "no console errors/warnings on /about (motion allowed)", consoleMsgs.length === 0, consoleMsgs.slice(0, 4).join(" || "));
consoleMsgs.length = 0;
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(PAGE, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2000));
ok("AC1.3", "no hydration error under prefers-reduced-motion", consoleMsgs.length === 0, consoleMsgs.slice(0, 4).join(" || "));

await b.close();
await sb.close();

const w = Math.max(...R.map((r) => r.ac.length));
for (const r of R)
  console.log(`${r.pass === null ? "SKIP" : r.pass ? "PASS" : "FAIL"}  ${r.ac.padEnd(w)}  ${r.name}${r.detail ? "\n           └─ " + r.detail : ""}`);
const fails = R.filter((r) => r.pass === false);
console.log(`\n${R.filter((r) => r.pass).length}/${R.filter((r) => r.pass !== null).length} passed · ${fails.length} FAILED · ${R.filter((r) => r.pass === null).length} skipped`);
if (fails.length) console.log("\n=== FAILURES ===\n" + fails.map((f) => `  [${f.ac}] ${f.name}\n     ${f.detail}`).join("\n"));
process.exit(0);
