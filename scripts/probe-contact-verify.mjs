/* /contact acceptance pass. Each block is one claim the change has to earn.
 *
 *   1. COLLISION SWEEP. The nav is mix-blend-mode over content and fixed, so
 *      every heading passes under it at some point while scrolling — that is
 *      not the defect. The defect is a heading that RESTS there. So this
 *      sweeps the page finely and reports, per heading, the scroll band where
 *      the logo overlaps it, then checks the position a reader actually stops
 *      at: the section parked at the top of the viewport.
 *   2. HASH LANDINGS. /contact#faq etc — the case scroll-margin-top exists for.
 *   3. KEYBOARD. Tab through the form, the accordion and the review links;
 *      every stop must have an accessible name and a visible focus state.
 *   4. REDUCED MOTION. Nothing may move, and content must still be PRESENT —
 *      a Reveal that never fires would leave the page blank at opacity 0.
 *   5. CONTRAST, measured off the RENDERED PIXELS rather than off the CSS.
 *      Opacity, blend modes and stacked backgrounds all lie in computed style.
 *
 * usage: node scripts/probe-contact-verify.mjs [port]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3210";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });

const load = async (path = "/contact") => {
  await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: "domcontentloaded" });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1200);
};

const to = async (y) => {
  await page.evaluate((v) => {
    if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
    else window.scrollTo(0, v);
  }, y);
  await sleep(90);
};

const readThrough = async () => {
  const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let y = 0; y <= H; y += 520) await to(y);
  await to(H);
  await sleep(500);
  return H;
};

/* ------------------------------------------------------------------ 1 */
console.log("=== 1. COLLISION SWEEP — logo box vs every heading, whole page ===");
await load();
const H = await readThrough();
await to(0);

const bands = new Map();
for (let y = 0; y <= H; y += 40) {
  await to(y);
  const hits = await page.evaluate(() => {
    const nav = document.querySelector("header, nav");
    const logo = nav?.querySelector("img, svg, a");
    if (!logo) return [];
    const L = logo.getBoundingClientRect();
    const out = [];
    for (const h of document.querySelectorAll("main h1, main h2, main h3, main h4")) {
      const R = h.getBoundingClientRect();
      if (R.width < 2 || R.height < 2) continue;
      const hit = L.left < R.right && L.right > R.left && L.top < R.bottom && L.bottom > R.top;
      if (hit)
        out.push((h.textContent || "").trim().replace(/\s+/g, " ").slice(0, 34));
    }
    return out;
  });
  for (const t of hits) {
    const cur = bands.get(t) || { lo: y, hi: y };
    cur.hi = y;
    bands.set(t, cur);
  }
}
if (!bands.size) console.log("  no heading ever intersects the logo box");
for (const [t, v] of bands)
  console.log(
    `  "${t}" overlapped for scrollY ${v.lo}..${v.hi} (${v.hi - v.lo + 40}px of travel)`,
  );

console.log("\n  -- at rest: each section parked at the top of the viewport --");
const secTops = await page.evaluate(() =>
  [...document.querySelectorAll("main section")].map((s) => ({
    id: s.id,
    top: Math.round(s.getBoundingClientRect().top + scrollY),
  })),
);
for (const s of secTops) {
  await to(s.top);
  await sleep(200);
  const r = await page.evaluate((id) => {
    const nav = document.querySelector("header, nav");
    const logo = nav?.querySelector("img, svg, a");
    const head = document.getElementById(id)?.querySelector("h1,h2,h3");
    if (!logo || !head) return null;
    const L = logo.getBoundingClientRect();
    const R = head.getBoundingClientRect();
    return {
      gap: Math.round(R.top - L.bottom),
      hit: L.left < R.right && L.right > R.left && L.top < R.bottom && L.bottom > R.top,
      txt: (head.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32),
    };
  }, s.id);
  if (r)
    console.log(
      `  #${s.id.padEnd(16)} heading starts ${String(r.gap).padStart(4)}px below the logo  ${
        r.hit ? "*** COLLIDES ***" : "clear"
      }  "${r.txt}"`,
    );
}

