/* Which SplitWords masks clip their word, and by how much?

   `.mask` is `overflow: hidden` with `padding-block: 0.14em` of headroom
   (SplitWords.module.css). The saffron emphasis run swaps font-family to
   --font-emphasis and font-style: italic inside that window, so if that face
   descends deeper than the upright one, 0.14em stops being enough.

   Measured two ways, because neither alone sees the whole thing:
     · layout — the word's border box against the mask's padding box
     · INK — the mask is temporarily set to overflow: visible and the word's
       painted extent re-read, which is what the eye is actually complaining
       about.

   usage: node scripts/probe-mask-crop.mjs [port]   (run from the repo root) */
import puppeteer from "puppeteer-core";

const PORT = process.argv[2] || "3300";

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "no-preference" },
]);
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2500));

/* walk the whole page so every whileInView block has built */
const H = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < H; y += 500) {
  await page.evaluate((t) => {
    const l = window.__lenis || window.lenis;
    if (l && typeof l.scrollTo === "function") l.scrollTo(t, { immediate: true });
    else window.scrollTo(0, t);
  }, y);
  await new Promise((r) => setTimeout(r, 90));
}
await new Promise((r) => setTimeout(r, 800));

const rows = await page.evaluate(() => {
  const masks = [...document.querySelectorAll("[class*='SplitWords_mask']")];
  const out = [];
  for (const m of masks) {
    const word = m.querySelector("[class*='SplitWords_word'], [class*='cssWord']") || m.firstElementChild;
    if (!word) continue;
    const text = (m.textContent || "").trim();
    if (!text) continue;
    const cs = getComputedStyle(m);
    const wcs = getComputedStyle(word);
    /* is there an emphasis run inside this mask? */
    const em = m.querySelector("[class*='emItalic'], em, i");
    const emCs = em ? getComputedStyle(em) : null;

    const mr = m.getBoundingClientRect();
    const wr = word.getBoundingClientRect();

    /* clipped extent: how far the word's box passes the mask's box */
    const overBottom = +(wr.bottom - mr.bottom).toFixed(2);
    const overTop = +(mr.top - wr.top).toFixed(2);

    out.push({
      text: text.slice(0, 26),
      italic: !!em,
      emFamily: emCs ? emCs.fontFamily.split(",")[0] : null,
      emStyle: emCs ? emCs.fontStyle : null,
      fontSize: cs.fontSize,
      maskH: +mr.height.toFixed(1),
      wordH: +wr.height.toFixed(1),
      overBottom,
      overTop,
      scrollOver: m.scrollHeight - m.clientHeight,
    });
  }
  return out;
});

const clipped = rows.filter((r) => r.overBottom > 0.5 || r.overTop > 0.5 || r.scrollOver > 0);
console.log(`\n${rows.length} masks on /about; ${clipped.length} with the word past the window`);
console.log("\nemphasis (italic) masks:");
rows
  .filter((r) => r.italic)
  .slice(0, 14)
  .forEach((r) =>
    console.log(
      `  "${r.text}"  ${r.fontSize}  ${r.emFamily}/${r.emStyle}  ` +
        `mask ${r.maskH} word ${r.wordH}  overBottom ${r.overBottom} overTop ${r.overTop} scrollOver ${r.scrollOver}`,
    ),
  );
console.log("\nplain masks (control), first 6:");
rows
  .filter((r) => !r.italic)
  .slice(0, 6)
  .forEach((r) =>
    console.log(
      `  "${r.text}"  ${r.fontSize}  mask ${r.maskH} word ${r.wordH}  ` +
        `overBottom ${r.overBottom} overTop ${r.overTop} scrollOver ${r.scrollOver}`,
    ),
  );

/* ---- INK: reveal the windows and see how much further the paint goes ---- */
const ink = await page.evaluate(() => {
  const masks = [...document.querySelectorAll("[class*='SplitWords_mask']")];
  const sample = masks.filter((m) => m.querySelector("[class*='emItalic'], em, i")).slice(0, 8);
  const before = sample.map((m) => m.getBoundingClientRect().height);
  sample.forEach((m) => {
    m.dataset.probeOld = m.style.overflow;
    m.style.overflow = "visible";
  });
  /* force layout */
  void document.body.offsetHeight;
  const after = sample.map((m, i) => {
    const w = m.querySelector("[class*='SplitWords_word'], [class*='cssWord']") || m.firstElementChild;
    const mr = m.getBoundingClientRect();
    const wr = w.getBoundingClientRect();
    return {
      text: (m.textContent || "").trim().slice(0, 24),
      maskH: +before[i].toFixed(1),
      wordBottomPastMask: +(wr.bottom - mr.bottom).toFixed(2),
      fontSize: getComputedStyle(m).fontSize,
    };
  });
  sample.forEach((m) => (m.style.overflow = m.dataset.probeOld || ""));
  return after;
});
console.log("\nwith the window opened (overflow: visible):");
ink.forEach((r) =>
  console.log(
    `  "${r.text}"  ${r.fontSize}  word bottom past mask bottom: ${r.wordBottomPastMask}px`,
  ),
);

setTimeout(() => process.exit(0), 1200);
await b.close().catch(() => {});
process.exit(0);
