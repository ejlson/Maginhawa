/* ZOOM ON ONE MARK, with a decile rule down the box.

   The row profile in probe-press-profile.mjs finds a notch in The Guardian
   at ~56% of the box, which would mean "The" is TALLER than "Guardian" —
   plausible only if you cannot see the mark. This renders one logo big, with
   a hairline every 10% of the box height and a number on each, so a band
   boundary read off the profile can be checked against the letterforms
   instead of trusted.

   Usage: node scripts/shoot-press-zoom.mjs [port] <file.svg> [outfile]  */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const FILE = process.argv[3];
const OUT =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/082df041-cd16-47f8-81ae-892042eaee11/scratchpad";
const DEST = process.argv[4] || `${OUT}/zoom-${FILE.replace(".svg", "")}.png`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 700, deviceScaleFactor: 2 });
await page.setContent("<!doctype html><meta charset=utf-8><body></body>", {
  waitUntil: "domcontentloaded",
});

const size = await page.evaluate(
  async (file, port) => {
    const BOX = 420;
    document.body.style.cssText =
      "margin:0;background:#F3EFE6;font:11px/1 ui-monospace,monospace;color:#B4453C";
    const holder = document.createElement("div");
    holder.style.cssText = `position:relative;display:inline-block;height:${BOX}px;margin:40px 60px`;
    const img = document.createElement("img");
    img.src = `http://localhost:${port}/press-logo/${file}`;
    img.style.cssText = "height:100%;width:auto;display:block";
    holder.appendChild(img);
    for (let i = 0; i <= 10; i++) {
      const line = document.createElement("div");
      line.style.cssText =
        `position:absolute;left:-46px;right:-10px;top:${(BOX * i) / 10}px;` +
        `height:1px;background:rgba(180,69,60,.55)`;
      const lab = document.createElement("span");
      lab.style.cssText =
        "position:absolute;left:-44px;top:-12px;background:#F3EFE6;padding:0 2px";
      lab.textContent = (i * 10) + "%";
      line.appendChild(lab);
      holder.appendChild(line);
    }
    document.body.appendChild(holder);
    await img.decode();
    return {
      w: Math.ceil(holder.getBoundingClientRect().right + 40),
      h: BOX + 90,
    };
  },
  FILE,
  PORT,
);

await page.setViewport({
  width: Math.max(400, size.w),
  height: size.h,
  deviceScaleFactor: 2,
});
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: DEST });
console.log(`wrote ${DEST}`);
await browser.close();
