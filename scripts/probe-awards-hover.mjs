/* DID THE AWARDS ROWS LOSE THEIR HOVER PHOTOGRAPH, AND NOTHING ELSE?

   Two questions, and the second is the one that catches a bad removal:

   1. NO PICTURE ON HOVER. The <img> is gone from the markup, so the check
      is simply that hovering a row produces no image element anywhere
      inside it — and that nothing else in the row is suddenly painting a
      background-image in its place.
   2. THE ROW STILL BEHAVES. The preview was absolutely positioned against
      `position: relative` on the row, and that anchor came off with it. If
      anything else had been relying on it the row's geometry would move,
      so the row box and its three tracks are measured at rest and on hover
      and must be identical.

   Then the mobile menu's copyright line, which must now read exactly what
   the footer prints.

   usage: node scripts/probe-awards-hover.mjs <port>                      */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "networkidle2", timeout: 90000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading") &&
        !document.querySelector('[class*="Loader_overlay__"]'),
  { timeout: 45000 },
).catch(() => console.warn("! loader gate timed out"));
await sleep(1500);

/* DEV COMPILES ON FIRST HIT, and a fast-refresh reload lands mid-probe as
   "execution context was destroyed". Retry the whole park-and-settle step
   rather than the individual reads. */
async function parkOnAwards(attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    try {
      await page.waitForFunction(
        () => [...document.querySelectorAll("h2")]
          .some((n) => /Awards\s*&\s*Recognition/i.test(n.textContent || "")),
        { timeout: 30000 },
      );
      await page.evaluate(() => {
        const h = [...document.querySelectorAll("h2")]
          .find((n) => /Awards\s*&\s*Recognition/i.test(n.textContent || ""));
        if (h) h.scrollIntoView({ block: "center", behavior: "instant" });
      });
      await sleep(2500);
      const n = await page.evaluate(
        () => document.querySelectorAll('a[class*="coverageRow"]').length);
      if (n > 0) return n;
    } catch (e) {
      console.warn(`  · attempt ${i + 1} lost the page (${String(e).slice(0, 60)}) — retrying`);
    }
    await sleep(2500);
  }
  return 0;
}
await parkOnAwards();

const found = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('a[class*="coverageRow"]')];
  return {
    rows: rows.length,
    thumbsInDom: document.querySelectorAll('[class*="coverageThumb"]').length,
    imgsInRows: rows.reduce((n, r) => n + r.querySelectorAll("img").length, 0),
  };
});
console.log(`\n══ /about awards table ══`);
console.log(`rows rendered      : ${found.rows}`);
console.log(`.coverageThumb els : ${found.thumbsInDom}   (want 0)`);
console.log(`<img> inside rows  : ${found.imgsInRows}   (want 0)`);

if (!found.rows) { console.log("! no rows found — aborting"); await b.close(); process.exit(1); }

/* geometry at rest */
const rest = await page.evaluate(() => {
  const r = document.querySelector('a[class*="coverageRow"]');
  const b = r.getBoundingClientRect();
  const cs = getComputedStyle(r);
  return { w: +b.width.toFixed(1), h: +b.height.toFixed(1),
           cols: cs.gridTemplateColumns, pos: cs.position };
});

/* hover it for real */
const box = await page.evaluate(() => {
  const r = document.querySelector('a[class*="coverageRow"]');
  const b = r.getBoundingClientRect();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
});
await page.mouse.move(box.x, box.y);
await sleep(900);

const hovered = await page.evaluate(() => {
  const row = document.querySelector('a[class*="coverageRow"]');
  const b = row.getBoundingClientRect();
  const cs = getComputedStyle(row);
  /* anything painting a picture inside the row, by any means */
  const painters = [...row.querySelectorAll("*")].filter((n) => {
    const s = getComputedStyle(n);
    return n.tagName === "IMG" || (s.backgroundImage && s.backgroundImage !== "none");
  }).map((n) => n.tagName + "." + (n.className.baseVal ?? n.className));
  /* and anything visibly overflowing the row box, which a floating
     preview necessarily would */
  const overflow = [...row.querySelectorAll("*")].filter((n) => {
    const r = n.getBoundingClientRect();
    return r.height > b.height + 4 && getComputedStyle(n).opacity !== "0";
  }).length;
  return { w: +b.width.toFixed(1), h: +b.height.toFixed(1),
           cols: cs.gridTemplateColumns, painters, overflow,
           arrowOpacity: getComputedStyle(
             row.querySelector('[class*="coverageArrow"]') || row).opacity };
});

console.log(`\n── first row, at rest vs hovered ──`);
console.log(`box    : ${rest.w}x${rest.h}  ->  ${hovered.w}x${hovered.h}  ${
  rest.w === hovered.w && rest.h === hovered.h ? "✓ unmoved" : "✗ MOVED"}`);
console.log(`tracks : ${rest.cols === hovered.cols ? "✓ identical" : "✗ CHANGED"}  (${rest.cols})`);
console.log(`position on row    : ${rest.pos}`);
console.log(`image painters     : ${hovered.painters.length ? "✗ " + hovered.painters.join(", ") : "✓ none"}`);
console.log(`children overflowing the row : ${hovered.overflow}   (want 0)`);
console.log(`arrow opacity on hover       : ${hovered.arrowOpacity}  (still wakes)`);

/* ── the mobile menu's copyright ── */
const footerCopy = await page.evaluate(() => {
  const n = [...document.querySelectorAll("footer *")]
    .find((e) => /©/.test(e.textContent || "") && e.children.length === 0);
  return n ? n.textContent.trim() : null;
});

await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.reload({ waitUntil: "networkidle2", timeout: 90000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading") &&
        !document.querySelector('[class*="Loader_overlay__"]'),
  { timeout: 45000 },
).catch(() => {});
await sleep(2000);

const opened = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")]
    .find((b) => /menu/i.test(b.getAttribute("aria-label") || b.textContent || ""));
  if (!btn) return false;
  btn.click();
  return true;
});
await sleep(1200);

const menuCopy = await page.evaluate(() => {
  const aside = document.querySelector('aside[class*="Menu_"]') ||
                document.querySelector('[class*="Menu_sheet"]');
  if (!aside) return { err: "no menu element" };
  const n = [...aside.querySelectorAll("*")]
    .find((e) => /©/.test(e.textContent || "") && e.children.length === 0);
  return { text: n ? n.textContent.trim() : null,
           rendered: n ? getComputedStyle(n).textTransform : null };
});

console.log(`\n══ copyright notice ══`);
console.log(`footer      : ${JSON.stringify(footerCopy)}`);
console.log(`mobile menu : ${JSON.stringify(menuCopy.text)}  (opened=${opened}, transform=${menuCopy.rendered})`);
console.log(`match       : ${footerCopy && menuCopy.text === footerCopy ? "✓ identical" : "✗ DIFFERENT"}`);

await b.close();
