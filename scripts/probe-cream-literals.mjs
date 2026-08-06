/* THE CREAM-LITERAL PROBE — hairlines, boundaries and fills, not text.

   WHY THIS EXISTS ALONGSIDE probe-palette-blastradius.mjs. That probe walks
   every element that renders a text run of its own, which is exactly the set
   this one cannot help with and vice versa. About twenty of the stranded
   `rgba(250, 247, 241, …)` literals are BORDERS, OUTLINES, RULES and FILLS —
   blastradius never sees them, because they render no text. Two of the three
   floors that matter on this site are carried by things that are not words:
   1.4.11 asks 3:1 of the boundary that identifies a control and of the ring
   that shows focus, and neither is a glyph.

   IT ALSO GOES WHERE BLASTRADIUS DOES NOT. That probe's ROUTES are
   ["/", "/restaurants", "/about"]. Contact, FAQ and ReviewUs render ONLY on
   /contact (ContactPage.tsx:32 says so in as many words), so eleven of the
   literals live on a route the text probe has never once visited. This one
   adds /contact.

   THE MEASUREMENT IS BLASTRADIUS'S, GENERALISED FROM `color` TO ANY PROPERTY.
   Each site is shot twice — once normally, once with the one declaration
   under test forced to `transparent` and nothing else touched. The pixels
   that CHANGED are, by construction, exactly the pixels that declaration
   paints. Their values in shot A are the paint as composited — post-alpha,
   post-backdrop-filter, post-blend. Their values at the same coordinates in
   shot B are the backdrop that was underneath. No ancestor walk, no assumed
   ground, and it works unchanged whether the declaration is an rgba literal
   or a color-mix of a token, which is the whole point: the same script
   measures before and after the migration.

   `transparent` RATHER THAN `visibility: hidden`, for the same reason
   blastradius uses `color: transparent`: hiding the element would take its
   fill, its children and its backdrop-filter with it, and the backdrop is
   the thing being measured. Forcing one property leaves the stacking order,
   the blur and the layout exactly where they were.

   THE PAINT IS THE CORE OF THE CHANGE, not its mean. A 1px hairline at
   dpr 1 is one device pixel and reads clean, but an outline with a radius,
   a text-decoration underline and any border on a curve all carry an
   anti-aliased rim that is a blend of paint and backdrop. Averaging the rim
   in drags a passing boundary under its floor. Top decile of change, the
   same decile blastradius takes.

   THE BACKDROP IS THE WORST PIXEL under the paint, never the mean — the
   brightest under a dark line, the darkest under a light one. A mean over a
   photograph hides the exact failure the floor exists to catch.

   FLOORS, AND WHY THEY DIFFER PER ROW. WCAG 1.4.11 wants 3:1 from
   "visual information required to identify user interface components and
   states" — the toggle's boundary, the selection band, the focus ring, the
   button's edge. It explicitly does NOT govern decoration: a rule that
   groups a table, a spine that a timeline hangs off, a tint that stands in
   for a photograph while it decodes. Those are recorded with floor `—` and
   reported as a STEP, so the number is on the record without pretending an
   ornament had a bar to clear. Each row says which it is and why.

   WHAT IT DELIBERATELY DOES NOT MEASURE, all transient states that need a
   moment this probe cannot hold still:
     · BlogIndex `.mediaLoading::after` — the skeleton sweep, alive only
       while a media box is undecoded, and animating while it is.
     · PageTransition `.loaderRing` — visible only during a route change.
     · CustomCursor `.cursor` — needs a live pointer, and at 0.04 it is a
       tint under a refraction filter rather than a boundary.
     · About `.frame` background — covered by its own photograph the instant
       one decodes.
   Each is argued in its own stylesheet comment instead.

   usage: node scripts/probe-cream-literals.mjs [port] [width]              */
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const WIDTH = Number(process.argv[3] || 1440);
const HEIGHT = 900;

const lin = (v) => ((v /= 255), v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
};

/* Each site names the ONE declaration under test. `sel` is a class-substring
   match because CSS modules hash the suffix. `floor` is null where the thing
   is ornament and 3 where 1.4.11 applies — see the header. */
