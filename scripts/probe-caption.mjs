/* Caption row geometry: is every pill seated on the FIRST line of the
   description beside it, and are the two pills the same box? Runs against
   the SETTLED grid (the intro is skipped by scrolling clean past it, which
   the component settles on).
   usage: node scripts/probe-caption.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
for (const vw of [1440, 1728, 1920]) {
const page = await browser.newPage();
await page.setViewport({ width: vw, height: 900 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#restaurants [data-plate]", { timeout: 60000 });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
  timeout: 60000,
});
await sleep(800);

// straight past the chapter — the sequence settles rather than playing
await page.evaluate(() => {
  const el = document.querySelector("#restaurants");
  window.__lenis?.scrollTo(
    window.scrollY + el.getBoundingClientRect().bottom + innerHeight,
    { immediate: true },
  );
});
await sleep(600);
await page.evaluate(() => {
  const el = document.querySelector("#restaurants");
  window.__lenis?.scrollTo(
    window.scrollY + el.getBoundingClientRect().top - innerHeight * 0.1,
    { immediate: true },
  );
});
await sleep(900);

const rows = await page.evaluate(() => {
  // a zero-width probe span dropped at the very start of the description
  // reports the FIRST line box directly — no guessing from line-height
  const out = [];
  for (const cell of document.querySelectorAll("#restaurants li")) {
    const tag = cell.querySelector("[class*='cellTag']");
    const row = cell.querySelector("[class*='pillRow']");
    if (!tag || !row) continue;
    const probe = document.createElement("span");
    probe.textContent = "​";
    tag.insertBefore(probe, tag.firstChild);
    const line = probe.getBoundingClientRect();
    probe.remove();
    const r = row.getBoundingClientRect();
    const pills = [...row.children].map((p) => {
      const b = p.getBoundingClientRect();
      return {
        cls: p.className.includes("Book") ? "book" : "place",
        h: +b.height.toFixed(1),
      };
    });
    out.push({
      name: cell.querySelector("[role=img], [class*='wordmark']")?.ariaLabel ||
        cell.textContent.trim().slice(0, 14),
      tagLines: Math.round(tag.getBoundingClientRect().height / line.height),
      // signed gap between the pill row's top and the first line's top
      dTop: +(r.top - line.top).toFixed(1),
      pills,
    });
  }
  return out;
});

console.log(`\n--- viewport ${vw} ---`);
console.log("tile                 lines  pillTop-lineTop  pill heights");
for (const r of rows) {
  console.log(
    r.name.padEnd(20),
    String(r.tagLines).padStart(4),
    String(r.dTop).padStart(14),
    "  ",
    r.pills.map((p) => `${p.cls}:${p.h}`).join(" "),
  );
}
const tops = rows.map((r) => r.dTop);
const heights = [...new Set(rows.flatMap((r) => r.pills.map((p) => p.h)))];
console.log(
  `\nspread of pillTop across tiles: ${(Math.max(...tops) - Math.min(...tops)).toFixed(1)}px`,
);
console.log(`distinct pill heights: ${heights.join(", ")}`);
const shared = rows.filter((r) => r.dTop < 6).length;
console.log(`pills on the first line: ${shared}/${rows.length} tiles`);
await page.close();
}
await browser.close();
