/* THE TWO SEAMS AROUND THE ABOUT CHAPTER, measured rather than asserted.

   About Us is moving back onto the maroon, which changes what its two edges
   are for. A GROUND CHANGE IS ITSELF A SEPARATOR — that is the argument
   written into both PressWall.module.css and AboutIntro.module.css, and it
   is why each of those paddings is the number it is. Move the chapter and
   the argument moves with it:

     ABOVE — the full-bleed band closes and About opens. On cream that seam
     was a colour change (band → cream). On maroon it still is (band →
     maroon), and a stronger one, so the tight top padding has MORE help than
     it used to, not less.

     BELOW — About closes and "Featured In" opens. On cream that seam carried
     a ground change and the air only had to keep the title off the boundary.
     On maroon there is NO ground change left: the air is now the only thing
     separating two chapters, so the same number is doing strictly more work.

   WHAT IS MEASURED: ink to ink, not box to box. The display face's cap
   overshoots its own line box, so an element's border-box top is not where
   the reader sees the chapter start. Each edge is found by scanning the
   rendered column of pixels for the first row that differs from the ground.

   usage: node scripts/probe-about-maroon-seams.mjs [port]                   */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 1500));

// arm the reveals in ~500px steps, or the chapters below the fold are still
// at opacity 0 and their ink cannot be found
const h = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < h; y += 500) {
  await page.evaluate((t) => window.scrollTo(0, t), y);
  await new Promise((r) => setTimeout(r, 110));
}
await new Promise((r) => setTimeout(r, 1600));

const geo = await page.evaluate(() => {
  const doc = (el) => {
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY), left: Math.round(r.left), h: Math.round(r.height) };
  };
  const about = document.querySelector("#about");
  const press = document.querySelector('[class*="PressWall_section"]');
  const band = document.querySelector('[class*="Manifesto"]');
  const zone = document.querySelector('[class*="MaroonZone_zone"]');
  const cs = (el) => (el ? getComputedStyle(el) : null);

  // the last painted thing in the band above, and the first ink in About
  const title = about?.querySelector("h2");
  const lastPhoto = about ? [...about.querySelectorAll('[class*="Frame"]')].pop() : null;
  const pressTitle = press?.querySelector("h2, [class*='heading'], [class*='title']");

  return {
    band: band ? { ...doc(band), padBottom: cs(band).paddingBottom, bg: cs(band).backgroundColor } : null,
    about: about ? { ...doc(about), pad: cs(about).padding, bg: cs(about).backgroundColor, theme: about.dataset.navTheme } : null,
    aboutTitle: title ? doc(title) : null,
    aboutLastFrame: lastPhoto ? doc(lastPhoto) : null,
    press: press ? { ...doc(press), padTop: cs(press).paddingTop, bg: cs(press).backgroundColor, theme: press.closest("[data-nav-theme]")?.dataset.navTheme } : null,
    pressTitle: pressTitle ? doc(pressTitle) : null,
    zone: zone ? { ...doc(zone), bg: cs(zone).backgroundColor } : null,
    docHeight: document.documentElement.scrollHeight,
  };
});

/** Find the first row of INK in a strip of the rendered page.

    A single-column scan was tried first and is wrong twice over: it lands
    between letterforms as often as on one, and at a chapter boundary the
    GROUND CHANGE itself reads as ink. So this takes a full-width strip of
    the title's own box, establishes the ground from its first row, and
    reports the first row in which ANY pixel departs from it — which is where
    the reader actually sees the chapter start, cap overshoot included. */
async function inkEdge(yFrom, yTo, xFrom, xWidth) {
  await page.evaluate((t) => window.scrollTo(0, t), Math.max(0, yFrom - 80));
  await new Promise((r) => setTimeout(r, 2400));
  const sy = await page.evaluate(() => Math.round(window.scrollY));
  const png = await page.screenshot({ encoding: "base64", captureBeyondViewport: false });
  return page.evaluate(
    async (b64, scrollY, a, b, xa, xw) => {
      const img = new Image();
      img.src = "data:image/png;base64," + b64;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const top = Math.max(0, a - scrollY);
      const bot = Math.min(img.height, b - scrollY);
      const x = Math.max(0, Math.min(img.width - 2, xa));
      const w = Math.max(2, Math.min(img.width - x, xw));
      if (bot <= top) return null;
      const d = g.getImageData(x, top, w, bot - top).data;
      const at = (row, col) => {
        const i = (row * w + col) * 4;
        return [d[i], d[i + 1], d[i + 2]];
      };
      const base = at(0, Math.floor(w / 2));
      for (let row = 0; row < bot - top; row++) {
        for (let col = 0; col < w; col++) {
          const p = at(row, col);
          if (Math.abs(p[0] - base[0]) + Math.abs(p[1] - base[1]) + Math.abs(p[2] - base[2]) > 30) {
            return { ground: base, firstInk: row + top + scrollY, scrollY };
          }
        }
      }
      return { ground: base, firstInk: null, scrollY };
    },
    png, sy, yFrom, yTo, xFrom, xWidth,
  );
}

const out = { geo };
// TOP SEAM: the band's painted bottom edge → the first ink of "About Us".
// Scanned from just INSIDE About's own box, so the band's own last row can
// never be mistaken for the chapter's first ink.
if (geo.band && geo.aboutTitle) {
  const e = await inkEdge(geo.about.top + 2, geo.aboutTitle.bottom, geo.aboutTitle.left, 620);
  out.topSeam = {
    bandBottom: geo.band.bottom,
    aboutBoxTop: geo.about.top,
    titleBoxTop: geo.aboutTitle.top,
    firstInk: e?.firstInk ?? null,
    groundSampled: e?.ground ?? null,
    boxToBox: geo.about.top - geo.band.bottom,
    bandToInk: e?.firstInk != null ? e.firstInk - geo.band.bottom : null,
    capOvershoot: e?.firstInk != null ? geo.aboutTitle.top - e.firstInk : null,
  };
}
// BOTTOM SEAM: the last object in About → the first ink of "Featured In".
// Scanned from inside the press section's own box for the same reason: on a
// shared ground there is no colour step to confuse it, and on a changing one
// there would be.
if (geo.aboutLastFrame && geo.pressTitle) {
  const e = await inkEdge(geo.press.top + 2, geo.pressTitle.bottom, geo.pressTitle.left, 620);
  out.bottomSeam = {
    aboutLastObjectBottom: geo.aboutLastFrame.bottom,
    aboutBoxBottom: geo.about.bottom,
    pressBoxTop: geo.press.top,
    firstInk: e?.firstInk ?? null,
    groundSampled: e?.ground ?? null,
    boxToBox: geo.press.top - geo.about.bottom,
    objectToInk: e?.firstInk != null ? e.firstInk - geo.aboutLastFrame.bottom : null,
    boxTopToInk: e?.firstInk != null ? e.firstInk - geo.press.top : null,
  };
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
