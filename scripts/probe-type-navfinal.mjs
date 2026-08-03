/* NAV CONTRAST, WITH THE BACKGROUND HELD STILL.
   The A/B run (probe-type-navab.mjs) came back non-physical on / and
   /restaurants — a HIGHER opacity measuring LOWER contrast, and the same
   sample swinging 1.01 → 5.18 between runs. The cause is the method meeting
   the page: the differential shoots the link, hides it, and shoots again,
   and on those two routes there is VIDEO behind the bar. The frame moves
   between the two exposures, so the "pixels the link changed" are mostly
   pixels the film changed.

   So: pause every video, freeze CSS animation, and only then measure. Now
   the two exposures differ by the glyphs and nothing else.

   Also settles the 821px question — whether the wider tracking makes any
   nav link wrap at the last width that still shows them.

   usage: node scripts/probe-type-navfinal.mjs [port]                       */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3220";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/* SCOPED TO THE BAR. `[class*="links"] a` also matches the FOOTER's link
   lists — which is how an earlier run reported the identical contrast at
   y=0, y=700 and y=3600 on /restaurants: it was measuring off-screen footer
   anchors whose clip rect clamped to the top of the viewport. Anchoring the
   selector to <nav> is the fix. */
const NAVSEL = 'nav ul[class*="links"] a';

