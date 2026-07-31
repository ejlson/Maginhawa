/* THE SECOND CHAPTER CHANGE — the pinned photograph and the journal that
   covers it — plus the geometry around it.

     PIN      the interlude must HOLD its screen while the Blog sheet
              crosses it: its top edge stays at 0 for the whole cover
     COVER    the sheet's top edge runs a clean viewport, bottom to top
     SEAM     no third ground between them — whatever shows below the
              journal's top edge must be the photograph, not the page
     FRAME    the maroon breath around the photograph, which must equal the
              breath around the About film
     TOP      the distance from the maroon band's top edge down to the
              About heading and the About film
     MARQUEE  the gap from the last masthead lane to the photograph
     PLATE    the journal's plate against the restaurant reel's plate

   usage: node scripts/probe-journal.mjs [port] [w] [h] */
import puppeteer from "puppeteer-core";
import { sleep } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const W = Number(process.argv[3] || 1440);
const H = Number(process.argv[4] || 900);

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#blog", { timeout: 60000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 60000 },
);
await sleep(1200);

const SEL = {
  scope: ".pinScope",
  interlude: '[class*="Interlude_section"]',
  media: '[class*="Interlude_media"]',
  blog: "#blog",
  about: "#about",
  aboutFilm: '[class*="AboutIntro_mediaFrame"]',
  aboutTitle: '[class*="AboutIntro_title"]',
  zone: 'div[class*="MaroonZone_zone"]',
  lane: '[class*="PressWall_lane"]',
  rule: '[class*="Manifesto_section"]',
};

/* The About film ENTERS from y: 48 — measuring the chapter before its
   entrance has played reports the offset, not the layout. Walk it into view
   and let it land first. */
await page.evaluate((SEL) => {
  const el = document.querySelector(SEL.about);
  window.__lenis?.scrollTo(scrollY + el.getBoundingClientRect().top, {
    immediate: true,
  });
}, SEL);
await sleep(2200);

/* ---------- static geometry (measured in page coordinates) ---------- */
const geo = await page.evaluate((SEL) => {
  const box = (s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top + scrollY),
      bottom: Math.round(r.bottom + scrollY),
      left: Math.round(r.left),
      right: Math.round(r.right),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  };
  const lanes = [...document.querySelectorAll(SEL.lane)];
  const lastLane = lanes[lanes.length - 1]?.getBoundingClientRect();
  const rule = document.querySelector(SEL.rule);
  const rs = rule ? getComputedStyle(rule) : null;
  return {
    zone: box(SEL.zone),
    about: box(SEL.about),
    aboutFilm: box(SEL.aboutFilm),
    aboutTitle: box(SEL.aboutTitle),
    interlude: box(SEL.interlude),
    media: box(SEL.media),
    blog: box(SEL.blog),
    laneBottom: lastLane ? Math.round(lastLane.bottom + scrollY) : null,
    rule: rs
      ? {
          w: rule.getBoundingClientRect().width,
          border: rs.borderBottomWidth,
          colour: rs.borderBottomColor,
          style: rs.borderBottomStyle,
        }
      : null,
    plate: (() => {
      const p = document.querySelector('[class*="Blog_plate"]');
      const r = p?.getBoundingClientRect();
      return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null;
    })(),
    vw: innerWidth,
  };
}, SEL);

console.log(`\nviewport ${W}x${H}`);

console.log(
  `\nTOP      maroon band starts ${geo.zone.top} · About film top ${geo.aboutFilm.top} (+${geo.aboutFilm.top - geo.zone.top}px) · heading top ${geo.aboutTitle.top} (+${geo.aboutTitle.top - geo.zone.top}px)`,
);
console.log(
  `         film's left breath ${geo.aboutFilm.left}px, bottom breath ${geo.about.bottom - geo.aboutFilm.bottom}px  (an even frame = the top matches these)`,
);

