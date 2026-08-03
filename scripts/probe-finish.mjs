/* Verification sweep for the work the two Builders were running when they
   stopped. Everything here is MEASURED in a real browser rather than read
   out of the CSS, because the last two times I reported from source alone
   I was wrong about what the page actually did.

   usage: node scripts/probe-finish.mjs [port]   (run from the repo root) */
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

const out = [];
const say = (s) => {
  out.push(s);
  console.log(s);
};

/* ---------- 1. FAQ grid inside the content width ---------- */
await page.goto(`${B}/contact`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1200));

const faq = await page.evaluate(() => {
  const sec = document.querySelector("#faq, [class*='FAQ_section']");
  if (!sec) return { error: "no faq section" };
  const layout = sec.querySelector(".container");
  const list = sec.querySelector("ul");
  /* the container every other block on the page is measured against */
  const ref = document.querySelector("main .container");
  const r = (el) => {
    if (!el) return null;
    const x = el.getBoundingClientRect();
    return { l: +x.left.toFixed(1), r: +x.right.toFixed(1), w: +x.width.toFixed(1) };
  };
  return { layout: r(layout), list: r(list), ref: r(ref), vw: innerWidth };
});
say(`\n[1] FAQ width  ${JSON.stringify(faq)}`);
if (faq.layout && faq.ref) {
  const over = faq.layout.l < faq.ref.l - 1 || faq.layout.r > faq.ref.r + 1;
  say(`    within content width: ${over ? "NO — overflows" : "yes"}`);
}

/* ---------- 2. the horizontal scrollbar test, whole page ---------- */
const overflow = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
}));
say(`[2] /contact doc overflow  ${JSON.stringify(overflow)}  ${
  overflow.scrollW > overflow.clientW ? "OVERFLOWS" : "clean"
}`);

/* ---------- 3. the restaurants note has no ground of its own ---------- */
await page.goto(`${B}/restaurants`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1800));

const walk = await page.evaluate(() => {
  const el = [...document.querySelectorAll("p")].find((p) =>
    /no booking needed/i.test(p.textContent || ""),
  );
  if (!el) return { error: "note not found" };
  const cs = getComputedStyle(el);
  const bef = getComputedStyle(el, "::before");
  const aft = getComputedStyle(el, "::after");
  return {
    background: cs.backgroundColor,
    backgroundImage: cs.backgroundImage,
    backdropFilter: cs.backdropFilter,
    border: cs.borderTopWidth,
    padding: cs.padding,
    beforeContent: bef.content,
    afterContent: aft.content,
    color: cs.color,
  };
});
say(`[3] walk-in note  ${JSON.stringify(walk, null, 0)}`);

/* ---------- 4. the wheel is draggable ---------- */
const drag = await page.evaluate(() => {
  const scroller = document.querySelector("[data-dragging], [class*='rail'], [class*='wheel']");
  return {
    found: !!scroller,
    cls: scroller ? scroller.className : null,
  };
});
say(`[4] wheel element  ${JSON.stringify(drag)}`);

/* actually drag it and see whether anything moved */
const before = await page.evaluate(() => {
  const s = [...document.querySelectorAll("*")].find(
    (e) => e.scrollHeight > e.clientHeight + 40 && e.clientHeight > 200,
  );
  return s ? { tag: s.tagName, cls: String(s.className).slice(0, 60), top: s.scrollTop } : null;
});
if (before) {
  await page.mouse.move(720, 500);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(720, 500 - i * 14);
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 900));
  const after = await page.evaluate(() => {
    const s = [...document.querySelectorAll("*")].find(
      (e) => e.scrollHeight > e.clientHeight + 40 && e.clientHeight > 200,
    );
    return s ? s.scrollTop : null;
  });
  say(`[4b] drag moved the wheel: ${before.top} -> ${after}  ${
    after !== before.top ? "YES" : "NO"
  }`);
}

/* ---------- 5. About: deck card variants and side spacing ---------- */
await page.goto(`${B}/about`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1500));

/* walk down to the deck so it is staged */
await page.evaluate(() => {
  const rail = document.querySelector("[class*='railStage'], [class*='rail']");
  if (rail) rail.scrollIntoView({ block: "center" });
});
await new Promise((r) => setTimeout(r, 1500));

const deck = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("[class*='railCard']")];
  if (!cards.length) return { error: "no cards" };
  const boxes = cards.map((c) => {
    const r = c.getBoundingClientRect();
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      shape: r.width > r.height ? "landscape" : "portrait",
      radius: getComputedStyle(c).borderRadius,
    };
  });
  const land = boxes.filter((b) => b.shape === "landscape");
  const port = boxes.filter((b) => b.shape === "portrait");
  return {
    n: boxes.length,
    order: boxes.map((b) => b.shape[0]).join(""),
    landscapeSizes: [...new Set(land.map((b) => `${b.w}x${b.h}`))],
    portraitSizes: [...new Set(port.map((b) => `${b.w}x${b.h}`))],
    radius: [...new Set(boxes.map((b) => b.radius))],
  };
});
say(`[5] deck  ${JSON.stringify(deck)}`);

/* ---------- 6. cursor never vanishes on /about ---------- */
const cursor = await page.evaluate(() => {
  const hits = [];
  for (const el of document.querySelectorAll("*")) {
    if (getComputedStyle(el).cursor === "none") {
      hits.push(String(el.className).slice(0, 50) || el.tagName);
    }
  }
  const custom = document.querySelector("[class*='CustomCursor'], [class*='cursor']");
  return { noneCount: hits.length, sample: hits.slice(0, 6), customMounted: !!custom };
});
say(`[6] cursor  ${JSON.stringify(cursor)}`);

/* ---------- 7. GROUP? matches MAGINHAWA ---------- */
const hero = await page.evaluate(() => {
  const pick = (t) =>
    [...document.querySelectorAll("*")].find(
      (e) => (e.textContent || "").trim() === t && e.children.length < 40,
    );
  const read = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      family: cs.fontFamily.split(",")[0],
      size: cs.fontSize,
      weight: cs.fontWeight,
      style: cs.fontStyle,
    };
  };
  return { MAGINHAWA: read(pick("MAGINHAWA")), GROUP: read(pick("GROUP?")) };
});
say(`[7] hero type  ${JSON.stringify(hero)}`);

/* ---------- 8. /about doc overflow ---------- */
const ov2 = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
}));
say(`[8] /about doc overflow  ${JSON.stringify(ov2)}  ${
  ov2.scrollW > ov2.clientW ? "OVERFLOWS" : "clean"
}`);

/* ---------- 9. console errors across the routes ---------- */
const errs = [];
page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 140)));
page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 140)));
for (const r of ["/", "/about", "/careers", "/contact", "/restaurants"]) {
  await page.goto(`${B}${r}`, { waitUntil: "networkidle2" }).catch(() => {});
  await new Promise((x) => setTimeout(x, 900));
}
say(`\n[9] console errors (${errs.length}):`);
[...new Set(errs)].slice(0, 12).forEach((e) => say(`    ${e}`));

setTimeout(() => process.exit(0), 1500);
await b.close().catch(() => {});
process.exit(0);
