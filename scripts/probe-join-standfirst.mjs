/* WHERE THE LONG COPY CAN ACTUALLY BE READ.

   The hero's third beat used to be 41 characters inside the photograph,
   bottom-right, cream on a corner scrim — and probe-join-caption.mjs
   measured that at 15.7–18.4:1 (p95). The copy is now 152 characters, and
   that measurement does not transfer: it was a number about one corner of
   one frame of video, and a block four times the size covers four times the
   picture, most of it outside the scrim's reach.

   So this probe measures BOTH options against the real thing rather than
   asserting the obvious:

   A. THE REJECTED ONE — the new copy put BACK inside the photograph at the
      old caption's position and styling, injected at runtime so no build is
      needed to ask the question. The pixels actually behind the words are
      screenshotted and read, worst-case (p95, because WCAG is a worst-case
      rule and cream type fails over a highlight long before it fails over a
      mean).
   B. THE SHIPPED ONE — the standfirst under the payoff line, on cream, by
      the composited-colour method, plus a pixel read of its own ground as a
      cross-check that nothing is behind it.

   Same decode trick as probe-join-caption.mjs: this repo has no image
   decoder and the brief forbids adding one, so the screenshot goes back into
   the page as a data URL and is read off a canvas.

   usage: node scripts/probe-join-standfirst.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3187";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;

const srgb = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const ratio = (a, b) => {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
    "--use-gl=angle",
  ],
});

/** read the pixels of a page rect and return their luminance quantiles */
const groundUnder = async (page, box) => {
  const shot = await page.screenshot({
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    captureBeyondViewport: false,
    encoding: "base64",
  });
  const ls = await page.evaluate(
    (b64) =>
      new Promise((resolve) => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement("canvas");
          c.width = im.width;
          c.height = im.height;
          const cx = c.getContext("2d");
          cx.drawImage(im, 0, 0);
          const d = cx.getImageData(0, 0, c.width, c.height).data;
          const out = [];
          for (let i = 0; i < d.length; i += 4) out.push(d[i], d[i + 1], d[i + 2]);
          resolve(out);
        };
        im.src = "data:image/png;base64," + b64;
      }),
    shot,
  );
  const lums = [];
  for (let i = 0; i < ls.length; i += 3) lums.push(lum(ls[i], ls[i + 1], ls[i + 2]));
  lums.sort((x, y) => x - y);
  const q = (p) => lums[Math.min(lums.length - 1, Math.floor(lums.length * p))];
  return { n: lums.length, p50: q(0.5), p95: q(0.95), max: lums[lums.length - 1] };
};

