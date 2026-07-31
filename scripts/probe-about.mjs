/* THE ABOUT CHAPTER'S RIGHT-HAND COLUMN — measure, spine, portrait, void.

     MEASURE  .story's computed width, the longest rendered line in REAL
              characters, and the line count per paragraph. Line boxes come
              from Range.getClientRects(); the per-line character count comes
              from walking the text one character at a time and grouping the
              single-character rects by their line box top.
     SPINE    the right edges of .title, both paragraphs, the Learn More
              link, the founder's name row and the portrait — they must all
              land on one vertical.
     PORTRAIT computed width x height, and the 4:5 crop (h/w = 1.25). Also
              guards the documented 0x0 collapse.
     VOID     the vertical distance from the link's bottom edge down to the
              founder row's top — the empty middle of the column.
     FIT      grid.scrollHeight vs grid.clientHeight: the one-screen gate.
     RHYTHM   the paragraph gap (must resolve against --t-small, not 16px)
     MOTION   the film's whileInView entrance, and its full-height seat.

   usage: node scripts/probe-about.mjs [w] [h] [port] */
import puppeteer from "puppeteer-core";
import { sleep } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = Number(process.argv[2] || 1440);
const H = Number(process.argv[3] || 900);
const PORT = process.argv[4] || "3100";

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#about", { timeout: 60000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 60000 },
);
await page.evaluate(() => document.fonts.ready);
await sleep(1200);

/* The film ENTERS from y: 48 with whileInView — measuring before the
   entrance has landed reports the offset, not the layout. Walk the chapter
   into view and let it settle (probe-journal.mjs does the same). */
await page.evaluate(() => {
  const el = document.querySelector("#about");
  window.__lenis?.scrollTo(scrollY + el.getBoundingClientRect().top, {
    immediate: true,
  });
});
await sleep(2200);