const SITES = [
  // ---- /restaurants — the view switch and the wheel. Every one of these
  // identifies a control or a state, so every one answers to 3:1.
  { route: "/restaurants", key: "viewToggle border", sel: '[class*="viewToggle"]', prop: "border-color",
    floor: 3, why: "1.4.11 — the boundary that identifies the view switch as a control" },
  { route: "/restaurants", key: "toggleThumb fill", sel: '[class*="toggleThumb"]', prop: "background-color",
    floor: 3, why: "1.4.11 — the only thing that says WHICH view is active" },
  { route: "/restaurants", key: "selBand borders", sel: '[class*="selBand"]', prop: "border-color",
    floor: 3, why: "1.4.11 — the selection window naming the committed restaurant" },
  { route: "/restaurants", key: "name focus ring", sel: '[class*="RestaurantsShowcase_name"]:not([class*="nameActive"])', prop: "outline-color",
    floor: 3, focus: true, why: "1.4.11 + 2.4.11 — the focus indicator on the wheel" },
  // :not(actBtnSolid) — the solid variant sets `border-color: var(--cream)`
  // on purpose and is NOT one of the stranded literals. Matching on the
  // substring alone picked it first and measured a migration that had
  // already happened, which is why the row reported a solid cream.
  { route: "/restaurants", key: "actBtn border", sel: '[class*="actBtn"]:not([class*="actBtnSolid"])', prop: "border-color",
    floor: 3, why: "1.4.11 — the pill's edge is the only thing drawing the button" },

  // ---- /about — both ornament. Recorded, not held to a bar.
  // The prints rest at opacity 0 and are emitted by the scroll, so at any
  // held position there is nothing to measure. Forcing opacity does not touch
  // the outline's colour or the footage under it — it just puts the print on
  // screen for the pair of shots.
  { route: "/about", key: "heroTrailImg outline", sel: '[class*="heroTrailImg"]', prop: "outline-color",
    floor: null, force: "opacity: 1 !important;", why: "ornament — a hairline of separation between print and footage" },
  { route: "/about", key: "timeline spine", sel: '[class*="About_timeline"]', prop: "background-color",
    floor: null, pseudo: "::before", why: "ornament — the spine the chapters hang off" },
  /* THE ONE STRANDED LITERAL THAT IS TYPE. blastradius never scored it: the
     chapters rest at opacity 0 until their own observer sets `.entered`, and
     that probe drops any run whose inherited opacity chain is under 0.06, so
     the whole spine reads as unpainted. Forcing the entered state paints the
     dates without touching their colour. 5.6rem at the top of the clamp, so
     1.4.3's LARGE-text floor of 3:1 applies, not 4.5. */
  { route: "/about", key: "timeline year", sel: '[class*="About_year"]', prop: "color", floor: 3,
    css: '[class*="About_storyItem"], [class*="About_itemBody"], [class*="About_year"] { opacity: 1 !important; }',
    why: "1.4.3 large text — the date on each chapter of the story" },

  // ---- / — ornament.
  { route: "/", key: "Footer rule", sel: '[class*="Footer_rule"]', prop: "background-color",
    floor: null, why: "ornament — the band divider inside the footer" },

  // ---- /contact — a route blastradius never visits. The two underlines are
  // affordances: they are what says a line is a link, so they are 1.4.11.
  { route: "/contact", key: "infoLink underline", sel: '[class*="infoLink"]', prop: "text-decoration-color",
    floor: 3, why: "1.4.11 — the underline is what identifies the line as a link" },
  { route: "/contact", key: "visitAddr underline", sel: '[class*="visitAddr"]', prop: "text-decoration-color",
    floor: 3, why: "1.4.11 — same: the affordance saying the address opens a map" },
  { route: "/contact", key: "ReviewUs grid frame", sel: '[class*="ReviewUs_grid"]', prop: "border-color",
    floor: null, why: "ornament — the table's outer frame" },
  { route: "/contact", key: "ReviewUs cell rules", sel: '[class*="ReviewUs_item"]', prop: "border-color",
    floor: null, why: "ornament — interior rules grouping the cells" },
  { route: "/contact", key: "FAQ list rule", sel: '[class*="FAQ_list"]', prop: "border-color",
    floor: null, why: "ornament — the accordion's top rule" },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 300000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--autoplay-policy=no-user-gesture-required"],
});
const scratchBrowser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const scratch = await scratchBrowser.newPage();
await scratch.setContent("<canvas id=c></canvas>");

