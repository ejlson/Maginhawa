/* Does a plate SNAP onto its seat? Tracks one plate's distance to its grid
   seat through the flight. Overshoot shows up as the distance crossing zero
   and coming back — which is exactly the jerk we do not want.
   usage: node scripts/probe-flight.mjs [port] */
import puppeteer from "puppeteer-core";
import { ready, arm, sleep } from "./lib-intro.mjs";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1"] });
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await ready(page, process.argv[2] || "3100");
await arm(page);
const t0 = Date.now();
console.log("  t(ms)  plate0 signed dx,dy to its seat   plate3   plate7");
const trace = [];
for (let i = 0; i < 34; i++) {
  const r = await page.evaluate(() => {
    const plates = [...document.querySelectorAll("[class*='introPlate']")];
    const seats = [...document.querySelectorAll("[data-plate]")];
    if (!plates.length) return null;
    const d = (n) => {
      const p = plates[n]?.getBoundingClientRect(), s = seats[n]?.getBoundingClientRect();
      if (!p || !s) return null;
      return [Math.round(p.left + p.width/2 - (s.left + s.width/2)),
              Math.round(p.top + p.height/2 - (s.top + s.height/2))];
    };
    return { a: d(0), b: d(3), c: d(7) };
  });
  if (!r) { console.log(String(Date.now()-t0).padStart(7), " (stage retired)"); break; }
  trace.push(r);
  console.log(String(Date.now()-t0).padStart(7),
    JSON.stringify(r.a).padEnd(14), JSON.stringify(r.b).padEnd(14), JSON.stringify(r.c));
  await sleep(160);
}
// a sign flip on either axis after the plate has closed most of the gap = overshoot
const flips = (key, axis) => {
  const v = trace.map(t => t[key]?.[axis]).filter(x => x !== null && x !== undefined);
  let n = 0;
  for (let i = 1; i < v.length; i++) if (Math.sign(v[i]) !== 0 && Math.sign(v[i]) !== Math.sign(v[i-1]) && Math.sign(v[i-1]) !== 0) n++;
  return n;
};
console.log(`\novershoots (sign flips) — plate0: ${flips("a",0)+flips("a",1)}, plate3: ${flips("b",0)+flips("b",1)}, plate7: ${flips("c",0)+flips("c",1)}`);
console.log("0 = each plate decelerated onto its seat and stopped, once");
await b.close();
