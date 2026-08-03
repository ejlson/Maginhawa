/* DOES IT FIT, AND CAN IT BE OUTLINED.

   Two questions a screenshot answers only by luck:

   1. THE SEAT CARD'S VERTICAL FIT. The deck engages at
      `(min-width: 1200px) and (min-height: 640px)`, and the card's height is
      chosen by a WIDTH band (RAIL_BANDS), not by the viewport's height. So a
      short-but-wide window — 1440x700 with browser chrome, 1280x720, a
      half-height 1920 — gets a full-size card in a frame that cannot hold it.
      This walks every chapter at several window heights and reports how much
      of the seated card is outside the viewport.

   2. THE DOCUMENT OUTLINE. The page's two largest sections ("Our Story", the
      deck; "Awards & Recognition", the table) are titled with styled <span>
      eyebrows. This dumps the real heading tree so the outline can be read
      as a screen reader or an outline view would see it.

   usage: node scripts/probe-about-fit.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
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

/* ---- 1. outline, once ---- */
{
  const page = await b.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/about`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await sleep(3000);
  const outline = await page.evaluate(() =>
    [...document.querySelectorAll("main h1,main h2,main h3,main h4,main h5,main h6")].map(
      (h) => {
        const cs = getComputedStyle(h);
        const hidden =
          cs.clip === "rect(0px, 0px, 0px, 0px)" || cs.position === "absolute" && h.offsetWidth <= 1;
        return `${h.tagName}${hidden ? " (visually hidden)" : ""}  "${h.textContent.trim().slice(0, 48)}"`;
      },
    ),
  );
  console.log("--- heading outline inside <main> ---");
  outline.forEach((l) => console.log("  " + l));
  console.log(`  total: ${outline.length}`);
  await page.close();
}

/* ---- 2. seat-card fit across window heights ---- */
const HEIGHTS = [1080, 900, 800, 720, 660];
console.log("\n--- seat card vertical fit (deck branch, width 1440) ---");
for (const H of HEIGHTS) {
  const page = await b.newPage();
  await page.setViewport({ width: 1440, height: H });
  await page.goto(`http://localhost:${PORT}/about`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await sleep(3200);

  const hasDeck = await page.$('[class*="railPinWrap"]');
  if (!hasDeck) {
    console.log(`  1440x${H}: list branch (no deck)`);
    await page.close();
    continue;
  }

  const pin = await page.evaluate(() => {
    const e = document.querySelector('[class*="railPinWrap"]');
    const r = e.getBoundingClientRect();
    return { top: Math.round(r.top + scrollY), h: Math.round(r.height) };
  });

  const worst = [];
  /* 9 chapters, sampled at their dwell centre */
  for (let i = 0; i < 9; i++) {
    const f = 0.04 + (0.92 / 8) * (i + (i < 8 ? 0.275 : 0));
    const y = pin.top + f * (pin.h - H);
    await page.evaluate(
      (v) => window.__lenis?.scrollTo(v, { immediate: true }) ?? scrollTo(0, v),
      y,
    );
    await sleep(700);
    const m = await page.evaluate((vh) => {
      /* the seated card is the one whose --i resolves nearest upright; take
         the largest visible card rect instead — same thing, no internals */
      let best = null;
      for (const c of document.querySelectorAll('[class*="railCard"]')) {
        const r = c.getBoundingClientRect();
        if (r.width < 40 || Number(getComputedStyle(c).opacity) < 0.5) continue;
        if (!best || r.width * r.height > best.w * best.h)
          best = { top: r.top, bot: r.bottom, w: r.width, h: r.height };
      }
      if (!best) return null;
      const copy = document.querySelector('[class*="railCopy"]');
      const cr = copy ? copy.getBoundingClientRect() : null;
      return {
        cardTop: Math.round(best.top),
        cardBot: Math.round(best.bot),
        over: Math.round(Math.max(0, -best.top) + Math.max(0, best.bot - vh)),
        copyBot: cr ? Math.round(cr.bottom) : null,
        copyOver: cr ? Math.round(Math.max(0, cr.bottom - vh)) : null,
      };
    }, H);
    if (m) worst.push({ i: i + 1, ...m });
  }
  const clipped = worst.filter((w) => w.over > 4);
  const copyClipped = worst.filter((w) => w.copyOver > 4);
  console.log(
    `  1440x${H}: cards clipped ${clipped.length}/9` +
      (clipped.length
        ? ` (worst ch${clipped.sort((a, z) => z.over - a.over)[0].i} by ${clipped[0].over}px)`
        : "") +
      `   copy clipped ${copyClipped.length}/9` +
      (copyClipped.length
        ? ` (worst ch${copyClipped.sort((a, z) => z.copyOver - a.copyOver)[0].i} by ${copyClipped[0].copyOver}px)`
        : ""),
  );
  await page.close();
}

await b.close();
