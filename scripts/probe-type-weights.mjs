/* The elements whose font-weight was just re-pointed at a token — checked in
   the browser rather than in the stylesheet, because a var() that fails to
   resolve silently falls back to `normal` and the CSS still looks correct.

   usage: node scripts/probe-type-weights.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* route → [label, selector, expected computed weight] */
const CASES = [
  [
    "/about",
    [
      ["hero kicker", '[class*="About_heroKicker"]', "200"],
      ["hero GROUP", '[class*="About_heroLineBottom"]', "200"],
      ["awards outlet", '[class*="About_coverageOutlet"]', "500"],
      ["em italic", '[class*="About_emItalic"]', null],
    ],
  ],
  ["/contact", [["submit pill", '[class*="Contact_submitPill"]', "500"]]],
  [
    "/",
    [
      ["footer direct line", '[class*="Footer_directLine"]', "400"],
      ["footer credit", '[class*="Footer_developer"]', "200"],
    ],
  ],
];

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });

let fails = 0;
for (const [route, sels] of CASES) {
  await page.goto(`http://localhost:${PORT}${route}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1500);

  console.log(`\n  ${route}`);
  for (const [label, sel, want] of sels) {
    const r = await page.evaluate((s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const c = getComputedStyle(e);
      return {
        weight: c.fontWeight,
        family: c.fontFamily.split(",")[0].replace(/["']/g, ""),
        style: c.fontStyle,
      };
    }, sel);
    if (!r) {
      console.log(`    ${label.padEnd(20)} NOT IN THE DOM`);
      continue;
    }
    const ok = want === null || r.weight === want;
    if (!ok) fails++;
    console.log(
      `    ${ok ? "PASS" : "FAIL"}  ${label.padEnd(20)} weight ${r.weight.padEnd(4)}${want ? `(want ${want}) ` : ""} ${r.family} ${r.style}`,
    );
  }
}

console.log(`\n  ${fails ? `${fails} FAILURE(S)` : "ALL PASS"}`);
await b.close();
