/* THE CONTRAST THE BLEND USED TO HIDE.

   Under mix-blend-mode: difference every glyph's contrast was a function of
   whichever video frame sat behind it, so there was nothing stable to
   measure. With the blend gone the only variable left is the scrim, and
   that IS measurable: hide the copy, screenshot the band it occupies, and
   take the BRIGHTEST composited pixel there — the worst case cream has to
   survive. Sampled across the section's whole traverse, because the footage
   moves and the scrim's radial centre does not.

   usage: node scripts/probe-book-contrast.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "50853";
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const lin = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const CREAM = lum(250, 247, 241);
const ratio = (l) => (CREAM + 0.05) / (l + 0.05);

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});

for (const [W, H] of [[1440, 900], [375, 667]]) {
  const p = await b.newPage();
  await p.setViewport({ width: W, height: H });
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 });
  await s(2500);

  console.log(`\n===== ${W}x${H} =====`);
  let worst = { r: Infinity };

  // eight stations across the traverse, from the seal to the departure
  for (let i = 0; i < 8; i++) {
    const frac = i / 7;
    const band = await p.evaluate((f) => {
      const el = document.querySelector("#book");
      const y = el.getBoundingClientRect().top + window.scrollY + f * el.offsetHeight * 0.9;
      window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
      return null;
    }, frac);
    await s(700);

    // The rectangle the copy actually occupies — intersected with the FILM's
    // own rect, not just the viewport. Once the section starts leaving, the
    // copy's box hangs off the top and a viewport-only clamp would sample the
    // maroon footer below the seam, whose cream type is not this section's
    // problem. Then hide the copy so only the composited backdrop remains.
    const box = await p.evaluate(() => {
      const bk = document.querySelector('[class*="Reservations_book"]');
      const q = bk.getBoundingClientRect();
      const f = document.querySelector("#book").getBoundingClientRect();
      bk.style.visibility = "hidden";
      const top = Math.max(q.top, f.top, 0);
      const bottom = Math.min(q.bottom, f.bottom, window.innerHeight);
      return { x: q.x, y: top, w: q.width, h: bottom - top };
    });
    // NOT a `clip` screenshot: puppeteer's clip is document-relative and
    // re-renders from the document origin, which under Lenis returns a shot
    // of the top of the page. Full viewport, cropped in the canvas below.
    const clip = {
      x: Math.max(0, Math.round(box.x)),
      y: Math.max(0, Math.round(box.y)),
      width: Math.round(Math.min(W - Math.max(0, box.x), box.w)),
      height: Math.round(Math.min(H - Math.max(0, box.y), box.h)),
    };
    if (clip.width < 8 || clip.height < 8) {
      await p.evaluate(() => {
        document.querySelector('[class*="Reservations_book"]').style.visibility = "";
      });
      console.log(`  station ${i} (${frac.toFixed(2)})  copy off-screen — skipped`);
      continue;
    }
    const b64 = await p.screenshot({ type: "png", encoding: "base64" });
    // decode in the page rather than pulling in a PNG library: Chrome is
    // already here and its decoder is the one that produced the bytes
    const mx = await p.evaluate(async (data, c0) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = c0.width;
      c.height = c0.height;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, c0.x, c0.y, c0.width, c0.height, 0, 0, c0.width, c0.height);
      const px = g.getImageData(0, 0, c.width, c.height).data;
      const lin = (v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
      let m = 0;
      for (let k = 0; k < px.length; k += 4) {
        const l = 0.2126 * lin(px[k]) + 0.7152 * lin(px[k + 1]) + 0.0722 * lin(px[k + 2]);
        if (l > m) m = l;
      }
      return m;
    }, b64, clip);
    await p.evaluate(() => {
      document.querySelector('[class*="Reservations_book"]').style.visibility = "";
    });

    const r = ratio(mx);
    if (r < worst.r) worst = { r, frac, mx };
    console.log(
      `  station ${i} (${frac.toFixed(2)})  brightest backdrop L ${mx.toFixed(4)}  →  cream contrast ${r.toFixed(2)}:1  ${r >= 4.5 ? "PASS" : "FAIL"}`,
    );
  }
  console.log(`  WORST across the traverse: ${worst.r.toFixed(2)}:1  ${worst.r >= 4.5 ? "PASS" : "FAIL"}`);
  await p.close();
}

await b.close();