console.log(
  `\nMARQUEE  last masthead lane ends ${geo.laneBottom} · photograph starts ${geo.media.top}  → ${geo.media.top - geo.laneBottom}px of maroon between them`,
);

const frame = {
  left: geo.media.left - geo.interlude.left,
  right: geo.interlude.right - geo.media.right,
  top: geo.media.top - geo.interlude.top,
  bottom: geo.interlude.bottom - geo.media.bottom,
};
console.log(
  `\nFRAME    maroon around the photograph: ${frame.top}px top, ${frame.right}px right, ${frame.bottom}px bottom, ${frame.left}px left`,
);
console.log(
  `         the About film's breath is ${geo.aboutFilm.left}px — ${frame.left === geo.aboutFilm.left ? "the same frame" : "DIFFERENT"}`,
);

console.log(
  `\nRULE     under the statement: ${geo.rule.style} ${geo.rule.border} ${geo.rule.colour}, running ${Math.round(geo.rule.w)}px of a ${geo.vw}px window`,
);

/* ---------- the plates ---------- */
const plates = await page.evaluate(() => {
  const blog = document.querySelector('[class*="Blog_plate"]');
  const b = blog?.getBoundingClientRect();
  return { blog: b ? { w: b.width, h: b.height } : null };
});

/* ---------- the cover ---------- */
console.log(`\nCOVER    walking the journal up over the photograph`);
await page.evaluate((SEL) => {
  const el = document.querySelector(SEL.interlude);
  window.__lenis?.scrollTo(scrollY + el.getBoundingClientRect().top, {
    immediate: true,
  });
}, SEL);
await sleep(900);

console.log("  scrollY   photo top   photo bottom   journal top   showing below the journal");
const track = [];
for (let i = 0; i < 16; i++) {
  const s = await page.evaluate((SEL) => {
    const p = document.querySelector(SEL.interlude).getBoundingClientRect();
    const j = document.querySelector(SEL.blog).getBoundingClientRect();
    // what is actually painted just above the journal's top edge?
    const probeY = Math.max(2, Math.min(innerHeight - 2, j.top - 6));
    const under = document.elementFromPoint(Math.round(innerWidth / 2), probeY);
    return {
      y: Math.round(scrollY),
      pTop: Math.round(p.top),
      pBottom: Math.round(p.bottom),
      jTop: Math.round(j.top),
      under: under
        ? `${under.tagName.toLowerCase()}.${(under.className.baseVal ?? under.className ?? "").toString().split(" ")[0].slice(0, 22)}`
        : "—",
    };
  }, SEL);
  track.push(s);
  console.log(
    `  ${String(s.y).padStart(7)}   ${String(s.pTop).padStart(9)}   ${String(s.pBottom).padStart(12)}   ${String(s.jTop).padStart(11)}   ${s.under}`,
  );
  await page.evaluate(() =>
    window.__lenis?.scrollTo(scrollY + 90, { immediate: true }),
  );
  await sleep(150);
}

// only the frames where the journal's edge is actually crossing the screen
const crossing = track.filter((s) => s.jTop > 0 && s.jTop < H);
const pinTops = crossing.map((s) => s.pTop);
console.log(
  `\nPIN      while the journal crossed the screen the photograph's top edge sat at ${Math.min(...pinTops)}..${Math.max(...pinTops)}  (0..0 = pinned)`,
);
const jTops = track.map((s) => s.jTop);
console.log(
  `COVER    the journal's top edge ran ${Math.max(...jTops)} -> ${Math.min(...jTops)}`,
);
const grounds = [...new Set(crossing.map((s) => s.under))];
console.log(`SEAM     what showed above the journal's edge: ${grounds.join(", ")}`);

await b.close();

/* ---------- and the reel's plate, for comparison ---------- */
console.log(
  `\nPLATE    journal card ${Math.round(plates.blog.w)}x${Math.round(plates.blog.h)}  (the reel's is measured by probe-plates.mjs)`,
);