const SPOTS = [
  ["/", 0], ["/", 700],
  ["/about", 0], ["/about", 700],
  ["/blog", 0], ["/blog", 700],
  ["/contact", 0], ["/contact", 700],
  ["/join-us", 0], ["/join-us", 700],
  ["/restaurants", 0], ["/restaurants", 700], ["/restaurants", 3600],
  ["/restaurants/belly", 0], ["/restaurants/belly", 700],
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

const freeze = () =>
  page.evaluate(() => {
    document.querySelectorAll("video").forEach((v) => {
      try { v.pause(); v.autoplay = false; } catch {}
    });
    let s = document.getElementById("__freeze");
    if (!s) { s = document.createElement("style"); s.id = "__freeze"; document.head.appendChild(s); }
    s.textContent = `*,*::before,*::after{animation-play-state:paused!important}`;
  });

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

/* measure ALL five links, not just the first — the bar spans 480px and the
   photograph behind it is not uniform across that span */
const measure = async () => {
  const clips = await page.evaluate((sel) => {
    const as = [...document.querySelectorAll(sel)];
    if (!as.length) return null;
    const nav = as[0].closest("nav");
    if (nav && +getComputedStyle(nav).opacity < 0.95) return null;
    return as.map((a) => {
      const r = a.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
    }).filter((c) => c.width > 4 && c.height > 4 && c.y >= 0 && c.y + c.height <= 120);
  }, NAVSEL);
  if (!clips || !clips.length) return null;

  let worst = Infinity;
  for (let i = 0; i < clips.length; i++) {
    const on = await pixels(clips[i]);
    await page.evaluate(([sel, idx]) => {
      [...document.querySelectorAll(sel)][idx].style.visibility = "hidden";
    }, [NAVSEL, i]);
    await sleep(120);
    const off = await pixels(clips[i]);
    await page.evaluate(([sel, idx]) => {
      [...document.querySelectorAll(sel)][idx].style.visibility = "";
    }, [NAVSEL, i]);
    const d = on.map((v, j) => ({ d: Math.abs(v - off[j]), fg: v, bg: off[j] }));
    d.sort((x, y) => y.d - x.d);
    const core = d.slice(0, Math.max(1, Math.floor(d.length * 0.06)));
    if (core[0].d < 0.01) continue;
    const mean = (k) => core.reduce((a, o) => a + o[k], 0) / core.length;
    worst = Math.min(worst, ratio(mean("fg"), mean("bg")));
  }
  return worst === Infinity ? null : worst;
};

const setStyle = (t, o) =>
  page.evaluate((tt, oo) => {
    let s = document.getElementById("__ab");
    if (!s) { s = document.createElement("style"); s.id = "__ab"; document.head.appendChild(s); }
    s.textContent = `nav ul[class*="links"] a{letter-spacing:${tt}!important;opacity:${oo}!important}`;
  }, t, o);

const reveal = async (y) => {
  const go = (v) => page.evaluate((t) => {
    if (window.__lenis) window.__lenis.scrollTo(t, { immediate: true });
    else window.scrollTo(0, t);
  }, v);
  await go(y + 240);
  await sleep(400);
  let cur = y + 240;
  for (let i = 0; i < 5; i++) { cur -= 48; await go(Math.max(0, cur)); await sleep(150); }
  await sleep(700);
  await freeze();
  await sleep(250);
};

console.log("=== WORST OF THE FIVE LINKS, background frozen ===");
console.log("route                  y    A .07/.85   B .11/.78   C .11/.85");
console.log("-".repeat(66));
const worst = { A: Infinity, B: Infinity, C: Infinity };

let last = null;
for (const [route, y] of SPOTS) {
  if (route !== last) {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await sleep(1600);
    last = route;
  }
  await reveal(y);

  const out = {};
  for (const [k, t, o] of [["A", "0.07em", "0.85"], ["B", "0.11em", "0.78"], ["C", "0.11em", "0.85"]]) {
    await setStyle(t, o);
    await sleep(200);
    out[k] = await measure();
  }
  if (out.A == null || out.B == null || out.C == null) {
    console.log(`${route.padEnd(22)} ${String(y).padStart(5)}  bar not visible here`);
    continue;
  }
  for (const k of ["A", "B", "C"]) worst[k] = Math.min(worst[k], out[k]);
  const m = (v) => (v < 4.5 ? "*" : " ");
  console.log(
    `${route.padEnd(22)} ${String(y).padStart(5)} ${out.A.toFixed(2).padStart(8)}${m(out.A)} ${out.B.toFixed(2).padStart(9)}${m(out.B)} ${out.C.toFixed(2).padStart(9)}${m(out.C)}`,
  );
}
console.log("-".repeat(66));
console.log(`worst  A ${worst.A.toFixed(2)}:1   B ${worst.B.toFixed(2)}:1   C ${worst.C.toFixed(2)}:1     * = under 4.5:1`);

/* ---------- INK DENSITY, three settings ---------- */
await page.goto("about:blank");
await page.setViewport({ width: 900, height: 300 });
await page.evaluate(() => {
  document.body.style.cssText = "margin:0;background:#fff";
  const STACK = 'Helvetica, "Helvetica Neue", Arial, "Liberation Sans", sans-serif';
  for (const [id, tr, op] of [["A", "0.07em", "0.85"], ["B", "0.11em", "0.78"], ["C", "0.11em", "0.85"]]) {
    const d = document.createElement("div");
    d.id = id;
    d.textContent = "RESTAURANTS BLOG ABOUT US CAREERS CONTACT US";
    d.style.cssText = `font-family:${STACK};font-size:13px;font-weight:400;text-transform:uppercase;letter-spacing:${tr};opacity:${op};color:#000;white-space:nowrap;display:inline-block;padding:4px 0`;
    document.body.appendChild(d);
    document.body.appendChild(document.createElement("br"));
  }
});
await page.evaluate(() => document.fonts.ready);
await sleep(300);
console.log("\n=== INK DENSITY (mean ink per pixel of the text band) ===");
const inks = {};
for (const id of ["A", "B", "C"]) {
  const el = await page.$(`#${id}`);
  const box = await el.boundingBox();
  const b64 = await el.screenshot({ encoding: "base64" });
  await scratch.bringToFront();
  const v = await scratch.evaluate(async (data) => {
    const img = new Image(); img.src = "data:image/png;base64," + data; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    let ink = 0; const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4)
      ink += Math.max(0, 1 - (0.2126 * f(d[i]) + 0.7152 * f(d[i + 1]) + 0.0722 * f(d[i + 2])));
    return ink / n;
  }, b64);
  await page.bringToFront();
  inks[id] = v;
  console.log(`  ${id}  ink ${v.toFixed(4)}   width ${box.width.toFixed(1)}px`);
}
console.log(`  B is ${(((inks.A - inks.B) / inks.A) * 100).toFixed(1)}% lighter than A`);
console.log(`  C is ${(((inks.A - inks.C) / inks.A) * 100).toFixed(1)}% lighter than A  (tracking alone)`);

/* ---------- 821px WRAP CHECK ---------- */
await page.setViewport({ width: 821, height: 900 });
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 }).catch(() => {});
await page.evaluate(() => document.fonts.ready);
await sleep(1200);
const wrap = await page.evaluate((sel) => {
  const as = [...document.querySelectorAll(sel)];
  const ul = document.querySelector('nav [class*="links"]');
  const logo = document.querySelector('[class*="logo"]');
  return {
    perLink: as.map((a) => {
      const r = a.getBoundingClientRect();
      const cs = getComputedStyle(a);
      const lines = Math.round((r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / parseFloat(cs.lineHeight || "18"));
      return { text: a.textContent.trim(), w: +r.width.toFixed(1), h: +r.height.toFixed(1), lineHeight: cs.lineHeight, lines };
    }),
    listWidth: +ul.getBoundingClientRect().width.toFixed(1),
    listRight: +ul.getBoundingClientRect().right.toFixed(1),
    gapToLogo: +(ul.getBoundingClientRect().left - logo.getBoundingClientRect().right).toFixed(1),
    viewport: 821,
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}, NAVSEL);
console.log("\n=== 821px (last width that shows inline links) ===");
console.log(JSON.stringify(wrap, null, 2));

await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
