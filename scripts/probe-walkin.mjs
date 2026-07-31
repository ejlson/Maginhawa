/* The walk-in note on /restaurants.

   Three ways it can go wrong quietly:
   - it names the wrong venues (Bunso is bookable:false because it has not
     OPENED, which is not a walk-in policy);
   - it collides with the view toggle it is supposed to share a line with;
   - it sits over .cards below 980px and steals the wheel, undoing the
     data-lenis-prevent fix that made the card grid scrollable at all.

   usage: node scripts/probe-walkin.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "50853";
const BASE = `http://localhost:${PORT}/restaurants`;
const s = (ms) => new Promise((r) => setTimeout(r, ms));

let fails = 0;
const rec = (id, ok, detail) => {
  if (!ok) fails++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${id}  ${detail}`);
};

const lin = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const CREAM = 0.2126 * lin(250) + 0.7152 * lin(247) + 0.0722 * lin(241);

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});

const open = async (W, H) => {
  const p = await b.newPage();
  await p.setViewport({ width: W, height: H });
  await p.goto(BASE, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 });
  await p.evaluate(() => document.fonts.ready);
  await s(2200);
  return p;
};

const geom = (p) =>
  p.evaluate(() => {
    const n = document.querySelector('[class*="RestaurantsShowcase_walkIn"]');
    const t = document.querySelector('[class*="RestaurantsShowcase_viewToggle"]');
    const nr = n.getBoundingClientRect();
    const tr = t.getBoundingClientRect();
    const hit = document.elementFromPoint(nr.x + nr.width / 2, nr.y + nr.height / 2);
    return {
      text: n.innerText.replace(/\s+/g, " ").trim(),
      note: { x: nr.x, y: nr.y, w: nr.width, h: nr.height, r: nr.right, b: nr.bottom },
      toggle: { x: tr.x, y: tr.y, w: tr.width, r: tr.right, b: tr.bottom },
      overlap: !(nr.right < tr.left || nr.left > tr.right || nr.bottom < tr.top || nr.top > tr.bottom),
      clipped: nr.right > window.innerWidth + 0.5 || nr.left < -0.5 || nr.bottom > window.innerHeight + 0.5,
      pe: getComputedStyle(n).pointerEvents,
      radius: getComputedStyle(n).borderTopLeftRadius,
      // whatever is under the note's centre must NOT be the note itself
      hitTag: hit?.tagName,
      hitClass: typeof hit?.className === "string" ? hit.className : "",
    };
  });

/* ---- AC-5.1 / AC-5.3 across the desktop widths ---- */
for (const [W, H] of [[1920, 1080], [1440, 900], [1280, 800], [1024, 800]]) {
  const p = await open(W, H);
  const g = await geom(p);
  console.log(`\n===== ${W}x${H} (wheel view) =====`);
  if (W === 1920) {
    rec("AC-5.1", ["Mamasons", "Hoodwood", "Café Mama & Sons"].every((n) => g.text.includes(n)) && !g.text.includes("Bunso"),
      `"${g.text}"`);
  }
  rec("AC-5.3", !g.overlap && !g.clipped,
    `note ${Math.round(g.note.x)}..${Math.round(g.note.r)} x ${Math.round(g.note.y)}..${Math.round(g.note.b)} (${Math.round(g.note.w)}x${Math.round(g.note.h)})  toggle ${Math.round(g.toggle.x)}..${Math.round(g.toggle.r)}  gap ${Math.round(g.note.x - g.toggle.r)}px`);
  rec("wheel-safe", g.pe === "none" && g.hitTag !== "P",
    `pointer-events ${g.pe}; element under its centre = ${g.hitTag}.${g.hitClass.split(" ")[0] || ""}`);
  await p.close();
}