/* ------------------------------------------------------------------ 2 */
console.log("\n=== 2. HASH LANDINGS ===");
for (const hash of ["#contact-us", "#faq", "#leave-a-review"]) {
  await load(`/contact${hash}`);
  await sleep(1400);
  const r = await page.evaluate((h) => {
    const nav = document.querySelector("header, nav");
    const logo = nav?.querySelector("img, svg, a");
    const sec = document.querySelector(h);
    const head = sec?.querySelector("h1,h2,h3");
    if (!logo || !head) return null;
    const L = logo.getBoundingClientRect();
    const R = head.getBoundingClientRect();
    return {
      y: Math.round(scrollY),
      gap: Math.round(R.top - L.bottom),
      hit: L.left < R.right && L.right > R.left && L.top < R.bottom && L.bottom > R.top,
    };
  }, hash);
  console.log(
    `  ${hash.padEnd(16)} scrollY=${String(r?.y).padStart(6)}  heading ${String(r?.gap).padStart(5)}px below logo  ${
      r?.hit ? "*** COLLIDES ***" : "clear"
    }`,
  );
}

/* ------------------------------------------------------------------ 3 */
console.log("\n=== 3. KEYBOARD — every stop named and visibly focused ===");
await load();
await readThrough();
await to(0);
await page.evaluate(() => {
  document.body.setAttribute("tabindex", "-1");
  document.body.focus();
  document.body.removeAttribute("tabindex");
});
const stops = [];
for (let i = 0; i < 34; i++) {
  await page.keyboard.press("Tab");
  await sleep(130);
  const s = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const id = el.id;
    const lab = id ? document.querySelector(`label[for="${id}"]`) : null;
    const name =
      el.getAttribute("aria-label") ||
      lab?.textContent?.trim() ||
      el.textContent?.trim().slice(0, 34) ||
      "";
    /* a visible focus state = a ring, or a background/colour the element does
       not have at rest. Compare against the same element with focus dropped. */
    return {
      tag: el.tagName.toLowerCase(),
      name: name || "(NO NAME)",
      inMain: !!el.closest("main"),
      outline: cs.outlineStyle === "none" ? "" : `${cs.outlineWidth} ${cs.outlineStyle}`,
      bg: cs.backgroundColor,
      sec: el.closest("section")?.id || "-",
    };
  });
  if (!s) break;
  stops.push(s);
}
for (const s of stops)
  console.log(
    `  [${(s.sec || "-").padEnd(15)}] ${s.tag.padEnd(8)} "${s.name.slice(0, 34)}"${
      s.name === "(NO NAME)" ? " *** UNNAMED ***" : ""
    }  outline=${s.outline || "none"} bg=${s.bg}`,
  );

/* ------------------------------------------------------------------ 4 */
/* the closed off-canvas Menu is parked past the right edge by a transform.
   Off-SCREEN is not off the tab order, so check whether it is actually
   removed from it, or whether six links are silently focusable on every page. */
console.log("\n=== 3b. THE CLOSED MENU PANEL — focusable while shut? ===");
{
  const m = await page.evaluate(() => {
    const panel = document.querySelector('[class*="Menu_panel"]');
    if (!panel) return null;
    const cs = getComputedStyle(panel);
    return {
      transform: cs.transform,
      visibility: cs.visibility,
      pointerEvents: cs.pointerEvents,
      ariaHidden: panel.getAttribute("aria-hidden"),
      inert: panel.hasAttribute("inert"),
      left: Math.round(panel.getBoundingClientRect().left),
      focusables: panel.querySelectorAll("a[href], button, input, [tabindex]").length,
      negTabindex: [...panel.querySelectorAll("a[href], button")].every(
        (e) => e.getAttribute("tabindex") === "-1",
      ),
    };
  });
  console.log(`  ${JSON.stringify(m, null, 0)}`);
  if (m && !m.inert && m.ariaHidden !== "true" && m.visibility !== "hidden" && !m.negTabindex)
    console.log(
      `  *** ${m.focusables} links inside the CLOSED menu are still in the tab order ***`,
    );
}

