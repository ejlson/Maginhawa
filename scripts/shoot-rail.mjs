/* Frames of the story rail, for eyes rather than for assertions.
   Desktop walk through the pin, plus the two fallback branches.
   usage: node scripts/shoot-rail.mjs [port] [outdir] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const OUT = process.argv[3] || "/tmp/rail";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

const open = async (w, h, reduce = false) => {
  const page = await b.newPage();
  await page.setViewport({ width: w, height: h });
  if (reduce)
    await page
      .target()
      .createCDPSession()
      .then((s) =>
        s.send("Emulation.setEmulatedMedia", {
          features: [{ name: "prefers-reduced-motion", value: "reduce" }],
        }),
      );
  await page.goto(`http://localhost:${PORT}/about`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => !document.body.classList.contains("is-loading"),
    { timeout: 60000 },
  );
  await sleep(1400);
  return page;
};

const page = await open(1440, 900);
const g = await page.evaluate(() => {
  const w = document.querySelector("[class*='railPinWrap']");
  if (!w) return null;
  return {
    top: w.getBoundingClientRect().top + window.scrollY,
    travel: w.offsetHeight - window.innerHeight,
  };
});
if (!g) {
  console.log("rail not mounted at 1440x900");
} else {
  for (const p of [-0.02, 0, 0.04, 0.2, 0.4, 0.6, 0.8, 0.96, 1, 1.02]) {
    await page.evaluate(
      (y) => window.__lenis?.scrollTo(y, { immediate: true }),
      g.top + p * g.travel,
    );
    await sleep(420);
    const name = `${OUT}/rail-${String(Math.round(p * 100)).replace("-", "m").padStart(3, "0")}.png`;
    await page.screenshot({ path: name });
    console.log(name);
  }
  // the focus state at card 5 — the ring plus the panel it switched to
  await page.evaluate(() => {
    const cards = document.querySelectorAll("[class*='railCard']");
    cards[5]?.focus();
  });
  await sleep(900);
  await page.screenshot({ path: `${OUT}/rail-focus5.png` });
  console.log(`${OUT}/rail-focus5.png`);
}
await page.close();

for (const [w, h, reduce, tag] of [
  [862, 900, false, "862"],
  [862, 600, false, "862short"],
  [860, 900, false, "860"],
  [375, 812, false, "375"],
  [1440, 900, true, "reduced"],
]) {
  const p = await open(w, h, reduce);
  const state = await p.evaluate(() => ({
    rail: !!document.querySelector("[class*='railPinWrap']"),
    list: !!document.querySelector("[class*='storyList']"),
    overflow:
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  console.log(
    `${tag.padEnd(9)} ${w}x${h}${reduce ? " reduced" : ""}  rail=${state.rail} list=${state.list} h-overflow=${state.overflow}px`,
  );
  await p.evaluate(() => {
    const el =
      document.querySelector("[class*='railPinWrap']") ??
      document.querySelector("[class*='storyList']");
    window.__lenis?.scrollTo(
      el.getBoundingClientRect().top + window.scrollY,
      { immediate: true },
    );
  });
  await sleep(600);
  await p.screenshot({ path: `${OUT}/branch-${tag}.png` });
  await p.close();
}

await b.close();
