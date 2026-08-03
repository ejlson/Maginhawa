/* WHICH PHYSICAL FACE DOES THE HELVETICA STACK ACTUALLY LAND ON?
   probe-type-families.mjs measured ADVANCE WIDTHS and could not answer two
   questions, because width is the wrong instrument for both:

     IS THE ITALIC REAL?  Helvetica Oblique is metrically identical to
       Helvetica Roman — same advances, glyph for glyph. So a synthesised
       slant and a drawn oblique measure the SAME, and the width test comes
       back "synthesised" either way. The right instruments are the platform
       font name the compositor reports (CDP CSS.getPlatformFontsForNode)
       and a pixel diff of the two renderings.

     IS THERE A LIGHT?  Weights 100/200/300 measured 365.375px against
       400/500's 363.953px — a different face, not a rounding artefact. If
       macOS is quietly supplying Helvetica Light for sub-400 weights then a
       "thinner nav" exists on this machine and NOWHERE ELSE, which is worse
       than not having one.

   usage: node scripts/probe-type-faces.mjs                                */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STACK = 'Helvetica, "Helvetica Neue", Arial, "Liberation Sans", sans-serif';

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: 1200, height: 800 });
await page.goto("about:blank");

/* build one span per case, tagged so CDP can find it */
const CASES = [
  ["roman-400", "font-style:normal;font-weight:400"],
  ["italic-400", "font-style:italic;font-weight:400"],
  ["italic-400-nosynth", "font-style:italic;font-weight:400;font-synthesis:none"],
  ["w100", "font-weight:100"],
  ["w200", "font-weight:200"],
  ["w300", "font-weight:300"],
  ["w400", "font-weight:400"],
  ["w500", "font-weight:500"],
  ["w600", "font-weight:600"],
  ["w700", "font-weight:700"],
];

await page.evaluate(
  (cases, stack) => {
    document.body.style.margin = "0";
    document.body.style.background = "#fff";
    for (const [id, css] of cases) {
      const s = document.createElement("div");
      s.id = id;
      s.textContent = "Handgloves 0123";
      s.style.cssText = `font-family:${stack};font-size:64px;white-space:pre;${css}`;
      document.body.appendChild(s);
    }
  },
  CASES,
  STACK,
);
await page.evaluate(() => document.fonts.ready);
await sleep(400);

const client = await page.createCDPSession();
await client.send("DOM.enable");
await client.send("CSS.enable");
const { root } = await client.send("DOM.getDocument", { depth: -1 });

const platform = {};
for (const [id] of CASES) {
  const { nodeId } = await client.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: `#${id}`,
  });
  const { fonts } = await client.send("CSS.getPlatformFontsForNode", { nodeId });
  platform[id] = fonts.map((f) => `${f.familyName} (${f.glyphCount} glyphs)`);
}

/* pixel diff — render each case to its own canvas via html2canvas-free route:
   screenshot the element and hash the bytes */
const shots = {};
for (const [id] of CASES) {
  const el = await page.$(`#${id}`);
  const buf = await el.screenshot({ encoding: "base64" });
  shots[id] = buf;
}
const same = (a, b) => (shots[a] === shots[b] ? "IDENTICAL PIXELS" : "different pixels");

console.log("=== PLATFORM FACE REPORTED BY THE COMPOSITOR ===");
for (const [id] of CASES) console.log(`  ${id.padEnd(20)} ${platform[id].join(", ")}`);

console.log("\n=== ITALIC ===");
console.log(`  roman-400 vs italic-400            : ${same("roman-400", "italic-400")}`);
console.log(`  italic-400 vs italic-400-nosynth   : ${same("italic-400", "italic-400-nosynth")}`);
console.log(`  roman-400 vs italic-400-nosynth    : ${same("roman-400", "italic-400-nosynth")}`);
const realOblique =
  shots["italic-400"] === shots["italic-400-nosynth"] &&
  shots["roman-400"] !== shots["italic-400-nosynth"];
console.log(
  `  VERDICT: ${realOblique ? "REAL DRAWN OBLIQUE — suppressing synthesis changes nothing" : "SYNTHESISED — the browser is shearing the roman"}`,
);

console.log("\n=== WEIGHTS ===");
for (const w of [100, 200, 300, 500, 600, 700])
  console.log(`  w400 vs w${w}: ${same("w400", `w${w}`)}`);

await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
