/* Find the three words the user says are cropped — "served", "comfortable",
   "every kitchen we run." — and walk UP from each, reporting every ancestor
   that could be doing the clipping (overflow, clip-path, mask, fixed height).
   The last probe guessed at the markup and matched nothing; this one starts
   from the text itself.

   usage: node scripts/probe-crop-who.mjs [port]   (run from the repo root) */
import puppeteer from "puppeteer-core";

const PORT = process.argv[2] || "3300";

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "no-preference" },
]);
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2500));

const H = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < H; y += 500) {
  await page.evaluate((t) => {
    const l = window.__lenis || window.lenis;
    if (l && typeof l.scrollTo === "function") l.scrollTo(t, { immediate: true });
    else window.scrollTo(0, t);
  }, y);
  await new Promise((r) => setTimeout(r, 90));
}
await new Promise((r) => setTimeout(r, 800));

const report = await page.evaluate(() => {
  const TARGETS = ["served", "comfortable", "kitchen"];
  const out = [];

  for (const needle of TARGETS) {
    /* the deepest element whose own text is just this word */
    const hits = [...document.querySelectorAll("*")].filter((e) => {
      const t = (e.textContent || "").trim();
      return t.toLowerCase().includes(needle) && e.children.length === 0;
    });
    if (!hits.length) {
      out.push({ needle, error: "not found" });
      continue;
    }
    const el = hits[0];
    const chain = [];
    let n = el;
    for (let i = 0; i < 7 && n && n !== document.body; i++) {
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      chain.push({
        tag: n.tagName,
        cls: String(n.className).slice(0, 46),
        overflow: `${cs.overflowX}/${cs.overflowY}`,
        clipPath: cs.clipPath === "none" ? "" : cs.clipPath.slice(0, 30),
        maskImage: cs.maskImage === "none" ? "" : "yes",
        h: +r.height.toFixed(1),
        scrollOver: n.scrollHeight - n.clientHeight,
        fontFamily: cs.fontFamily.split(",")[0],
        fontStyle: cs.fontStyle,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        padBlock: `${cs.paddingTop}/${cs.paddingBottom}`,
      });
      n = n.parentElement;
    }
    out.push({ needle, text: (el.textContent || "").trim().slice(0, 30), chain });
  }
  return out;
});

for (const r of report) {
  console.log(`\n=== "${r.needle}" ${r.error || `-> "${r.text}"`}`);
  (r.chain || []).forEach((c, i) =>
    console.log(
      `  ${i}. <${c.tag}> ${c.cls}\n     overflow ${c.overflow}${
        c.clipPath ? ` clip-path ${c.clipPath}` : ""
      }${c.maskImage ? " mask-image" : ""}  h=${c.h} scrollOver=${c.scrollOver}\n     ${
        c.fontFamily
      } ${c.fontStyle} ${c.fontSize}/${c.lineHeight}  pad ${c.padBlock}`,
    ),
  );
}

setTimeout(() => process.exit(0), 1200);
await b.close().catch(() => {});
process.exit(0);