const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: HEIGHT });
// CSS.forcePseudoState is the only way to paint a focus ring the probe can
// see — see the focus row in the loop below.
const cdp = await page.createCDPSession();
await cdp.send("DOM.enable");
await cdp.send("CSS.enable");
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 220)));
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e).slice(0, 220)));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function settle() {
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
  await wait(1200);
}
/** Lenis smooths every seek; ask, wait it out, then read back where it landed. */
async function seek(y) {
  await page.evaluate((t) => window.scrollTo(0, t), y);
  await wait(2200);
  return page.evaluate(() => Math.round(window.scrollY));
}
/** Reveal's IntersectionObservers never arm unless the page is walked. */
async function armReveals() {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((t) => window.scrollTo(0, t), y);
    await wait(110);
  }
  await wait(1400);
  return h;
}
const shoot = () => page.screenshot({ encoding: "base64", captureBeyondViewport: false });

/** Diff one box across the two shots; return {paint, backdrops, n, coverage}. */
function measure(shotA, shotB, box, scrollY) {
  return scratch.evaluate(
    async (a, b, bx, sy, vw, vh) => {
      const draw = async (b64) => {
        const i = new Image();
        i.src = "data:image/png;base64," + b64;
        await i.decode();
        const c = document.createElement("canvas");
        c.width = i.width;
        c.height = i.height;
        const g = c.getContext("2d", { willReadFrequently: true });
        g.drawImage(i, 0, 0);
        const x = Math.max(0, Math.min(vw - 1, bx.x));
        const y = Math.max(0, Math.min(vh - 1, bx.y - sy));
        const w = Math.max(1, Math.min(vw - x, bx.w));
        const h = Math.max(1, Math.min(vh - y, bx.h));
        return g.getImageData(x, y, w, h).data;
      };
      const A = await draw(a);
      const B = await draw(b);
      const px = [];
      for (let i = 0; i < A.length && i < B.length; i += 4) {
        const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
        // 6, not blastradius's 16: a hairline at 0.14 alpha over a dark ground
        // is a genuinely small delta, and 16 would discard the very rows this
        // probe exists to record. The contamination guard below is what keeps
        // the looser threshold honest.
        if (d > 6) px.push([d, A[i], A[i + 1], A[i + 2], B[i], B[i + 1], B[i + 2]]);
      }
      if (px.length < 4) return null;
      const area = Math.max(1, Math.floor(A.length / 4));
      px.sort((x, y) => y[0] - x[0]);
      const core = px.slice(0, Math.max(3, Math.round(px.length * 0.1)));
      const mean = (rows, o) => Math.round(rows.reduce((s, r) => s + r[o], 0) / rows.length);
      return {
        n: px.length,
        coverage: px.length / area,
        paint: [mean(core, 1), mean(core, 2), mean(core, 3)],
        backdrops: px.map((r) => [r[4], r[5], r[6]]),
      };
    },
    shotA, shotB, box, scrollY, WIDTH, HEIGHT,
  );
}

const report = [];
const byRoute = new Map();
for (const s of SITES) byRoute.set(s.route, [...(byRoute.get(s.route) || []), s]);

