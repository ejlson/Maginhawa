/* THE RESTAURANT TILES + THE INTRO TITLE.

     CROP     the plate's rendered aspect — portrait, and the width
              unchanged from the grid's column.
     CAPTION  that the caption block sits INSIDE the plate's box (its
              bottom edge on the plate's bottom edge, not below it), that
              the divider above the pills is actually drawn, and that the
              type over the photograph is cream.
     HIT      the Book link must still be clickable through the caption's
              pointer-events, and must NOT be a descendant of the plate
              <button> (invalid, and it breaks activation).
     TITLE    the font-size before the sequence arms and after — they must
              be EQUAL. A size that changes on the arming frame is the
              shrink the fit-up-front was meant to remove.
     CENTRE   the title's distance from the middle of the screen on the
              frame it armed. The glide that used to close this is gone, so
              the crossing test has to land it on its own.

   usage: node scripts/probe-discover-tiles.mjs [w] [h] [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = Number(process.argv[2] || 1440);
const H = Number(process.argv[3] || 900);
const PORT = process.argv[4] || "3100";
const SHOT = process.argv[5] || null;

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2" });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 90000 },
);
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 500));

/* ---- TITLE: size before arming ---- */
const before = await page.evaluate(() => {
  const t = Array.from(document.querySelectorAll("h2")).find((n) =>
    /Our\s*Restaurants/i.test(n.textContent || ""),
  );
  return t ? parseFloat(getComputedStyle(t).fontSize) : null;
});

/* creep down until the sequence arms, sampling the title as we go */
const arm = await page.evaluate(async () => {
  const titleOf = () =>
    Array.from(document.querySelectorAll("h2")).find((n) =>
      /Our\s*Restaurants/i.test(n.textContent || ""),
    );
  const sizes = [];
  let armedAt = null;
  for (let i = 0; i < 90; i++) {
    window.scrollBy(0, 70);
    await new Promise((r) => setTimeout(r, 90));
    const t = titleOf();
    if (!t) continue;
    const px = parseFloat(getComputedStyle(t).fontSize);
    sizes.push(+px.toFixed(1));
    const r = t.getBoundingClientRect();
    // the split starts the moment the words part; detect via the section
    // having left IDLE — the head becomes visible mid-screen
    if (armedAt === null && r.width > 0 && Math.abs(r.top + r.height / 2 - window.innerHeight / 2) < 400) {
      armedAt = Math.round(r.top + r.height / 2 - window.innerHeight / 2);
    }
  }
  return { sizes: [...new Set(sizes)], armedAt };
});

/* ---- settle, then measure the tiles ---- */
await new Promise((r) => setTimeout(r, 2500));
const out = await page.evaluate(() => {
  const plate = document.querySelector("[data-plate]");
  const cell = plate?.closest("li");
  const cap = cell?.querySelector('[class*="cellCaption"]');
  const pills = cell?.querySelector('[class*="pillRow"]');
  const tag = cell?.querySelector('[class*="cellTag"]');
  const book = cell?.querySelector('a[class*="pillBook"]');
  const btn = cell?.querySelector("button");
  const pr = plate?.getBoundingClientRect();
  const cr = cap?.getBoundingClientRect();
  const cellR = cell?.getBoundingClientRect();
  const cs = pills ? getComputedStyle(pills) : null;
  const title = Array.from(document.querySelectorAll("h2")).find((n) =>
    /Our\s*Restaurants/i.test(n.textContent || ""),
  );
  return {
    plate: pr ? { w: Math.round(pr.width), h: Math.round(pr.height) } : null,
    ratio: pr ? +(pr.height / pr.width).toFixed(3) : null,
    cellH: cellR ? Math.round(cellR.height) : null,
    capInside:
      pr && cr
        ? {
            capBottom: Math.round(cr.bottom),
            plateBottom: Math.round(pr.bottom),
            capTopWithinPlate: Math.round(cr.top - pr.top),
          }
        : null,
    divider: cs
      ? { borderTop: cs.borderTopWidth, color: cs.borderTopColor }
      : null,
    tagColor: tag ? getComputedStyle(tag).color : null,
    bookInsideButton: !!(book && btn && btn.contains(book)),
    bookPointer: book ? getComputedStyle(book).pointerEvents : null,
    capPointer: cap ? getComputedStyle(cap).pointerEvents : null,
    titlePx: title ? parseFloat(getComputedStyle(title).fontSize) : null,
  };
});

console.log(`\n=== DISCOVER TILES @ ${W}x${H} ===`);
console.log("\n-- TITLE --");
console.log(`  size before arming : ${before}px`);
console.log(`  sizes seen during  : ${arm.sizes.join(", ")}`);
console.log(`  size after settle  : ${out.titlePx}px`);
console.log(
  `  stable: ${arm.sizes.length <= 1 ? "YES  OK" : "NO — it changed mid-sequence  FAIL"}`,
);

console.log("\n-- CROP --");
console.log(`  plate: ${out.plate?.w}x${out.plate?.h}  h/w=${out.ratio}`);
console.log(
  `  portrait: ${out.ratio > 1 ? "YES  OK" : "NO — still landscape  FAIL"}` +
    `   (4:5 target = 1.25)`,
);

console.log("\n-- CAPTION --");
if (out.capInside) {
  const inside =
    out.capInside.capBottom <= out.capInside.plateBottom + 2 &&
    out.capInside.capTopWithinPlate > 0;
  console.log(
    `  caption bottom ${out.capInside.capBottom} vs plate bottom ${out.capInside.plateBottom}`,
  );
  console.log(`  caption top is ${out.capInside.capTopWithinPlate}px down the plate`);
  console.log(`  inside the image: ${inside ? "YES  OK" : "NO  FAIL"}`);
}
console.log(`  cell height ${out.cellH} vs plate height ${out.plate?.h}` +
  (Math.abs((out.cellH || 0) - (out.plate?.h || 0)) < 4
    ? "  (caption takes no flow space  OK)"
    : "  (caption still in flow  FAIL)"));
console.log(`  divider above pills: ${out.divider?.borderTop} ${out.divider?.color}`);
console.log(`  caption type colour: ${out.tagColor}`);

console.log("\n-- HIT --");
console.log(
  `  Book nested inside the plate <button>: ${out.bookInsideButton}` +
    (out.bookInsideButton ? "  FAIL (invalid)" : "  OK"),
);
console.log(`  caption pointer-events: ${out.capPointer}  /  Book: ${out.bookPointer}`);

if (SHOT) {
  await page.screenshot({ path: SHOT });
  console.log(`\n  screenshot -> ${SHOT}`);
}
await b.close();
