/* Geometry of the scattered pasteboard at rest: the box each print is
   actually drawn at (is the per-seat crop landing?), whether any of them
   trespass on the title, and which files repeat.
   usage: node scripts/probe-field.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "58274";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#restaurants [data-plate]", { timeout: 60000 });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
  timeout: 60000,
});
await sleep(1200);
// Park the section JUST SHORT of the arming band (its centre at 72% of the
// viewport, outside the 38–62% trigger) so the pasteboard is measured at
// rest — scrolling it to dead centre arms the sequence and you end up
// measuring the dolly instead.
await page.evaluate(() => {
  const el = document.querySelector("#restaurants");
  const r = el.getBoundingClientRect();
  window.__lenis?.scrollTo(
    window.scrollY + r.top + r.height / 2 - innerHeight * 0.72,
    { immediate: true },
  );
});
await sleep(1500);

const out = await page.evaluate(() => {
  const sec = document.querySelector("#restaurants");
  const title = sec.querySelector("h2").getBoundingClientRect();
  const imgs = [...sec.querySelectorAll("[class*='stagePrintImg']")];
  const rows = imgs.map((im) => {
    const r = im.getBoundingClientRect();
    const src = decodeURIComponent(im.currentSrc || im.src).match(/[^/=&?]+\.jpg/)?.[0];
    return {
      src,
      attr: `${im.getAttribute("width")}x${im.getAttribute("height")}`,
      drawn: `${Math.round(r.width)}x${Math.round(r.height)}`,
      ar: +(r.width / r.height).toFixed(2),
      box: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)],
      offscreen: r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth,
      // does it overlap the title's own line box?
      hitsTitle:
        r.left < title.right && r.right > title.left &&
        r.top < title.bottom && r.bottom > title.top,
    };
  });
  const counts = {};
  rows.forEach((r) => (counts[r.src] = (counts[r.src] || 0) + 1));
  return {
    vh: innerHeight,
    section: [Math.round(sec.getBoundingClientRect().top), Math.round(sec.getBoundingClientRect().bottom)],
    title: [Math.round(title.left), Math.round(title.top), Math.round(title.right), Math.round(title.bottom)],
    rows,
    repeats: Object.entries(counts).filter(([, n]) => n > 1),
  };
});

console.log("viewport h", out.vh, "| section", out.section, "| title", out.title);
console.log("\n src                     attr       drawn      ar    box                       flags");
for (const r of out.rows) {
  const flags = [r.offscreen && "OFFSCREEN", r.hitsTitle && "HITS-TITLE"].filter(Boolean).join(" ");
  console.log(
    ` ${String(r.src).padEnd(22)} ${r.attr.padEnd(10)} ${r.drawn.padEnd(10)} ${String(r.ar).padEnd(5)} ${JSON.stringify(r.box).padEnd(24)} ${flags}`,
  );
}
console.log("\nrepeated files:", JSON.stringify(out.repeats));
await browser.close();
