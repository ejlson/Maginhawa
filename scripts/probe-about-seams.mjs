/* HOW MANY THINGS ARE MOVING AT ONCE, AND WHERE.

   The brief for this page is "slow, smooth and controlled… structure and
   purpose… lead well into each other as not to confuse the user". Screenshots
   cannot answer that: a still frame of two animations mid-flight looks
   identical to a still frame of one. What distinguishes "leads into" from
   "competes" is whether the moves OVERLAP, and by how much.

   So this walks the page in fixed scroll steps and, at each step, diffs the
   computed transform/opacity of every animated element against the previous
   step. An element that changed is "in motion at this scroll position". The
   output is a per-position count plus the names of the movers, which makes
   two things visible that no screenshot shows:

     - CONCURRENCY: positions where three or four unrelated things move.
     - DEAD AIR: long runs where nothing moves at all, i.e. the page has
       stopped leading the reader anywhere.

   Reported against the section map so a hot spot can be named ("the
   statement's last word is still rising while the chef photo starts").

   usage: node scripts/probe-about-seams.mjs [port] [width] [height] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const W = Number(process.argv[3] || 1440);
const H = Number(process.argv[4] || 900);
const STEP = 60;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

const page = await b.newPage();
await page.setViewport({ width: W, height: H });
await page.goto(`http://localhost:${PORT}/about`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);
await sleep(3800);

/* label every element we care about once, so the diff can name its movers */
await page.evaluate(() => {
  const tag = (sel, name) =>
    document.querySelectorAll(sel).forEach((e, i) => {
      e.dataset.probe = document.querySelectorAll(sel).length > 1 ? `${name}${i}` : name;
    });
  tag('[class*="statementWord"]', "stmtWord");
  tag('[class*="chefImage"]', "chefImg");
  tag('[class*="chefLead"]', "chefLead");
  tag('[class*="chefCredit"]', "chefCredit");
  tag('[class*="railCard"]', "card");
  tag('[class*="railItem"]', "item");
  tag('[class*="railTrack"]', "track");
  tag('[class*="storyNumberTrack"]', "wheel");
  tag('[class*="storyItem"]', "listItem");
  tag('[class*="storyImageFrame"]', "listImg");
  tag('[class*="railCopy"]', "copy");
  tag('[class*="scrollCue"]', "cue");
  tag('[class*="heroLineInner"]', "heroLine");
  tag('[class*="coverage"]:not(a):not(span):not(ol):not(li)', "coverage");
});

const sections = await page.evaluate(() => {
  const g = (sel) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return [Math.round(r.top + scrollY), Math.round(r.bottom + scrollY)];
  };
  return {
    statement: g('section[class*="statement"]'),
    chef: g('section[class*="chef"]'),
    story: g('section[class*="story"]'),
    coverage: g('section[class*="coverage"]'),
    doc: document.documentElement.scrollHeight,
  };
});

const which = (y) => {
  for (const k of ["coverage", "story", "chef", "statement"]) {
    const s = sections[k];
    if (s && y + 0 >= s[0] && y < s[1]) return k;
  }
  return "hero";
};

const snap = () =>
  page.evaluate(() => {
    const out = {};
    for (const e of document.querySelectorAll("[data-probe]")) {
      const cs = getComputedStyle(e);
      out[e.dataset.probe] = `${cs.transform}|${Number(cs.opacity).toFixed(2)}`;
    }
    return out;
  });

/* optional [from] [to] so the top-of-page seams can be walked on their own
   without paying for the deck's 7 screens */
const FROM = Number(process.argv[5] || 0);
const max = Math.min(sections.doc - H, Number(process.argv[6] || Infinity));
let prev = null;
const rows = [];

for (let y = FROM; y <= max; y += STEP) {
  await page.evaluate(
    (v) => window.__lenis?.scrollTo(v, { immediate: true }) ?? scrollTo(0, v),
    y,
  );
  /* two frames: one for the scrub to write, one for the spring to settle
     enough that a genuinely static element reads as static */
  await sleep(140);
  const cur = await snap();
  if (prev) {
    const movers = [];
    for (const k of Object.keys(cur)) if (prev[k] !== cur[k]) movers.push(k);
    /* group the nine deck cards/items into one mover — they are one object */
    const grouped = new Set(
      movers.map((m) => m.replace(/^(card|item|listItem|listImg|stmtWord|heroLine|coverage)\d+$/, "$1*")),
    );
    rows.push({ y, n: grouped.size, raw: movers.length, who: [...grouped], sec: which(y) });
  }
  prev = cur;
}

console.log(`\n${W}x${H}  doc ${sections.doc}px  step ${STEP}px`);
console.log(
  `sections: ${Object.entries(sections)
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => `${k} ${v[0]}-${v[1]}`)
    .join("  ")}\n`,
);

/* 1. concurrency hot spots */
console.log("--- positions with 3+ independent movers (competing) ---");
const hot = rows.filter((r) => r.n >= 3);
for (const r of hot) console.log(`  y=${String(r.y).padStart(6)} [${r.sec.padEnd(9)}] ${r.n}: ${r.who.join(", ")}`);
if (!hot.length) console.log("  none");

/* 2. dead air — runs of >=5 consecutive samples with nothing moving */
console.log("\n--- dead runs (>=5 samples, nothing in motion) ---");
let run = null;
const dead = [];
for (const r of rows) {
  if (r.n === 0) run = run ?? r.y;
  else {
    if (run !== null && (r.y - run) / STEP >= 5) dead.push([run, r.y]);
    run = null;
  }
}
if (run !== null) dead.push([run, max]);
for (const [a, z] of dead)
  console.log(`  y=${String(a).padStart(6)} -> ${String(z).padStart(6)}  (${z - a}px, ${((z - a) / H).toFixed(1)} screens) [${which(a)}]`);
if (!dead.length) console.log("  none");

/* 3. per-section motion density */
console.log("\n--- motion density by section ---");
const bySec = {};
for (const r of rows) {
  bySec[r.sec] = bySec[r.sec] || { n: 0, moving: 0, sum: 0 };
  bySec[r.sec].n++;
  if (r.n > 0) bySec[r.sec].moving++;
  bySec[r.sec].sum += r.n;
}
for (const [k, v] of Object.entries(bySec))
  console.log(
    `  ${k.padEnd(10)} ${String(v.n).padStart(4)} samples  ${String(Math.round((100 * v.moving) / v.n)).padStart(3)}% in motion  avg ${(v.sum / v.n).toFixed(2)} movers`,
  );

await b.close();
