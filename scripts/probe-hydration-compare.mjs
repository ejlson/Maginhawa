/* Is React #418 on /about under prefers-reduced-motion PRE-EXISTING?

   Agent 2 claims it is, and attributes it to SplitWords and the scroll cue —
   both in KEEP regions. That is only credible if the SAME error appears on a
   build of HEAD, which is the About.tsx/About.module.css that existed before
   the timeline landed. This runs the identical page on both servers and
   prints what each reports.

     :3100  working tree (timeline)      :3200  HEAD (deck + wheel)

   usage: node scripts/probe-hydration-compare.mjs                          */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 180000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

async function run(port, label, reduce, viewport = { width: 1440, height: 900 }) {
  const page = await b.newPage();
  const msgs = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning" || /hydrat/i.test(m.text()))
      msgs.push(`[console.${m.type()}] ${m.text()}`);
  });
  page.on("pageerror", (e) => msgs.push(`[pageerror] ${e.message}`));
  await page.setViewport(viewport);
  if (reduce) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(`http://localhost:${port}/about`, { waitUntil: "networkidle2" }).catch((e) => msgs.push("NAV FAIL " + e.message));
  await new Promise((r) => setTimeout(r, 2600));
  const sizes = await page.evaluate(() => ({
    li: document.querySelectorAll('[class*="timeline"] > li, [class*="storyList"] > li').length,
    h: document.documentElement.scrollHeight,
  }));
  await page.close();
  console.log(`\n--- ${label} · port ${port} · reduce=${reduce} · ${viewport.width}px ---`);
  console.log(`    items=${sizes.li} docH=${sizes.h}`);
  if (!msgs.length) console.log("    CLEAN (no errors/warnings)");
  else msgs.forEach((m) => console.log("    " + m));
  return msgs;
}

const cases = [
  [3200, "HEAD (deck + wheel)", true],
  [3200, "HEAD (deck + wheel)", false],
  [3100, "WORKING TREE (timeline)", true],
  [3100, "WORKING TREE (timeline)", false],
  [3200, "HEAD (deck + wheel)", true, { width: 375, height: 812 }],
  [3100, "WORKING TREE (timeline)", true, { width: 375, height: 812 }],
];
const out = [];
for (const [p, l, r, v] of cases) out.push([l, r, v?.width ?? 1440, await run(p, l, r, v)]);

console.log("\n=== VERDICT ===");
const head418 = out.filter((o) => o[0].startsWith("HEAD") && o[3].some((m) => /418/.test(m)));
const wt418 = out.filter((o) => o[0].startsWith("WORKING") && o[3].some((m) => /418/.test(m)));
console.log(`  HEAD  reproduces #418 in ${head418.length} of ${out.filter((o) => o[0].startsWith("HEAD")).length} cases: ${head418.map((o) => `reduce=${o[1]}@${o[2]}px`).join(", ") || "NONE"}`);
console.log(`  TREE  reproduces #418 in ${wt418.length} of ${out.filter((o) => o[0].startsWith("WORKING")).length} cases: ${wt418.map((o) => `reduce=${o[1]}@${o[2]}px`).join(", ") || "NONE"}`);
console.log(
  head418.length && wt418.length
    ? "  => PRE-EXISTING. The timeline did not introduce it."
    : wt418.length && !head418.length
      ? "  => REGRESSION. HEAD is clean; the timeline introduced it."
      : "  => neither reproduces; inconclusive from this run.",
);
await b.close();
