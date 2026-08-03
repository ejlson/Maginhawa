/* DID THE SHARED COMPONENTS BREAK ANYTHING ELSE?
 *
 * This work touched two components that are NOT About's: CustomCursor (the
 * data-cursor zone resolution, which runs on every route) and SplitWords (a
 * new opt-in `css` driver, which AboutIntro and Discover also mount). Neither
 * has a test that would notice a regression, because both are visual.
 *
 * So this is the cheap, honest version: load every route, scroll it end to
 * end, and report console errors, page errors, failed requests, horizontal
 * overflow, and whether the cursor resolves to the mode the route expects.
 *
 * usage: node scripts/probe-routes.mjs [port]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROUTES = ["/", "/about", "/restaurants", "/restaurants/belly", "/blog", "/contact", "/join-us"];

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu"],
});

for (const route of ROUTES) {
  const page = await b.newPage();
  const errs = [];
  const failed = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") errs.push(`${m.type()}: ${m.text().slice(0, 160)}`);
  });
  page.on("pageerror", (e) => errs.push(`pageerror: ${String(e).slice(0, 160)}`));
  page.on("requestfailed", (r) => failed.push(`${r.failure()?.errorText} ${r.url().slice(0, 110)}`));
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(`HTTP ${r.status()} ${r.url().slice(0, 110)}`);
  });

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1400);

  /* sweep the page with the pointer moving, the way a reader does */
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 700) {
    await page.evaluate((v) => {
      if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
      else window.scrollTo(0, v);
    }, y);
    await page.mouse.move(700 + (y % 5) * 20, 420 + (y % 7) * 13);
    await sleep(90);
  }

  const s = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
    h: document.documentElement.scrollHeight,
    /* SplitWords: any word left stranded below its mask after a full sweep */
    stranded: [...document.querySelectorAll('[class*="SplitWords_word"],[class*="SplitWords_cssWord"]')].filter((w) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(w).transform);
      return Math.abs(m.m42) > 1.5;
    }).length,
    totalWords: document.querySelectorAll('[class*="SplitWords_word"],[class*="SplitWords_cssWord"]').length,
    cursorZones: document.querySelectorAll("[data-cursor]").length,
    cursorValues: [...new Set([...document.querySelectorAll("[data-cursor]")].map((e) => e.getAttribute("data-cursor")))],
  }));

  console.log(`\n=== ${route} ===`);
  console.log(`  height ${s.h}  hOverflow ${s.sw > s.cw ? `*** ${s.sw} > ${s.cw} ***` : "none"}`);
  console.log(`  SplitWords: ${s.totalWords} words, stranded below mask: ${s.stranded === 0 ? "0 ok" : `*** ${s.stranded} ***`}`);
  console.log(`  data-cursor zones: ${s.cursorZones} ${JSON.stringify(s.cursorValues)}`);
  const uniqErrs = [...new Set(errs)];
  console.log(`  console errors/warnings: ${uniqErrs.length}`);
  uniqErrs.slice(0, 8).forEach((e) => console.log(`     ${e}`));
  const uniqFail = [...new Set(failed)];
  console.log(`  failed/4xx requests: ${uniqFail.length}`);
  uniqFail.slice(0, 8).forEach((e) => console.log(`     ${e}`));
  await page.close();
}

await b.close();
