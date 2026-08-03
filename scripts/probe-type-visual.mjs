/* VISUAL CONFIRMATION for the two structural edits — the retired rule under
   the manifesto, and the retired eyebrow above the /blog title. Reports the
   computed borders and head geometry alongside the screenshots so the check
   is a value, not just a picture.
   Scrolls like a reader; never fullPage (fullPage resizes the viewport to
   the document, IntersectionObserver never fires, and every reveal on the
   site stays frozen at its initial state).
   usage: node scripts/probe-type-visual.mjs [port]                        */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3220";
const OUT = "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/2023fdca-cd86-4bca-922b-c2f81853e348/scratchpad/shots";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

const walkTo = async (page, y, h) => {
  for (let v = 0; v <= y; v += Math.round(h * 0.5)) {
    await page.evaluate((t) => {
      if (window.__lenis) window.__lenis.scrollTo(t, { duration: 0.25 });
      else window.scrollTo(0, t);
    }, v);
    await sleep(200);
  }
  await page.evaluate((t) => {
    if (window.__lenis) window.__lenis.scrollTo(t, { duration: 0.3 });
    else window.scrollTo(0, t);
  }, y);
  await sleep(1100);
};

for (const [vp, W, H] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
  /* --- the manifesto → Our Restaurants boundary, where the rule used to be */
  {
    const page = await b.newPage();
    await page.setViewport({ width: W, height: H });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await sleep(1600);
    const y = await page.evaluate(() => {
      const m = [...document.querySelectorAll("section")].find((s) =>
        /vibrantfilipino/i.test((s.textContent || "").replace(/\s+/g, "").toLowerCase()),
      );
      if (!m) return null;
      const r = m.getBoundingClientRect();
      return Math.max(0, Math.round(r.bottom + window.scrollY - window.innerHeight * 0.72));
    });
    if (y !== null) {
      await walkTo(page, y, H);
      const info = await page.evaluate(() => {
        const m = [...document.querySelectorAll("section")].find((s) =>
          /vibrantfilipino/i.test((s.textContent || "").replace(/\s+/g, "").toLowerCase()),
        );
        const cs = getComputedStyle(m);
        // is there ANY 1px horizontal line drawn at this boundary?
        const rules = [...document.querySelectorAll("body *")].filter((e) => {
          const s = getComputedStyle(e);
          const r = e.getBoundingClientRect();
          return r.height <= 2 && r.width > window.innerWidth * 0.5 &&
            (parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderBottomWidth) > 0 ||
             (s.backgroundColor !== "rgba(0, 0, 0, 0)" && r.height > 0));
        }).length;
        return {
          borderBottom: `${cs.borderBottomWidth} ${cs.borderBottomStyle}`,
          borderTop: `${cs.borderTopWidth} ${cs.borderTopStyle}`,
          fullWidthHairlinesOnScreen: rules,
        };
      });
      console.log(`${vp}  manifesto boundary:`, JSON.stringify(info));
      await page.screenshot({ path: `${OUT}/manifesto-boundary-${vp}.png` });
    }
    await page.close();
  }

  /* --- the /blog head */
  {
    const page = await b.newPage();
    await page.setViewport({ width: W, height: H });
    await page.goto(`http://localhost:${PORT}/blog`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await sleep(1800);
    const head = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const hdr = h1.closest("header");
      const r = hdr.getBoundingClientRect();
      const cs = getComputedStyle(hdr);
      const h1cs = getComputedStyle(h1);
      return {
        headerHeight: Math.round(r.height),
        paddingBlock: `${cs.paddingTop} / ${cs.paddingBottom}`,
        h1: `${h1cs.fontFamily.split(",")[0]} ${h1cs.fontWeight} ${h1cs.fontSize}`,
        h1Left: Math.round(h1.getBoundingClientRect().left),
        anyEyebrow: !!hdr.querySelector('[class*="eyebrow"]'),
        saffronDots: [...document.querySelectorAll("header *")].filter((e) =>
          /199, 126, 63/.test(getComputedStyle(e, "::before").backgroundColor || ""),
        ).length,
        outline: [...document.querySelectorAll("h1,h2,h3")].map((h) => h.tagName).slice(0, 5).join(" → "),
      };
    });
    console.log(`${vp}  /blog head:`, JSON.stringify(head));
    await page.screenshot({ path: `${OUT}/blog-head-${vp}.png` });
    await page.close();
  }
}

console.log(`\nshots → ${OUT}`);
await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
