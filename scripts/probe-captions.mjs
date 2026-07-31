/* Samples the caption split-text mid-build to prove the words really rise
   out of their masks on a stagger rather than simply appearing.
   usage: node scripts/probe-captions.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "55075";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await sleep(4500);
await page.evaluate(() => {
  const el = document.querySelector("#restaurants");
  window.__lenis?.scrollTo(
    window.scrollY + el.getBoundingClientRect().top - innerHeight * 0.15,
    { immediate: true },
  );
});
await sleep(700);
let armed = false;
for (let i = 0; i < 60 && !armed; i++) {
  await page.evaluate(() => window.__lenis?.scrollTo(window.scrollY + 40, { immediate: true }));
  await sleep(60);
  armed = await page.evaluate(() => !!document.querySelector("[data-assembly-armed='1']"));
}
console.log(armed ? "armed" : "NEVER ARMED");

// sample the first tile's words repeatedly across the caption beat
const samples = [];
const t0 = Date.now();
await sleep(5700);
for (let i = 0; i < 22; i++) {
  const s = await page.evaluate(() => {
    const tile = document.querySelector("#restaurants li");
    const words = [...tile.querySelectorAll("[class*='capWord']")];
    return words.map((w) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(w).transform);
      return Math.round(m.f); // translateY in px
    });
  });
  samples.push([Date.now() - t0, s]);
  await sleep(60);
}
for (const [t, s] of samples) console.log(String(t).padStart(5), JSON.stringify(s));

// and the head furniture, to confirm it arrives from the edges
await sleep(3000);
const head = await page.evaluate(() => {
  const sec = document.querySelector("#restaurants");
  const b = (s) => {
    const el = sec.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [Math.round(r.left), Math.round(r.top), Math.round(r.right)];
  };
  return {
    title: b("h2"),
    caption: b("p"),
    toggle: b("[role='group']"),
    step: sec.getAttribute("data-assembly-step"),
    vw: innerWidth,
  };
});
console.log("\nsettled head:", JSON.stringify(head));
await browser.close();
