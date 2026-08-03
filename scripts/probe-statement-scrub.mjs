/* At rest the statement's italic words are NOT clipped (verified at 3x zoom),
   so the crop the user photographed is a state, not a constant. The statement
   rises word by word on a scroll scrub — so this sweeps that scrub and reports,
   per frame, which words are still inside their clip window and whether the
   italic ones behave differently from the upright ones.

   usage: node scripts/probe-statement-scrub.mjs [port]  (run from the repo root) */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const PORT = process.argv[2] || "3300";
const OUT = "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/2023fdca-cd86-4bca-922b-c2f81853e348/scratchpad/shots";
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "no-preference" },
]);
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2500));

const sec = await page.evaluate(() => {
  const el = document.querySelector("[class*='About_statement__']");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: Math.round(scrollY + r.top), h: el.offsetHeight };
});
if (!sec) {
  console.log("statement section not found");
  await b.close().catch(() => {});
  process.exit(0);
}
console.log(`statement top=${sec.top} h=${sec.h}`);

const go = async (y) => {
  await page.evaluate((t) => {
    const l = window.__lenis || window.lenis;
    if (l && typeof l.scrollTo === "function") l.scrollTo(t, { immediate: true });
    else window.scrollTo(0, t);
  }, y);
  await new Promise((r) => setTimeout(r, 700));
};

/* sweep from a screen above the section to a screen below it */
for (let i = 0; i <= 10; i++) {
  const y = sec.top - 900 + ((sec.h + 900) * i) / 10;
  await go(y);

  const state = await page.evaluate(() => {
    const masks = [...document.querySelectorAll("[class*='statementMask']")];
    const rows = masks.map((m) => {
      const w = m.firstElementChild;
      const mr = m.getBoundingClientRect();
      const wr = w.getBoundingClientRect();
      const cs = getComputedStyle(w);
      return {
        t: (m.textContent || "").trim().slice(0, 14),
        it: cs.fontStyle === "italic",
        /* how far the word's top sits below the window's top: 0 = fully
           arrived, positive = still rising through the clip */
        risen: +(wr.top - mr.top).toFixed(1),
      };
    });
    return {
      y: Math.round(scrollY),
      onScreen: (() => {
        const p = document.querySelector("[class*='statementText']");
        if (!p) return false;
        const r = p.getBoundingClientRect();
        return r.top < innerHeight && r.bottom > 0;
      })(),
      rows,
    };
  });

  const mid = state.rows.filter((r) => r.risen > 1);
  const midIt = mid.filter((r) => r.it).length;
  console.log(
    `  ${i * 10}%  y=${state.y}  onScreen=${state.onScreen}  ` +
      `mid-rise ${mid.length}/${state.rows.length} (italic ${midIt})` +
      (mid.length && mid.length <= 6
        ? `  -> ${mid.map((r) => `${r.t}${r.it ? "*" : ""}:${r.risen}`).join(" ")}`
        : ""),
  );

  if (state.onScreen) {
    await page.screenshot({ path: `${OUT}/stmt-${i * 10}.png` });
  }
}
console.log(`\nshots -> ${OUT}/stmt-*.png   (* marks an italic word)`);

setTimeout(() => process.exit(0), 1200);
await b.close().catch(() => {});
process.exit(0);
