/* AWARDS & RECOGNITION, WITHOUT ITS REVEALS.

   The eyebrow and every outlet row used to be wrapped in <Reveal>, which
   holds them at opacity 0 / y 28 / blur(8px) until an observer fires. They
   are plain elements now, so the test is that they are ALREADY standing
   before anything scrolls them into view — no transform, no blur, full
   opacity, from the first paint.

   usage: node scripts/probe-awards.mjs [port] [w] [h] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const W = Number(process.argv[3] || 1440);
const H = Number(process.argv[4] || 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[class*="About_coverage"]', { timeout: 60000 });
await sleep(2000);

const read = () =>
  page.evaluate(() => {
    const eyebrow = document.querySelector('[class*="About_coverageEyebrow"]');
    const items = [...document.querySelectorAll('[class*="About_coverageList"] > li')];
    const style = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { op: cs.opacity, tf: cs.transform, filter: cs.filter };
    };
    return {
      eyebrow: style(eyebrow),
      eyebrowTag: eyebrow?.tagName.toLowerCase(),
      count: items.length,
      rows: items.slice(0, 4).map(style),
      offenders: items.filter((el) => {
        const cs = getComputedStyle(el);
        return cs.opacity !== "1" || cs.transform !== "none" || cs.filter !== "none";
      }).length,
      totalLinks: document.querySelectorAll('[class*="About_coverageRow"]').length,
    };
  });

// BEFORE anything scrolls it into view — this is the state that matters
const before = await read();
console.log(`\nBEFORE scrolling to it (section still below the fold)`);
console.log(`  eyebrow <${before.eyebrowTag}> ${JSON.stringify(before.eyebrow)}`);
console.log(`  ${before.count} outlet groups, ${before.totalLinks} award rows`);
before.rows.forEach((r, i) => console.log(`  row ${i} ${JSON.stringify(r)}`));
console.log(
  `  rows not fully standing: ${before.offenders}  ${before.offenders === 0 ? "OK — nothing is waiting to animate" : "*** STILL ANIMATING ***"}`,
);

// and after, to prove nothing kicks in late
await page.evaluate(() => {
  const el = document.querySelector('[class*="About_coverage"]');
  window.__lenis?.scrollTo(scrollY + el.getBoundingClientRect().top, {
    immediate: true,
  });
});
await sleep(1800);
const after = await read();
console.log(`\nAFTER scrolling it into view`);
console.log(`  eyebrow ${JSON.stringify(after.eyebrow)}`);
console.log(
  `  rows not fully standing: ${after.offenders}  ${after.offenders === 0 ? "OK" : "*** ANIMATED LATE ***"}`,
);
/* NOT `opacity === 1`: .coverageEyebrow rests at 0.85 in the stylesheet
   (About.module.css:877). The test for "nothing animates" is that the state
   is IDENTICAL before and after the section is scrolled to, with no
   transform and no blur — a Reveal would show as opacity 0 / y 28 /
   blur(8px) beforehand and a different set of values after. */
const still =
  before.offenders === 0 &&
  after.offenders === 0 &&
  before.eyebrow.tf === "none" &&
  before.eyebrow.filter === "none" &&
  JSON.stringify(before.eyebrow) === JSON.stringify(after.eyebrow);
console.log(
  `\nVERDICT: ${still ? "no entrance animation remains — identical before and after" : "SOMETHING STILL ANIMATES"}`,
);

await page.screenshot({ path: "/tmp/awards.png" });
await b.close();
