/* THE PALETTE, SECTION BY SECTION, AT BOTH ENDS OF THE RANGE.

   A palette change cannot be judged on one section. The ground carries the
   hero, the restaurant grid, the statement, the band, the About chapter, the
   press credential, the footer and the whole /restaurants route, and a pair
   that reads well under a photograph can read flat under type. This walks
   all eight and shoots each at 1440 and at 390 so they can be laid side by
   side.

   IT SHOOTS THE VIEWPORT, NOT A CLIP. `page.screenshot({clip})` measures
   from the DOCUMENT origin, not from the scroll position, so a clip built
   out of getBoundingClientRect() lands somewhere else entirely on a scrolled
   page. Each target is scrolled into frame and the viewport is captured
   whole — which is also what the reader actually sees.

   usage: node scripts/probe-palette-screenshots.mjs [port] [outdir]         */
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const OUT = process.argv[3] || "/tmp/palette-shots";
mkdirSync(OUT, { recursive: true });

/* Each target names the route, a selector to bring into frame, and how to
   frame it — `top` puts the section's own top just under the navbar, `mid`
   centres it, `seam` centres the boundary between it and the next thing. */
const TARGETS = [
  { name: "1-hero", route: "/", sel: "header, [class*='Hero_hero']", frame: "top" },
  { name: "2-restaurant-cards", route: "/", sel: "#restaurants [class*='VenueCard_card']", frame: "mid" },
  { name: "3-statement", route: "/", sel: "[class*='Manifesto_'] h2, [class*='Manifesto_'] p", frame: "mid" },
  { name: "4-band", route: "/", sel: "[class*='Manifesto_']", frame: "bottom" },
  { name: "5-about", route: "/", sel: "#about", frame: "top" },
  { name: "6-featured-in", route: "/", sel: "[class*='PressWall_section']", frame: "top" },
  { name: "7-about-press-seam", route: "/", sel: "[class*='PressWall_section']", frame: "seam" },
  { name: "8-footer", route: "/", sel: "footer", frame: "bottom" },
  { name: "9-restaurants-grid", route: "/restaurants", sel: "[class*='RestaurantsShowcase_']", frame: "mid" },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 300000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--autoplay-policy=no-user-gesture-required"],
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (const width of [1440, 390]) {
  const height = width === 1440 ? 900 : 844;
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  let current = null;

  for (const t of TARGETS) {
    if (current !== t.route) {
      await page.goto(`http://localhost:${PORT}${t.route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      // never networkidle0 — the hero film never idles
      await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
      await wait(1400);
      // ~500px steps, or the IntersectionObservers behind Reveal never arm
      // and half the page shoots at opacity 0
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 500) {
        await page.evaluate((v) => window.scrollTo(0, v), y);
        await wait(110);
      }
      await wait(1500);
      current = t.route;
    }

    const target = await page.evaluate(
      (sel, frame, vh) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const top = r.top + scrollY;
        const bottom = r.bottom + scrollY;
        if (frame === "top") return Math.max(0, top - 90);
        if (frame === "bottom") return Math.max(0, bottom - vh + 40);
        if (frame === "seam") return Math.max(0, top - vh / 2);
        return Math.max(0, top + (bottom - top) / 2 - vh / 2);
      },
      t.sel, t.frame, height,
    );
    if (target == null) {
      console.log(`  [skip] ${t.name} @${width} — selector found nothing: ${t.sel}`);
      continue;
    }
    await page.evaluate((y) => window.scrollTo(0, y), target);
    // Lenis smooths the seek and lands late
    await wait(2600);
    const png = await page.screenshot({ encoding: "binary", captureBeyondViewport: false });
    const file = `${OUT}/${t.name}@${width}.png`;
    writeFileSync(file, png);
    const at = await page.evaluate(() => Math.round(window.scrollY));
    console.log(`  ${file}   (scrollY ${at})`);
  }
  await page.close();
}

await browser.close();
console.log(`\ndone → ${OUT}`);
