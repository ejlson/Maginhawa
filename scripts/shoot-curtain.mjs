/* Eyes on the page transition. The probe next door proves the machine never
   strands anyone; this proves the curtain still LOOKS like the curtain —
   which no assertion can tell you.

   Four stations per breakpoint: mid-cover (the sheet travelling up), sealed
   (the image reel, which is the only thing the reader has while the route
   loads), mid-reveal, and landed. Then the one that matters most: a route
   deliberately held for five seconds, sampled at t=2900ms. That is a hundred
   milliseconds past where the old 2800ms stuck timer used to drop the
   curtain, so this frame is the bug — if it shows /about with no curtain,
   the fix is not in.

   usage: node scripts/shoot-curtain.mjs [port] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3120";
const OUT = process.env.OUT || "/tmp/mgnhw_curtain";
const s = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu"],
});
const page = await b.newPage();
const settle = async () => {
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
  await s(1200);
};
const click = (l) => page.evaluate((L) => {
  const a = [...document.querySelectorAll("nav a, header a")].find((e) => (e.textContent || "").trim().toUpperCase() === L);
  if (a) a.click();
  return !!a;
}, l);
const phase = () => page.evaluate(() => window.__pageTransition?.phase ?? "?").catch(() => "?");

async function run(tag, w, h, reduce = false) {
  await page.setViewport({ width: w, height: h });
  if (reduce) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await settle();

  await click("ABOUT US");
  await s(reduce ? 90 : 260);
  await page.screenshot({ path: `${OUT}/${tag}_1_cover.png` });
  await s(reduce ? 140 : 340);
  await page.screenshot({ path: `${OUT}/${tag}_2_sealed.png` });
  // wait for the reveal to start, then catch it halfway
  for (let i = 0; i < 200 && (await phase()) !== "reveal"; i++) await s(40);
  await s(reduce ? 90 : 240);
  await page.screenshot({ path: `${OUT}/${tag}_3_reveal.png` });
  await s(1400);
  await page.screenshot({ path: `${OUT}/${tag}_4_landed.png` });
  console.log(`  ${tag}: 4 frames`);
  if (reduce) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
}

console.log(`shooting into ${OUT}`);
await run("desk", 1440, 900);
await run("phone", 390, 844);
await run("reduce", 1440, 900, true);

/* the frame the whole fix exists for */
await page.setViewport({ width: 1440, height: 900 });
await page.setRequestInterception(true);
let hold = false;
page.on("request", async (r) => {
  if (hold && /[?&]_rsc=/.test(r.url())) await s(5000);
  r.continue().catch(() => {});
});
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
await settle();
hold = true;
await click("RESTAURANTS");
await s(2900);
const at2900 = await page.evaluate(() => ({ path: location.pathname, phase: window.__pageTransition?.phase }));
await page.screenshot({ path: `${OUT}/slow_t2900.png` });
await s(3400);
await page.screenshot({ path: `${OUT}/slow_landed.png` });
const at6300 = await page.evaluate(() => location.pathname);
hold = false;
console.log(`  slow route: at t=2900ms path=${at2900.path} phase=${at2900.phase} (old code dropped the curtain at 2800ms)`);
console.log(`              at t=6300ms path=${at6300}`);

await b.close();
console.log("done");
