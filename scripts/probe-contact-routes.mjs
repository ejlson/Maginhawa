/* THE BLAST-RADIUS CHECK for the /contact footer swap.
 *
 * /contact suppresses the footer's "Got any questions? Contact us." block from
 * the OUTSIDE — Footer.tsx is not the contact page's to edit — using a
 * structural selector scoped to a class that should exist on no other route.
 * "Should" is the word this file exists to delete. Every route is loaded and
 * asked three things:
 *
 *   · is the invitation rendered (a box with area, not merely present in the
 *     DOM — `display: none` leaves the element queryable);
 *   · is it in the accessibility tree (a hidden <h2> would leave an orphan in
 *     the heading outline);
 *   · does the "Get in touch" link still work, i.e. is it hit-testable.
 *
 * Expected: present on /, /about, /blog, /join-us and /restaurants; gone on
 * /contact and replaced there by the "Come and see us." block.
 *
 * The footer is the LAST thing on every page, so it must be scrolled to
 * before it is measured — `fullPage` and blind `getBoundingClientRect` both
 * read whileInView content that never entered.
 *
 * usage: node scripts/probe-contact-routes.mjs [port]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3210";
const ROUTES = ["/", "/about", "/blog", "/join-us", "/restaurants", "/contact"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const rows = [];
for (const route of ROUTES) {
  await page.goto(`http://localhost:${PORT}${route}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(900);

  // walk to the bottom like a reader so the footer has actually entered
  const max = await page.evaluate(
    () => document.documentElement.scrollHeight - innerHeight,
  );
  for (let y = 0; y <= max; y += 600) {
    await page.evaluate((v) => {
      if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
      else window.scrollTo(0, v);
    }, y);
    await sleep(60);
  }
  await page.evaluate((v) => {
    if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
    else window.scrollTo(0, v);
  }, max);
  await sleep(900);

  rows.push(
    await page.evaluate((route) => {
      const footer = document.querySelector("footer");
      const h2 = footer && footer.querySelector("h2");
      const inviteEl = h2 && h2.parentElement;
      const cta = footer && footer.querySelector("a[href='/contact']");
      const r = inviteEl ? inviteEl.getBoundingClientRect() : null;
      const visit = document.querySelector(
        "aside[aria-labelledby='come-and-see-us']",
      );
      // hit test the pill's own centre — a display:none ancestor takes it out
      const pill =
        footer &&
        [...footer.querySelectorAll("a[href='/contact']")].find((a) =>
          /get in touch/i.test(a.innerText),
        );
      let hit = null;
      if (pill) {
        const p = pill.getBoundingClientRect();
        if (p.width) {
          const el = document.elementFromPoint(
            p.x + p.width / 2,
            p.y + p.height / 2,
          );
          hit = !!(el && pill.contains(el));
        } else {
          hit = false;
        }
      }
      return {
        route,
        inviteTitle: h2 ? h2.textContent.trim() : null,
        // rendered === has a box. display:none leaves the node but no rects.
        inviteRendered: !!(h2 && h2.getClientRects().length),
        inviteBox: r ? { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) } : null,
        ctaHref: cta ? cta.getAttribute("href") : null,
        ctaClickable: hit,
        visitBlock: visit
          ? {
              x: Math.round(visit.getBoundingClientRect().x),
              links: [...visit.querySelectorAll("a")].length,
            }
          : null,
      };
    }, route),
  );
}

// accessibility tree: the hidden heading must not survive into it
await page.goto(`http://localhost:${PORT}/contact`, {
  waitUntil: "domcontentloaded",
});
await sleep(1200);
const snap = await page.accessibility.snapshot();
const names = [];
(function walk(n) {
  if (!n) return;
  if (n.role === "heading") names.push(n.name);
  (n.children || []).forEach(walk);
})(snap);

console.log(JSON.stringify({ routes: rows, contactHeadings: names }, null, 1));

await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
