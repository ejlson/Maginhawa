/* The wheel drag is gated on `reduced.current` (RestaurantsShowcase.tsx:642)
   and headless Chrome reports `prefers-reduced-motion: reduce` in some
   builds — which would make a failed drag a PROBE fault, not a site fault.
   So: report the media state first, then force no-preference, then drag the
   real scroller (scrollerRef), not the outer .wheel the last probe grabbed.

   usage: node scripts/probe-drag-commit.mjs [port]   (run from the repo root) */
import puppeteer from "puppeteer-core";

const PORT = process.argv[2] || "3300";
const B = `http://localhost:${PORT}`;

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });

await page.goto(`${B}/restaurants`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1500));
const rmDefault = await page.evaluate(
  () => matchMedia("(prefers-reduced-motion: reduce)").matches,
);
console.log(`\nheadless default prefers-reduced-motion: reduce = ${rmDefault}`);

/* force a motion-allowing reader, which is what the feature is written for */
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "no-preference" },
]);
await page.goto(`${B}/restaurants`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2200));
console.log(
  `after emulate: reduce = ${await page.evaluate(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  )}`,
);

/* the scroller is the element that actually overflows inside the wheel */
const box = await page.evaluate(() => {
  const wheel = document.querySelector("[class*='wheel']");
  if (!wheel) return { error: "no wheel" };
  const cands = [wheel, ...wheel.querySelectorAll("*")].filter(
    (e) => e.scrollHeight > e.clientHeight + 20,
  );
  const s = cands[0];
  if (!s) return { error: "nothing overflows inside the wheel" };
  const r = s.getBoundingClientRect();
  return {
    cls: String(s.className).slice(0, 60),
    x: Math.round(r.left + r.width / 2),
    y: Math.round(r.top + r.height / 2),
    scrollTop: s.scrollTop,
    scrollH: s.scrollHeight,
    clientH: s.clientHeight,
  };
});
console.log(`scroller: ${JSON.stringify(box)}`);
if (box.error) {
  setTimeout(() => process.exit(0), 800);
  await b.close().catch(() => {});
  process.exit(0);
}

const nameOf = () =>
  page.evaluate(() => {
    const a = document.querySelector(
      "[aria-current='true'], [aria-selected='true'], [data-active='true'], [class*='isActive'], [class*='active']",
    );
    return a ? (a.textContent || "").trim().slice(0, 30) : null;
  });

const selBefore = await nameOf();

await page.mouse.move(box.x, box.y);
await page.mouse.down();
let mid = null;
for (let i = 1; i <= 20; i++) {
  await page.mouse.move(box.x, box.y - i * 10);
  await new Promise((r) => setTimeout(r, 14));
  if (i === 10) {
    mid = await page.evaluate(() => {
      const w = document.querySelector("[class*='wheel']");
      const all = [w, ...(w ? w.querySelectorAll("*") : [])].filter(Boolean);
      const el = all.find((e) => e.getAttribute && e.getAttribute("data-dragging"));
      const sc = all.find((e) => e.scrollHeight > e.clientHeight + 20);
      return {
        draggingAttrOn: el ? String(el.className).slice(0, 40) : null,
        scrollTop: sc ? sc.scrollTop : null,
      };
    });
  }
}
console.log(`mid-drag: ${JSON.stringify(mid)}`);
await page.mouse.up();
await new Promise((r) => setTimeout(r, 1400));

const after = await page.evaluate(() => {
  const w = document.querySelector("[class*='wheel']");
  const all = [w, ...(w ? w.querySelectorAll("*") : [])].filter(Boolean);
  const sc = all.find((e) => e.scrollHeight > e.clientHeight + 20);
  return { scrollTop: sc ? sc.scrollTop : null };
});
const selAfter = await nameOf();
console.log(`selected before: ${JSON.stringify(selBefore)}`);
console.log(`after drag:      scrollTop=${after.scrollTop} selected=${JSON.stringify(selAfter)}`);
console.log(
  `\nVERDICT: ${
    mid && mid.draggingAttrOn ? "drag COMMITTED" : "drag NEVER COMMITTED"
  }; selection ${selBefore !== selAfter ? "CHANGED" : "unchanged"}`,
);

setTimeout(() => process.exit(0), 1200);
await b.close().catch(() => {});
process.exit(0);
