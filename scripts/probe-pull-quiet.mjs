/* Two things the pull must not do.

   1. REDUCED MOTION. The stage never mounts at all under
      prefers-reduced-motion, so the pull must never exist — no pull layer,
      no split values moving, and the chapter must simply be there, settled,
      with its heading in its seat.
   2. NARROW. Below STAGE_MIN_WIDTH the sequence is skipped for the same
      reason. Just above it the pull has to hold its own geometry: the plate
      still rests at exactly its seat's width, and still inside the hole.

   usage: node scripts/probe-pull-quiet.mjs [port] */
import puppeteer from "puppeteer-core";
import { ready, arm, sleep } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3210";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

// ---- 1. reduced motion ----
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await ready(page, PORT);
  await page.evaluate(() => {
    const el = document.querySelector("#restaurants");
    window.__lenis?.scrollTo(
      window.scrollY + el.getBoundingClientRect().top - innerHeight * 0.15,
      { immediate: true },
    );
  });
  await sleep(1200);
  // and then keep scrolling THROUGH the band the sequence would arm in
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => window.__lenis?.scrollTo(window.scrollY + 40, { immediate: true }));
    await sleep(40);
  }
  await sleep(1500);
  const r = await page.evaluate(() => {
    const sec = document.querySelector("#restaurants");
    const plates = [...document.querySelectorAll("#restaurants [data-plate]")];
    return {
      pullLayers: document.querySelectorAll("[data-deck-pull]").length,
      introWords: document.querySelectorAll("[data-intro-word]").length,
      stage: document.querySelectorAll("[data-assembly-armed]").length,
      step: sec?.getAttribute("data-assembly-step"),
      // the settled chapter is simply there
      platesVisible: plates.filter(
        (p) => parseFloat(getComputedStyle(p).opacity) > 0.9,
      ).length,
      lenisStopped: !!window.__lenis?.isStopped,
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  });
  console.log("reduced motion:", JSON.stringify(r));
  // `data-assembly-step` is written only while the intro is OWNED, so its
  // absence is the assertion: no clock ever started
  console.log(
    r.pullLayers === 0 &&
      r.introWords === 0 &&
      r.stage === 0 &&
      r.step === null &&
      r.platesVisible === 8 &&
      !r.lenisStopped
      ? "  PASS — no stage, no pull layer, no clock; chapter simply there, scroll free"
      : "  FAIL",
  );
  await page.close();
}

// ---- 2. just above the stage's minimum width ----
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 820 });
  await ready(page, PORT);
  const armed = await arm(page);
  await sleep(2600);
  const mid = await page.evaluate(() => {
    const p = document.querySelector("[data-deck-pull]");
    const w = [...document.querySelectorAll("[data-intro-word]")];
    if (!p || w.length !== 2) return null;
    const m = new DOMMatrixReadOnly(getComputedStyle(p).transform);
    return {
      scale: Math.round(m.m11 * 1000) / 1000,
      drawn: Math.round(p.getBoundingClientRect().width),
      gap: Math.round(w[1].getBoundingClientRect().left - w[0].getBoundingClientRect().right),
    };
  });
  await sleep(6000);
  const rest = await page.evaluate(() => {
    const seats = [...document.querySelectorAll("#restaurants [data-plate]")].map(
      (el) => Math.round(el.getBoundingClientRect().width),
    );
    return { seats: [...new Set(seats)], step: document.querySelector("#restaurants")?.getAttribute("data-assembly-step") };
  });
  console.log("\n1024px wide: armed =", armed, "| mid-split", JSON.stringify(mid), "| settled", JSON.stringify(rest));
  await page.close();
}

await browser.close();
