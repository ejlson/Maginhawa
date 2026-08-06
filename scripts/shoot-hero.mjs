/* Shoot the reworked hero — wordmark out, navbar named, lockup centred —
   at desktop, tablet and phone, plus a zoomed crop of the navbar so the
   Contralto wordmark can be read at its real size.

   Usage: node scripts/shoot-hero.mjs [port]  */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const OUT =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/1fc8ec40-c8ba-4c1f-8e2d-89c2ff0d34ec/scratchpad/hero";
const s = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });

const VIEWS = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "tablet", w: 834, h: 1112 },
  { name: "phone", w: 390, h: 844 },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});

for (const v of VIEWS) {
  const page = await browser.newPage();
  await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 2 });
  /* NOT networkidle0 — the hero runs looping video, so the network never
     goes idle and the navigation times out at 30s. */
  await page.goto(`http://localhost:${PORT}/`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 15000,
    })
    .catch(() => console.log(`! ${v.name}: loader never cleared is-loading`));
  await page.evaluate(() => document.fonts.ready);
  /* the lede and the actions come in on a 1.45s delay off `started` */
  await s(3000);

  await page.screenshot({ path: `${OUT}/${v.name}.png` });

  /* what the reader actually reads, at 4x — a full-viewport shot of a hero
     this size cannot show whether the wordmark is really Contralto */
  if (v.name === "desktop") {
    await page.screenshot({
      path: `${OUT}/navbar-zoom.png`,
      clip: { x: 0, y: 0, width: 560, height: 74 },
    });
  }

  const audit = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const fam = (el) => (el ? getComputedStyle(el).fontFamily : null);
    const face = (f) =>
      !f
        ? null
        : /Fraunces/i.test(f)
          ? "Fraunces"
          : /contralto-big/.test(f)
            ? "Contralto (big)"
            : /contralto/.test(f)
              ? "Contralto (small)"
              : "Helvetica";
    const h1 = q("h1");
    const nav = q("nav a[aria-label*='home'] span");
    const box = h1?.getBoundingClientRect();
    return {
      h1_text: h1?.textContent?.trim().slice(0, 60),
      h1_face: face(fam(h1)),
      h1_size: h1 ? Math.round(parseFloat(getComputedStyle(h1).fontSize)) : null,
      h1_lines:
        h1 && box
          ? Math.round(box.height / parseFloat(getComputedStyle(h1).lineHeight))
          : null,
      nav_text: nav?.textContent?.trim(),
      nav_face: face(fam(nav)),
      /* is the lockup actually centred? compare its box centre to the
         viewport centre — the whole point of the change */
      lockup_centre_offset: (() => {
        const l = q("section#top > div:last-child");
        if (!l) return null;
        const r = l.getBoundingClientRect();
        return Math.round(r.top + r.height / 2 - window.innerHeight / 2);
      })(),
      wordmark_svg_still_in_hero: !!q("section#top svg text"),
      h1_count: document.querySelectorAll("h1").length,
    };
  });
  console.log(v.name, JSON.stringify(audit));
  await page.close();
}

console.log(`\nwrote ${OUT}`);
await browser.close();
