/* THE HERO'S TWO GEOMETRY CLAIMS, MEASURED.

   1. THE SEQUENCE PLAYS WHERE IT CAN BE SEEN. The caption is the third beat
      and it lives inside the photograph, so if the frame runs past the bottom
      of the window the beat fires off-screen and the whole sequence is
      pointless. This reports, per viewport, where the frame closes and how
      much clearance the caption has to the fold.

   2. THE CROP IS HONEST. The source is 1920x1080 (1.78). Every frame ratio
      wider than that throws away height; every ratio narrower throws away
      width. This reports exactly how much of the original photograph survives
      at each viewport, so "it crops comfortably" is a number rather than an
      opinion — and so the phone, where a wide letterbox fights hardest, is
      checked rather than hoped for.

   usage: node scripts/probe-join-fold.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3187";
const SRC_AR = 1920 / 1080;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => {
  if (!c) fails++;
  console.log(`    ${c ? "PASS" : "FAIL"}  ${m}`);
};

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu", "--use-gl=angle"],
});

for (const [VW, VH] of [
  [1440, 900],
  [1920, 1080],
  [820, 1180],
  [390, 844],
]) {
  const page = await b.newPage();
  await page.setViewport({ width: VW, height: VH });
  await page.goto(`http://localhost:${PORT}/careers`, { waitUntil: "networkidle0", timeout: 60000 });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  // past the whole sequence: lens ≈ 1.0s + 0.9s, caption + 0.7s
  await sleep(3200);

  const r = await page.evaluate(() => {
    const g = (s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, w: b.width, h: b.height };
    };
    const img = document.querySelector('[class*="heroImg"]');
    /* THE THIRD BEAT MOVED. It was a caption inside the photograph; it is now
       the standfirst under the payoff line (see `.heroStand`), so that is the
       element the fold rule is about — and the fold rule itself is unchanged
       in substance: beat 3 arrives last, and a beat that plays under the
       fold plays where nobody can see it. */
    const cap = document.querySelector('[class*="heroStand"]');
    return {
      vh: innerHeight,
      labels: g('[class*="heroLabels"]'),
      // the <h1> is `display: contents` — the two line spans carry the type
      title: g('[class*="heroLineTop"]'),
      titleFs: getComputedStyle(document.querySelector('[class*="heroLineTop"]')).fontSize,
      lines: document.querySelectorAll('[class*="heroLine"]').length,
      frame: g('[class*="heroBand"]'),
      caption: g('[class*="heroStand"]'),
      capOpacity: +getComputedStyle(cap).opacity,
      // the split has landed when the frame is back on its own box
      frameScale: getComputedStyle(document.querySelector('[class*="heroFrame"]')).transform,
      lineTops: [...document.querySelectorAll('[class*="heroLine"]')].map(
        (el) => +el.getBoundingClientRect().top.toFixed(0),
      ),
      // the rendered box of the <img> itself, which object-fit crops INTO
      imgBox: { w: img.getBoundingClientRect().width, h: img.getBoundingClientRect().height },
      served: `${img.naturalWidth}x${img.naturalHeight}`,
      alt: img.getAttribute("alt"),
    };
  });

  const boxAr = r.imgBox.w / r.imgBox.h;
  // object-fit: cover — the wider box crops the source's height, and vice versa
  const keptH = boxAr >= SRC_AR ? SRC_AR / boxAr : 1;
  const keptW = boxAr >= SRC_AR ? 1 : boxAr / SRC_AR;
  const clear = r.vh - r.caption.bottom;

  console.log(`\n=== ${VW}x${VH} ===`);
  console.log(
    `  labels y ${r.labels.top.toFixed(0)}–${r.labels.bottom.toFixed(0)}   title ${r.titleFs} over ${r.lines} lines, y ${r.title.top.toFixed(0)}–${r.title.bottom.toFixed(0)}`,
  );
  console.log(
    `  frame  ${r.frame.w.toFixed(0)}x${r.frame.h.toFixed(0)} (${(r.frame.w / r.frame.h).toFixed(2)}:1)  y ${r.frame.top.toFixed(0)}–${r.frame.bottom.toFixed(0)}   fold at ${r.vh}`,
  );
  console.log(
    `  crop   keeps ${(keptH * 100).toFixed(0)}% of the source HEIGHT and ${(keptW * 100).toFixed(0)}% of its WIDTH   (served ${r.served})`,
  );
  console.log(
    `  standfirst y ${r.caption.top.toFixed(0)}–${r.caption.bottom.toFixed(0)}  opacity ${r.capOpacity}  clearance to fold ${clear.toFixed(0)}px`,
  );

  ok(clear > 0, `the standfirst lands inside the first screen (${clear.toFixed(0)}px of clearance)`);
  /* THE PAYOFF LINE IS THE NEW BOTTOM OF THE HERO. The headline breaks
     across the photograph now, so the last thing in the composition is the
     second line of the sentence and not the caption inside the picture. A
     hero whose closing two words are under the fold is a sentence the reader
     never finishes. */
  ok(
    r.lineTops[r.lineTops.length - 1] < r.vh,
    `the payoff line starts above the fold (y ${r.lineTops[r.lineTops.length - 1]} of ${r.vh})`,
  );
  ok(r.capOpacity > 0.98, "the standfirst has finished arriving");
  ok(
    /matrix\(1, 0, 0, 1, 0, 0\)|none/.test(r.frameScale),
    `the split finished — the photograph is at full size on its seat (${r.frameScale})`,
  );
  ok(keptH >= 0.6 && keptW >= 0.6, `neither axis of the photograph is more than 40% cropped`);
  ok(!!r.alt && r.alt.length > 20, "the photograph carries a real alt text");
  await page.close();
}

console.log(`\n  ${fails === 0 ? "THE HERO FITS AND THE CROP IS HONEST" : `${fails} FAILURE(S)`}\n`);
const shutdown = async () => {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    proc?.kill("SIGKILL");
  } catch {}
  process.exit(fails === 0 ? 0 : 1);
};
await shutdown();
