/* Two checks:
   1. The story wheel's label and dot indicator must be CENTRED on the year,
      not flushed to its right edge — and the year's right edge must not have
      moved, or the "even spacing either side of the cards" fix is undone.
   2. The careers form copy the user asked to change.

   usage: node scripts/probe-wheel-centre.mjs [port]   (run from the repo root) */
import puppeteer from "puppeteer-core";

const PORT = process.argv[2] || "3300";
const B = `http://localhost:${PORT}`;

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});

for (const W of [1440, 1920, 1280]) {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: 900 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.goto(`${B}/about`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1800));
  await page.evaluate(() => {
    const s = document.querySelector("[class*='railStage']");
    if (s) s.scrollIntoView({ block: "center" });
  });
  await new Promise((r) => setTimeout(r, 1800));

  const m = await page.evaluate(() => {
    const label = document.querySelector("[class*='storyWheelLabel']");
    const mask = document.querySelector("[class*='storyWheelMask']");
    const dots = document.querySelector(
      "[class*='storyProgress'], [class*='storyDots']",
    );
    const card = document.querySelector("[class*='railCard']");
    const mid = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        l: +r.left.toFixed(1),
        r: +r.right.toFixed(1),
        c: +(r.left + r.width / 2).toFixed(1),
      };
    };
    return { label: mid(label), year: mid(mask), dots: mid(dots), card: mid(card) };
  });

  if (!m.year) {
    console.log(`${W}: wheel not found`);
    await page.close();
    continue;
  }
  const dLabel = m.label ? +(m.label.c - m.year.c).toFixed(1) : null;
  const dDots = m.dots ? +(m.dots.c - m.year.c).toFixed(1) : null;
  console.log(
    `\n${W}px  year ${m.year.l}..${m.year.r} (centre ${m.year.c})\n` +
      `      label centre offset from the year: ${dLabel}px\n` +
      `      dots  centre offset from the year: ${dDots}px\n` +
      `      year right edge -> card left edge: ${
        m.card ? +(m.card.l - m.year.r).toFixed(1) : "n/a"
      }px`,
  );
  const ok = Math.abs(dLabel ?? 99) < 2 && Math.abs(dDots ?? 99) < 2;
  console.log(`      ${ok ? "CENTRED" : "NOT CENTRED"}`);
  await page.close();
}

/* ---- careers copy ---- */
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`${B}/careers`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1800));
const copy = await page.evaluate(() => {
  const t = document.body.innerText;
  const opts = [...document.querySelectorAll("select option")].map((o) => o.textContent.trim());
  const btn = [...document.querySelectorAll("button[type='submit']")].map((x) =>
    x.textContent.trim(),
  );
  const described = [...document.querySelectorAll("[aria-describedby]")]
    .map((e) => e.getAttribute("aria-describedby"))
    .filter((id) => !document.getElementById(id));
  return {
    hasPdfWord: /PDF or Word\. You attach it to the email\./.test(t),
    hasAttachDraft: /Attach your CV to the draft\./.test(t),
    hasOpenEmail: /Open email and send/.test(t),
    submitLabels: btn,
    lastOption: opts[opts.length - 1],
    hasGeneralApplication: opts.includes("General application"),
    danglingDescribedBy: described,
  };
});
console.log(`\ncareers copy: ${JSON.stringify(copy, null, 1)}`);

setTimeout(() => process.exit(0), 1200);
await b.close().catch(() => {});
process.exit(0);
