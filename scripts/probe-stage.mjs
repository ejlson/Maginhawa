/* THE STAGE. What the reader is actually looking at while the restaurant
   chapter performs: where the title sits, and whether the NEXT chapter's
   maroon is showing under it. Both have to be right or the sequence plays
   in the wrong frame.

     CENTRE   the intro title's centre must sit at the middle of the screen
     CLEAR    no maroon anywhere on screen for the whole performance

   usage: node scripts/probe-stage.mjs [port] [w] [h] */
import puppeteer from "puppeteer-core";
import { sleep, arm } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const W = Number(process.argv[3] || 1440);
const H = Number(process.argv[4] || 900);

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#restaurants", { timeout: 60000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 60000 },
);
await sleep(1200);

if (!(await arm(page))) throw new Error("the chapter's intro never armed");

const look = () =>
  page.evaluate(() => {
    // the intro line lives inside the stage's centred composition
    const t =
      document.querySelector('[class*="Discover_stageCenter"] h2') ??
      document.querySelector('[class*="Discover_stageCenter"]');
    const sec = document.querySelector("#restaurants");
    const zone = document.querySelector('div[class*="MaroonZone_zone"]');
    const held = document.querySelector('[class*="ChapterPin_held"]');
    // the stage unmounts the moment the performance ends
    if (!t) return null;
    const tr = t.getBoundingClientRect();
    const sr = sec.getBoundingClientRect();
    const zr = zone.getBoundingClientRect();
    return {
      step: document.querySelector("[data-assembly-step]")?.dataset
        .assemblyStep ?? "—",
      vh: innerHeight,
      titleTop: Math.round(tr.top),
      titleMid: Math.round(tr.top + tr.height / 2),
      titleBottom: Math.round(tr.bottom),
      secBottom: Math.round(sr.bottom),
      zoneTop: Math.round(zr.top),
      pinY: Math.round(
        new DOMMatrixReadOnly(getComputedStyle(held).transform).m42,
      ),
    };
  });

console.log(`\nviewport ${W}×${H}`);
console.log(
  "  step  title top  title mid  title bottom  section bottom  MAROON top  pin y",
);
const seen = [];
for (let i = 0; i < 22; i++) {
  const s = await look();
  if (!s) break;
  seen.push(s);
  console.log(
    `  ${String(s.step).padStart(4)}  ${String(s.titleTop).padStart(9)}  ${String(s.titleMid).padStart(9)}  ${String(s.titleBottom).padStart(12)}  ${String(s.secBottom).padStart(14)}  ${String(s.zoneTop).padStart(10)}  ${String(s.pinY).padStart(5)}`,
  );
  await sleep(600);
}

const mids = seen.map((s) => s.titleMid).filter((m) => m > -2000 && m < 4000);
const parked = seen.find((s) => s.step === "3" || s.step === "2") ?? seen[2];
console.log(
  `\nCENTRE: the title's middle parked at ${parked.titleMid} of ${H}  (${(parked.titleMid / H).toFixed(2)} — 0.50 is the middle of the screen)`,
);
const worst = Math.min(...seen.map((s) => s.zoneTop));
console.log(
  `CLEAR:  the next chapter's maroon came as close as ${worst}px from the top of the window  (≥ ${H} = never on screen)`,
);
console.log(
  `        ${worst < H ? `SHOWING — ${H - worst}px of maroon was visible under the performance` : "clear for the whole performance"}`,
);
await b.close();
