/* CONTRAST ON THE QUIET TYPE.

   The two helper lines on this page were bracketed, right-aligned, uppercase
   and set at `opacity: 0.4`. The equivalent line on /contact measured 3.44:1
   against the 4.5:1 body minimum before it was rewritten, and this measures
   whether the rewrite here actually lands above the bar rather than merely
   looking calmer.

   The measurement composites properly: `opacity` and an rgba `color` are
   both alpha, and both have to be blended against the element's REAL
   backdrop before a ratio means anything — on this page that backdrop is
   cream in one place and the application plate's maroon wash in another, and
   the plate is darker, so a colour that passes on cream does not
   automatically pass on the plate. Every ancestor's background and opacity
   is walked, so the number is the one the eye gets.

   usage: node scripts/probe-join-contrast.mjs [port] [w] [h] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3187";
const VW = +(process.argv[3] || 1440);
const VH = +(process.argv[4] || 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: VW, height: VH });
await page.goto(`http://localhost:${PORT}/careers`, { waitUntil: "networkidle0", timeout: 60000 });
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);
await sleep(2200);

/* EVERY LINE IS SCROLLED INTO VIEW BEFORE IT IS MEASURED. Nearly all of this
   copy sits inside a `Reveal`, whose hidden state is `opacity: 0` — and
   ancestor opacity multiplies into the composite, so measuring a line that
   has not entered yet composites the text fully into its own background and
   reports a flat 1:1 for the whole page. The first run of this probe failed
   seven of eight lines that way. */
const SELECTORS = [
  ['[class*="rolesAside"]', "roles hint"],
  ['[class*="formAside"]', "form hint"],
  ['[class*="reasonBody"]', "reason body"],
  ['[class*="reasonTitle"]', "reason title"],
  /* `heroLabel__` with the trailing separator: `[class*="heroLabel"]` also
     matches the `heroLabels` FLEX CONTAINER, which is the first in document
     order, carries no colour of its own and reported an inherited 16px at
     17.5:1 — a pass measured on the wrong element. */
  ['[class*="heroLabel__"]', "hero corner label"],
  ['[class*="submitAside"]', "the CV warning at the button"],
  ['[class*="heroStand"]', "hero standfirst"],
  ['[class*="roleMeta"]', "role meta"],
  ['[class*="roleType"]', "role type"],
  ['[class*="field"] label', "field label"],
  /* the three lines that replaced the placeholders, plus the two empty
     states that are NOT placeholders but had the same contrast fault */
  ['[class*="JoinUs_hint"]', "field hint"],
  ['[class*="fileEmpty"]', "file field empty state"],
  /* `#apply-position`, not `[class*="field"] select` — the first select in
     the form is now the phone's dial code, which always HAS a value and is
     therefore always at full ink. The one whose quiet `:invalid` tone needs
     measuring is the role picker. */
  ["#apply-position", "role select, nothing chosen"],
  ["#apply-phone-cc", "dial code select"],
];
for (const [sel] of SELECTORS) {
  await page.evaluate((s) => {
    document.querySelector(s)?.scrollIntoView({ block: "center" });
  }, sel);
  await sleep(500);
}
await page.evaluate(() => window.__lenis?.scrollTo(0, { immediate: true }) ?? scrollTo(0, 0));
await sleep(1200);

const rows = await page.evaluate((SELECTORS) => {
  const parse = (s) => {
    const m = s.match(/[\d.]+/g);
    if (!m) return null;
    return [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]];
  };
  const over = (fg, bg) =>
    [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
  const lum = (c) => {
    const f = c.slice(0, 3).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  // the real backdrop under an element: walk up compositing every opaque or
  // translucent background, so a tinted plate over cream resolves correctly
  const backdrop = (el) => {
    const stack = [];
    for (let n = el.parentElement; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const bg = parse(cs.backgroundColor);
      if (bg && bg[3] > 0) stack.unshift(bg);
      if (bg && bg[3] === 1) break;
    }
    let out = [255, 255, 255, 1];
    for (const layer of stack) out = over(layer, out);
    return out;
  };
  const measure = (sel, label) => {
    const el = document.querySelector(sel);
    if (!el) return { label, missing: true };
    const cs = getComputedStyle(el);
    const col = parse(cs.color);
    // element opacity multiplies the colour's own alpha
    let a = col[3];
    for (let n = el; n; n = n.parentElement) a *= +getComputedStyle(n).opacity;
    const bg = backdrop(el);
    const fg = over([col[0], col[1], col[2], a], bg);
    const [l1, l2] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    return {
      label,
      text: el.textContent.trim().slice(0, 52),
      color: cs.color,
      opacity: +a.toFixed(3),
      size: cs.fontSize,
      transform: cs.textTransform,
      align: cs.textAlign,
      bg: `rgb(${bg.slice(0, 3).map(Math.round).join(",")})`,
      ratio: +((l1 + 0.05) / (l2 + 0.05)).toFixed(2),
    };
  };
  return SELECTORS.map(([sel, label]) => measure(sel, label));
}, SELECTORS);

console.log(`\n=== contrast at ${VW}x${VH}   (WCAG AA body minimum 4.5:1) ===\n`);
for (const r of rows) {
  if (r.missing) {
    console.log(`  ??  ${r.label} — not on the page`);
    continue;
  }
  const pass = r.ratio >= 4.5;
  if (!pass) fails++;
  console.log(
    `  ${pass ? "PASS" : "FAIL"}  ${String(r.ratio).padStart(5)}:1  ${r.label.padEnd(17)} ${r.size.padStart(7)}  ${r.transform === "uppercase" ? "CAPS " : "     "}${r.align.padEnd(6)} on ${r.bg}`,
  );
  console.log(`               "${r.text}"`);
}
console.log(
  `\n  ${fails === 0 ? "EVERY QUIET LINE CLEARS 4.5:1" : `${fails} LINE(S) UNDER 4.5:1`}\n`,
);

const shutdown = async () => {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    proc?.kill("SIGKILL");
  } catch {}
  process.exit(fails === 0 ? 0 : 1);
};
await shutdown();
