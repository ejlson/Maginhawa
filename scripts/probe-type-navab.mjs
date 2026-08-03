/* NAV CONTRAST, A/B. probe-type-nav.mjs found the links at 2.98:1 deep into
   /restaurants — under the 4.5:1 floor for 13px text. The question that
   matters is whether the lighter setting CAUSED that or merely inherited it,
   and the only way to answer it is to measure both settings against the same
   pixels in the same frame:

     A  letter-spacing 0.07em, opacity 0.85   (before)
     B  letter-spacing 0.11em, opacity 0.78   (tracking AND colour)
     C  letter-spacing 0.11em, opacity 0.85   (tracking only)

   Same differential method as probe-type-nav.mjs: shoot the link, hide the
   link, shoot the identical rect, and call the changed pixels text.

   The bar hides itself on downward scroll, so the reveal is done by walking
   the scroll position UP in small steps with a frame between each — one
   immediate jump does not read as an upward gesture to Nav.tsx's listener.

   usage: node scripts/probe-type-navab.mjs [port]                          */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3220";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const SPOTS = [
  ["/", 0], ["/", 2400], ["/", 5200],
  ["/about", 0], ["/about", 2000], ["/about", 6000],
  ["/blog", 0], ["/blog", 1200],
  ["/contact", 0], ["/contact", 1400],
  ["/join-us", 0], ["/join-us", 2200],
  ["/restaurants", 0], ["/restaurants", 1600], ["/restaurants", 3600],
  ["/restaurants/belly", 0], ["/restaurants/belly", 1800],
];

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
const scratch = await b.newPage();
await scratch.goto("about:blank");
await page.bringToFront();
await page.setViewport({ width: 1440, height: 900 });

const pixels = async (clip) => {
  await page.bringToFront();
  const b64 = await page.screenshot({ clip, encoding: "base64" });
  await scratch.bringToFront();
  const out = await scratch.evaluate(async (data) => {
    const img = new Image();
    img.src = "data:image/png;base64," + data;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const o = new Array(d.length / 4);
    for (let i = 0, j = 0; i < d.length; i += 4, j++)
      o[j] = 0.2126 * f(d[i]) + 0.7152 * f(d[i + 1]) + 0.0722 * f(d[i + 2]);
    return o;
  }, b64);
  await page.bringToFront();
  return out;
};

const measure = async () => {
  const clip = await page.evaluate(() => {
    const a = document.querySelector('[class*="links"] a');
    if (!a) return null;
    const nav = a.closest("nav");
    if (nav && +getComputedStyle(nav).opacity < 0.95) return null;
    const r = a.getBoundingClientRect();
    if (r.width < 4 || r.bottom < 2) return null;
    return { x: Math.round(r.x), y: Math.max(0, Math.round(r.y)), width: Math.round(r.width), height: Math.round(r.height) };
  });
  if (!clip) return null;
  const on = await pixels(clip);
  await page.evaluate(() => {
    document.querySelector('[class*="links"] a').style.visibility = "hidden";
  });
  await sleep(220);
  const off = await pixels(clip);
  await page.evaluate(() => {
    document.querySelector('[class*="links"] a').style.visibility = "";
  });
  const d = on.map((v, i) => ({ d: Math.abs(v - off[i]), fg: v, bg: off[i] }));
  d.sort((x, y) => y.d - x.d);
  const core = d.slice(0, Math.max(1, Math.floor(d.length * 0.06)));
  if (core[0].d < 0.005) return null;
  const mean = (k) => core.reduce((a, o) => a + o[k], 0) / core.length;
  return ratio(mean("fg"), mean("bg"));
};

const setStyle = (tracking, opacity) =>
  page.evaluate(
    (t, o) => {
      let s = document.getElementById("__ab");
      if (!s) { s = document.createElement("style"); s.id = "__ab"; document.head.appendChild(s); }
      s.textContent = `[class*="links"] a{letter-spacing:${t}!important;opacity:${o}!important}`;
    },
    tracking,
    opacity,
  );

const reveal = async (y) => {
  await page.evaluate((v) => {
    if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
    else window.scrollTo(0, v);
  }, y);
  await sleep(450);
  // walk UP in steps so Nav.tsx's listener sees an upward gesture
  for (const step of [60, 60, 60]) {
    await page.evaluate((v) => {
      if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
      else window.scrollTo(0, v);
    }, Math.max(0, y - step * 3 + (180 - step * 3)));
    await sleep(120);
  }
  let cur = y;
  for (let i = 0; i < 4; i++) {
    cur = Math.max(0, cur - 55);
    await page.evaluate((v) => {
      if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
      else window.scrollTo(0, v);
    }, cur);
    await sleep(160);
  }
  await sleep(800);
};

console.log("route                  y    A .07/.85   B .11/.78   C .11/.85");
console.log("-".repeat(66));
let worstA = Infinity, worstB = Infinity, worstC = Infinity, nA = 0;

let lastRoute = null;
for (const [route, y] of SPOTS) {
  if (route !== lastRoute) {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await sleep(1500);
    lastRoute = route;
  }
  await reveal(y);

  await setStyle("0.07em", "0.85");
  await sleep(250);
  const a = await measure();

  await setStyle("0.11em", "0.78");
  await sleep(250);
  const bb = await measure();

  await setStyle("0.11em", "0.85");
  await sleep(250);
  const cc = await measure();

  if (a === null || bb === null || cc === null) {
    console.log(`${route.padEnd(22)} ${String(y).padStart(5)}  bar not visible here`);
    continue;
  }
  worstA = Math.min(worstA, a); worstB = Math.min(worstB, bb); worstC = Math.min(worstC, cc); nA++;
  const mark = (v) => (v < 4.5 ? "*" : " ");
  console.log(
    `${route.padEnd(22)} ${String(y).padStart(5)} ${a.toFixed(2).padStart(8)}${mark(a)} ${bb.toFixed(2).padStart(9)}${mark(bb)} ${cc.toFixed(2).padStart(9)}${mark(cc)}`,
  );
}

console.log("-".repeat(66));
console.log(`samples: ${nA}   worst A: ${worstA.toFixed(2)}:1   worst B: ${worstB.toFixed(2)}:1   worst C: ${worstC.toFixed(2)}:1`);
console.log("* = under the 4.5:1 floor for 13px text");
await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
