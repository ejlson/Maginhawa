/* Final gaps:
   A. the stale inline font-size measured INSIDE grid mode — 1440 -> 1000 and
      1440 -> 981, where the heading keeps 91px but its seat shrinks to nine
      of a much narrower band's columns. (The first pass only resized down to
      980/768/390, i.e. out of the grid entirely.)
   B. one-line-ness at the laptop widths nobody tested: 1024, 1366, 1512, 1600.
   usage: node scripts/probe-verify-head4.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "51365";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

const M = () => {
  const r = (n) => +n.toFixed(1);
  const sec = document.getElementById("restaurants");
  const h2 = Array.from(sec.querySelectorAll("h2")).find(
    (n) => !n.closest("[aria-hidden]"),
  );
  const head = h2.parentElement;
  const cap = head.querySelector("p");
  const spans = Array.from(h2.children).map((s) => {
    const q = s.getBoundingClientRect();
    return { t: s.textContent.trim(), l: r(q.left), rt: r(q.right), tp: r(q.top) };
  });
  const hb = h2.getBoundingClientRect();
  const hd = head.getBoundingClientRect();
  const cb = cap.getBoundingClientRect();
  const font = parseFloat(getComputedStyle(h2).fontSize);
  return {
    vw: innerWidth,
    inline: h2.style.fontSize || null,
    font: +font.toFixed(2),
    seatW: r(hb.width),
    h2H: r(hb.height),
    ratio: +(hb.height / font).toFixed(2),
    oneLine: Math.abs(spans[0].tp - spans[1].tp) <= 1 && hb.height < font * 1.6,
    inkRight: r(Math.max(...spans.map((s) => s.rt))),
    seatRight: r(hb.right),
    bandRight: r(hd.right),
    capLeft: r(cb.left),
    capRight: r(cb.right),
    capFlush: r(cb.right - hd.right),
    overflowsSeat: Math.max(...spans.map((s) => s.rt)) > hb.right + 1,
    overflowsBand: Math.max(...spans.map((s) => s.rt)) > hd.right + 1,
    inkVsCap: r(cb.left - Math.max(...spans.map((s) => s.rt))),
    spans,
  };
};

async function fresh(w, h) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 120000,
  });
  await p.evaluate(() => document.fonts.ready);
  await sleep(900);
  return p;
}

console.log("=== A. stale inline font-size, resized DOWN inside grid mode ===");
{
  const p = await fresh(1440, 900);
  let armed = false;
  for (let i = 0; i < 30 && !armed; i++) {
    await p.evaluate(() => window.scrollBy(0, 500));
    await sleep(350);
    armed = await p.evaluate(
      () => document.getElementById("restaurants")?.dataset.assemblyArmed === "1",
    );
  }
  await p.waitForFunction(
    () => !document.getElementById("restaurants")?.dataset.assemblyStep,
    { timeout: 40000 },
  );
  await sleep(2600);
  console.log("  baseline 1440: " + JSON.stringify(await p.evaluate(M)));
  for (const w of [1280, 1100, 1024, 1000, 981]) {
    await p.setViewport({ width: w, height: 900 });
    await sleep(1100);
    const m = await p.evaluate(M);
    console.log(
      `  1440 -> ${w}: inline ${m.inline} computed ${m.font}px seat ${m.seatW}px ` +
        `oneLine:${m.oneLine ? "Y" : "N"} (ratio ${m.ratio}) ink ${m.inkRight} ` +
        `seatR ${m.seatRight} bandR ${m.bandRight} capL ${m.capLeft} ` +
        `air(ink->cap) ${m.inkVsCap}px overflowSeat:${m.overflowsSeat} overflowBand:${m.overflowsBand}`,
    );
  }
  await p.close();
}

console.log("\n=== B. one line at the untested laptop widths (fresh, settled) ===");
for (const w of [1024, 1366, 1512, 1600, 2560]) {
  const p = await fresh(w, 900);
  const m = await p.evaluate(M);
  // and again at the clamp size a return visit renders
  const c = await p.evaluate(() => {
    const sec = document.getElementById("restaurants");
    const h2 = Array.from(sec.querySelectorAll("h2")).find(
      (n) => !n.closest("[aria-hidden]"),
    );
    const keep = h2.style.fontSize;
    h2.style.fontSize = "";
    const spans = Array.from(h2.children).map((s) => s.getBoundingClientRect());
    const hb = h2.getBoundingClientRect();
    const f = parseFloat(getComputedStyle(h2).fontSize);
    const out = {
      font: +f.toFixed(2),
      one: Math.abs(spans[0].top - spans[1].top) <= 1 && hb.height < f * 1.6,
      ink: +Math.max(...spans.map((s) => s.right)).toFixed(1),
      seatR: +hb.right.toFixed(1),
    };
    h2.style.fontSize = keep;
    return out;
  });
  console.log(
    `  ${String(w).padStart(4)}px fitted ${m.font}px one:${m.oneLine ? "Y" : "N"} ` +
      `ink ${m.inkRight} seatR ${m.seatRight} air->cap ${m.inkVsCap}px | ` +
      `clamp ${c.font}px one:${c.one ? "Y" : "N"} ink ${c.ink} seatR ${c.seatR} | ` +
      `capFlush ${m.capFlush} overflowSeat:${m.overflowsSeat}`,
  );
  await p.close();
}
await b.close();