const out = await page.evaluate(() => {
  const q = (s, root = document) => root.querySelector(s);
  const qa = (s, root = document) => [...root.querySelectorAll(s)];
  const S = {
    section: "#about",
    grid: '[class*="AboutIntro_grid"]',
    headCell: '[class*="AboutIntro_headCell"]',
    headBlock: '[class*="AboutIntro_headBlock"]',
    title: '[class*="AboutIntro_title"]',
    story: '[class*="AboutIntro_story"]',
    body: '[class*="AboutIntro_body"]',
    cta: 'a[class*="AboutIntro_cta"]',
    founderRow: '[class*="AboutIntro_founderRow"]',
    portrait: '[class*="AboutIntro_portraitFrame"]',
    mediaFrame: '[class*="AboutIntro_mediaFrame"]',
  };

  const r4 = (n) => (n == null ? null : Math.round(n * 100) / 100);
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: r4(r.top),
      bottom: r4(r.bottom),
      left: r4(r.left),
      right: r4(r.right),
      w: r4(r.width),
      h: r4(r.height),
    };
  };

  /* ---------- line boxes and per-line character counts ---------- */
  // One Range per character; group the resulting rects by their line box
  // top. Zero-area rects are collapsed whitespace and carry no line.
  function lines(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const groups = new Map();
    let order = 0;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const txt = n.nodeValue;
      for (let i = 0; i < txt.length; i++) {
        const rng = document.createRange();
        rng.setStart(n, i);
        rng.setEnd(n, i + 1);
        const rects = [...rng.getClientRects()].filter((r) => r.height > 0);
        if (!rects.length) continue; // collapsed whitespace
        const rect = rects[0];
        if (rect.width === 0 && /\s/.test(txt[i])) continue;
        const key = Math.round(rect.top);
        if (!groups.has(key))
          groups.set(key, { top: rect.top, chars: [], order: order++ });
        groups.get(key).chars.push(txt[i]);
      }
    }
    const ls = [...groups.values()]
      .sort((a, b) => a.top - b.top)
      .map((g) => g.chars.join("").trim());
    // and the line-box count straight from a whole-element range
    const whole = document.createRange();
    whole.selectNodeContents(el);
    const boxes = [...whole.getClientRects()].filter((r) => r.height > 0);
    const distinctTops = new Set(boxes.map((r) => Math.round(r.top))).size;
    return {
      count: ls.length,
      rectCount: boxes.length,
      distinctTops,
      lengths: ls.map((l) => l.length),
      longest: ls.length ? Math.max(...ls.map((l) => l.length)) : 0,
      texts: ls,
    };
  }

  const section = q(S.section);
  const grid = q(S.grid);
  const headBlock = q(S.headBlock);
  const story = q(S.story);
  const title = q(S.title);
  const bodies = qa(S.body, headBlock || document);
  const cta = q(S.cta);
  const founderRow = q(S.founderRow);
  const portrait = q(S.portrait);
  const mediaFrame = q(S.mediaFrame);

  const csStory = story ? getComputedStyle(story) : null;
  const csSection = getComputedStyle(section);
  const csPortrait = portrait ? getComputedStyle(portrait) : null;

  const bodyLines = bodies.map(lines);

  /* AC-7: the paragraph gap. The computed `gap` on .story is the
     declaration; the geometric gap is what actually rendered. */
  let geoGap = null;
  if (bodies.length === 2) {
    geoGap = r4(
      bodies[1].getBoundingClientRect().top -
        bodies[0].getBoundingClientRect().bottom,
    );
  }

  /* AC-3: the two-track seat. col = (vw - leftPad - rightPad - 11*gutter)/12
     with this section's ASYMMETRIC padding. */
  const padL = parseFloat(csSection.paddingLeft);
  const padR = parseFloat(csSection.paddingRight);
  const col = (innerWidth - padL - padR - 11 * 12) / 12;
  const twoTrack = 2 * col + 12;

  /* AC-11 */
  const csMedia = mediaFrame ? getComputedStyle(mediaFrame) : null;
  let mediaTy = null;
  if (csMedia && csMedia.transform && csMedia.transform !== "none") {
    const m = csMedia.transform.match(/matrix\(([^)]+)\)/);
    if (m) mediaTy = r4(parseFloat(m[1].split(",")[5]));
    const m3 = csMedia.transform.match(/matrix3d\(([^)]+)\)/);
    if (m3) mediaTy = r4(parseFloat(m3[1].split(",")[13]));
  } else if (csMedia) {
    mediaTy = 0;
  }

  return {
    vw: innerWidth,
    vh: innerHeight,
    section: { padL: r4(padL), padR: r4(padR), box: box(section) },
    grid: {
      box: box(grid),
      scrollHeight: grid.scrollHeight,
      clientHeight: grid.clientHeight,
      overflow: grid.scrollHeight - grid.clientHeight,
    },
    story: {
      box: box(story),
      contentWidth: story
        ? r4(
            story.getBoundingClientRect().width -
              parseFloat(csStory.paddingLeft) -
              parseFloat(csStory.paddingRight),
          )
        : null,
      maxWidth: csStory ? csStory.maxWidth : null,
      fontSize: csStory ? csStory.fontSize : null,
      gap: csStory ? csStory.rowGap : null,
      alignItems: csStory ? csStory.alignItems : null,
    },
    headBlock: { box: box(headBlock) },
    bodies: bodies.map((el, i) => ({
      box: box(el),
      fontSize: getComputedStyle(el).fontSize,
      textWrap: getComputedStyle(el).textWrap || getComputedStyle(el).textWrapStyle,
      lines: bodyLines[i],
    })),
    // the character counts are only meaningful if the real face rendered —
    // a fallback metric would silently change every "longest line" number
    font: {
      family: bodies[0] ? getComputedStyle(bodies[0]).fontFamily : null,
      loaded: [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`),
    },
    brCount: headBlock ? qa("br", headBlock).length : null,
    bodyCount: bodies.length,
    geoGap,
    title: { box: box(title), lines: title ? lines(title) : null },
    cta: { box: box(cta) },
    founderRow: { box: box(founderRow) },
    portrait: {
      box: box(portrait),
      cssWidth: csPortrait ? csPortrait.width : null,
      cssHeight: csPortrait ? csPortrait.height : null,
      ratio: portrait
        ? r4(
            portrait.getBoundingClientRect().height /
              portrait.getBoundingClientRect().width,
          )
        : null,
    },
    seat: { col: r4(col), twoTrack: r4(twoTrack) },
    void:
      cta && founderRow
        ? r4(
            founderRow.getBoundingClientRect().top -
              cta.getBoundingClientRect().bottom,
          )
        : null,
    media: {
      box: box(mediaFrame),
      opacity: csMedia ? csMedia.opacity : null,
      ty: mediaTy,
      clipPath: csMedia ? csMedia.clipPath : null,
    },
    docScrollWidth: document.documentElement.scrollWidth,
  };
});

await b.close();

const p = (n) => (n == null ? "—" : String(n));
console.log(`\n=== ${W}x${H} ===`);
console.log(
  `MEASURE  .story w ${p(out.story.box?.w)} (content ${p(out.story.contentWidth)}) · max-width ${p(out.story.maxWidth)} · font-size ${p(out.story.fontSize)} · align-items ${p(out.story.alignItems)}`,
);
out.bodies.forEach((bd, i) => {
  console.log(
    `         p${i + 1} w ${p(bd.box.w)} · ${bd.lines.count} lines (rects ${bd.lines.rectCount}) · longest ${bd.lines.longest} chars · per-line ${bd.lines.lengths.join(",")}`,
  );
});
const longest = Math.max(...out.bodies.map((bd) => bd.lines.longest));
const totalLines = out.bodies.reduce((a, bd) => a + bd.lines.count, 0);
console.log(
  `         LONGEST ${longest} chars · TOTAL ${totalLines} lines split ${out.bodies.map((bd) => bd.lines.count).join("+")}`,
);

const spine = {
  title: out.title.box?.right,
  p1: out.bodies[0]?.box.right,
  p2: out.bodies[1]?.box.right,
  cta: out.cta.box?.right,
  founderRow: out.founderRow.box?.right,
  portrait: out.portrait.box?.right,
};
const vals = Object.values(spine).filter((v) => v != null);
const spread = Math.round((Math.max(...vals) - Math.min(...vals)) * 100) / 100;
console.log(
  `\nSPINE    ${Object.entries(spine)
    .map(([k, v]) => `${k} ${p(v)}`)
    .join(" · ")}   spread ${spread}px ${spread <= 1 ? "OK" : "*** FAIL ***"}`,
);

console.log(
  `\nPORTRAIT ${p(out.portrait.box?.w)} x ${p(out.portrait.box?.h)} · ratio ${p(out.portrait.ratio)} · css ${p(out.portrait.cssWidth)}/${p(out.portrait.cssHeight)}`,
);
console.log(
  `         col ${p(out.seat.col)} · 2-track seat ${p(out.seat.twoTrack)} · |w - seat| ${p(out.portrait.box ? Math.round(Math.abs(out.portrait.box.w - out.seat.twoTrack) * 100) / 100 : null)}`,
);

console.log(`\nVOID     cta bottom -> founderRow top = ${p(out.void)}px`);

console.log(
  `\nFIT      grid scrollHeight ${out.grid.scrollHeight} vs clientHeight ${out.grid.clientHeight} → overflow ${out.grid.overflow}px ${out.grid.overflow <= 1 ? "OK" : "*** FAIL ***"}`,
);

console.log(
  `\nRHYTHM   ${out.bodyCount} <p class=body>, ${out.brCount} <br> · computed gap ${p(out.story.gap)} · geometric gap ${p(out.geoGap)}`,
);

console.log(
  `\nTITLE    ${p(out.title.lines?.count)} line(s) · w ${p(out.title.box?.w)} · "${out.title.lines?.texts.join(" | ")}"`,
);

console.log(
  `\nMOTION   mediaFrame opacity ${p(out.media.opacity)} · ty ${p(out.media.ty)} · clip ${p(out.media.clipPath)}`,
);
console.log(
  `         mediaFrame h ${p(out.media.box?.h)} vs grid h ${p(out.grid.box?.h)} → Δ ${p(out.media.box && out.grid.box ? Math.round(Math.abs(out.media.box.h - out.grid.box.h) * 100) / 100 : null)}`,
);

console.log(
  `\nOVERFLOW doc scrollWidth ${out.docScrollWidth} vs innerWidth ${out.vw} → ${out.docScrollWidth - out.vw}px ${out.docScrollWidth <= out.vw + 1 ? "OK" : "*** FAIL ***"}`,
);
console.log(
  `         headBlock w ${p(out.headBlock.box?.w)} · body w ${p(out.bodies[0]?.box.w)}`,
);

console.log(
  `\nFONT     body family ${p(out.font.family)} · faces ${out.font.loaded.join(", ") || "none"}`,
);

console.log(`\nJSON:${JSON.stringify(out)}`);