console.log(
  "\n=== the 152-character standfirst: inside the photograph vs under the headline ===",
);

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
  await sleep(3400);

  console.log(`\n=== ${VW}x${VH} ===`);

  /* ---- A. THE REJECTED OPTION, RECONSTRUCTED ----
     The real copy, at the real size, in the real position the caption held,
     inside the real photograph — built at runtime so the comparison costs no
     build and cannot drift from the shipped stylesheet's other values. */
  const boxA = await page.evaluate((text) => {
    const frame = document.querySelector('[class*="heroFrame"]');
    const stand = document.querySelector('[class*="heroStand"]');
    const cs = getComputedStyle(stand);
    const el = document.createElement("span");
    el.id = "__capA";
    el.textContent = text;
    // the retired `.heroCaption` rules, verbatim
    Object.assign(el.style, {
      position: "absolute",
      right: "clamp(16px, 2.2vw, 34px)",
      bottom: "clamp(13px, 1.8vw, 28px)",
      zIndex: "2",
      margin: "0",
      maxWidth: "min(88%, 46ch)",
      textAlign: "right",
      fontFamily: cs.fontFamily,
      fontSize: "0.8125rem",
      letterSpacing: "0.07em",
      lineHeight: "1.35",
      color: "#faf7f1",
      display: "block",
    });
    frame.appendChild(el);
    const r = el.getBoundingClientRect();
    el.style.visibility = "hidden";
    return {
      x: Math.max(0, Math.round(r.left - 4)),
      y: Math.max(0, Math.round(r.top - 3)),
      width: Math.round(r.width + 8),
      height: Math.round(r.height + 6),
      lines: Math.round(r.height / (0.8125 * 16 * 1.35)),
      w: Math.round(r.width),
      h: Math.round(r.height),
      frameW: Math.round(frame.getBoundingClientRect().width),
      frameH: Math.round(frame.getBoundingClientRect().height),
    };
  }, "Every Maginhawa restaurant is shaped by the people behind it. Join a team where craft, creativity and care come together to create thoughtful hospitality.");

  await sleep(120);
  const gA = await groundUnder(page, boxA);
  await page.evaluate(() => document.getElementById("__capA")?.remove());

  const creamL = lum(250, 247, 241);
  const worstA = ratio(creamL, gA.p95);
  const medA = ratio(creamL, gA.p50);
  const maxA = ratio(creamL, gA.max);
  console.log(
    `  A  IN THE PHOTOGRAPH   ${boxA.w}x${boxA.h}px over ${boxA.lines} lines — ${((boxA.w * boxA.h) / (boxA.frameW * boxA.frameH) * 100).toFixed(0)}% of the picture`,
  );
  console.log(
    `     cream on the real pixels:  worst(p95) ${worstA.toFixed(2)}:1   median ${medA.toFixed(2)}:1   brightest ${maxA.toFixed(2)}:1   over ${gA.n} px`,
  );
  console.log(
    `     ${worstA >= 4.5 ? "clears" : "FAILS"} the 4.5:1 body minimum`,
  );

  /* ---- B. THE SHIPPED OPTION ---- */
  const boxB = await page.evaluate(() => {
    const el = document.querySelector('[class*="heroStand"]');
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    el.style.visibility = "hidden";
    return {
      x: Math.max(0, Math.round(r.left - 4)),
      y: Math.max(0, Math.round(r.top - 3)),
      width: Math.round(r.width + 8),
      height: Math.round(r.height + 6),
      fg: cs.color,
      size: cs.fontSize,
      lines: Math.round(r.height / parseFloat(cs.lineHeight)),
      w: Math.round(r.width),
      h: Math.round(r.height),
      text: el.textContent.trim().length,
    };
  });
  await sleep(120);
  const gB = await groundUnder(page, boxB);
  await page.evaluate(() => {
    const el = document.querySelector('[class*="heroStand"]');
    if (el) el.style.visibility = "";
  });

  const fgB = boxB.fg.match(/[\d.]+/g).map(Number);
  // an rgba colour composites against its own ground before it means anything
  const aB = fgB[3] === undefined ? 1 : fgB[3];
  const over = (c, bg) => c * aB + bg * (1 - aB);
  const fgBL = lum(over(fgB[0], 250), over(fgB[1], 247), over(fgB[2], 241));
  const worstB = ratio(fgBL, gB.p95);
  const medB = ratio(fgBL, gB.p50);
  console.log(
    `  B  UNDER THE HEADLINE  ${boxB.w}x${boxB.h}px over ${boxB.lines} lines at ${boxB.size}  (${boxB.text} characters)`,
  );
  console.log(
    `     maroon on its real ground: worst(p95) ${worstB.toFixed(2)}:1   median ${medB.toFixed(2)}:1   over ${gB.n} px`,
  );

  if (worstB < 4.5) {
    fails++;
    console.log("     FAIL — the shipped standfirst is under 4.5:1");
  } else {
    console.log("     PASS — the shipped standfirst clears 4.5:1 across its whole run");
  }
  await page.close();
}

console.log(
  `\n  ${fails === 0 ? "THE STANDFIRST IS READABLE WHERE IT SHIPPED" : `${fails} VIEWPORT(S) UNDER 4.5:1`}\n`,
);
const shutdown = async () => {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    proc?.kill("SIGKILL");
  } catch {}
  process.exit(fails === 0 ? 0 : 1);
};
await shutdown();
