/* CONTRAST OF THE CAPTION OVER THE PHOTOGRAPH.

   The other contrast probe composites CSS colours, which works when the
   backdrop is a flat fill. This caption sits on a frame of video, so its
   backdrop is a few thousand pixels of varying brightness and there is no
   colour to look up — the only honest measurement is to read the pixels that
   are actually behind the words.

   Method: hide the caption, screenshot the exact rectangle it occupied, and
   compute the luminance of every pixel in it. WCAG is a worst-case rule, not
   an average one, so the number that decides is the BRIGHTEST region under
   the text, not the mean — cream type fails over a highlight long before it
   fails over the average. The 95th percentile is used rather than the single
   brightest pixel so one specular dot on a pan rim does not condemn a caption
   that is perfectly readable.

   Run WITHOUT the scrim as well (--noscrim) to show what the gradient is
   actually buying, rather than asserting that it helps.

   THE SCREENSHOT IS DECODED BY THE BROWSER, not by a PNG library in Node —
   this repo has no image decoder and the brief forbids adding a dependency
   for one. The captured buffer goes back into the page as a data URL, is
   drawn to a canvas and read with getImageData. (Canvas is banned in the
   PAGE's own code; this is a probe injecting it after the fact.)

   usage: node scripts/probe-join-caption.mjs [port] [--noscrim] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "3187";
const NOSCRIM = process.argv.includes("--noscrim");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;

const srgb = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const ratio = (a, b) => {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu", "--use-gl=angle"],
});

console.log(
  `\n=== caption over the photograph   ${NOSCRIM ? "SCRIM REMOVED (control)" : "as shipped"}   (WCAG AA 4.5:1) ===`,
);

for (const [VW, VH] of [
  [1440, 900],
  [1920, 1080],
  [820, 1180],
  [390, 844],
]) {
  const page = await b.newPage();
  await page.setViewport({ width: VW, height: VH });
  await page.goto(`http://localhost:${PORT}/careers`, { waitUntil: "networkidle0", timeout: 60000 });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(3200);

  if (NOSCRIM)
    await page.addStyleTag({ content: '[class*="heroScrim"]{display:none!important}' });

  // the caption's own box, padded a little so the measurement covers the
  // ground the glyphs actually sit on rather than only their tight bounds
  const box = await page.evaluate(() => {
    const el = document.querySelector('[class*="heroCaption"]');
    const r = el.getBoundingClientRect();
    const fg = getComputedStyle(el).color;
    el.style.visibility = "hidden";
    return {
      x: Math.max(0, Math.round(r.left - 4)),
      y: Math.max(0, Math.round(r.top - 3)),
      width: Math.round(r.width + 8),
      height: Math.round(r.height + 6),
      fg,
    };
  });
  await sleep(120);
  const shot = await page.screenshot({
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    captureBeyondViewport: false,
    encoding: "base64",
  });
  await page.evaluate(() => {
    document.querySelector('[class*="heroCaption"]').style.visibility = "";
  });

  const ls = await page.evaluate(
    (b64) =>
      new Promise((resolve) => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement("canvas");
          c.width = im.width;
          c.height = im.height;
          const cx = c.getContext("2d");
          cx.drawImage(im, 0, 0);
          const d = cx.getImageData(0, 0, c.width, c.height).data;
          const out = [];
          for (let i = 0; i < d.length; i += 4) out.push(d[i], d[i + 1], d[i + 2]);
          resolve(out);
        };
        im.src = "data:image/png;base64," + b64;
      }),
    shot,
  );

  const lums = [];
  for (let i = 0; i < ls.length; i += 3) lums.push(lum(ls[i], ls[i + 1], ls[i + 2]));
  lums.sort((a, b) => a - b);
  const q = (p) => lums[Math.min(lums.length - 1, Math.floor(lums.length * p))];
  const fg = box.fg.match(/[\d.]+/g).map(Number);
  const fgL = lum(fg[0], fg[1], fg[2]);

  const worst = ratio(fgL, q(0.95));
  const median = ratio(fgL, q(0.5));
  const absoluteWorst = ratio(fgL, lums[lums.length - 1]);
  const pass = worst >= 4.5;
  if (pass !== true) fails++;
  console.log(
    `  ${pass ? "PASS" : "FAIL"}  ${VW}x${VH}  worst(p95) ${worst.toFixed(2)}:1   median ${median.toFixed(2)}:1   single brightest pixel ${absoluteWorst.toFixed(2)}:1   over ${lums.length} px`,
  );
  await page.close();
}

console.log(
  `\n  ${fails === 0 ? "THE CAPTION CLEARS 4.5:1 EVERYWHERE" : `${fails} VIEWPORT(S) UNDER 4.5:1`}\n`,
);
const shutdown = async () => {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    proc?.kill("SIGKILL");
  } catch {}
  process.exit(fails === 0 ? 0 : 1);
};
await shutdown();
