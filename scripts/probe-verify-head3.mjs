/* Settle the 981/1100 nav-vs-standfirst overlap by EYE, not by box maths.
   page.screenshot({clip}) measures from the DOCUMENT origin when
   captureBeyondViewport is on, so the first attempt photographed the top of
   the page instead of the parked viewport. Full-viewport shot instead, plus
   a device-scale-4 crop of the band, plus a painted-pixel check.
   usage: node scripts/probe-verify-head3.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "51365";
const OUT = process.env.OUT || "/tmp";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

for (const w of [981, 1100]) {
  const page = await b.newPage();
  await page.setViewport({ width: w, height: 900, deviceScaleFactor: 4 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => !document.body.classList.contains("is-loading"),
    { timeout: 120000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await sleep(900);
  let armed = false;
  for (let i = 0; i < 30 && !armed; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await sleep(350);
    armed = await page.evaluate(
      () => document.getElementById("restaurants")?.dataset.assemblyArmed === "1",
    );
  }
  await page.waitForFunction(
    () => !document.getElementById("restaurants")?.dataset.assemblyStep,
    { timeout: 40000 },
  );
  await sleep(3000);

  const state = await page.evaluate(() => {
    const sec = document.getElementById("restaurants");
    const h2 = Array.from(sec.querySelectorAll("h2")).find(
      (n) => !n.closest("[aria-hidden]"),
    );
    const cap = h2.parentElement.querySelector("p");
    const cs = getComputedStyle(cap);
    const words = Array.from(cap.querySelectorAll("span")).slice(0, 4).map((s) => {
      const q = s.getBoundingClientRect();
      const c = getComputedStyle(s);
      return {
        t: s.textContent.trim().slice(0, 12),
        box: [+q.left.toFixed(1), +q.top.toFixed(1), +q.right.toFixed(1), +q.bottom.toFixed(1)],
        op: c.opacity,
        tf: c.transform.slice(0, 34),
      };
    });
    const nav = document.querySelector("nav");
    const links = Array.from(nav.querySelectorAll("a")).map((a) => {
      const q = a.getBoundingClientRect();
      return {
        t: a.textContent.trim().slice(0, 12),
        box: [+q.left.toFixed(1), +q.top.toFixed(1), +q.right.toFixed(1), +q.bottom.toFixed(1)],
        op: getComputedStyle(a).opacity,
        color: getComputedStyle(a).color,
      };
    });
    return {
      scrollY: Math.round(window.scrollY),
      capOpacity: cs.opacity,
      capColor: cs.color,
      words,
      navOpacity: getComputedStyle(nav).opacity,
      navZ: getComputedStyle(nav).zIndex,
      links,
    };
  });
  console.log(`\n=== ${w}px  scrollY ${state.scrollY} ===`);
  console.log(`  caption opacity ${state.capOpacity} color ${state.capColor}`);
  console.log(`  first caption word boxes: ${JSON.stringify(state.words)}`);
  console.log(`  nav opacity ${state.navOpacity} z ${state.navZ}`);
  console.log(`  nav links: ${JSON.stringify(state.links)}`);

  // plain viewport shot — no clip, so no document-origin confusion
  await page.screenshot({ path: `${OUT}/vp-${w}.png` });
  // and the band on its own, cropped from the same buffer by CDP
  const cdp = await page.createCDPSession();
  const shot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    clip: {
      x: Math.max(0, w - 430),
      y: 0,
      width: 430,
      height: 120,
      scale: 3,
    },
  });
  const fs = await import("node:fs");
  fs.writeFileSync(`${OUT}/band-${w}.png`, Buffer.from(shot.data, "base64"));
  console.log(`  wrote ${OUT}/vp-${w}.png and ${OUT}/band-${w}.png`);
  await page.close();
}
await b.close();
