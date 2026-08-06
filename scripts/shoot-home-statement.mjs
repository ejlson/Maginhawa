/* Screenshots of the home page around the statement — the grid's last row,
 * the sentence and the band — at two widths.
 *
 * THE "control" STOP IS GONE. This script used to take a fourth shot of the
 * "Learn more about us" pill seated inside the band's photograph and print
 * its label and href; that pill has been removed from Manifesto.tsx along
 * with the band's whole scroll expansion, so the query returned null and the
 * script threw on it. The stop is deleted rather than made conditional —
 * there is nothing at that position to photograph any more.
 *
 * page.screenshot({clip}) measures from the DOCUMENT origin, not the
 * viewport, so every shot here is a full-viewport capture taken at a scroll
 * position rather than a clip. Scroll is driven through Lenis's own handle
 * (window.scrollTo is overridden by it) in ~500px steps, because teleporting
 * past a section does not fire its IntersectionObservers.
 *
 * usage: node scripts/shoot-home-statement.mjs [port]
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const OUT = "shots/home-statement";
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

for (const [w, h, tag] of [
  [1440, 900, "1440"],
  [390, 844, "390"],
]) {
  const page = await b.newPage();
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://localhost:${PORT}/`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));

  const to = async (y) => {
    await page.evaluate((v) => {
      const l = window.__lenis;
      if (l) l.scrollTo(v, { immediate: true, force: true });
      else window.scrollTo(0, v);
    }, y);
    await new Promise((r) => setTimeout(r, 140));
  };
  // step down so every observer on the way is armed
  const target = await page.evaluate(() => {
    const g = document.querySelector('[class*="Discover_grid"]');
    return Math.round(g.getBoundingClientRect().bottom + window.scrollY);
  });
  for (let y = 0; y < target + 2200; y += 500) await to(y);

  const shots = await page.evaluate(() => {
    const grid = document.querySelector('[class*="Discover_grid"]');
    const st = document.querySelector('[class*="Manifesto_section"]');
    const band = document.querySelector('[class*="Manifesto_band"]');
    const y = (el, off) =>
      Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY + off));
    return {
      seam: y(grid, -window.innerHeight + 260),
      sentence: y(st, -60),
      band: y(band, -120),
      bandRatio: band
        ? +(band.getBoundingClientRect().width / band.getBoundingClientRect().height).toFixed(2)
        : null,
      bandW: band ? Math.round(band.getBoundingClientRect().width) : null,
    };
  });

  for (const key of ["seam", "sentence", "band"]) {
    await to(shots[key]);
    await new Promise((r) => setTimeout(r, 900));
    await page.screenshot({ path: `${OUT}/${tag}-${key}.png` });
  }
  console.log(
    `${tag}: band ${shots.bandW}px @ ${shots.bandRatio}:1`,
  );
  await page.close();
}

await b.close();
console.log(`shots in ${OUT}/`);
