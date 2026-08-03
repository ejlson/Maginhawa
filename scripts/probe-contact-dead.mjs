/* Why is /contact 3009px tall with two large empty stretches, and why can't
   the two eyebrows be seen? Hypothesis: Reveal's whileInView never fires for
   them. Walks every section, reporting its box, its computed opacity, and the
   opacity of the nearest Reveal wrapper.
   usage: node scripts/probe-contact-dead.mjs [port] */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1","--enable-gpu"] });
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/contact`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(()=>{});
await page.evaluate(() => document.fonts.ready);
await sleep(2000);

/* first read everything WITHOUT scrolling, then scroll the whole page slowly
   and read again — anything that changes was waiting on an observer */
const read = () => page.evaluate(() => {
  const px = (n) => Math.round(n);
  const out = [];
  document.querySelectorAll("section, [class*='eyebrow'], [class*='faq'], [class*='Faq'], [class*='review'], [class*='Review']").forEach((e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    out.push({
      tag: e.tagName, cls: String(e.className).slice(0, 30),
      top: px(r.top + scrollY), h: px(r.height),
      op: s.opacity, vis: s.visibility, tf: s.transform.slice(0, 22),
      txt: (e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28),
    });
  });
  return out;
});

const before = await read();
await page.evaluate(async () => {
  const H = document.documentElement.scrollHeight;
  for (let y = 0; y <= H; y += 300) {
    window.__lenis?.scrollTo(y, { immediate: true }) ?? window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 90));
  }
});
await sleep(1200);
const after = await read();

console.log("\n  el                              top    h     opacity before -> after");
before.forEach((x, i) => {
  const y = after[i] || {};
  const changed = x.op !== y.op;
  console.log(`  ${(x.cls || x.tag).padEnd(30)} ${String(x.top).padStart(5)} ${String(x.h).padStart(5)}   ${x.op} -> ${y.op}${changed ? "   (was waiting on an observer)" : ""}   ${x.txt}`);
});

const gaps = await page.evaluate(() => {
  /* find vertical stretches of the document with no painted text */
  const boxes = [...document.querySelectorAll("*")].filter((e) => {
    const t = (e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    if (!t) return false;
    const r = e.getBoundingClientRect();
    return r.height > 4 && getComputedStyle(e).opacity !== "0";
  }).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top + scrollY), Math.round(r.bottom + scrollY)]; })
    .sort((a, c) => a[0] - c[0]);
  const gaps = []; let cur = 0;
  for (const [t, bm] of boxes) { if (t - cur > 260) gaps.push([cur, t, t - cur]); cur = Math.max(cur, bm); }
  return { docH: document.documentElement.scrollHeight, gaps };
});
console.log(`\n  document ${gaps.docH}px — empty stretches over 260px:`);
gaps.gaps.forEach(([a, c, d]) => console.log(`    ${a} -> ${c}   ${d}px`));
const t = setTimeout(() => process.exit(0), 3000);
await b.close().catch(() => {});
clearTimeout(t); process.exit(0);
