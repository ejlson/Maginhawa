/* THE WORD MASKS HAVE NO SPACES IN THEM.
 *
 * SplitWords separates adjacent words with `margin-right: 0.24em` on the mask
 * (SplitWords.module.css:15), not with a space character. That is correct
 * typographically — a real space inside a clip window would be clipped — but it
 * means the block's TEXT is one run-on string. Everything that reads text
 * rather than pixels sees "MaginhawaisTagalogfor…": copy-and-paste, in-page
 * find, a text-mode crawler, and any AT that falls back to content when it
 * declines an aria-label.
 *
 * It matters here more than it did before, because this work moved two blocks
 * of editorial prose into that grammar: the About statement, and the deck's
 * nine chapter bodies. The deck's stated reason for being CSS 3D rather than a
 * canvas is that those nine bodies stay readable to a crawler — so whether the
 * rendered text is words or one run is exactly the question that justification
 * turns on.
 *
 * Reports, for each affected block: textContent, innerText, whether the
 * SERVER's HTML has the spaced form, and what a selection would copy.
 *
 * usage: node scripts/probe-textruns.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
await page.evaluate(() => document.fonts.ready);
await sleep(1800);

const r = await page.evaluate(() => {
  const grab = (el) =>
    el && {
      tag: el.tagName.toLowerCase(),
      textContent: (el.textContent || "").slice(0, 88),
      innerText: (el.innerText || "").replace(/\n/g, "\\n").slice(0, 88),
      ariaLabel: (el.getAttribute("aria-label") || "").slice(0, 88),
      masks: el.querySelectorAll('[class*="SplitWords_mask"],[class*="statementMask"]').length,
      spacesInText: ((el.textContent || "").match(/ /g) || []).length,
      words: (el.getAttribute("aria-label") || "").split(" ").length,
    };
  const out = {};
  out.statement = grab(document.querySelector('[class*="statementText"]'));
  const panel = document.querySelector('[class*="railPanel"]');
  out.deckTitle = grab(panel?.querySelector('[class*="storyTitle"]'));
  out.deckBody = grab(panel?.querySelector('[class*="storyBody"]'));
  out.chefQuote = grab(document.querySelector('[class*="chefQuote"]'));
  /* the control: a block this work did NOT move into masks */
  out.chefBody = grab(document.querySelector('[class*="chefBody"]'));
  /* what does find-in-page / a text crawler see for the whole section? */
  const sec = document.querySelector('[class*="About_story__"]') ?? document.querySelector('[class*="storyShell"]');
  out.sectionHasSpacedPhrase = (sec?.innerText || "").includes("Filipino ice-cream parlour");
  out.sectionHasRunOn = (sec?.innerText || "").includes("Filipinoice-creamparlour") || (sec?.textContent || "").includes("Filipinoice-creamparlour");
  return out;
});

for (const [k, v] of Object.entries(r)) {
  if (!v || typeof v !== "object") {
    console.log(`\n${k}: ${v}`);
    continue;
  }
  console.log(`\n=== ${k}  <${v.tag}>  masks=${v.masks} ===`);
  console.log(`  aria-label   : ${JSON.stringify(v.ariaLabel)}`);
  console.log(`  textContent  : ${JSON.stringify(v.textContent)}`);
  console.log(`  innerText    : ${JSON.stringify(v.innerText)}`);
  console.log(`  spaces in textContent: ${v.spacesInText}   (aria-label has ${v.words - 1})`);
}
await b.close();
