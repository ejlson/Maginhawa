/* THE STATEMENT'S MEASURE, SWEPT — the other axis.

   probe-manifesto-wrap.mjs sweeps the display SIZE and finds that the
   sentence goes 4 lines / 3 lines with nothing usable between: at the
   current size the fourth line is "London." on its own, which is the
   one-word widow the stylesheet has been fixed for before, and one step
   smaller collapses to three.

   Size is not the only lever. The measure is: a NARROWER column breaks the
   third line earlier and carries "in the heart of" down to join "London.",
   which keeps four lines and kills the widow without touching the type
   size. This sweeps the statement's width at a fixed size and reports the
   breaks so the seat can be chosen from evidence.

   usage: node scripts/probe-manifesto-measure.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";

const WIDTHS = [1728, 1600, 1440, 1280, 1150, 1024];
// as a percentage of the full 12-column measure
const CAPS = [100, 96, 92, 88, 84, 80, 76];

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

async function measure(pct) {
  return page.evaluate(async (pct) => {
    let tag = document.getElementById("__measProbe");
    if (!tag) {
      tag = document.createElement("style");
      tag.id = "__measProbe";
      document.head.appendChild(tag);
    }
    const pick = () =>
      Array.from(document.querySelectorAll("h2[aria-label]")).find((n) =>
        /vibrant Filipino/.test(n.getAttribute("aria-label") || ""),
      );
    const h2 = pick();
    if (!h2) return null;
    tag.textContent = `.${h2.className.split(" ")[0]} { max-width: ${pct}% !important; }`;
    for (let i = 0; i < 2; i++) {
      window.dispatchEvent(new Event("resize"));
      await new Promise((r) => setTimeout(r, 420));
    }
    const live = pick();
    const kids = Array.from(live.children);
    if (!kids.length || kids[0].hasAttribute("data-part")) return { locked: false };
    const lines = kids.map((line) => {
      const masks = Array.from(line.children);
      return {
        n: masks.length,
        text: masks
          .map((m) => (m.textContent || "").trim())
          .filter(Boolean)
          .join(" "),
      };
    });
    return { locked: true, lines };
  }, pct);
}

const table = [];
for (const w of WIDTHS) {
  await page.setViewport({ width: w, height: 900 });
  await new Promise((r) => setTimeout(r, 200));
  for (const c of CAPS) table.push({ w, c, r: await measure(c) });
}

/** a line carrying one mask, or only a bare "London.", is a widow */
const widow = (lines) => {
  const last = lines[lines.length - 1];
  return last.n <= 1;
};

console.log("\n=== MEASURE SWEEP — lines (W = widow on last line) ===\n");
const head = CAPS.map((c) => String(c + "%").padStart(7)).join("");
console.log("  width │" + head);
console.log("  ──────┼" + "─".repeat(head.length));
for (const w of WIDTHS) {
  const row = CAPS.map((c) => {
    const e = table.find((t) => t.w === w && t.c === c);
    const L = e?.r?.lines;
    if (!L) return "      ?";
    return String(L.length + (widow(L) ? "W" : "")).padStart(7);
  }).join("");
  console.log(`  ${String(w).padStart(5)} │${row}`);
}

console.log("\n=== CLEAN 4-LINE SETTINGS (no widow, every width) ===");
let found = false;
for (const c of CAPS) {
  const rows = WIDTHS.map((w) => table.find((t) => t.w === w && t.c === c));
  const ok = rows.every(
    (r) => r?.r?.lines?.length === 4 && !widow(r.r.lines),
  );
  if (ok) {
    found = true;
    console.log(`\n  max-width ${c}% — 4 clean lines at EVERY width`);
    for (const w of [1600, 1440, 1280]) {
      const e = rows.find((r) => r.w === w);
      console.log(`   @${w}:`);
      e.r.lines.forEach((l, i) => console.log(`      ${i + 1}. (${l.n}) ${l.text}`));
    }
  }
}
if (!found) console.log("  none — see the per-width breaks below");

console.log("\n=== BREAKS AT 1440 ===");
for (const c of CAPS) {
  const e = table.find((t) => t.w === 1440 && t.c === c);
  const L = e?.r?.lines;
  console.log(`\n  ${c}% -> ${L?.length} lines${L && widow(L) ? "  <-- WIDOW" : ""}`);
  L?.forEach((l, i) => console.log(`    ${i + 1}. (${l.n}) ${l.text}`));
}

await b.close();
