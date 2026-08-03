/* Captures of /contact at the four target viewports, plus the grid facts the
 * screenshots are meant to prove.
 *
 * NEVER `fullPage: true` here. The page is built out of `Reveal`, which is
 * `whileInView`; a full-page capture does not fire IntersectionObserver, so
 * every section that has not been scrolled into view renders as blank maroon
 * ground. (scripts/shoot-contact.mjs does exactly this at 1440, which is why
 * its edge census also picked up the off-canvas Menu and the nav.) Each shot
 * below is a real viewport frame taken after the page has been read down to
 * that point, which is what a reader actually sees.
 *
 * usage: node scripts/shoot-contact-grid.mjs [port] [outDir]
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3210";
const OUT = process.argv[3] || "/tmp/mgnhw_contact_after";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu"],
});
const page = await b.newPage();

const to = async (y) => {
  await page.evaluate((v) => {
    if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
    else window.scrollTo(0, v);
  }, y);
  await sleep(240);
};

/* sRGB relative luminance + contrast, with CSS `opacity` composited against
   the ground the way the browser does it (in gamma space, not linear) */
const contrast = (fg, bg, alpha) => {
  const lin = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const mixed = fg.map((c, i) => alpha * c + (1 - alpha) * bg[i]);
  const a = L(mixed);
  const z = L(bg);
  const [hi, lo] = a > z ? [a, z] : [z, a];
  return (hi + 0.05) / (lo + 0.05);
};

for (const [w, h] of [
  [1440, 900],
  [1920, 1080],
  [820, 1180],
  [390, 844],
]) {
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://localhost:${PORT}/contact`, { waitUntil: "domcontentloaded" });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1200);

  /* read the page down so every Reveal has entered (they are `once: true`,
     so they stay shown when we come back up for the shots) */
  const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let y = 0; y <= H; y += Math.round(h * 0.6)) await to(y);
  await to(H);
  await sleep(600);

  const facts = await page.evaluate(() => {
    const ul = document.querySelector('ul[class*="ReviewUs_grid"]');
    const lis = ul ? [...ul.children] : [];
    const cells = lis.map((li) => {
      const r = li.getBoundingClientRect();
      return { x: Math.round(r.left), w: Math.round(r.width) };
    });
    /* group cells into rows by their y, so "does the last row fill" is a fact
       about geometry rather than about items % columns. A row is full when its
       leftmost cell starts at the list's left edge and its rightmost cell ends
       at the right edge — measuring summed widths instead would read a gapped
       row as 94% full and cry ragged. */
    const rows = new Map();
    for (const li of lis) {
      const r = li.getBoundingClientRect();
      const k = Math.round(r.top);
      const cur = rows.get(k) || { l: Infinity, r: -Infinity };
      rows.set(k, { l: Math.min(cur.l, r.left), r: Math.max(cur.r, r.right) });
    }
    const ur = ul ? ul.getBoundingClientRect() : { left: 0, right: 0, width: 0 };
    const ulW = ur.width;
    const rowFill = [...rows.entries()]
      .sort((a, z) => a[0] - z[0])
      .map(([, v]) => Math.round(((v.r - v.l) / ulW) * 100));
    const lede = document.querySelector('p[class*="ReviewUs_lede"]');
    const ls = lede ? getComputedStyle(lede) : null;
    return {
      cells,
      rowFill,
      ledeOpacity: ls?.opacity,
      ledeAlign: ls?.textAlign,
      ledeTransform: ls?.textTransform,
      ledeText: lede?.textContent?.trim().replace(/\s+/g, " "),
      ledeAriaHidden: lede?.closest("[aria-hidden]") ? "yes" : "no",
      eyebrows: [...document.querySelectorAll("main [class*='eyebrow']")].map((e) =>
        e.textContent.trim(),
      ),
      faqListX: Math.round(
        document.querySelector('ul[class*="FAQ_list"]')?.getBoundingClientRect().left ?? -1,
      ),
      formX: Math.round(
        document.querySelector('form[class*="Contact_form"]')?.getBoundingClientRect().left ?? -1,
      ),
      overflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  const cr = contrast([250, 247, 241], [47, 0, 0], parseFloat(facts.ledeOpacity || "1"));
  console.log(`\n=== ${w}x${h} ===  hOverflow ${facts.overflow}`);
  console.log(`  review cells x/w : ${facts.cells.map((c) => `${c.x}/${c.w}`).join("  ")}`);
  console.log(`  row fill %       : ${facts.rowFill.join("  ")}  ${facts.rowFill.every((p) => p >= 99) ? "(all rows full)" : "*** RAGGED ROW ***"}`);
  console.log(`  faq list left    : ${facts.faqListX}`);
  console.log(`  form left        : ${facts.formX}`);
  console.log(`  eyebrows left    : ${JSON.stringify(facts.eyebrows)}`);
  console.log(
    `  helper text      : align=${facts.ledeAlign} transform=${facts.ledeTransform} opacity=${facts.ledeOpacity} contrast=${cr.toFixed(2)}:1 ${cr >= 4.5 ? "PASS" : "*** FAIL ***"} ariaHidden=${facts.ledeAriaHidden}`,
  );
  console.log(`  helper copy      : "${facts.ledeText}"`);

  const tops = await page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll("main section")].map((s) => [
        s.id,
        Math.round(s.getBoundingClientRect().top + scrollY),
      ]),
    ),
  );

  for (const [name, y] of [
    ["01-top", 0],
    ["02-form", Math.max(0, tops["contact-us"] + Math.round(h * 0.3))],
    ["03-faq", Math.max(0, tops["faq"] - 30)],
    ["04-review", Math.max(0, tops["leave-a-review"] - 30)],
    ["05-review-grid", Math.max(0, tops["leave-a-review"] + Math.round(h * 0.45))],
    ["06-footer", H],
  ]) {
    await to(y);
    await sleep(320);
    await page.screenshot({ path: `${OUT}/${w}x${h}-${name}.png` });
  }
}
console.log(`\nshots -> ${OUT}`);

await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
