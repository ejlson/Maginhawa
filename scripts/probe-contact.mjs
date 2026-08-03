/* THE /contact AUDIT — grid edges, the nav collision, and the heading outline.
 *
 * Everything here has one precondition that is easy to get wrong: this page is
 * built out of `Reveal`, which is `whileInView`. A `fullPage` screenshot does
 * NOT fire IntersectionObserver, so a naive capture renders every un-entered
 * section as blank ground and every measurement below as `opacity:0` garbage.
 * `readThrough()` therefore walks the page down in viewport-sized steps, the
 * way a reader does, and only then measures.
 *
 *   1. LEFT EDGES. Every laid-out element's x, clustered. Near-misses (two
 *      edges within ~12px) are the defect — a 9px offset reads as a mistake
 *      where a 90px one reads as a decision.
 *   2. THE 1529 GHOST. Six elements were reported parked ~89px off the right
 *      edge of a 1440 viewport with no document overflow. Identify them.
 *   3. NAV COLLISION. The nav is `mix-blend-mode: difference` over content and
 *      is out of scope to change, so every section's own top must clear it.
 *      Walks each section to its in-frame position and intersects the nav's
 *      logo box with the section's first heading box.
 *   4. HEADING OUTLINE. h1..h6 in document order, to catch the /about defect
 *      (styled <span> eyebrows leaving whole sections with no heading).
 *   5. FORM. Every control's accessible name at each viewport.
 *
 * usage: node scripts/probe-contact.mjs [port]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3210";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
  ],
});
const page = await b.newPage();

const settle = async () => {
  await page.goto(`http://localhost:${PORT}/contact`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1200);
};

const to = async (y) => {
  await page.evaluate((v) => {
    if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
    else window.scrollTo(0, v);
  }, y);
  await sleep(160);
};

/* Walk the whole page in viewport steps so every `whileInView` has actually
   entered. Without this the measurements below are all taken against hidden,
   y-offset elements. */
const readThrough = async () => {
  const h = await page.evaluate(
    () => document.documentElement.scrollHeight - innerHeight,
  );
  const vh = await page.evaluate(() => innerHeight);
  for (let y = 0; y <= h; y += Math.round(vh * 0.6)) await to(y);
  await to(h);
  await sleep(700);
  await to(0);
  await sleep(400);
  return h;
};

const label = (sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? el.className : null;
  }, sel);

/* ------------------------------------------------------------------ 1 */
async function leftEdges(w, h) {
  await page.setViewport({ width: w, height: h });
  await settle();
  await readThrough();
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("main *")) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      /* Skip everything inside an <svg>. The four paths of the Google "G" sit
         one to five pixels apart by definition — that is letterform geometry,
         not a layout edge, and counting it buries the handful of edges that
         actually are the page's column system. Same for icon-sized boxes. */
      if (el.closest("svg")) continue;
      if (r.width < 24) continue;
      out.push({
        x: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width),
        tag: el.tagName.toLowerCase(),
        cls:
          typeof el.className === "string"
            ? el.className.slice(0, 58)
            : "(svg)",
        txt: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 34),
      });
    }
    return out;
  });
}

function cluster(rows, key = "x") {
  const counts = new Map();
  for (const r of rows) counts.set(r[key], (counts.get(r[key]) || 0) + 1);
  return [...counts.entries()].sort((a, z) => a[0] - z[0]);
}

console.log("=== 1. LEFT EDGES @1440x900 ===");
const rows = await leftEdges(1440, 900);
const edges = cluster(rows);
console.log("distinct left edges:", edges.length);
for (const [x, n] of edges) {
  const ex = rows.filter((r) => r.x === x).slice(0, 3);
  console.log(
    `  x=${String(x).padStart(5)}  n=${String(n).padStart(3)}  ` +
      ex.map((e) => `${e.tag}.${e.cls.split(" ")[0]}`).join(" | "),
  );
}
/* The census above still counts inline spans mid-line (the second half of
   "Mon – Fri", a pill's label), which are positions within a text flow rather
   than column edges. The list below is the thing the grid pass is actually
   about: the left edge of every LAYOUT landmark on the route. */
