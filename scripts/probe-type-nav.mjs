/* THE NAVBAR, MEASURED. The ask was "lighter nav links" against a family
   with no Light on two of three platforms, so the effect has to come from
   tracking and colour — and both of those have to be paid for and checked:

     INK       tracking lowers the perceived weight of a line of caps by
               lowering its ink density. Rendered off-page with no blend
               mode, at the old and the new setting, counting the fraction
               of pixels in the text band that carry ink.
     WIDTH     tracking costs horizontal space, and the links have a hard
               floor: below 821px they are replaced by the burger, so the
               whole set must still fit the lane at exactly 821.
     CONTRAST  the bar runs mix-blend-mode: difference, so the links' real
               contrast is a function of whatever is behind them. Sampled
               from the composited screenshot on every route, at the top of
               the page and again over a photograph.

   usage: node scripts/probe-type-nav.mjs [port]                           */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3220";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STACK = 'Helvetica, "Helvetica Neue", Arial, "Liberation Sans", sans-serif';

/* Decode a base64 PNG and REDUCE IT IN THE PAGE, returning a handful of
   numbers rather than one float per pixel. Two reasons, both learned the
   hard way: shipping ~20k floats back over CDP is slow enough to trip the
   protocol timeout, and the reduction is what the caller wanted anyway.
   The decode happens in a scratch tab so the canvas never lands in a
   document we are about to screenshot — and both tabs get an explicit
   bringToFront, because a headless BACKGROUND tab cannot be captured and
   the screenshot simply hangs. */
const analyse = async (page, scratch, b64) => {
  await scratch.bringToFront();
  const out = await scratch.evaluate(async (data) => {
    const img = new Image();
    img.src = "data:image/png;base64," + data;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const ls = new Float64Array(px.length / 4);
    for (let i = 0, j = 0; i < px.length; i += 4, j++)
      ls[j] = 0.2126 * f(px[i]) + 0.7152 * f(px[i + 1]) + 0.0722 * f(px[i + 2]);
    let ink = 0;
    for (const l of ls) ink += Math.max(0, 1 - l);
    const sorted = Array.from(ls).sort((a, b) => a - b);
    const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
    return {
      n: sorted.length,
      inkMean: ink / sorted.length,
      p03: at(0.03),
      p10: at(0.1),
      p50: at(0.5),
      p90: at(0.9),
      p97: at(0.97),
    };
  }, b64);
  await page.bringToFront();
  return out;
};

const lum = (r, g, b) => {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
const scratch = await b.newPage();
await scratch.goto("about:blank");

/* ---------- 1. INK DENSITY, off-page, no blend ---------- */
await page.setViewport({ width: 900, height: 200 });
await page.goto("about:blank");
await page.evaluate(
  (stack) => {
    document.body.style.cssText = "margin:0;background:#fff";
    for (const [id, tr, op] of [
      ["old", "0.07em", "0.85"],
      ["new", "0.11em", "0.78"],
    ]) {
      const d = document.createElement("div");
      d.id = id;
      d.textContent = "RESTAURANTS ABOUT BLOG JOIN US CONTACT";
      d.style.cssText = `font-family:${stack};font-size:13px;font-weight:400;text-transform:uppercase;letter-spacing:${tr};opacity:${op};color:#000;white-space:nowrap;display:inline-block;padding:4px 0`;
      document.body.appendChild(d);
      document.body.appendChild(document.createElement("br"));
    }
  },
  STACK,
);
await page.evaluate(() => document.fonts.ready);
await sleep(300);

const ink = {};
const widths = {};
for (const id of ["old", "new"]) {
  const el = await page.$(`#${id}`);
  const box = await el.boundingBox();
  widths[id] = +box.width.toFixed(1);
  await page.bringToFront();
  const b64 = await el.screenshot({ encoding: "base64" });
  const a = await analyse(page, scratch, b64);
  ink[id] = +a.inkMean.toFixed(4);
}

console.log("=== INK DENSITY (mean ink per pixel of the text band) ===");
console.log(`  old  0.07em / opacity .85 : ${ink.old}   width ${widths.old}px`);
console.log(`  new  0.11em / opacity .78 : ${ink.new}   width ${widths.new}px`);
console.log(
  `  -> ${(((ink.old - ink.new) / ink.old) * 100).toFixed(1)}% lighter line, +${(widths.new - widths.old).toFixed(1)}px wide`,
);

/* ---------- 2. FIT AT THE 821px BREAKPOINT ---------- */
await page.setViewport({ width: 821, height: 900 });
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);
await sleep(1000);

const fit = await page.evaluate(() => {
  const nav = document.querySelector("header, nav")?.closest("header, nav") ||
    document.querySelector('[class*="nav"]');
  const ul = document.querySelector('[class*="links"]');
  if (!ul) return { error: "no links list found" };
  const links = [...ul.querySelectorAll("a")];
  const r = ul.getBoundingClientRect();
  const navR = (nav || document.body).getBoundingClientRect();
  const logo = document.querySelector('[class*="logo"]');
  const logoR = logo?.getBoundingClientRect();
  const cs = getComputedStyle(links[0]);
  return {
    linksWidth: +r.width.toFixed(1),
    linksLeft: +r.left.toFixed(1),
    linksRight: +r.right.toFixed(1),
    navWidth: +navR.width.toFixed(1),
    logoRight: logoR ? +logoR.right.toFixed(1) : null,
    laneFree: logoR ? +(r.left - logoR.right).toFixed(1) : null,
    tracking: cs.letterSpacing,
    weight: cs.fontWeight,
    size: cs.fontSize,
    opacity: cs.opacity,
    family: cs.fontFamily,
    labels: links.map((a) => a.textContent.trim()),
    anyWrapped: links.some((a) => a.getBoundingClientRect().height > 30),
  };
});
console.log("\n=== FIT AT 821px (the breakpoint where links become a burger) ===");
console.log(JSON.stringify(fit, null, 2));

