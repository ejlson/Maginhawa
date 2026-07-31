/* THE BREATH AROUND THE JOURNAL.

   The reader's complaint is that the space BELOW the Blog sheet (before the
   film that closes the page) is bigger than the space ABOVE it. "Above" and
   "below" are not symmetrical constructs here — the sheet is the top of a
   sticky cover (see reference: chapter pin sequencing), so this measures
   every candidate edge and lets the numbers say which pair the eye is
   actually comparing.

   usage: node scripts/probe-blog-gap.mjs [port] [w] [h] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

for (const [W, H] of [
  [1920, 1080],
  [1440, 900],
  [1280, 800],
  [768, 1024],
]) {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => !document.body.classList.contains("is-loading"),
    { timeout: 60000 },
  );
  await sleep(1800);

  const g = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        top: Math.round(r.top + scrollY),
        bottom: Math.round(r.bottom + scrollY),
        h: Math.round(r.height),
        padTop: cs.paddingTop,
        padBottom: cs.paddingBottom,
        marTop: cs.marginTop,
        marBottom: cs.marginBottom,
        bg: cs.backgroundColor,
      };
    };
    return {
      pinScope: box(".pinScope"),
      interlude: box('[class*="Interlude_section"]'),
      interMedia: box('[class*="Interlude_media"]'),
      blog: box("#blog"),
      blogHead: box('[class*="Blog_head"]'),
      blogStrip: box('[class*="Blog_strip"]'),
      blogCard: box('[class*="Blog_card"]'),
      blogCounter: box('[class*="Blog_counter"]'),
      book: box("#book"),
      docH: document.documentElement.scrollHeight,
    };
  });

  const f = (n) => String(n).padStart(6);
  console.log(`\n===== ${W}x${H} =====`);
  for (const [k, v] of Object.entries(g)) {
    if (!v || typeof v !== "object") continue;
    console.log(
      `  ${k.padEnd(11)} top ${f(v.top)}  bottom ${f(v.bottom)}  h ${f(v.h)}   pad ${v.padTop} / ${v.padBottom}   margin ${v.marTop} / ${v.marBottom}`,
    );
  }

  const { blog, blogHead, blogStrip, blogCounter, book, interlude } = g;
  const lastInner = [blogCounter, blogStrip].filter(Boolean).sort((a, c) => c.bottom - a.bottom)[0];
  const above = blogHead.top - blog.top;
  const trailing = blog.bottom - lastInner.bottom;
  const seam = book.top - blog.bottom;
  console.log(`  ---`);
  console.log(`  ABOVE   sheet top ${blog.top} → heading top ${blogHead.top}          = ${above}px`);
  console.log(`  TRAIL   last content bottom ${lastInner.bottom} → sheet bottom ${blog.bottom} = ${trailing}px  (forced: the sheet must be >= 100svh for the pin)`);
  console.log(`  SEAM    sheet bottom ${blog.bottom} → #book top ${book.top}   = ${seam}px  (--home-gap)`);
  console.log(`  =>  reader sees ${above}px above the journal, ${trailing + seam}px below it`);
  console.log(
    `  interlude bottom ${interlude.bottom} · blog top ${blog.top} → ${blog.top - interlude.bottom}px between them`,
  );

  await page.close();
}

await b.close();