console.log("\nCOLUMN EDGES — the layout landmarks, one line each:");
{
  const marks = await page.evaluate(() => {
    const want = [
      ['[class*="Contact_wordmark"]', "Contact wordmark"],
      ['[class*="Contact_info"]', "Contact enquiries col"],
      ['form[class*="Contact_form"]', "Contact form"],
      ['[class*="FAQ_head"]:not([class*="headTop"])', "FAQ heading rail"],
      ['ul[class*="FAQ_list"]', "FAQ accordion"],
      ['[class*="ReviewUs_title"]', "Review headline"],
      ['p[class*="ReviewUs_lede"]', "Review helper line"],
      ['ul[class*="ReviewUs_grid"] > li:nth-child(1)', "Review col 1"],
      ['ul[class*="ReviewUs_grid"] > li:nth-child(2)', "Review col 2"],
      ['ul[class*="ReviewUs_grid"] > li:nth-child(3)', "Review col 3"],
      ['[class*="Footer_blurb"]', "Footer blurb"],
      ['[class*="Footer_invite"]', "Footer invite"],
      ['[class*="Footer_col"]:nth-child(1)', "Footer col 1"],
    ];
    return want.map(([sel, name]) => {
      const el = document.querySelector(sel);
      return { name, x: el ? Math.round(el.getBoundingClientRect().left) : null };
    });
  });
  for (const m of marks)
    console.log(`  ${m.name.padEnd(24)} x=${m.x === null ? "(absent)" : m.x}`);
  const distinct = [...new Set(marks.map((m) => m.x).filter((x) => x !== null))].sort(
    (a, z) => a - z,
  );
  console.log(`  => ${distinct.length} distinct landmark edges: ${distinct.join(", ")}`);
}

/* near-misses: pairs of edges within 12px of each other */
console.log("\nNEAR-MISSES (<=12px apart — the damaging kind):");
for (let i = 1; i < edges.length; i++) {
  const d = edges[i][0] - edges[i - 1][0];
  if (d > 0 && d <= 12)
    console.log(`  *** ${edges[i - 1][0]} vs ${edges[i][0]} — ${d}px apart ***`);
}

/* ------------------------------------------------------------------ 2 */
console.log("\n=== 2. THE 1529 GHOST (x > viewport width) ===");
{
  const vw = await page.evaluate(() => innerWidth);
  const off = rows.filter((r) => r.x >= vw - 8);
  console.log(`viewport=${vw}  elements at/after the right edge: ${off.length}`);
  for (const r of off)
    console.log(
      `  x=${r.x} right=${r.right} w=${r.w}  <${r.tag} class="${r.cls}">  "${r.txt}"`,
    );
  const doc = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  console.log(`documentElement scrollWidth=${doc.sw} clientWidth=${doc.cw}`);
  /* who clips them? walk up for the first non-visible overflow */
  const clipper = await page.evaluate((vwIn) => {
    const res = [];
    for (const el of document.querySelectorAll("main *")) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (Math.round(r.left) < vwIn - 8) continue;
      let p = el.parentElement;
      const chain = [];
      while (p && p !== document.body) {
        const cs = getComputedStyle(p);
        chain.push(
          `${p.tagName.toLowerCase()}.${(typeof p.className === "string" ? p.className : "").split(" ")[0]}[of=${cs.overflowX}]`,
        );
        if (cs.overflowX !== "visible") break;
        p = p.parentElement;
      }
      res.push({
        cls: typeof el.className === "string" ? el.className.slice(0, 40) : "",
        chain: chain.slice(-4).join(" < "),
      });
    }
    return res;
  }, vw);
  for (const c of clipper) console.log(`  ${c.cls}\n     ancestors: ${c.chain}`);
}

