/* THE DISCOVER HEAD, MEASURED BEFORE IT IS MOVED.

   The settled "Our Restaurants." heading is being collapsed from two
   stacked lines to one, and the standfirst is moving to the right edge of
   the content band. Both changes are seat arithmetic: does one line of
   Contralto at the chapter's sizes fit beside a right-ranged caption, and
   at which column spans? Guessing a display face's advance widths is how
   headings end up wrapping on someone else's viewport, so this reads the
   real numbers first:

     - the head band's content width and its internal 12-column geometry
     - the settled title's CLAMP size (inline fitted size stripped) and the
       width of "Our" / "Restaurants." at that size
     - the same at the FITTED size the intro leaves behind (titlePx)
     - the live caption's box, for the before picture

   Read-only — it changes nothing and drives nothing; the numbers it prints
   are what the stylesheet's spans are chosen from.

   usage: node scripts/probe-title-measure.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "51365";
const WIDTHS = [981, 1100, 1280, 1440, 1728];

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
// domcontentloaded, never networkidle0 — the page keeps a looping video
// alive and no idle event ever fires
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 60000 },
);
await page.evaluate(() => document.fonts.ready);

async function measure() {
  return page.evaluate(() => {
    const sec = document.getElementById("restaurants");
    if (!sec) return null;
    // the SETTLED h2 — the one outside the stage overlay (the intro title
    // lives under an aria-hidden pasteboard)
    const h2 = Array.from(sec.querySelectorAll("h2")).find(
      (n) => !n.closest("[aria-hidden]"),
    );
    if (!h2) return null;
    const head = h2.parentElement;
    const headBox = head.getBoundingClientRect();
    const cs = getComputedStyle(head);

    /* one-line width at a given font-size, from a shrink-wrapped clone:
       lines forced inline-block with the 0.28em word space, the clone
       itself inline-block inside a nowrap sheet so it takes its natural
       width rather than the head's */
    const lineAt = (inlinePx) => {
      const sheet = document.createElement("div");
      sheet.style.cssText =
        "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;";
      const clone = h2.cloneNode(true);
      clone.style.fontSize = inlinePx ? inlinePx : "";
      clone.style.display = "inline-block";
      const lines = Array.from(clone.children);
      lines.forEach((l, i) => {
        l.style.display = "inline-block";
        l.style.marginRight = i < lines.length - 1 ? "0.28em" : "0";
      });
      sheet.appendChild(clone);
      head.appendChild(sheet);
      const font = parseFloat(getComputedStyle(clone).fontSize);
      const total = clone.getBoundingClientRect().width;
      const words = lines.map((l) => ({
        text: (l.textContent || "").trim(),
        w: +l.getBoundingClientRect().width.toFixed(1),
      }));
      sheet.remove();
      return { font: +font.toFixed(2), total: +total.toFixed(1), words };
    };

    const fitted = h2.style.fontSize || null;
    const caption = head.querySelector("p");
    const capBox = caption ? caption.getBoundingClientRect() : null;
    const gutter = 12; // --grid-gutter is a fixed 12px by design
    const col = (headBox.width - 11 * gutter) / 12;
    const span = (n) => +(n * col + (n - 1) * gutter).toFixed(1);

    return {
      viewport: window.innerWidth,
      headW: +headBox.width.toFixed(1),
      headLeft: +headBox.left.toFixed(1),
      col: +col.toFixed(2),
      spans: { 6: span(6), 7: span(7), 8: span(8), 9: span(9), 10: span(10) },
      clamp: lineAt(null),
      fittedPx: fitted,
      fittedLine: fitted ? lineAt(fitted) : null,
      caption: capBox
        ? {
            left: +capBox.left.toFixed(1),
            right: +capBox.right.toFixed(1),
            w: +capBox.width.toFixed(1),
          }
        : null,
      h2Box: (() => {
        const r = h2.getBoundingClientRect();
        return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
      })(),
    };
  });
}

for (const w of WIDTHS) {
  await page.setViewport({ width: w, height: 900 });
  // let the component's resize listeners (fitTitle) settle before reading
  await new Promise((r) => setTimeout(r, 500));
  const m = await measure();
  console.log(`\n=== ${w}px viewport ===`);
  console.log(JSON.stringify(m, null, 2));
}

await b.close();
