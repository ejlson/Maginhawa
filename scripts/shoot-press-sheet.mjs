/* PRESS LOGO CONTACT SHEET — look at the marks, one per row, on the cream.

   Companion to probe-press-ink.mjs: that script produces the numbers, this
   one produces the picture, so a ratio like "Time Out = 0.477" can be seen
   for what it is (a small wordmark floating in a 16:9 frame) rather than
   taken on trust.

   Each row draws the mark at a COMMON BOX HEIGHT with a hairline around the
   box, so the difference between the box and the ink inside it is visible.
   The lane's own treatment (grayscale, 0.72 alpha, cream ground) is applied
   so what is on screen here is what is on screen there.

   Modes:
     box   every mark on the same BOX height  — the problem, drawn
     ink   every mark scaled so its INK matches — the fix, drawn

   Usage: node scripts/shoot-press-sheet.mjs [port] [box|ink] [outfile]  */
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const MODE = process.argv[3] || "box";
const OUT =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/082df041-cd16-47f8-81ae-892042eaee11/scratchpad";
const FILE = process.argv[4] || `${OUT}/press-sheet-${MODE}.png`;

const ink = JSON.parse(readFileSync(`${OUT}/press-ink.json`, "utf8"));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 1400, deviceScaleFactor: 2 });
/* A BLANK DOCUMENT, NOT THE HOME PAGE. The first version of this script
   navigated to "/" and rewrote document.body — React hydrated a beat later
   and wiped the sheet, and the screenshot came back as an empty cream field.
   setContent gives a page with no app on it; the logos load over absolute
   http URLs off the same dev server. */
await page.setContent(
  "<!doctype html><meta charset=utf-8><body></body>",
  { waitUntil: "domcontentloaded" },
);

const h = await page.evaluate(
  (rows, mode, port) => {
    const BOX = 48; // box height for the "box" sheet
    const TARGET_INK = 34; // ink height for the "ink" sheet
    document.documentElement.style.overflow = "hidden";
    document.body.style.cssText =
      "margin:0;background:#F3EFE6;font:12px/1.2 ui-monospace,monospace;color:#5A1A22;padding:16px 20px";
    const wrap = document.createElement("div");
    for (const r of rows) {
      const box = mode === "ink" ? TARGET_INK / r.inkRatio : BOX;
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;align-items:center;gap:14px;padding:7px 0;border-bottom:1px solid rgba(90,26,34,.12)";
      const tag = document.createElement("div");
      tag.style.cssText = "width:170px;flex:none;opacity:.65";
      tag.textContent = `${r.name}  ${r.inkRatio.toFixed(3)}`;
      const seat = document.createElement("div");
      seat.style.cssText = `height:${box}px;flex:none;outline:1px dashed rgba(90,26,34,.28)`;
      const img = document.createElement("img");
      img.src = `http://localhost:${port}/press-logo/${r.file}`;
      img.style.cssText =
        "height:100%;width:auto;display:block;opacity:.72;filter:grayscale(1)";
      seat.appendChild(img);
      row.append(tag, seat);
      wrap.appendChild(row);
    }
    document.body.appendChild(wrap);
    return Promise.all(
      [...document.images].map((i) => i.decode().catch(() => {})),
    ).then(() => document.body.scrollHeight + 32);
  },
  ink,
  MODE,
  PORT,
);

await page.setViewport({
  width: 1100,
  height: Math.ceil(h),
  deviceScaleFactor: 2,
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: FILE });
console.log(`wrote ${FILE}`);
await browser.close();
