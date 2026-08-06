/* THE PALETTE BLAST-RADIUS PROBE.

   The site's two core tokens moved — the ground deepened and the ink lifted,
   which drops every ink-on-ground pair on the site at once. Dozens of values
   sitting on top of those two were tuned, and their ratios written into
   comments, against the OLD pair. This walks the pages and re-measures all of
   it, so the correction is arithmetic rather than assertion.

   IT MEASURES PIXELS, NOT STYLESHEETS, AND THAT IS THE WHOLE DESIGN. The
   first cut of this file resolved `color` and walked ancestors for the first
   opaque `background-color`. It was faster and it was wrong in the three
   places that matter most on this site:
     · text over FILM (the hero clauses, the /about statement, the venue
       cards' addresses) has no painted ground at all — the ancestor walk
       eventually reaches <body> and reports cream-on-cream, 1:1, which is
       not a failure, it is a non-measurement;
     · the navbar paints with `mix-blend-mode: difference`, so its glyphs are
       never the colour its `color` property says;
     · scrims, gradients and `color-mix()` grounds composite to something no
       single declaration names.

   So both halves come off the rendered frame. Each viewport is shot TWICE —
   once normally, once with every measured run set to `color: transparent`
   (which hides glyphs while leaving backgrounds, borders and blend modes
   exactly where they were; `visibility: hidden` would have taken the
   button fills with it). The pixels that CHANGED between the two are the
   glyph. Their values in shot A are the ink as painted — post-blend,
   post-opacity, post-everything — and their values at the same coordinates
   in shot B are the ground that was underneath them.

   TWO REFINEMENTS THAT DECIDE WHETHER A NUMBER IS HONEST:
     · the ink is the top decile of change, i.e. the GLYPH CORE. Averaging
       every changed pixel folds in the anti-aliased rim, which is a blend of
       ink and ground and drags a passing ratio under its floor.
     · the ground is the WORST pixel in the run's own box — the brightest
       under dark ink, the darkest under light ink — never the mean. A mean
       over a photograph hides exactly the failure the floor exists to catch.

   `text-shadow` is stripped in shot B along with the colour. That is
   deliberate and conservative: --scrim-text is a legibility aid, not a
   ground, and leaving it on would paint a dark halo that the probe would
   read as ground and score as help the reader may not get on a brighter
   frame.

   THE FLOOR is WCAG 2.2 1.4.3 — 3:1 for large text (>=24px, or >=18.66px at
   weight >=700), 4.5:1 otherwise. Graphical objects answer to 1.4.11's 3:1
   instead, but nothing here can tell an icon from a word, so every run is
   held to the text bar and the report names the known graphical exceptions.

   A VIDEO'S LUMINANCE CHANGES FRAME TO FRAME. Any row whose ground is film
   is a reading of ONE frame and is marked `film` rather than `paint`.

   EVERY VIDEO IS PAUSED BEFORE THE PAIR OF SHOTS, and this is not a nicety —
   it is what makes the diff mean anything. The first run of this probe
   reported the whole /about statement at ~1.03:1 and the hero's primary
   button at 1.33:1 with a ground of rgb(13,0,0). Both were nonsense: the
   footage advanced between shot A and shot B, so most of the "changed"
   pixels were the film moving rather than the glyph disappearing, and the
   top decile of change was a bright frame edge instead of a letterform.
   Pausing freezes one frame under both shots so the only thing that can
   differ is the type.

   AND A CONTAMINATION GUARD BEHIND IT. Type covers maybe 5–40% of its own
   box. If more than 60% of the box changed, something other than the glyph
   moved — a transition still running, a hover clip, a frame that slipped —
   and the row is reported as `unstable` and kept OUT of the pass/fail count
   rather than published as a failure that isn't one.

   PROBE GOTCHAS THIS FILE OBEYS — each of them cost a run at some point:
     · never networkidle0 (the hero video never idles). domcontentloaded plus
       a wait on <body> losing `is-loading`.
     · Lenis owns the scroller; window.scrollTo is smoothed and lands late,
       so every seek waits it out and then reads back where it ACTUALLY is.
     · walk in ~500px steps first or the IntersectionObservers behind Reveal
       never arm and half the page reports as unpainted.
     · page.screenshot({clip}) measures from the DOCUMENT origin, not the
       viewport. This shoots the viewport and crops in a scratch canvas.

   usage: node scripts/probe-palette-blastradius.mjs [port] [width]          */
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const WIDTH = Number(process.argv[3] || 1440);
const HEIGHT = 900;
const ROUTES = ["/", "/restaurants", "/about"];

const lin = (v) => ((v /= 255), v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
};

