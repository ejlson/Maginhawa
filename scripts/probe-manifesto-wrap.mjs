/* THE STATEMENT'S WRAP, SWEPT.

   The locked line count is a MEASURED result, not a hand-set one (see
   useLockedLines): the component freezes whatever the browser wrapped, so
   the only way to choose a display size is to try each one at each width
   and read the line count back.

   The sweep works by injecting a font-size override and then dispatching a
   resize, which is exactly what the component listens for to DROP the lock
   and re-measure — so every reading comes from the real component at the
   real width, not from a detached clone.

   Reports, per width and per candidate vw coefficient: the line count and
   the words on each line, so a 4-line result that strands a one-word last
   line is not mistaken for a good one.

   usage: node scripts/probe-manifesto-wrap.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";

const WIDTHS = [1728, 1600, 1440, 1280, 1150, 1024];
const COEFS = [5.35, 5.1, 4.9, 4.7, 4.5, 4.3, 4.1];
const MIN_PX = 2.4 * 16;
const MAX_PX = 5.2 * 16;

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2" });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 60000 },
);
await page.evaluate(() => document.fonts.ready);

/** set the override, drop the lock, let it re-measure, read the lines back */
async function measure(px) {
  return page.evaluate(async (px) => {
    let tag = document.getElementById("__wrapProbe");
    if (!tag) {
      tag = document.createElement("style");
      tag.id = "__wrapProbe";
      document.head.appendChild(tag);
    }
    const h2 = Array.from(document.querySelectorAll("h2[aria-label]")).find((n) =>
      /vibrant Filipino/.test(n.getAttribute("aria-label") || ""),
    );
    if (!h2) return null;
    tag.textContent = `.${h2.className.split(" ")[0]} { font-size: ${px}px !important; }`;
    /* The component drops the lock on resize and re-measures in a layout
       effect. Two rounds, not one: a single dispatch with a short settle
       gave a NON-MONOTONIC sweep (a smaller size reporting more lines than
       a larger one at the same width), which cannot be a real wrap and is
       the reading landing before the re-lock has finished. Re-locking twice
       and waiting longer makes every column monotonic. */
    for (let i = 0; i < 2; i++) {
      window.dispatchEvent(new Event("resize"));
      await new Promise((r) => setTimeout(r, 420));
    }

    const live = Array.from(document.querySelectorAll("h2[aria-label]")).find(
      (n) => /vibrant Filipino/.test(n.getAttribute("aria-label") || ""),
    );
    const kids = Array.from(live.children);
    const locked = kids.length > 0 && !kids[0].hasAttribute("data-part");
    if (!locked) return { locked: false };
    // each line is a span of masks; count the masks, and read words with
    // spaces (textContent has none — the gaps are margins, not characters)
    const lines = kids.map((line) => {
      const masks = Array.from(line.children);
      const words = masks.map((m) => (m.textContent || "").trim()).filter(Boolean);
      return { n: masks.length, text: words.join(" ") };
    });
    return {
      locked: true,
      lines,
      height: Math.round(live.getBoundingClientRect().height),
    };
  }, px);
}

const table = [];
for (const w of WIDTHS) {
  await page.setViewport({ width: w, height: 900 });
  await new Promise((r) => setTimeout(r, 200));
  for (const c of COEFS) {
    const px = Math.min(MAX_PX, Math.max(MIN_PX, (c * w) / 100));
    const r = await measure(px);
    table.push({ w, c, px: +px.toFixed(1), r });
  }
}

console.log("\n=== WRAP SWEEP — line count by width x size ===\n");
const head = COEFS.map((c) => String(c).padStart(6)).join("");
console.log("  width │" + head);
console.log("  ──────┼" + "─".repeat(head.length));
for (const w of WIDTHS) {
  const row = COEFS.map((c) => {
    const e = table.find((t) => t.w === w && t.c === c);
    const n = e?.r?.lines?.length ?? "?";
    return String(n).padStart(6);
  }).join("");
  console.log(`  ${String(w).padStart(5)} │${row}`);
}

console.log("\n=== 4-LINE CANDIDATES (breaks shown) ===");
for (const c of COEFS) {
  const rows = WIDTHS.map((w) => table.find((t) => t.w === w && t.c === c));
  const counts = rows.map((r) => r?.r?.lines?.length);
  if (counts.every((n) => n === 4)) {
    console.log(`\n  coefficient ${c}vw — 4 lines at EVERY width tested`);
    const at1440 = rows.find((r) => r.w === 1440);
    at1440?.r?.lines?.forEach((l, i) =>
      console.log(`    ${i + 1}. (${l.n}) ${l.text}`),
    );
    console.log(`    h2 height @1440: ${at1440?.r?.height}px`);
  }
}

console.log("\n=== BREAKS AT 1440 FOR EACH SIZE ===");
for (const c of COEFS) {
  const e = table.find((t) => t.w === 1440 && t.c === c);
  console.log(`\n  ${c}vw = ${e.px}px -> ${e.r?.lines?.length} lines`);
  e.r?.lines?.forEach((l, i) => console.log(`    ${i + 1}. ${l.text}`));
}

await b.close();