/* ------------------------------------------------------------------ 3 */
console.log("\n=== 3. NAV COLLISION — nav logo box vs each section heading ===");
async function collisions() {
  await to(0);
  const sections = await page.evaluate(() =>
    [...document.querySelectorAll("main section")].map((s) => ({
      id: s.id,
      top: Math.round(s.getBoundingClientRect().top + scrollY),
      h: Math.round(s.getBoundingClientRect().height),
    })),
  );
  const out = [];
  for (const s of sections) {
    /* park the section's own top just under the nav, the position a reader
       lands in when the section comes into frame */
    for (const frac of [0, 0.04, 0.1]) {
      await to(Math.max(0, s.top - 8 + s.h * frac));
      await sleep(220);
      const r = await page.evaluate((secId) => {
        const nav = document.querySelector("header, nav");
        const logo = nav?.querySelector("img, svg, a");
        const sec = document.getElementById(secId);
        const head = sec?.querySelector("h1,h2,h3,[class*='word'],[class*='title']");
        if (!logo || !head) return null;
        const L = logo.getBoundingClientRect();
        const H = head.getBoundingClientRect();
        const navBox = nav.getBoundingClientRect();
        const hit =
          L.left < H.right && L.right > H.left && L.top < H.bottom && L.bottom > H.top;
        return {
          logo: [Math.round(L.left), Math.round(L.top), Math.round(L.right), Math.round(L.bottom)],
          head: [Math.round(H.left), Math.round(H.top), Math.round(H.right), Math.round(H.bottom)],
          navBottom: Math.round(navBox.bottom),
          hit,
          txt: (head.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30),
        };
      }, s.id);
      if (r) out.push({ id: s.id, frac, ...r });
    }
  }
  return out;
}
for (const c of await collisions()) {
  console.log(
    `  #${(c.id || "?").padEnd(16)} f=${String(c.frac).padEnd(5)} navBot=${String(c.navBottom).padStart(3)} ` +
      `logo=[${c.logo.join(",")}] head=[${c.head.join(",")}] ` +
      `${c.hit ? `*** COLLIDES *** "${c.txt}"` : "clear"}`,
  );
}

/* ------------------------------------------------------------------ 4 */
console.log("\n=== 4. HEADING OUTLINE ===");
{
  await settle();
  await readThrough();
  const hs = await page.evaluate(() =>
    [...document.querySelectorAll("main h1,main h2,main h3,main h4,main h5,main h6")].map(
      (h) => ({
        lvl: +h.tagName[1],
        txt: (h.textContent || "").trim().replace(/\s+/g, " ").slice(0, 56),
        sec: h.closest("section")?.id || "-",
      }),
    ),
  );
  for (const h of hs)
    console.log(`  ${"  ".repeat(h.lvl - 1)}h${h.lvl}  [${h.sec}]  ${h.txt}`);
  const secs = await page.evaluate(() =>
    [...document.querySelectorAll("main section")].map((s) => ({
      id: s.id,
      hasHeading: !!s.querySelector("h1,h2,h3,h4,h5,h6"),
    })),
  );
  for (const s of secs)
    console.log(
      `  section #${s.id} ${s.hasHeading ? "has a heading" : "*** NO HEADING ***"}`,
    );
}

/* ------------------------------------------------------------------ 5 */
console.log("\n=== 5. FORM + REVIEW GRID + FAQ across viewports ===");
for (const [w, h] of [
  [1440, 900],
  [1920, 1080],
  [820, 1180],
  [390, 844],
]) {
  await page.setViewport({ width: w, height: h });
  await settle();
  await readThrough();
  const r = await page.evaluate(() => {
    const fields = [...document.querySelectorAll("input,textarea,button[type=submit]")].map(
      (el) => {
        const id = el.id;
        const lab = id ? document.querySelector(`label[for="${id}"]`) : null;
        return {
          tag: el.tagName.toLowerCase(),
          name: el.name || "",
          named:
            el.getAttribute("aria-label") ||
            lab?.textContent?.trim() ||
            el.textContent?.trim() ||
            "(none)",
        };
      },
    );
    const gridUl = document.querySelector('[class*="ReviewUs"] ul, ul[class*="grid"]');
    const cols = gridUl
      ? getComputedStyle(gridUl).gridTemplateColumns.split(" ").length
      : 0;
    const items = gridUl ? gridUl.children.length : 0;
    const faqRows = document.querySelectorAll("#faq li").length;
    const sw = document.documentElement.scrollWidth;
    const cw = document.documentElement.clientWidth;
    return { fields, cols, items, faqRows, sw, cw };
  });
  console.log(
    `\n  ${w}x${h}: reviewGrid ${r.cols} cols x ${r.items} items (last row ${
      r.items % r.cols === 0 ? "full" : `${r.items % r.cols}/${r.cols} filled`
    }), faq rows=${r.faqRows}, hOverflow=${r.sw > r.cw ? `*** ${r.sw}>${r.cw} ***` : "none"}`,
  );
  for (const f of r.fields)
    console.log(
      `     ${f.tag}[${f.name}] -> "${f.named}"${f.named === "(none)" ? " *** UNLABELLED ***" : ""}`,
    );
}

/* close can hang on GPU-backed headless Chrome — race it and hard-exit */
await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
