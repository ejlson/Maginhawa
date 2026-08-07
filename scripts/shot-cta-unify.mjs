/* THE THREE ACTIONS, SIDE BY SIDE, AT REST AND UNDER THE POINTER.
 *
 * They are one component now (components/PillCta.tsx) and this is the
 * check that says so from the outside: three clips of the same control in
 * its three chapters, plus a measurement of each one's box, so "identical"
 * is a number rather than an impression. The closing frame's instance is
 * the accent variant and is expected to differ in FILL and in nothing else.
 *
 * Also shoots the restaurants chapter's new closing hairline against its
 * opening one, since a rule that does not line up with the grid it brackets
 * is worse than no rule.
 *
 * usage: node scripts/shot-cta-unify.mjs [port] [width] [height]
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const W = +(process.argv[3] || 1440);
const H = +(process.argv[4] || 900);
const DIR = "/tmp/cta-unify";
fs.mkdirSync(DIR, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=2"],
});
const p = await b.newPage();
await p.setViewport({ width: W, height: H });
await p.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await p
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await new Promise((r) => setTimeout(r, 1500));

const travel = async (y) => {
  await p.evaluate((to) => {
    const l = window.__lenis;
    if (l) l.scrollTo(to, { immediate: true, force: true });
    else window.scrollTo(0, to);
  }, y);
  await new Promise((r) => setTimeout(r, 200));
};

// wake every in-view trigger before measuring or shooting
const docH = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < docH; y += 500) await travel(y);
await travel(0);
await new Promise((r) => setTimeout(r, 500));

/* Each control, found by the SHARED class the component emits — if a call
   site had drifted back to a local shape it would simply not be found. */
const CASES = [
  { name: "about", sel: "[class*='AboutSplit_section'] [class*='PillCta_host']" },
  { name: "blog", sel: "#blog [class*='PillCta_host']" },
  { name: "reservations", sel: "#book [class*='PillCta_host']" },
];

const report = [];
for (const c of CASES) {
  const box = await p.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const link = el.querySelector("a");
    const label = el.querySelector("[class*='PillCta_label']");
    const disc = el.querySelector("[class*='PillCta_disc']");
    el.scrollIntoView({ block: "center" });
    const cs = getComputedStyle(link);
    const ds = getComputedStyle(disc);
    return {
      text: label.textContent.trim(),
      w: Math.round(link.getBoundingClientRect().width),
      h: Math.round(link.getBoundingClientRect().height),
      discD: Math.round(disc.getBoundingClientRect().width),
      fill: ds.backgroundColor,
      ink: cs.color,
      font: cs.fontFamily.split(",")[0],
      size: cs.fontSize,
      tracking: cs.letterSpacing,
      radius: getComputedStyle(
        el.querySelector("[class*='PillCta_body']"),
      ).borderRadius,
    };
  }, c.sel);

  if (!box) {
    report.push({ ...c, MISSING: true });
    continue;
  }
  await new Promise((r) => setTimeout(r, 400));

  const el = await p.$(c.sel);
  await el.screenshot({ path: `${DIR}/${c.name}-rest.png` });
  // hover the anchor itself, then let the 460ms close finish
  await p.hover(`${c.sel} a`);
  await new Promise((r) => setTimeout(r, 800));
  await el.screenshot({ path: `${DIR}/${c.name}-hover.png` });
  await p.mouse.move(0, 0);
  await new Promise((r) => setTimeout(r, 700));

  report.push({ name: c.name, ...box });
}

/* the restaurants chapter's two hairlines — do they bracket the same box? */
const rules = await p.evaluate(() => {
  const head = document.querySelector("#restaurants [class*='headRule']");
  const foot = document.querySelector("#restaurants [class*='footRule']");
  const grid = document.querySelector("#restaurants [class*='grid']");
  const sec = document.querySelector("#restaurants");
  if (!foot) return { footRule: "MISSING" };
  const r = (e) => {
    const b = e.getBoundingClientRect();
    return { l: Math.round(b.left), r: Math.round(b.right), t: b.top + scrollY };
  };
  const h = r(head);
  const f = r(foot);
  const g = r(grid);
  const s = sec.getBoundingClientRect();
  return {
    headRule: `x ${h.l}→${h.r}`,
    footRule: `x ${f.l}→${f.r}`,
    grid: `x ${g.l}→${g.r}`,
    edgesMatch: h.l === f.l && h.r === f.r && f.l === g.l && f.r === g.r,
    gridBottomToRule: Math.round(f.t - (g.t + grid.getBoundingClientRect().height)),
    ruleToSectionEnd: Math.round(s.bottom + scrollY - f.t),
  };
});

await travel(
  await p.evaluate(
    () =>
      document.querySelector("#restaurants").getBoundingClientRect().bottom +
      scrollY -
      innerHeight +
      40,
  ),
);
await new Promise((r) => setTimeout(r, 500));
await p.screenshot({ path: `${DIR}/discover-foot.png` });

console.log("\n── THE THREE ACTIONS ──");
for (const r of report) {
  if (r.MISSING) {
    console.log(`  ${r.name.padEnd(13)} NOT FOUND (${r.sel})`);
    continue;
  }
  console.log(
    `  ${r.name.padEnd(13)} "${r.text}"\n` +
      `      ${r.w}×${r.h}  disc ${r.discD}  radius ${r.radius}\n` +
      `      fill ${r.fill}  ink ${r.ink}\n` +
      `      ${r.font} ${r.size} / ${r.tracking}`,
  );
}

console.log("\n── THE RESTAURANTS CHAPTER'S HAIRLINES ──");
for (const [k, v] of Object.entries(rules)) console.log(`  ${k.padEnd(18)} ${v}`);
console.log(`\nclips → ${DIR}\n`);

await b.close();
