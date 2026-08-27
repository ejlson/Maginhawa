/* IS `.grain { inset: -50% }` LOAD-BEARING, OR IS IT 4x THE PIXELS FOR FREE?

   The layer census puts `div.Hero_grain` at 2880x1800 — 5.18M layer pixels,
   the largest non-document layer on the home page and one of only 27 that are
   actually PAINTED. `inset: -50%` is what makes it 2x the hero box in each
   axis; `.hero`'s overflow then clips the excess away.

   The grain sits INSIDE `.zoom`, which the intro scales, so the over-provision
   is not obviously pointless — a wrapper that scaled DOWN would pull an
   `inset: 0` child's edges into view. This settles it by looking.

   ⚠️ TWO PAGE LOADS CANNOT BE COMPARED. The loader's split-flap picks random
   letters, the film advances, and PNG byte length changes for any of it — a
   first attempt at this compared file sizes across loads and reported a
   difference on every shot, which was the loader, not the grain.

   So: ONE load, animations PAUSED at each sample point, shoot, flip the rule,
   shoot again, flip it back. Everything except `inset` is then bit-identical
   by construction, and the diff is decoded to raw RGBA rather than compared
   as compressed bytes.

   usage: node scripts/probe-grain-parity.mjs [port] [w] [h]              */
import puppeteer from "puppeteer-core";
import sharp from "sharp";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3120";
const W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});

const raw = async (png) => (await sharp(png).raw().toBuffer({ resolveWithObject: true })).data;
const compare = async (a, b) => {
  const [x, y] = [await raw(a), await raw(b)];
  let diff = 0, max = 0;
  for (let i = 0; i < x.length; i++) {
    const d = Math.abs(x[i] - y[i]);
    if (d) { diff++; if (d > max) max = d; }
  }
  return diff === 0 ? "IDENTICAL"
    : `${diff} channel samples differ of ${x.length} (${(diff / x.length * 100).toFixed(3)}%), max Δ${max}/255`;
};

const pair = async (page, label) => {
  await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.pause(); } catch {} }));
  await page.evaluate(() => document.querySelectorAll("video").forEach((v) => v.pause()));
  await sleep(300);
  const before = await page.screenshot({ type: "png" });
  await page.evaluate(() => {
    const s = document.createElement("style");
    s.id = "__grain";
    s.textContent = '[class*="Hero_grain"] { inset: 0 !important; }';
    document.head.appendChild(s);
  });
  await sleep(300);
  const after = await page.screenshot({ type: "png" });
  await page.evaluate(() => document.getElementById("__grain")?.remove());
  await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.play(); } catch {} }));
  console.log(`  ${label.padEnd(28)} ${await compare(before, after)}`);
};

console.log("\n`.grain { inset: -50% }` vs `inset: 0` — same load, animations paused\n");

// at rest, repeat-visit path
{
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H });
  await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem("mgnhw:introSeen", "1"); } catch {} });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForFunction(() => !document.querySelector('[class*="Loader_overlay__"]'),
    { timeout: 45000, polling: "raf" }).catch(() => {});
  await sleep(1500);
  console.log("── repeat visit ──");
  await pair(page, "hero at rest");
  await page.close();
}

// mid-intro, first-visit path — sampled while `.zoom` is mid-scale
{
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
  console.log("── first visit, intro running ──");
  for (const t of [2600, 3400, 4200, 5400, 7000]) {
    await page.evaluate((ms) => new Promise((r) => {
      const wait = ms - performance.now();
      setTimeout(r, wait > 0 ? wait : 0);
    }), t);
    const scale = await page.evaluate(() => {
      const z = document.querySelector('[class*="Hero_zoom"]');
      if (!z) return "no .zoom";
      const m = new DOMMatrixReadOnly(getComputedStyle(z).transform);
      return "scale " + m.a.toFixed(3);
    });
    await pair(page, `t=${t}ms  ${scale}`);
  }
  await page.close();
}
await b.close();
