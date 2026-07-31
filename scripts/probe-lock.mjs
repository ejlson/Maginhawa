/* THE HOLD. Once the title lands mid-screen the whole sequence plays on its
   own clock and the page is held until the chapter is standing. Three
   things have to be true:
     1. the camera runs by itself — no gesture required;
     2. the reader CANNOT get past the section while it plays, by wheel,
        touch or programmatic scroll;
     3. the page is handed back the moment the grid is in place.
   usage: node scripts/probe-lock.mjs [port] */
import puppeteer from "puppeteer-core";
import { ready, arm, sleep } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await ready(page, PORT);

const state = () =>
  page.evaluate(() => {
    const field = document.querySelector("[class*='stageField']");
    const zs = [...(field?.children ?? [])].map((el) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el.firstElementChild).transform);
      return Math.round(m.m43);
    });
    const vis = [...(field?.children ?? [])].filter(
      (el) => Number(getComputedStyle(el.firstElementChild).opacity) > 0.02,
    ).length;
    const sec = document.querySelector("#restaurants").getBoundingClientRect();
    return {
      step: Number(document.querySelector("#restaurants")?.getAttribute("data-assembly-step") ?? -1),
      zMax: zs.length ? Math.max(...zs) : 0,
      spread: zs.length ? Math.max(...zs) - Math.min(...zs) : 0,
      vis,
      n: zs.length,
      scrollY: Math.round(window.scrollY),
      secBottom: Math.round(sec.bottom),
    };
  });

// Every way a READER can actually leave: wheel, touch drag, and the
// keyboard's scroll keys. Deliberately NOT window.scrollBy/scrollTop — an
// `overflow: hidden` box is still programmatically scrollable by spec, and
// nothing a user can press reaches that path. (Keeping the page
// programmatically scrollable is wanted anyway: it is what lets an anchor
// link or scroll restoration still work.)
const shove = async () => {
  await page.evaluate(() => {
    for (let i = 0; i < 6; i++) {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: 400, cancelable: true, bubbles: true }));
    }
  });
  for (const k of ["PageDown", "ArrowDown", " ", "End"]) {
    await page.keyboard.press(k === " " ? "Space" : k);
  }
  await page.touchscreen.touchStart(700, 700);
  await page.touchscreen.touchMove(700, 200);
  await page.touchscreen.touchEnd();
};

await arm(page);
const t0 = Date.now();
console.log("  t(ms)  step   zMax  spread  visible   scrollY   drift");
const base = (await state()).scrollY;
let maxDrift = 0;
let releasedAt = null;
let zPeak = 0;
for (let i = 0; i < 46; i++) {
  await shove();
  await sleep(260);
  const s = await state();
  const drift = s.scrollY - base;
  zPeak = Math.max(zPeak, s.zMax);
  if (s.step >= 0 && s.step < 10) maxDrift = Math.max(maxDrift, Math.abs(drift));
  if (releasedAt === null && Math.abs(drift) > 40) releasedAt = Date.now() - t0;
  console.log(
    `${String(Date.now() - t0).padStart(7)} ${String(s.step).padStart(5)} ${String(s.zMax).padStart(6)} ${String(s.spread).padStart(7)} ${String(s.vis).padStart(6)}/${s.n} ${String(s.scrollY).padStart(9)} ${String(drift).padStart(7)}`,
  );
  if (drift > 40) break;
}
console.log(`\ncamera ran unaided (no gesture given): peak z ${zPeak} — ${zPeak > 500 ? "yes" : "NO"}`);
console.log(`largest drift while the chapter was playing: ${maxDrift}px (0 = never got past it)`);
console.log(`page handed back at: ${releasedAt === null ? "NEVER — still locked" : releasedAt + "ms"}`);
await browser.close();
