/* THE GRID ⟷ REEL SWITCH.

   The two views are swapped by an AnimatePresence with mode="wait": the
   outgoing list runs its exit, unmounts, and only then does the incoming
   list mount and run its entrance. That is fine as long as the two lists
   are ABOUT THE SAME HEIGHT — the grid is two rows, the reel is one, and
   the aspect ratios were previously chosen so the two totals landed within
   a few dozen pixels of each other.

   This samples, every frame-ish, through both directions of the switch:
     LIST   the list's own height
     SECT   the section's height (what the rest of the page feels)
     PAGE   document height and scrollY — a section that changes height
            above the fold drags every later chapter with it
     GAP    whether there is a moment with NO list mounted at all, which is
            where mode="wait" lets the box collapse

   usage: node scripts/probe-viewswitch.mjs [w] [h] [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = Number(process.argv[2] || 1440);
const H = Number(process.argv[3] || 900);
const PORT = process.argv[4] || "3100";

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2" });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 90000 },
);
await page.evaluate(() => document.fonts.ready);

// run the assembly through so the grid is settled and pressable
for (let i = 0; i < 70; i++) {
  await page.evaluate(() => window.scrollBy(0, 70));
  await new Promise((r) => setTimeout(r, 70));
}
await new Promise((r) => setTimeout(r, 3000));
await page.evaluate(() => {
  const g = document.querySelector('[class*="grid"]');
  window.scrollTo(0, g.getBoundingClientRect().top + window.scrollY - 120);
});
await new Promise((r) => setTimeout(r, 1200));

/** sample the boxes for `ms`, starting the instant we click `label` */
async function switchTo(label, ms = 1600) {
  return page.evaluate(
    async ({ label, ms }) => {
      const btns = Array.from(document.querySelectorAll("button"));
      const target = btns.find((b) =>
        (b.getAttribute("aria-label") || b.title || "")
          .toLowerCase()
          .includes(label),
      );
      const sect = document
        .querySelector('[class*="grid"]')
        ?.closest("section");
      const samples = [];
      const t0 = performance.now();
      let noList = 0;
      const tick = () => {
        const list = document.querySelector("ul[class*='grid']");
        if (!list) noList++;
        samples.push({
          t: Math.round(performance.now() - t0),
          list: list ? Math.round(list.getBoundingClientRect().height) : 0,
          sect: sect ? Math.round(sect.getBoundingClientRect().height) : 0,
          doc: Math.round(document.documentElement.scrollHeight),
          y: Math.round(window.scrollY),
        });
      };
      tick();
      target?.click();
      await new Promise((resolve) => {
        const id = setInterval(() => {
          tick();
          if (performance.now() - t0 > ms) {
            clearInterval(id);
            resolve();
          }
        }, 40);
      });
      return { found: !!target, samples, noList };
    },
    { label, ms },
  );
}

function report(name, r) {
  if (!r.found) return console.log(`\n${name}: TOGGLE NOT FOUND`);
  const s = r.samples;
  const lists = s.map((x) => x.list);
  const sects = s.map((x) => x.sect);
  const docs = s.map((x) => x.doc);
  const span = (a) => `${Math.min(...a)} → ${Math.max(...a)}`;
  console.log(`\n=== ${name} ===`);
  console.log(`  list height : ${span(lists)}   (swing ${Math.max(...lists) - Math.min(...lists)}px)`);
  console.log(`  section     : ${span(sects)}   (swing ${Math.max(...sects) - Math.min(...sects)}px)`);
  console.log(`  document    : ${span(docs)}   (swing ${Math.max(...docs) - Math.min(...docs)}px)`);
  console.log(`  frames with NO list mounted: ${r.noList}`);
  // the biggest single-sample jump — what a reader actually perceives
  let worst = 0;
  let at = 0;
  for (let i = 1; i < s.length; i++) {
    const d = Math.abs(s[i].sect - s[i - 1].sect);
    if (d > worst) {
      worst = d;
      at = s[i].t;
    }
  }
  /* JUDGED AS A FRACTION OF THE SWING, not in raw pixels. The two views
     genuinely differ by ~261px, so SOME movement is the point — a raw
     pixel threshold just flags the middle of any honest animation. What
     matters is whether one frame carries the whole change: a snap puts
     ~100% of the swing in a single step, an eased move spreads it so no
     step carries much more than a fifth. */
  const swing = Math.max(...sects) - Math.min(...sects) || 1;
  const share = worst / swing;
  console.log(
    `  largest single-step section jump: ${worst}px at t=${at}ms ` +
      `(${Math.round(share * 100)}% of the swing)` +
      (share > 0.5 ? "   <-- SNAP" : "   OK (spread)"),
  );
  console.log(
    "  trace: " +
      s
        .filter((_, i) => i % 3 === 0)
        .map((x) => `${x.t}:${x.sect}`)
        .join("  "),
  );
}

report("GRID → REEL", await switchTo("horizontal"));
await new Promise((r) => setTimeout(r, 900));
report("REEL → GRID", await switchTo("grid"));

// resting geometry of each view
const rest = await page.evaluate(() => {
  const list = document.querySelector("ul[class*='grid']");
  const cell = list?.querySelector("li");
  const plate = cell?.querySelector("[data-plate]");
  const pr = plate?.getBoundingClientRect();
  return {
    list: list ? Math.round(list.getBoundingClientRect().height) : null,
    plate: pr ? { w: Math.round(pr.width), h: Math.round(pr.height), ratio: +(pr.height / pr.width).toFixed(3) } : null,
  };
});
console.log("\n=== RESTING (current view) ===");
console.log(`  list height ${rest.list}   plate ${rest.plate?.w}x${rest.plate?.h} ratio ${rest.plate?.ratio}`);

await b.close();