/* ---- AC-5.4 card view at 900x800 ---- */
{
  const p = await open(900, 800);
  await p.evaluate(() => {
    [...document.querySelectorAll('[class*="viewToggle"] button')]
      .find((b) => b.getAttribute("aria-label") === "Card view")
      .click();
  });
  await s(900);
  const g = await geom(p);
  console.log(`\n===== 900x800 (card view) =====`);

  // does the note sit over the last card's action buttons?
  const clash = await p.evaluate(() => {
    const n = document.querySelector('[class*="RestaurantsShowcase_walkIn"]').getBoundingClientRect();
    const cards = [...document.querySelectorAll('[class*="RestaurantsShowcase_card"]')];
    const btns = cards.flatMap((c) => [...c.querySelectorAll("a, button")]);
    const hits = btns
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => !(r.right < n.left || r.left > n.right || r.bottom < n.top || r.top > n.bottom))
      .map(({ el }) => `${el.tagName}:${el.innerText.trim().slice(0, 12)}`);
    return hits;
  });
  rec("AC-5.4a", clash.length === 0,
    `card actions intersecting the note: ${clash.length ? clash.join(", ") : "none"}`);

  // a wheel notch over the note must still scroll the GRID, not the page.
  // p.mouse.wheel, not a synthetic WheelEvent: an untrusted event never
  // scrolls anything, so a dispatched one would "pass" against a broken page
  // and "fail" against a working one for the same reason.
  const nbox = await p.evaluate(() => {
    const r = document.querySelector('[class*="RestaurantsShowcase_walkIn"]').getBoundingClientRect();
    const box = document.querySelector('[class*="RestaurantsShowcase_cards"]');
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, box: box.scrollTop, page: window.scrollY,
             scrollable: box.scrollHeight - box.clientHeight };
  });
  await p.mouse.move(nbox.x, nbox.y);
  for (let i = 0; i < 6; i++) {
    await p.mouse.wheel({ deltaY: 200 });
    await s(120);
  }
  await s(600);
  const scrolled = await p.evaluate((b0) => {
    const box = document.querySelector('[class*="RestaurantsShowcase_cards"]');
    return { boxDelta: box.scrollTop - b0.box, pageDelta: window.scrollY - b0.page, scrollable: b0.scrollable };
  }, nbox);
  rec("AC-5.4b", scrolled.scrollable <= 0 || scrolled.boxDelta > 0,
    `grid travelled ${scrolled.boxDelta}px (of ${scrolled.scrollable}px available), page travelled ${scrolled.pageDelta}px`);
  await p.close();
}

/* ---- AC-5.5 contrast, AC-5.6 phone ---- */
for (const [W, H, view] of [[1440, 900, "wheel"], [900, 800, "cards"], [390, 844, "wheel"]]) {
  const p = await open(W, H);
  if (view === "cards") {
    await p.evaluate(() => {
      [...document.querySelectorAll('[class*="viewToggle"] button')]
        .find((b) => b.getAttribute("aria-label") === "Card view")
        .click();
    });
    await s(900);
  }
  const g = await geom(p);
  // Hide the glyphs, screenshot, take the BRIGHTEST composited pixel inside
  // the plaque — the worst case the cream type has to survive.
  // Inset horizontally by half the plaque's height: the radius is 999px, so a
  // full-width crop's four corners fall OUTSIDE the pill onto whatever is
  // behind it, and over a bright card photo that corner is what the max picks
  // up. No glyph ever sits there.
  const box = await p.evaluate(() => {
    const n = document.querySelector('[class*="RestaurantsShowcase_walkIn"]');
    const r = n.getBoundingClientRect();
    n.style.color = "transparent";
    const inset = Math.round(r.height / 2);
    return { x: Math.round(r.x) + inset, y: Math.round(r.y + 4),
             width: Math.round(r.width) - inset * 2, height: Math.round(r.height - 8) };
  });
  const b64 = await p.screenshot({ type: "png", encoding: "base64", captureBeyondViewport: false });
  const mx = await p.evaluate(async (data, c0) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c0.width;
    c.height = c0.height;
    const g2 = c.getContext("2d", { willReadFrequently: true });
    g2.drawImage(img, c0.x, c0.y, c0.width, c0.height, 0, 0, c0.width, c0.height);
    const px = g2.getImageData(0, 0, c.width, c.height).data;
    const l = (v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
    let m = 0;
    for (let k = 0; k < px.length; k += 4) {
      const v = 0.2126 * l(px[k]) + 0.7152 * l(px[k + 1]) + 0.0722 * l(px[k + 2]);
      if (v > m) m = v;
    }
    return m;
  }, b64, box);
  const ratio = (CREAM + 0.05) / (mx + 0.05);
  console.log(`\n===== ${W}x${H} (${view} view) =====`);
  rec("AC-5.5", ratio >= 4.5, `brightest plaque pixel L ${mx.toFixed(4)} → cream contrast ${ratio.toFixed(2)}:1`);
  if (W === 390)
    rec("AC-5.6", !g.clipped && g.note.w > 40 && g.note.h > 10 && !g.overlap,
      `note ${Math.round(g.note.w)}x${Math.round(g.note.h)} r=${g.radius} at ${Math.round(g.note.x)},${Math.round(g.note.y)}  toggle right edge ${Math.round(g.toggle.r)}  clipped=${g.clipped}  overlapsToggle=${g.overlap}`);
  await p.close();
}

await b.close();
console.log(`\n${fails === 0 ? "ALL PASS" : `${fails} FAILURE(S)`}`);
process.exit(fails === 0 ? 0 : 1);
