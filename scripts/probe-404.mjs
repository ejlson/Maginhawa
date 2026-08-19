/* Acceptance probe for the 404 (app/not-found.tsx). Reads the three things a
   screenshot argues about and cannot settle:

     · does the page fit ONE SCREEN — `scrollHeight - innerHeight <= 0` at
       every window shape, which is the page's whole brief and the one that
       breaks quietly when a font falls back or a string is translated
     · the clearance between the numeral's ink and the headline's
     · whether each door's arrow is nearer its OWN label than the next
       door's — it was not, in the first draft

   Run against the dev server; the path is any path that does not exist. */
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args:["--no-sandbox","--hide-scrollbars"] });
const p = await b.newPage();
const SHAPES = [
  [1920, 1080], [1512, 982], [1440, 900], [1440, 700], [1280, 800],
  [1024, 768], [900, 900], [390, 844], [375, 667], [320, 568],
];

const read = () => p.evaluate(() => {
  const nav = document.querySelector('nav[aria-label="Where to go instead"]');
  const li = nav?.querySelectorAll("li") ?? [];
  const num = [...document.querySelectorAll("p")].find(e=>e.textContent.trim()==="404");
  const h1 = document.querySelector("h1");
  const r = e => { const b = e.getBoundingClientRect(); return {t:+b.top.toFixed(1),b:+b.bottom.toFixed(1),h:+b.height.toFixed(1),w:+b.width.toFixed(1)}; };
  return {
    navFound: !!nav,
    navBox: nav ? r(nav) : null,
    navDisplay: nav ? getComputedStyle(nav).display : null,
    liCount: li.length,
    firstLi: li[0] ? r(li[0]) : null,
    firstA: li[0]?.querySelector("a") ? { ...r(li[0].querySelector("a")), color: getComputedStyle(li[0].querySelector("a")).color } : null,
    numeral: num ? { ...r(num), lh: getComputedStyle(num).lineHeight, fs: getComputedStyle(num).fontSize } : null,
    h1: h1 ? r(h1) : null,
    /* box clearance between the numeral and the headline */
    numToTitle: num && h1 ? +(h1.getBoundingClientRect().top - num.getBoundingClientRect().bottom).toFixed(1) : null,
    /* per door: distance from its arrow to its OWN label vs to the label of
       the door beside it. `own < next` is the assertion — an arrow closer
       to the next door's title than to its own reads as that one's marker,
       which is what the first draft shipped.

       ⚠️ ONLY A DOOR ON THE SAME ROW COUNTS. The grid is auto-fit, so below
       ~5 columns the next door in DOM order sits on the row underneath and
       to the LEFT, and comparing against it reports a false ambiguity at
       every narrow width. Same `top` is the row test. */
    arrows: [...li].map((el, i, all) => {
      const a = el.querySelector('[aria-hidden]')?.getBoundingClientRect();
      const own = el.querySelector('a > span > span')?.getBoundingClientRect();
      if (!a || !own) return null;
      const nextEl = all[i + 1];
      const sameRow =
        nextEl &&
        Math.abs(nextEl.getBoundingClientRect().top - el.getBoundingClientRect().top) < 2;
      const next = sameRow ? nextEl.querySelector('a > span > span')?.getBoundingClientRect() : null;
      return {
        own: +(a.left - own.right).toFixed(1),
        next: next ? +(next.left - a.right).toFixed(1) : null,
      };
    }),
    docW: document.documentElement.clientWidth,
    /* ⚠️ THE ASSERTION IS CLIPPING, NOT SCROLL HEIGHT. `.page` carries
       `overflow: hidden` as its backstop, and that makes `scrollHeight`
       useless here — it can never exceed the viewport, so a document that
       overflows by 200px reports 0 and the probe passes while the last row
       of doors is invisible. Measure the LAST DOOR'S bottom edge against
       the viewport instead: that is the thing that has to be on screen, and
       it is the thing `overflow: hidden` silently eats. */
    clipped: (() => {
      const last = li[li.length - 1];
      if (!last) return null;
      return +(last.getBoundingClientRect().bottom - window.innerHeight).toFixed(1);
    })(),
    scrolls: +(document.documentElement.scrollHeight - window.innerHeight).toFixed(1),
  };
});

let worst = -Infinity;
for (const [w, h] of SHAPES) {
  await p.setViewport({ width: w, height: h });
  await p.goto("http://localhost:3000/this-path-does-not-exist", { waitUntil: "networkidle2" });
  await p.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 900));
  const m = await read();
  worst = Math.max(worst, m.clipped);
  const arrows = m.arrows.filter(Boolean);
  const arrowOk = arrows.every((a) => a.next === null || a.own < a.next);
  console.log(
    `${String(w).padStart(4)}x${String(h).padEnd(4)}  clipped ${String(m.clipped).padStart(7)}` +
      `  scrolls ${String(m.scrolls).padStart(4)}` +
      `  numToTitle ${String(m.numToTitle).padStart(6)}` +
      `  doors ${m.liCount}  arrows ${arrowOk ? "ok" : "AMBIGUOUS"}`,
  );
}
console.log(
  `\nworst clipping across ${SHAPES.length} shapes: ${worst}px ` +
    `(must be <= 0 — the last door has to be on screen)`,
);
if (process.env.OUT) {
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto("http://localhost:3000/this-path-does-not-exist", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1200));
  await p.screenshot({ path: process.env.OUT + "/nf.png" });
}
await b.close();
