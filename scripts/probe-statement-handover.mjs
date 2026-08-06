/* Does the maroon About band climb over a SET statement, or over an empty
   cream sheet?

   This is the defect recorded in 08bcf1c: ChapterPin held the section's
   ground, but the statement inside it scrubbed out of view before the band
   arrived, so the handover covered nothing. The fix is the keyed chapter
   signal (lib/chapter.ts) — the pin now waits for the last line of the
   statement to finish before it engages.

   WHAT IS MEASURED, walking the page in real steps rather than teleporting:
     · the order the reader meets the sections in
     · at the frame where the maroon band's top edge first enters the
       viewport, how much of the statement is still on screen and how far
       its last line has scrubbed
     · whether the pin ever wedges — ready stuck false would hold forever

   Usage: node scripts/probe-statement-handover.mjs [port]  */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
/* NOT networkidle0 — looping hero video means the network never idles */
await page.goto(`http://localhost:${PORT}/`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 15000,
  })
  .catch(() => console.log("! loader never cleared is-loading"));
await page.evaluate(async () => {
  await document.fonts.ready;
  return true;
});
await s(2500);

/* ---------- 1. the order the reader meets things in ---------- */
const order = await page.evaluate(() =>
  [...document.querySelectorAll("section")]
    .map((el) => {
      const h = el.querySelector("h1, h2");
      const t = (h?.textContent || el.id || "").trim().replace(/\s+/g, " ");
      return t
        ? { label: t.slice(0, 40), y: Math.round(el.getBoundingClientRect().top + window.scrollY) }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.y - b.y),
);
console.log("READER ORDER");
order.forEach((o) => console.log(`  ${String(o.y).padStart(6)}  ${o.label}`));

/* ---------- 2. walk, and catch the handover frame ---------- */
const height = await page.evaluate(() => document.documentElement.scrollHeight);
let handover = null;
let sawNotReady = false;
let lastReadyAt = null;

for (let y = 0; y < height; y += 60) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await s(45);
  const f = await page.evaluate(() => {
    const vh = window.innerHeight;
    /* the maroon band is the About zone's ground; find the first element
       whose computed background is the ink and that sits below the fold */
    const zone = document.querySelector('[class*="maroonZone"], [class*="MaroonZone"]');
    const band = zone ? zone.getBoundingClientRect().top : null;

    const st = document.querySelector('[class*="statement"]');
    const r = st ? st.getBoundingClientRect() : null;
    const visible = r
      ? Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / Math.max(1, r.height)
      : 0;

    /* how far the LAST line has scrubbed: its words sit at translateY(130%)
       before and 0% after, so a settled line has every mask at ~0 offset.

       SCOPED TO THE STATEMENT. A bare [class*="line"] also matches timeline,
       headline, byline and underline elsewhere on the page — the first run
       of this probe measured the journal timeline and reported the scrub as
       never having run. */
    const lines = st ? [...st.querySelectorAll('[class*="line"]')] : [];
    const lastLine = lines[lines.length - 1];
    let setness = null;
    if (lastLine) {
      const spans = [...lastLine.querySelectorAll("span")].filter((n) =>
        /matrix|translate/.test(getComputedStyle(n).transform),
      );
      if (spans.length) {
        const offs = spans.map((n) => {
          const m = new DOMMatrixReadOnly(getComputedStyle(n).transform);
          return Math.abs(m.m42); // y translation in px
        });
        setness = Math.round(offs.reduce((a, b) => a + b, 0) / offs.length);
      }
    }
    return { band, visible: Math.round(visible * 100), setness, vh };
  });

  if (f.band !== null && f.band <= f.vh && handover === null) {
    handover = { y, ...f };
  }
  if (f.setness !== null && f.setness > 2) sawNotReady = true;
  if (f.setness !== null && f.setness <= 2) lastReadyAt = y;
}

console.log("\nHANDOVER FRAME — the maroon band's top edge entering the viewport");
if (!handover) {
  console.log("  ! never caught the band entering; selector may be wrong");
} else {
  console.log(`  scrollY                 ${handover.y}`);
  console.log(`  statement on screen     ${handover.visible}%`);
  console.log(
    `  last line settled       ${handover.setness === null ? "n/a" : handover.setness + "px from rest"}`,
  );
  const verdict =
    handover.visible >= 55 && (handover.setness === null || handover.setness <= 6)
      ? "PASS — the band covers a statement that is on screen and set"
      : "FAIL — the band is covering an empty or half-set sheet";
  console.log(`  ${verdict}`);
}

console.log(
  `\nscrub ran at all: ${sawNotReady ? "yes" : "NO — the statement never left its start state"}`,
);
console.log(`last frame with the line at rest: y=${lastReadyAt}`);

await browser.close();
