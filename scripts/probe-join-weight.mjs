/* WHAT THE HERO ACTUALLY COSTS ON THE WIRE.

   public/ is 709MB and the hero is a new asset added to it, so "it uses
   next/image" is not an answer — the question is what `sizes` made the
   optimizer serve, and whether the served pixels match the rendered box or
   overshoot it by a factor.

   Reports the transferred bytes, the decoded pixel size, the CSS box it is
   drawn into, and the ratio between them. A ratio near the device pixel
   ratio is right; well above it is bytes being thrown away, and well below
   it is a soft picture.

   It also lists everything ELSE the page pulls, so the hero can be judged in
   proportion — and because that list is where PageTransition's ~17MB of raw,
   un-optimized venue photographs shows up.

   usage: node scripts/probe-join-weight.mjs [port] [w] [h] [dpr] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3187";
const VW = +(process.argv[3] || 1440);
const VH = +(process.argv[4] || 900);
const DPR = +(process.argv[5] || 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--enable-gpu", "--use-gl=angle"],
});
const page = await b.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DPR });

const bytes = new Map();
page.on("response", async (res) => {
  const u = res.url();
  if (!/_next\/image|\.(jpe?g|png|webp|avif|mp4|webm)/.test(u)) return;
  try {
    const len = +(res.headers()["content-length"] ?? 0);
    bytes.set(u, len || (await res.buffer()).length);
  } catch {
    /* body already gone — leave it out rather than guess */
  }
});

await page.goto(`http://localhost:${PORT}/careers`, { waitUntil: "networkidle0", timeout: 120000 });
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 })
  .catch(() => {});
await sleep(2600);

const imgs = await page.evaluate(() =>
  [...document.querySelectorAll('[class*="heroImg"], [class*="heroPrint"] img')].map((i) => {
    const r = i.getBoundingClientRect();
    return {
      url: i.currentSrc,
      src: decodeURIComponent((i.currentSrc.split("url=")[1] ?? "").split("&")[0]),
      /* THE REQUESTED WIDTH, NOT naturalWidth. Under puppeteer's
         deviceScaleFactor emulation Chrome reports naturalWidth in a space
         that tracks the CSS box rather than the decoded bitmap — a 1920-wide
         file came back as "680" at DPR 2 — which reads as a half-resolution
         image and is not one. The `w=` next/image was asked for is the
         honest number, and it is capped by the source's own 1920px. */
      served: `w=${(i.currentSrc.match(/[?&]w=(\d+)/) ?? [, "?"])[1]}`,
      servedW: +((i.currentSrc.match(/[?&]w=(\d+)/) ?? [, 0])[1]),
      box: `${Math.round(r.width)}x${Math.round(r.height)}`,
      boxW: r.width,
      hidden: r.width < 1,
      sizes: i.getAttribute("sizes"),
    };
  }),
);

console.log(`\n=== hero image weight   ${VW}x${VH} @${DPR}x ===`);
let total = 0;
for (const i of imgs) {
  const kb = (bytes.get(i.url) ?? 0) / 1024;
  if (!i.hidden) total += kb;
  console.log(
    `  ${(i.src || "?").padEnd(30)} ${i.hidden ? "(not rendered)".padEnd(24) : `${String(Math.round(kb)).padStart(4)}KB  served ${i.served.padEnd(9)} box ${i.box.padEnd(9)}`}` +
      (i.hidden ? "" : ` asked ${(i.servedW / i.boxW).toFixed(2)}x the CSS box (source caps at 1920)`),
  );
}
console.log(`  ---`);
console.log(`  hero total (rendered prints only): ${total.toFixed(0)}KB`);

// everything else the page pulled, so the hero can be judged in proportion
const other = [...bytes.entries()].filter(([u]) => !imgs.some((i) => i.url === u));
const otherKb = other.reduce((n, [, v]) => n + v, 0) / 1024;
console.log(`  every other image/video on the page: ${otherKb.toFixed(0)}KB across ${other.length} request(s)`);
for (const [u, v] of other.sort((a, b) => b[1] - a[1]).slice(0, 6))
  console.log(`    ${String(Math.round(v / 1024)).padStart(5)}KB  ${u.split("/").slice(-1)[0].slice(0, 80)}`);

const shutdown = async () => {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    proc?.kill("SIGKILL");
  } catch {}
  process.exit(0);
};
await shutdown();
