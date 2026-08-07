/* THE HOME PAGE'S VERTICAL SPACING, MEASURED INK-TO-INK.
 *
 * Declared padding is not the gap a reader sees. Every seam on this page is
 * the sum of the closing section's bottom padding, the opening section's top
 * padding, and whatever centring / min-height the two blocks do inside their
 * own boxes. Adding the stylesheet values up gets the wrong answer, so this
 * measures the real thing: the distance from the LAST PAINTED INK above a
 * seam to the FIRST PAINTED INK below it.
 *
 * "Ink" here is the deepest visible descendant with a non-empty rect —
 * text, image or rule — so a section that ends on a hard photographic edge
 * and one that ends on a caption are both measured at the thing the eye
 * actually stops on.
 *
 * It also reports each chapter's own internal head gaps, because a seam
 * that looks too big is often a chapter whose head is too loose rather than
 * two chapters standing too far apart.
 *
 * usage: node scripts/probe-home-spacing.mjs [port] [width] [height]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const W = +(process.argv[3] || 1440);
const H = +(process.argv[4] || 900);

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const p = await b.newPage();
await p.setViewport({ width: W, height: H });
/* NEVER networkidle0 on this site — the hover clips and the hero film loop,
   so the network never goes quiet. The loader's own class is the signal. */
await p.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await p
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await new Promise((r) => setTimeout(r, 1200));

/* Scroll in ~500px steps: teleporting past a section does NOT fire its
   IntersectionObservers, and half this page's type is behind one. Lenis
   overrides window.scrollTo, so drive it through the handle it publishes. */
const travel = async (y) => {
  await p.evaluate((to) => {
    const l = window.__lenis;
    if (l) l.scrollTo(to, { immediate: true, force: true });
    else window.scrollTo(0, to);
  }, y);
  await new Promise((r) => setTimeout(r, 140));
};
const docH0 = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < docH0; y += 500) await travel(y);
await travel(0);
await new Promise((r) => setTimeout(r, 600));

const out = await p.evaluate(() => {
  const abs = (el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + scrollY, bottom: r.bottom + scrollY, h: r.height };
  };

  /* the extreme painted edges inside a subtree — walk every element, keep
     the ones that are visible and have a real box, and take the min top /
     max bottom. Purely-decorative zero-height boxes drop out on their own. */
  const inkRange = (root) => {
    let top = Infinity;
    let bottom = -Infinity;
    for (const el of root.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (+cs.opacity === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      top = Math.min(top, r.top + scrollY);
      bottom = Math.max(bottom, r.bottom + scrollY);
    }
    return { inkTop: Math.round(top), inkBottom: Math.round(bottom) };
  };

  const named = [
    ["Hero", "#top"],
    ["Discover", "#restaurants"],
    ["Manifesto", "[class*='Manifesto_section']"],
    ["AboutSplit", "[class*='AboutSplit_section']"],
    ["PressWall", "[class*='PressWall_section']"],
    ["Blog", "#blog"],
    ["Reservations", "#book"],
    ["Footer", "[class*='Footer_footer']"],
  ];

  const rows = [];
  for (const [name, sel] of named) {
    const el = document.querySelector(sel);
    if (!el) {
      rows.push({ name, missing: true });
      continue;
    }
    const cs = getComputedStyle(el);
    rows.push({
      name,
      ...abs(el),
      ...inkRange(el),
      padT: cs.paddingTop,
      padB: cs.paddingBottom,
      padX: cs.paddingLeft,
    });
  }

  // seam = first ink below − last ink above
  const seams = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i];
    const c = rows[i + 1];
    if (a.missing || c.missing) continue;
    if (!isFinite(a.inkBottom) || !isFinite(c.inkTop)) continue;
    seams.push({
      seam: `${a.name} → ${c.name}`,
      gap: Math.round(c.inkTop - a.inkBottom),
      boxGap: Math.round(c.top - a.bottom),
      declared: `${a.padB} + ${c.padT}`,
    });
  }

  // a chapter's own internal rhythm — head lockups and their rules
  const inner = {};
  const q = (sel) => document.querySelector(sel);
  const gapBetween = (aSel, bSel) => {
    const a = q(aSel);
    const bEl = q(bSel);
    if (!a || !bEl) return null;
    return Math.round(
      bEl.getBoundingClientRect().top - a.getBoundingClientRect().bottom,
    );
  };

  /* ⚠️ THE MODULE PREFIX IS LOAD-BEARING IN THESE SELECTORS. `[class*=
     'body']` looked right and matched `PillCta_body` — the pill's own
     clipped background, which sits inside the head — so "Blog rule → body"
     reported −82px and read as a broken layout rather than as a probe
     asking the wrong question. Every selector here names its stylesheet. */
  inner["Discover topRule → head"] = gapBetween(
    "#restaurants [class*='Discover_topRule']",
    "#restaurants [class*='Discover_head']",
  );
  inner["Discover title → rule"] = gapBetween(
    "#restaurants [class*='Discover_lede']",
    "#restaurants [class*='Discover_headRule']",
  );
  inner["Discover rule → grid"] = gapBetween(
    "#restaurants [class*='Discover_headRule']",
    "#restaurants [class*='Discover_grid']",
  );
  inner["Discover grid → footRule"] = gapBetween(
    "#restaurants [class*='Discover_grid']",
    "#restaurants [class*='Discover_footRule']",
  );
  inner["Blog topRule → label"] = gapBetween(
    "#blog [class*='Blog_topRule']",
    "#blog [class*='Blog_chapterLabel']",
  );
  inner["Blog rule → body"] = gapBetween(
    "#blog [class*='Blog_headRule']",
    "#blog [class*='Blog_body']",
  );

  return {
    viewport: { w: innerWidth, h: innerHeight },
    docH: document.documentElement.scrollHeight,
    screens: +(document.documentElement.scrollHeight / innerHeight).toFixed(2),
    rows,
    seams,
    inner,
  };
});

console.log(`\nviewport ${out.viewport.w}×${out.viewport.h}`);
console.log(`document ${out.docH}px  =  ${out.screens} screens\n`);

console.log("── SECTION BOXES ──");
for (const r of out.rows) {
  if (r.missing) {
    console.log(`  ${r.name.padEnd(12)}  MISSING`);
    continue;
  }
  console.log(
    `  ${r.name.padEnd(12)} box ${String(Math.round(r.top)).padStart(5)}→${String(
      Math.round(r.bottom),
    ).padStart(5)}  h=${String(Math.round(r.h)).padStart(4)}` +
      `  ink ${String(r.inkTop).padStart(5)}→${String(r.inkBottom).padStart(5)}` +
      `  pad ${r.padT}/${r.padB}  x=${r.padX}`,
  );
}

console.log("\n── SEAMS (ink to ink) ──");
for (const s of out.seams) {
  const flag = s.gap > 160 ? "  ⚠ LARGE" : s.gap < 24 ? "  ⚠ TIGHT" : "";
  console.log(
    `  ${s.seam.padEnd(26)} ${String(s.gap).padStart(5)}px   (boxes ${String(
      s.boxGap,
    ).padStart(4)}px, declared ${s.declared})${flag}`,
  );
}

console.log("\n── INTERNAL RHYTHM ──");
for (const [k, v] of Object.entries(out.inner)) {
  console.log(`  ${k.padEnd(26)} ${v === null ? "n/a" : `${v}px`}`);
}
console.log();

await b.close();
