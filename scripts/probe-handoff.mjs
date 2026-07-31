/* The handoff is a single-frame swap: the overlay's plate is removed and
   the real tile's plate is revealed on the same commit. That only reads as
   invisible if the flying plate has actually SETTLED on the seat by then.
   This measures the residual gap, per plate, just before the swap.
   usage: node scripts/probe-handoff.mjs [port] [atMs] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "55075";
const AT = Number(process.argv[3] || 5100);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
  timeout: 30000,
});
await sleep(1200);
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
console.log("armed:", armed);
await sleep(AT);

const r = await page.evaluate(() => {
  const sec = document.querySelector("#restaurants");
  const seats = [...sec.querySelectorAll("[data-plate]")].map((e) => e.getBoundingClientRect());
  const flying = [...sec.querySelectorAll("div")]
    .filter((d) => d.className?.toString().includes("introPlate"))
    .map((e) => e.getBoundingClientRect());
  if (!flying.length) return { step: sec.getAttribute("data-assembly-step"), gone: true };
  return {
    step: sec.getAttribute("data-assembly-step"),
    gaps: flying.map((f, i) => [
      Math.round((f.left - seats[i].left) * 10) / 10,
      Math.round((f.top - seats[i].top) * 10) / 10,
      Math.round((f.width - seats[i].width) * 10) / 10,
    ]),
  };
});
console.log(JSON.stringify(r));
await browser.close();