/* ---------- 3. CONTRAST ON EVERY ROUTE, composited ----------
   Measured DIFFERENTIALLY, because two things defeat the obvious approach.
   The bar runs mix-blend-mode: difference, so "the text colour" is not a
   value in any stylesheet — it is |backdrop − cream| and changes with every
   pixel behind it. And a luminance-percentile guess at which pixels are text
   inverts silently when the bar sits over a dark photograph (light text on
   dark ground puts the TEXT in the top percentile, not the bottom).
   So: screenshot the link, hide only that link, screenshot the identical
   rect again. The second frame is the exact local background. Pixels that
   changed are text; the contrast is their core against the background that
   was underneath them.

   The nav also HIDES ITSELF on scroll-down (Nav.tsx animates opacity to 0),
   so every sample scrolls DOWN to the target and then back UP 220px — which
   is both what reveals the bar and how a reader actually meets it. */
const ROUTES = ["/", "/about", "/blog", "/contact", "/join-us", "/restaurants", "/restaurants/belly"];
console.log("\n=== NAV LINK CONTRAST (composited, through the difference blend) ===");

const shot = async (clip) => {
  await page.bringToFront();
  const b64 = await page.screenshot({ clip, encoding: "base64" });
  await scratch.bringToFront();
  const px = await scratch.evaluate(async (data) => {
    const img = new Image();
    img.src = "data:image/png;base64," + data;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const out = new Array(d.length / 4);
    for (let i = 0, j = 0; i < d.length; i += 4, j++)
      out[j] = 0.2126 * f(d[i]) + 0.7152 * f(d[i + 1]) + 0.0722 * f(d[i + 2]);
    return out;
  }, b64);
  await page.bringToFront();
  return px;
};

const worst = { route: null, where: null, r: Infinity };
for (const route of ROUTES) {
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1400);

  for (const [where, y] of [["top", 0], ["mid", 1600], ["deep", 3600]]) {
    await page.evaluate((v) => {
      if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
      else window.scrollTo(0, v);
    }, y);
    await sleep(500);
    if (y > 0) {
      // scroll back UP to reveal the bar (it hides on downward scroll)
      await page.evaluate((v) => {
        if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
        else window.scrollTo(0, v);
      }, y - 220);
      await sleep(1000);
    }

    const clip = await page.evaluate(() => {
      const ul = document.querySelector('[class*="links"]');
      const a = ul?.querySelector("a");
      if (!a) return null;
      const nav = a.closest("nav");
      if (nav && +getComputedStyle(nav).opacity < 0.9) return { hidden: true };
      const r = a.getBoundingClientRect();
      if (r.width < 4 || r.bottom < 0) return null;
      return { x: Math.round(r.x), y: Math.max(0, Math.round(r.y)), width: Math.round(r.width), height: Math.round(r.height) };
    });
    if (!clip) { console.log(`  ${route.padEnd(20)} ${where.padEnd(6)} no links (burger breakpoint / not rendered)`); continue; }
    if (clip.hidden) { console.log(`  ${route.padEnd(20)} ${where.padEnd(6)} bar still hidden, skipped`); continue; }

    const withText = await shot(clip);
    await page.evaluate(() => {
      const a = document.querySelector('[class*="links"] a');
      a.dataset.prevVis = a.style.visibility;
      a.style.visibility = "hidden";
    });
    await sleep(160);
    const without = await shot(clip);
    await page.evaluate(() => {
      const a = document.querySelector('[class*="links"] a');
      a.style.visibility = a.dataset.prevVis || "";
    });

    // text pixels = those the link changed; take the most-changed decile as
    // the glyph core, and compare it to the background that was under it
    const deltas = withText.map((v, i) => ({ d: Math.abs(v - without[i]), fg: v, bg: without[i] }));
    deltas.sort((a, b) => b.d - a.d);
    const core = deltas.slice(0, Math.max(1, Math.floor(deltas.length * 0.06)));
    if (!core.length || core[0].d < 0.005) { console.log(`  ${route.padEnd(20)} ${where.padEnd(6)} link invisible here (no pixel changed)`); continue; }
    const mean = (xs, k) => xs.reduce((a, o) => a + o[k], 0) / xs.length;
    const fg = mean(core, "fg");
    const bg = mean(core, "bg");
    const r = ratio(fg, bg);
    if (r < worst.r) Object.assign(worst, { route, where, r });
    console.log(
      `  ${route.padEnd(20)} ${where.padEnd(6)} ${r.toFixed(2).padStart(6)}:1   text L=${fg.toFixed(3)}  ground L=${bg.toFixed(3)}`,
    );
  }
}
console.log(`\n  WORST: ${worst.r.toFixed(2)}:1 on ${worst.route} (${worst.where})   [WCAG floor for 13px text: 4.5:1]`);

await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