/* ── page-side: find every element that renders a text run of its own ───── */
const COLLECT = () => {
  const strip = (c) => String(c || "").replace(/__[A-Za-z0-9_-]+$/, "");
  const label = (el) => {
    const cls = (typeof el.className === "string" ? el.className : "")
      .split(/\s+/).filter(Boolean).map(strip).slice(0, 2).join(".");
    const sect = el.closest("section,footer,nav,[data-nav-theme]");
    const sid = sect ? sect.id || strip((sect.className || "").split(/\s+/)[0]) : "";
    return `${sid ? sid + " » " : ""}${el.tagName.toLowerCase()}${cls ? "." + cls : ""}`;
  };
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    const r = el.getBoundingClientRect();
    // containers and off-screen ghosts are not text runs
    if (r.width < 4 || r.height < 4 || r.height > 420 || r.width > 1900) continue;

    // the inherited opacity chain — an ancestor at .5 halves this text too.
    // A run the reader genuinely cannot see is not a contrast failure.
    let chain = 1;
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      const o = parseFloat(getComputedStyle(p).opacity);
      if (!Number.isNaN(o)) chain *= o;
    }
    if (chain < 0.06) continue;

    // is there film or a photograph painting behind this run? asked of the
    // real stacking order rather than of an ancestor guess
    let film = false;
    const pts = [
      [r.left + 4, r.top + r.height / 2],
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.right - 4, r.top + r.height / 2],
    ];
    for (const [x, y] of pts) {
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      for (const hit of document.elementsFromPoint(x, y)) {
        if (hit === el || el.contains(hit)) continue;
        const t = hit.tagName;
        if (t === "VIDEO" || t === "IMG" || t === "CANVAS") film = true;
        if (getComputedStyle(hit).backgroundImage !== "none") film = true;
        const bg = getComputedStyle(hit).backgroundColor;
        if (/rgba?\([^)]*?(,\s*1\)|\)$)/.test(bg) && !/, *0\)/.test(bg)) break; // opaque: stop
      }
    }

    const px = parseFloat(cs.fontSize);
    const wt = parseInt(cs.fontWeight, 10) || 400;
    const key = label(el) + "|" + el.textContent.trim().slice(0, 24) + "|" + Math.round(r.width);
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      label: label(el),
      text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 30),
      px: +px.toFixed(1),
      wt,
      floor: px >= 24 || (px >= 18.66 && wt >= 700) ? 3 : 4.5,
      film,
      box: { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.ceil(r.width), h: Math.ceil(r.height) },
    });
  }
  return out;
};

/* ── driver ─────────────────────────────────────────────────────────────── */
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
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 220)));
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e).slice(0, 220)));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const HIDE_ID = "__blastradius_hide";

async function settle() {
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
  await wait(1200);
}
/** Lenis smooths every seek; ask, wait it out, then read back where it landed. */
async function seek(y) {
  await page.evaluate((t) => window.scrollTo(0, t), y);
  await wait(2400);
  return page.evaluate(() => Math.round(window.scrollY));
}
async function armReveals() {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((t) => window.scrollTo(0, t), y);
    await wait(110);
  }
  await wait(1600);
  return h;
}
const shoot = () => page.screenshot({ encoding: "base64", captureBeyondViewport: false });

/** Diff one run's box across the two shots; return {ink, ground, n}. */
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
        if (d > 16) px.push([d, A[i], A[i + 1], A[i + 2], B[i], B[i + 1], B[i + 2]]);
      }
      if (px.length < 6) return null;
      const area = Math.max(1, Math.floor(A.length / 4));
      px.sort((x, y) => y[0] - x[0]);
      // THE GLYPH CORE — top decile of change. The rest is the anti-aliased
      // rim, which is a blend of ink and ground and is not what is read.
      const core = px.slice(0, Math.max(3, Math.round(px.length * 0.1)));
      const mean = (rows, o) => Math.round(rows.reduce((s, r) => s + r[o], 0) / rows.length);
      return {
        n: px.length,
        // >60% of the box changed: that is not a glyph, that is something
        // else moving. The caller reports the row as unstable rather than
        // publishing a failure it cannot stand behind.
        coverage: px.length / area,
        ink: [mean(core, 1), mean(core, 2), mean(core, 3)],
        // every ground pixel the run sits on, so the caller can take the worst
        grounds: px.map((r) => [r[4], r[5], r[6]]),
      };
    },
    shotA, shotB, box, scrollY, WIDTH, HEIGHT,
  );
}

