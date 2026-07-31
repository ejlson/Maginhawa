/* The two paths that must never see the stage: reduced motion, and
   viewports too narrow for the four-column grid (where most of the flight
   would land below the fold). Both must show a fully dressed chapter with
   the head in its seat and no overlay.
   usage: node scripts/probe-skip.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "55075";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

async function run(label, { width, height, reduce }) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  if (reduce) {
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
  }
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#restaurants [data-plate]", { timeout: 30000 });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 30000,
  });
  await sleep(1200);
  await page.evaluate(() => {
    const el = document.querySelector("#restaurants");
    window.__lenis?.scrollTo(window.scrollY + el.getBoundingClientRect().top - 40, {
      immediate: true,
    });
    window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 40);
  });
  await sleep(2500);
  const r = await page.evaluate(() => {
    const sec = document.querySelector("#restaurants");
    const h2 = sec.querySelector("h2");
    const p = sec.querySelector("p");
    const plate = sec.querySelector("[data-plate]");
    const overlay = [...sec.children].some((c) =>
      c.className?.toString().includes("stage"),
    );
    const hb = h2.getBoundingClientRect();
    const pb = p.getBoundingClientRect();
    return {
      overlay,
      step: sec.getAttribute("data-assembly-step"),
      titleLeft: Math.round(hb.left),
      titleVisible: hb.left > -50 && hb.left < innerWidth,
      captionOnScreen: pb.right > 0 && pb.left < innerWidth,
      plateOpacity: plate ? getComputedStyle(plate).opacity : null,
      logoOpacity: (() => {
        const l = sec.querySelector("[class*='center']");
        return l ? getComputedStyle(l).opacity : null;
      })(),
    };
  });
  console.log(label.padEnd(26), JSON.stringify(r));
  await page.close();
}

await run("reduced motion (1440)", { width: 1440, height: 900, reduce: true });
await run("narrow 900px", { width: 900, height: 900, reduce: false });
await run("narrow 600px", { width: 600, height: 900, reduce: false });
await browser.close();
