/* The scrim's top corners went from 0.826 composited alpha to 0.148, which
   changes what the NAV sits on: #book is data-nav-theme="blend", i.e.
   mix-blend-mode: difference (Nav.module.css:17-18). A difference blend is
   self-inverting and cannot fail against black or white — its one weak band is
   a mid-grey backdrop, where cream (250,247,241) differences down to roughly
   (123,120,114) and the letters approach their own ground. Lightening the top
   of the film moves the nav's backdrop toward exactly that band, so it has to
   be measured rather than assumed.

   This samples the composited pixels inside each nav item's inked rect while
   #book is under the nav, and reports the worst contrast between the blended
   glyph and the blended ground beside it.

   WHAT IT FOUND, so nobody re-derives it. Over the sunlit shopfront the bar
   used to measure 8.3:1 and now measures 4.0-6.7:1 depending on which frame is
   showing — occasionally a hair under the 4.5 floor. That is a real softening,
   and it CANNOT be fixed by putting some of the dark back:

     scrim alpha over a peach wall (225,190,180) → nav ink↔ground
       0.148  (shipped)   ~4.1:1     ground is bright, cream differences to dark
       0.45   (the most AC-1.3 allows)  ~1.5:1  ground lands mid, both go grey
       0.75   (the old vignette)   ~6.9:1      ground is near-black

   The curve is a U, not a slope: a difference blend fails in the MIDDLE, and
   every value the corner budget permits sits nearer the bottom of the U than
   0.148 does. So the shipped scrim is the better of the two reachable ends,
   and closing the gap properly means changing the Nav's blend strategy rather
   than the scrim. SECTION=... below shows this is not a #book problem: the
   same bar already measures 1.1-3.9:1 over the hero.

   usage: node scripts/probe-book-nav.mjs [port]
          OLD=1 ...   measure against the vignette this replaced
          SECTION=#hero ...   measure over another blend section
          SHOT=<dir> ...      save the viewport for a human to look at */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "50853";
const s = (ms) => new Promise((r) => setTimeout(r, ms));
const lin = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});

let fails = 0;
for (const [W, H] of [[1440, 900], [390, 844]]) {
  const p = await b.newPage();
  await p.setViewport({ width: W, height: H });
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 });
  await p.evaluate(() => document.fonts.ready);
  // OLD=1 pins the scrim back to the vignette this section shipped with
  // (0.664 composited at the centre, 0.826 in the corners). Without a baseline
  // a marginal number here is unreadable: it does not say whether lightening
  // the scrim cost the nav anything or whether the difference blend was always
  // this close on this frame.
  if (process.env.OLD) {
    await p.addStyleTag({
      content: `[class*="Reservations_locScrim"]{background:
        radial-gradient(120% 100% at 50% 50%, rgba(18,0,0,0.52), rgba(18,0,0,0.72)),
        linear-gradient(rgba(18,0,0,0.3), rgba(18,0,0,0.38)) !important}`,
    });
  }
  await s(2500);

  // SECTION=<selector> measures a different blend section for context — the
  // difference blend is a site-wide device, and a number here is only
  // interpretable next to what the nav already scores over the other
  // photography it crosses (Hero, About, RestaurantsShowcase hero).
  const SECTION = process.env.SECTION || "#book";
  // park inside the section, then nudge UP — the bar hides on a downward scroll
  await p.evaluate((sel) => {
    const el = document.querySelector(sel);
    const y = el.getBoundingClientRect().top + window.scrollY + el.offsetHeight * 0.35;
    window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
  }, SECTION);
  await s(900);
  await p.evaluate(() => {
    const y = window.scrollY - 260;
    window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
  });
  await s(1200);

  // If the bar is mid-fade (it hides on downward scroll and eases back on the
  // way up) every sample is a blend of the blend, and a low ratio would say
  // nothing about the design. Report the opacity so a bad number can be told
  // apart from an invisible one.
  const theme = await p.evaluate(() => {
    const bar = document.querySelector("header, nav");
    if (!bar) return "(no bar)";
    const cs = getComputedStyle(bar);
    return `${bar.className}  opacity=${cs.opacity} transform=${cs.transform}`;
  });
  const rects = await p.evaluate(() => {
    const bar = document.querySelector("header") || document.querySelector("nav");
    if (!bar) return [];
    return [...bar.querySelectorAll("a, span, button")]
      .map((el) => {
        const rg = document.createRange();
        rg.selectNodeContents(el);
        const q = rg.getBoundingClientRect();
        if (q.width < 6 || q.height < 6 || q.bottom > 200) return null;
        // pad sideways so the sample includes the ground the glyphs sit on
        return { x: Math.round(q.left) - 6, y: Math.round(q.top), w: Math.round(q.width) + 12, h: Math.round(q.height), label: el.textContent.trim().slice(0, 18) };
      })
      .filter(Boolean);
  });

  const b64 = await p.screenshot({ type: "png", encoding: "base64" });
  const out = await p.evaluate(async (data, boxes) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const L = (v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
    return boxes.map((q) => {
      const px = g.getImageData(q.x, q.y, q.w, q.h).data;
      let hi = 0, lo = 1;
      for (let k = 0; k < px.length; k += 4) {
        const l = 0.2126 * L(px[k]) + 0.7152 * L(px[k + 1]) + 0.0722 * L(px[k + 2]);
        if (l > hi) hi = l;
        if (l < lo) lo = l;
      }
      return { label: q.label, ratio: (hi + 0.05) / (lo + 0.05) };
    });
  }, b64, rects);

  console.log(`\n===== ${W}x${H} =====  bar: ${theme}`);
  // FULL viewport, never a `clip` — puppeteer's clip is document-relative and
  // re-renders from the document origin, which under Lenis hands back the top
  // of the page instead of the bar you are looking at.
  if (process.env.SHOT) await p.screenshot({ path: `${process.env.SHOT}/nav_${W}.png` });
  if (!out.length) { console.log("  no nav items in view — nothing to measure"); }
  for (const o of out) {
    const ok = o.ratio >= 4.5;
    if (!ok) fails++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  "${o.label}"  ink↔ground ${o.ratio.toFixed(2)}:1`);
  }
  await p.close();
}
await b.close();
console.log(`\n${fails === 0 ? "ALL PASS" : `${fails} FAILURE(S)`}`);
process.exit(fails === 0 ? 0 : 1);