const report = [];
for (const route of ROUTES) {
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await settle();
  const docHeight = await armReveals();
  await seek(0);

  const runs = await page.evaluate(COLLECT);
  // Assign each run to the first viewport that fully contains it. Runs are
  // walked in document order so the stops come out monotonic.
  const stops = [];
  for (let y = 0; y <= Math.max(0, docHeight - HEIGHT); y += Math.round(HEIGHT * 0.8)) stops.push(y);
  if (!stops.length) stops.push(0);
  stops.push(Math.max(0, docHeight - HEIGHT));

  const pending = new Map(runs.map((r, i) => [i, r]));
  for (const target of stops) {
    if (!pending.size) break;
    const at = await seek(target);
    const here = [...pending.entries()].filter(([, r]) => r.box.y >= at + 2 && r.box.y + r.box.h <= at + HEIGHT - 2);
    if (!here.length) continue;

    // FREEZE THE FOOTAGE. Both shots have to see the same frame or the diff
    // measures the film rather than the type — see the header.
    await page.evaluate(() => document.querySelectorAll("video").forEach((v) => v.pause()));
    await wait(260);
    const A = await shoot();
    await page.evaluate(
      (boxes, id) => {
        const st = document.createElement("style");
        st.id = id;
        document.head.appendChild(st);
        const hits = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          const x = Math.round(r.left + scrollX), y = Math.round(r.top + scrollY);
          if (boxes.some((b) => Math.abs(b.x - x) < 2 && Math.abs(b.y - y) < 2 && Math.abs(b.w - Math.ceil(r.width)) < 3)) hits.push(el);
        }
        window.__br = hits;
        // colour, not visibility: the box, its fill, its border and its blend
        // mode all have to stay exactly where they were. text-shadow goes
        // too, or its halo would be measured as ground.
        hits.forEach((el) => {
          el.dataset.brC = el.style.color;
          el.dataset.brS = el.style.textShadow;
          el.style.setProperty("color", "transparent", "important");
          el.style.setProperty("text-shadow", "none", "important");
        });
      },
      here.map(([, r]) => r.box), HIDE_ID,
    );
    await wait(420);
    const B = await shoot();
    await page.evaluate((id) => {
      (window.__br || []).forEach((el) => {
        el.style.color = el.dataset.brC || "";
        el.style.textShadow = el.dataset.brS || "";
      });
      document.getElementById(id)?.remove();
    }, HIDE_ID);
    await wait(220);

    for (const [i, r] of here) {
      pending.delete(i);
      const m = await measure(A, B, r.box, at).catch(() => null);
      if (!m) continue;
      const inkL = lum(m.ink);
      let worst = m.grounds[0];
      let worstL = lum(worst);
      for (const g of m.grounds) {
        const l = lum(g);
        // worst = the ground pixel nearest the ink in luminance
        if (inkL > 0.4 ? l > worstL : l < worstL) { worstL = l; worst = g; }
      }
      const cr = ratio(m.ink, worst);
      const unstable = m.coverage > 0.6;
      report.push({
        route, label: r.label, text: r.text, px: r.px, wt: r.wt, floor: r.floor,
        kind: unstable ? "unstbl" : r.film ? "film" : "paint",
        ink: `rgb(${m.ink.join(",")})`, ground: `rgb(${worst.join(",")})`,
        cr: +cr.toFixed(2), pass: cr >= r.floor, unstable, n: m.n,
      });
    }
  }
}

/* ── output ─────────────────────────────────────────────────────────────── */
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
const tokens = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  return ["--cream", "--maroon", "--maroon-soft", "--placeholder", "--placeholder-line", "--rule", "--saffron", "--saffron-ink"]
    .map((t) => `${t}=${cs.getPropertyValue(t).trim()}`).join("  ");
});

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
const unstable = report.filter((r) => r.unstable);
const scored = report.filter((r) => !r.unstable);
const failures = scored.filter((r) => !r.pass);
const L = [];
L.push(`PALETTE BLAST RADIUS — ${new Date().toISOString()}  ${WIDTH}x${HEIGHT}  port ${PORT}`);
L.push(`TOKENS  ${tokens}`);
L.push("");
L.push(pad("ROUTE", 13) + pad("ELEMENT", 44) + pad("TEXT", 32) + pad("px/wt", 10) + pad("GND", 6) + pad("RATIO", 9) + pad("FLOOR", 7) + "RESULT");
L.push("-".repeat(128));
for (const r of [...report].sort((a, b) => a.route.localeCompare(b.route) || a.cr - b.cr)) {
  const verdict = r.unstable ? "not scored (>60% of box moved)" : r.pass ? "ok" : "**UNDER FLOOR**";
  L.push(pad(r.route, 13) + pad(r.label, 44) + pad(r.text, 32) + pad(`${r.px}/${r.wt}`, 10) + pad(r.kind, 6) + pad(r.cr + ":1", 9) + pad(r.floor + ":1", 7) + verdict);
}
L.push("");
L.push(`${scored.length} pairs scored — ${scored.length - failures.length} clear, ${failures.length} under floor  (+${unstable.length} not scored)`);
if (failures.length) {
  L.push("");
  L.push("UNDER FLOOR:");
  for (const f of failures) L.push(`  ${pad(f.route, 12)} ${f.label}  "${f.text}"  ${f.cr}:1 < ${f.floor}:1  [${f.kind}]  ink ${f.ink} on ${f.ground}`);
}
if (unstable.length) {
  L.push("");
  L.push("NOT SCORED — more than 60% of the box changed between the two shots, so the");
  L.push("diff is not a glyph. Re-run, or measure these by hand at a held scroll position:");
  for (const u of unstable) L.push(`  ${pad(u.route, 12)} ${u.label}  "${u.text}"  (would have read ${u.cr}:1)`);
}
const newErrors = consoleErrors.filter((e) => !/prefers-reduced-motion/i.test(e));
L.push("");
L.push(`console errors (the known prefers-reduced-motion hydration warning excluded by name): ${newErrors.length}`);
newErrors.slice(0, 15).forEach((e) => L.push("  " + e));

const out = L.join("\n");
console.log(out);
writeFileSync(process.env.PROBE_OUT || "/tmp/palette-blastradius.txt", out);

await browser.close();
await scratchBrowser.close();