for (const [route, sites] of byRoute) {
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await settle();
  await armReveals();
  await seek(0);

  for (const site of sites) {
    // Where is it, and what does the property currently resolve to? The
    // computed value is read from the live element, so a color-mix of a token
    // reports as the rgba the browser actually paints — which is what makes
    // this the same measurement before and after the migration.
    const found = await page.evaluate(
      (sel, prop, pseudo) => {
        // Clear any target left behind by a previous site. Without this, a
        // site that fails to measure leaves its marker on the page and the
        // NEXT site's querySelector finds that stale element instead of its
        // own — one miss silently corrupts every row after it on the route.
        document.querySelectorAll("[data-cl-target]").forEach((e) => e.removeAttribute("data-cl-target"));
        // >= 1, not > 2: a rule IS 1px tall. The first cut of this filter
        // wanted 2 and threw away Footer's divider for being the shape a
        // divider is.
        const els = [...document.querySelectorAll(sel)].filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width >= 1 && r.height >= 1;
        });
        /* TAKE THE MATCH NEAREST THE VIEWPORT, NOT THE FIRST IN THE DOCUMENT.
           The restaurant wheel is 77 buttons on one long column and only a
           handful are ever on screen; document order hands back the one at
           y = -1850, which is why the focus ring reported "paints nothing
           here" through three runs of this probe while the ring itself was
           perfectly correct. Sorting by distance from the viewport's middle
           picks an element the seek below can actually bring into frame. */
        const mid = scrollY + innerHeight / 2;
        els.sort((a, b) => {
          const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          return Math.abs(ra.top + scrollY + ra.height / 2 - mid) - Math.abs(rb.top + scrollY + rb.height / 2 - mid);
        });
        const el = els[0];
        if (!el) return null;
        el.setAttribute("data-cl-target", "1");
        const cs = getComputedStyle(el, pseudo || undefined);
        const r = el.getBoundingClientRect();
        // border-color resolves to FOUR values when the sides differ, and
        // .selBand sets only top and bottom — so the raw string is the tested
        // rgba followed by two currentColor creams. Report the first colour,
        // which is the side the declaration actually names.
        const raw = cs.getPropertyValue(prop) || cs.getPropertyValue(prop.replace("-color", ""));
        const first = (String(raw).match(/rgba?\([^)]*\)/) || [String(raw)])[0];
        return {
          declared: first,
          box: { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.ceil(r.width), h: Math.ceil(r.height) },
        };
      },
      site.sel, site.prop, site.pseudo || null,
    );
    if (!found) { report.push({ ...site, miss: "no element matched" }); continue; }

    // A site that only exists in a state the probe cannot hold (see .force in
    // SITES) gets that state pinned for BOTH shots, so it cancels out of the
    // diff entirely.
    // `force` is declarations applied to the target; `css` is a whole rule set,
    // for when the state lives on an ANCESTOR (a chapter at opacity 0 cannot
    // be revealed by styling the date inside it).
    if (site.force || site.css) {
      await page.evaluate((decls, raw) => {
        const st = document.createElement("style");
        st.id = "__cl_force";
        st.textContent = raw || `[data-cl-target="1"] { ${decls} }`;
        document.head.appendChild(st);
      }, site.force || "", site.css || "");
      await wait(400);
    }

    // Put the element in the middle of the viewport. A box taller than the
    // viewport is measured from its top — the spine is 4000px long and only
    // ever needs one screen of it.
    const target = Math.max(0, found.box.y - Math.round(HEIGHT / 2) + Math.min(found.box.h, HEIGHT) / 2);
    const at = await seek(target);

    // Re-read the box after the seek: parallax and scroll-linked transforms
    // move things, and a box measured before the scroll is a box that is no
    // longer there.
    const box = await page.evaluate(() => {
      const el = document.querySelector('[data-cl-target="1"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.ceil(r.width), h: Math.ceil(r.height) };
    });
    if (!box) { report.push({ ...site, miss: "element vanished after seek" }); continue; }

    /* PAD THE BOX BEFORE CLIPPING, and this is not slack — it is the
       difference between measuring the focus ring and reporting that it does
       not exist. `outline-offset: 4px` draws the ring OUTSIDE the border box,
       so a diff over the element's own rect contains none of it; the first
       run of this probe reported the wheel's focus indicator as "paints
       nothing here" for exactly that reason. The same padding is what lets a
       1px divider survive the viewport clamp instead of rounding to nothing.
       Extra area is free: the diff keeps only pixels that CHANGED, and
       nothing outside the declaration's paint changes between the shots. */
    const PAD = 12;
    const padded = { x: Math.max(0, box.x - PAD), y: Math.max(0, box.y - PAD), w: box.w + PAD * 2, h: box.h + PAD * 2 };
    const clipped = { ...padded, h: Math.min(padded.h, HEIGHT - Math.max(0, padded.y - at) - 2) };
    if (clipped.h < 2) { report.push({ ...site, miss: "not in viewport after seek" }); continue; }

    // FORCING :focus-visible, NOT CALLING .focus(). Chrome decides
    // focus-visible from HOW an element was focused — a scripted .focus() on
    // a button leaves the ring unpainted, which the first run of this probe
    // reported as "declaration paints nothing here" for the one row that most
    // needed measuring. CDP sets the pseudo-state directly, so the ring is
    // painted for both shots and the diff is the ring.
    if (site.focus) {
      await page.evaluate(() => document.querySelector('[data-cl-target="1"]')?.focus());
      const { root } = await cdp.send("DOM.getDocument");
      const hit = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: '[data-cl-target="1"]' });
      if (hit.nodeId) await cdp.send("CSS.forcePseudoState", { nodeId: hit.nodeId, forcedPseudoClasses: ["focus", "focus-visible"] });
      await wait(260);
    }

    // FREEZE THE FOOTAGE — both shots must see one frame or the diff measures
    // the film rather than the declaration.
    await page.evaluate(() => document.querySelectorAll("video").forEach((v) => v.pause()));
    await wait(300);
    const A = await shoot();

    await page.evaluate(
      (prop, pseudo) => {
        const el = document.querySelector('[data-cl-target="1"]');
        const st = document.createElement("style");
        st.id = "__cl_hide";
        // A pseudo-element's property cannot be set inline, so the ::before
        // rows go through a stylesheet rule instead.
        st.textContent = pseudo
          ? `[data-cl-target="1"]${pseudo} { ${prop}: transparent !important; }`
          : `[data-cl-target="1"] { ${prop}: transparent !important; }`;
        document.head.appendChild(st);
        void el?.offsetWidth;
      },
      site.prop, site.pseudo || null,
    );
    await wait(420);
    const B = await shoot();
    await page.evaluate(() => document.getElementById("__cl_hide")?.remove());
    // Release the forced state — a ring left painted on the wheel would sit
    // under every later row's backdrop on this route.
    if (site.focus) {
      const { root } = await cdp.send("DOM.getDocument");
      const hit = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: '[data-cl-target="1"]' });
      if (hit.nodeId) await cdp.send("CSS.forcePseudoState", { nodeId: hit.nodeId, forcedPseudoClasses: [] });
    }
    await wait(200);

    await page.evaluate(() => document.getElementById("__cl_force")?.remove());
    const m = await measure(A, B, clipped, at).catch(() => null);
    if (!m) {
      report.push({ ...site, declared: found.declared, miss: "no pixels changed — declaration paints nothing here" });
      continue;
    }
    const paintL = lum(m.paint);
    /* WHICH BACKDROP IS THE WORST DEPENDS ON WHICH SIDE THE PAINT IS ON, and
       an absolute threshold cannot answer that. blastradius asks `inkL > 0.4`,
       which is sound for TYPE — type is either clearly light or clearly dark,
       so 0.4 splits it correctly. It is wrong for a low-alpha hairline: 28%
       cream over a near-black photograph composites to rgb(82,70,69), L 0.066,
       so the absolute test files it as "dark ink" and hunts for the DARKEST
       backdrop — which, for a line that is lighter than everything under it,
       is the most flattering pixel in the box rather than the least. Measured,
       that one substitution reported the view switch's boundary at 2.26:1 when
       against a brighter patch of the same photograph it reads 1.30:1.

       So the direction is decided RELATIVE to the backdrop the paint actually
       sits on — the median, which is robust against the few pixels at either
       tail. Lighter than its ground: the worst ground is the brightest.
       Darker: the darkest. */
    const withL = m.backdrops.map((g) => [lum(g), g]).sort((a, b) => a[0] - b[0]);
    const medianL = withL[Math.floor(withL.length / 2)][0];
    const paintIsLighter = paintL > medianL;
    /* THE 95th PERCENTILE, NOT THE EXTREME. Taking the single most hostile
       pixel sounds like the conservative choice and is really a noise
       amplifier: one anti-aliased pixel where a hairline crosses a bright
       element decides the whole row. Measured, the view switch's thumb came
       back at 6.37:1 against a lone rgb(191,182,164) — a corner of the icon
       above it, not the surface the fill is read against. p95 still answers
       "the worst ground this boundary genuinely sits on" while needing 5% of
       the pixels to agree before a number moves. */
    const idx = paintIsLighter
      ? Math.floor(withL.length * 0.95)
      : Math.floor(withL.length * 0.05);
    const worst = withL[Math.min(withL.length - 1, Math.max(0, idx))][1];
    const cr = ratio(m.paint, worst);
    report.push({
      ...site,
      declared: found.declared,
      paint: `rgb(${m.paint.join(",")})`,
      backdrop: `rgb(${worst.join(",")})`,
      cr: +cr.toFixed(2),
      n: m.n,
      pass: site.floor == null ? null : cr >= site.floor,
    });
    await page.evaluate(() => document.querySelector('[data-cl-target="1"]')?.removeAttribute("data-cl-target"));
  }
}

