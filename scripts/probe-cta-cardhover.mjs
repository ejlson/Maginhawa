/* THE HOVER THAT BELONGS TO SOMETHING ELSE — /blog's featured lede is a
   whole-card link carrying a PRESENTATIONAL PillCta, and the close is
   driven from the card by `[data-cta-hover]` rather than by the pill's own
   :hover. This checks that path, and checks it the only way that proves
   anything: by pointing at the card WELL AWAY from the pill.

   Hovering the pill itself would pass whether or not the card rule exists —
   the pill is inside the card, so `.cta:hover` fires too and the control
   closes for the wrong reason.

   It asserts on all four moves, because the card rule reaches four
   elements and a rename that stranded any one of them would leave a
   control that half-closes.

   Usage: node scripts/probe-cta-cardhover.mjs <port> */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
const cdp = await page.createCDPSession();
await cdp.send("Emulation.setEmulatedMedia", {
  media: "screen",
  features: [
    { name: "hover", value: "hover" },
    { name: "pointer", value: "fine" },
  ],
});

await page.goto(`http://localhost:${PORT}/blog`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 20000,
  })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);
await s(2000);
await page.waitForSelector("[data-cta-hover]", { timeout: 20000 });

const state = () =>
  page.evaluate(() => {
    const card = document.querySelector("[data-cta-hover]");
    const q = (c) => card.querySelector(`[class*="PillCta_${c}__"]`);
    const tx = (el) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return +m.m41.toFixed(2);
    };
    return {
      cardHovered: card.matches(":hover"),
      pillHovered: q("cta").matches(":hover"),
      clip: +getComputedStyle(q("body")).clipPath.match(/[\d.]+px/g)[1].replace("px", ""),
      body: tx(q("body")),
      label: tx(q("label")),
      disc: tx(q("disc")),
      discCell: tx(q("discCell")),
      arrow: tx(q("arrow")),
    };
  });

const box = await page.evaluate(() => {
  const card = document.querySelector("[data-cta-hover]");
  const pill = card.querySelector('[class*="PillCta_cta__"]');
  card.scrollIntoView({ block: "center" });
  const c = card.getBoundingClientRect();
  const p = pill.getBoundingClientRect();
  /* the card's top-left quadrant, a long way from the pill */
  return {
    aim: { x: c.left + c.width * 0.25, y: c.top + c.height * 0.15 },
    pill: { x: p.left, y: p.top, w: p.width, h: p.height },
    cardH: c.height,
  };
});
let last = -1;
for (let i = 0; i < 40; i++) {
  await s(100);
  const y = await page.evaluate(() => Math.round(window.scrollY));
  if (y === last) break;
  last = y;
}
await s(600);

const before = await state();
await page.mouse.move(box.aim.x, box.aim.y);
await s(1600); // past --cta-dur (700ms) and the arrow's 74% delay + 340ms
const after = await state();

console.log("aimed at", box.aim, "— pill is at", box.pill);
console.log("before:", JSON.stringify(before));
console.log("after: ", JSON.stringify(after));

const fail = [];
if (!after.cardHovered) fail.push("the card is not hovered — nothing was tested");
if (after.pillHovered)
  fail.push("the pointer landed ON the pill, so this proves nothing about the card rule");
if (!(after.clip < before.clip - 20)) fail.push(`clip did not open (${before.clip} → ${after.clip})`);
for (const k of ["body", "label"])
  if (!(after[k] > 8)) fail.push(`${k} did not travel right (${after[k]}px)`);
for (const k of ["disc", "discCell"])
  if (!(after[k] < -8)) fail.push(`${k} did not travel left (${after[k]}px)`);
if (!(after.arrow > 3)) fail.push(`arrow did not step (${after.arrow}px)`);

if (fail.length) {
  console.log("\nFAIL");
  for (const f of fail) console.log("  ·", f);
} else {
  console.log("\nPASS — the card drives all four moves with the pointer nowhere near the pill");
}
await browser.close();
process.exit(fail.length ? 1 : 0);
