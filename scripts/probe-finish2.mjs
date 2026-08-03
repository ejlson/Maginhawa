/* Second pass. The first probe read getBoundingClientRect on the deck, which
   is the AXIS-ALIGNED BOUND OF THE PROJECTED BOX — a leaning portrait card
   measures wider than tall, so every card came back "landscape". Layout size
   (offsetWidth/Height) is pre-transform and is the card's real shape.
   The wheel drag also grabbed a guessed coordinate; here it grabs the wheel's
   own centre.

   usage: node scripts/probe-finish2.mjs [port]   (run from the repo root) */
import puppeteer from "puppeteer-core";

const PORT = process.argv[2] || "3300";
const B = `http://localhost:${PORT}`;

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });

/* ---------- deck: real shapes, in DOM order ---------- */
await page.goto(`${B}/about`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1500));
await page.evaluate(() => {
  const rail = document.querySelector("[class*='railStage']");
  if (rail) rail.scrollIntoView({ block: "center" });
});
await new Promise((r) => setTimeout(r, 1600));

const deck = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("[class*='railCard']")];
  return cards.map((c) => ({
    w: c.offsetWidth,
    h: c.offsetHeight,
    shape: c.offsetWidth > c.offsetHeight ? "L" : "P",
    cls: String(c.className)
      .split(" ")
      .filter((x) => !/railCard__/.test(x))
      .join(" "),
  }));
});
console.log(`\n[deck] ${deck.length} cards, layout boxes:`);
deck.forEach((d, i) => console.log(`   ${i}  ${d.shape}  ${d.w}x${d.h}   ${d.cls}`));
console.log(`   order: ${deck.map((d) => d.shape).join("")}`);
const L = [...new Set(deck.filter((d) => d.shape === "L").map((d) => `${d.w}x${d.h}`))];
const P = [...new Set(deck.filter((d) => d.shape === "P").map((d) => `${d.w}x${d.h}`))];
console.log(`   landscape sizes: ${JSON.stringify(L)}`);
console.log(`   portrait  sizes: ${JSON.stringify(P)}`);

/* ---------- deck: side spacing, seated card vs its column ---------- */
const gaps = await page.evaluate(() => {
  const stage = document.querySelector("[class*='railStage']");
  const cards = [...document.querySelectorAll("[class*='railCard']")];
  if (!stage || !cards.length) return null;
  const s = stage.getBoundingClientRect();
  /* the seated card is the one nearest the stage's vertical centre */
  const mid = s.top + s.height / 2;
  const seat = cards
    .map((c) => ({ c, r: c.getBoundingClientRect() }))
    .sort(
      (a, z) =>
        Math.abs(a.r.top + a.r.height / 2 - mid) - Math.abs(z.r.top + z.r.height / 2 - mid),
    )[0];
  return {
    stage: { l: +s.left.toFixed(1), r: +s.right.toFixed(1) },
    seat: { l: +seat.r.left.toFixed(1), r: +seat.r.right.toFixed(1) },
    leftGap: +(seat.r.left - s.left).toFixed(1),
    rightGap: +(s.right - seat.r.right).toFixed(1),
  };
});
console.log(`\n[deck gaps] ${JSON.stringify(gaps)}`);
if (gaps) console.log(`   asymmetry: ${(gaps.leftGap - gaps.rightGap).toFixed(1)}px`);

/* ---------- cursor in the awards rows ---------- */
const awards = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("[class*='coverageRow'], [class*='pressRow'], tr")];
  const target = rows.find((r) => (r.textContent || "").trim().length > 12);
  if (!target) return { error: "no award rows" };
  target.scrollIntoView({ block: "center" });
  return { found: true, cls: String(target.className).slice(0, 60) };
});
console.log(`\n[awards] ${JSON.stringify(awards)}`);
await new Promise((r) => setTimeout(r, 900));

const cursorOverAwards = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("[class*='coverageRow'], [class*='pressRow'], tr")];
  const t = rows.find((r) => (r.textContent || "").trim().length > 12);
  if (!t) return null;
  const r = t.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
});
if (cursorOverAwards) {
  await page.mouse.move(cursorOverAwards.x, cursorOverAwards.y);
  await new Promise((r) => setTimeout(r, 700));
  const state = await page.evaluate(() => {
    const c = document.querySelector("[class*='CustomCursor']");
    if (!c) return { mounted: false };
    const cs = getComputedStyle(c);
    const r = c.getBoundingClientRect();
    return {
      mounted: true,
      opacity: cs.opacity,
      visibility: cs.visibility,
      display: cs.display,
      transform: cs.transform.slice(0, 60),
      size: `${Math.round(r.width)}x${Math.round(r.height)}`,
    };
  });
  console.log(`   cursor while over an award row: ${JSON.stringify(state)}`);
  /* is a hover preview image showing, and how big */
  const preview = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].filter((i) => {
      const cs = getComputedStyle(i);
      const r = i.getBoundingClientRect();
      return +cs.opacity > 0.05 && r.width > 40 && r.top < innerHeight && r.bottom > 0;
    });
    return imgs
      .map((i) => ({
        w: Math.round(i.getBoundingClientRect().width),
        h: Math.round(i.getBoundingClientRect().height),
        src: (i.currentSrc || i.src).split("/").pop().slice(0, 40),
      }))
      .slice(0, 5);
  });
  console.log(`   visible images near the row: ${JSON.stringify(preview)}`);
}

/* ---------- wheel drag, grabbed at the wheel's own centre ---------- */
await page.goto(`${B}/restaurants`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2000));

const wheelBox = await page.evaluate(() => {
  const w = document.querySelector("[class*='wheel']");
  if (!w) return null;
  const r = w.getBoundingClientRect();
  return {
    x: Math.round(r.left + r.width / 2),
    y: Math.round(r.top + r.height / 2),
    scrollTop: w.scrollTop,
    scrollH: w.scrollHeight,
    clientH: w.clientHeight,
  };
});
console.log(`\n[wheel] ${JSON.stringify(wheelBox)}`);

if (wheelBox) {
  await page.mouse.move(wheelBox.x, wheelBox.y);
  await page.mouse.down();
  /* a real drag: several intermediate moves so the commit threshold trips */
  for (let i = 1; i <= 16; i++) {
    await page.mouse.move(wheelBox.x, wheelBox.y - i * 12);
    await new Promise((r) => setTimeout(r, 12));
  }
  const during = await page.evaluate(() => ({
    dragging: document.querySelector("[class*='wheel']")?.getAttribute("data-dragging"),
    rootDragging: document.documentElement.getAttribute("data-dragging"),
    bodyDragging: document.body.getAttribute("data-dragging"),
    scrollTop: document.querySelector("[class*='wheel']")?.scrollTop,
  }));
  console.log(`   mid-drag: ${JSON.stringify(during)}`);
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 1200));
  const after = await page.evaluate(
    () => document.querySelector("[class*='wheel']")?.scrollTop,
  );
  console.log(
    `   scrollTop ${wheelBox.scrollTop} -> ${after}   ${
      after !== wheelBox.scrollTop ? "DRAG WORKS" : "DRAG DID NOTHING"
    }`,
  );
}

setTimeout(() => process.exit(0), 1500);
await b.close().catch(() => {});
process.exit(0);