/* ── output ─────────────────────────────────────────────────────────────── */
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
const tokens = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  return ["--cream", "--maroon", "--rule"].map((t) => `${t}=${cs.getPropertyValue(t).trim()}`).join("  ");
});

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
const L = [];
L.push(`CREAM LITERALS — non-text declarations — ${new Date().toISOString()}  ${WIDTH}x${HEIGHT}  port ${PORT}`);
L.push(`TOKENS  ${tokens}`);
L.push("");
L.push(pad("ROUTE", 13) + pad("SITE", 22) + pad("DECLARED", 34) + pad("PAINT", 17) + pad("BACKDROP", 17) + pad("RATIO", 9) + pad("FLOOR", 7) + "RESULT");
L.push("-".repeat(140));
for (const r of report) {
  if (r.miss) {
    L.push(pad(r.route, 13) + pad(r.key, 22) + pad(r.declared || "", 34) + pad("", 17) + pad("", 17) + pad("", 9) + pad("", 7) + "not measured — " + r.miss);
    continue;
  }
  const verdict = r.floor == null ? "step (ornament — no bar)" : r.pass ? "ok" : "**UNDER FLOOR**";
  L.push(pad(r.route, 13) + pad(r.key, 22) + pad(r.declared, 34) + pad(r.paint, 17) + pad(r.backdrop, 17) + pad(r.cr + ":1", 9) + pad(r.floor == null ? "—" : r.floor + ":1", 7) + verdict);
}
const held = report.filter((r) => !r.miss && r.floor != null);
const fails = held.filter((r) => !r.pass);
const misses = report.filter((r) => r.miss);
L.push("");
L.push(`${held.length} boundaries held to a floor — ${held.length - fails.length} clear, ${fails.length} under floor`);
L.push(`${report.filter((r) => !r.miss && r.floor == null).length} ornament rows recorded as steps  ·  ${misses.length} not measured`);
if (fails.length) {
  L.push("");
  L.push("UNDER FLOOR:");
  for (const f of fails) L.push(`  ${pad(f.route, 12)} ${f.key}  ${f.cr}:1 < ${f.floor}:1  — ${f.why}`);
}
for (const r of report) if (!r.miss) L.push(`  · ${pad(r.key, 22)} ${r.why}`);
const newErrors = consoleErrors.filter((e) => !/prefers-reduced-motion/i.test(e));
L.push("");
L.push(`console errors (the known prefers-reduced-motion hydration warning excluded by name): ${newErrors.length}`);
newErrors.slice(0, 10).forEach((e) => L.push("  " + e));

const out = L.join("\n");
console.log(out);
writeFileSync(process.env.PROBE_OUT || "/tmp/cream-literals.txt", out);

await browser.close();
await scratchBrowser.close();