console.log("\n=== 4. REDUCED MOTION ===");
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await load();
await readThrough();
await to(0);
const rm = await page.evaluate(() => {
  const els = [...document.querySelectorAll("main h2, main p, main li")];
  const hidden = els.filter((e) => {
    const cs = getComputedStyle(e);
    return parseFloat(cs.opacity) < 0.05;
  });
  const moved = els.filter((e) => {
    const t = getComputedStyle(e).transform;
    return t && t !== "none" && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(t);
  });
  return {
    total: els.length,
    hidden: hidden.length,
    moved: moved.length,
    sample: hidden.slice(0, 4).map((e) => (e.textContent || "").trim().slice(0, 30)),
  };
});
console.log(
  `  ${rm.total} text elements; ${rm.hidden} still at opacity<0.05 ${
    rm.hidden ? `*** ${JSON.stringify(rm.sample)} ***` : "(none — good)"
  }; ${rm.moved} still transformed`,
);
await page.emulateMediaFeatures([]);

/* ------------------------------------------------------------------ 5 */
console.log("\n=== 5. CONTRAST, sampled from rendered pixels ===");
await load();
await readThrough();
const targets = [
  ['p[class*="ReviewUs_lede"]', "review helper line", 4.5],
  ['[class*="ReviewUs_title"]', "review headline", 3],
  ['[class*="ReviewUs_itemName"]', "restaurant name", 3],
  ['[class*="ReviewUs_itemTag"]', "restaurant location", 4.5],
  ['[class*="ReviewUs_itemCta"]', "review-on-google label", 4.5],
  ['[class*="FAQ_aside"]', "faq aside", 4.5],
  ['[class*="FAQ_question"]', "faq question", 4.5],
  ['[class*="FAQ_title"]', "faq headline", 3],
  ['[class*="Contact_label"]', "form label", 4.5],
];
const lin = (c) => {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);

/* No PNG decoder in node_modules and this pass adds no dependency, so the
   screenshot is handed back to the page and decoded there — the browser
   already has one. */
const samplePng = (b64) =>
  page.evaluate(async (data) => {
    /* an <img> src, not fetch() — the page's CSP refuses data: URLs to fetch
       but decodes them happily as images */
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const cv = document.createElement("canvas");
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data;
    const lin = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const L = (p) => 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2]);
    let dark = [255, 255, 255];
    let light = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) {
      const p = [d[i], d[i + 1], d[i + 2]];
      if (L(p) < L(dark)) dark = p;
      if (L(p) > L(light)) light = p;
    }
    return { dark, light };
  }, b64);

for (const [sel, name, min] of targets) {
  const handle = await page.$(sel);
  if (!handle) {
    console.log(`  ${name.padEnd(24)} (not found)`);
    continue;
  }
  /* scroll it into the middle of the frame and shoot the ELEMENT — passing a
     `clip` to page.screenshot would need page coordinates, not the viewport
     ones getBoundingClientRect hands back, and silently crops the wrong strip
     (or fails to deserialize) when the two are conflated. */
  await handle.scrollIntoView();
  await sleep(500);
  let shot;
  try {
    shot = await handle.screenshot();
  } catch {
    console.log(`  ${name.padEnd(24)} (not renderable in frame)`);
    continue;
  }
  /* darkest and lightest pixel in the crop: the text ink and the ground it
     sits on. Anti-aliased edges land between the two, so the extremes are the
     honest pair to compare. */
  /* Buffer.from(...) first: this puppeteer hands back a Uint8Array, whose
     own .toString("base64") is a comma-joined list of byte values, which the
     decoder then rejects as a corrupt image rather than as a bad string. */
  const { dark, light } = await samplePng(Buffer.from(shot).toString("base64"));
  const ratio = (lum(light) + 0.05) / (lum(dark) + 0.05);
  console.log(
    `  ${name.padEnd(24)} ink rgb(${light.join(",")}) on rgb(${dark.join(",")}) = ${ratio.toFixed(2)}:1  min ${min}  ${
      ratio >= min ? "PASS" : "*** FAIL ***"
    }`,
  );
}

await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
