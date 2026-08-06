/* THE MANIFESTO STATEMENT — seat, copy, wrap, accent, rest.

     SEAT     the order of the sections inside .afterHero: the statement has
              to come BEFORE the restaurants grid.
     COPY     the accessible name (every word is masked and aria-hidden, so
              the aria-label is the ONLY thing a screen reader gets) and the
              absence of the retired "Who is..." kicker.
     WRAP     the locked line count and the words on each line. The lock
              freezes whatever the browser wrapped, so the line count is a
              measured result — and a four-line set whose last line is one
              word is the widow this stylesheet has been fixed for twice.
              Words are read from the MASKS, not from textContent: the gaps
              between words are margins, not space characters.
     ACCENT   which words carry the saffron, and that the colour resolves.
     SCRUB    scrolled past, every word must have come to rest at
              translateY 0 — the sentence fully set, nothing left parked.
     CLIP     mask overflow, measured AFTER the scrub has finished. Before
              it, every word is legitimately parked 130% below its clip and
              the reading is meaningless.

   usage: node scripts/probe-manifesto.mjs [w] [h] [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = Number(process.argv[2] || 1440);
const H = Number(process.argv[3] || 900);
const PORT = process.argv[4] || "3100";

const PICK = `Array.from(document.querySelectorAll('h2[aria-label]')).find(
  (n) => /vibrant Filipino/.test(n.getAttribute('aria-label') || ''))`;

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
  { timeout: 60000 },
);
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 600));

const out = await page.evaluate((PICK) => {
  const h2 = eval(PICK);
  const after = document.querySelector(".afterHero");

  const seat = Array.from(after?.children || []).map((el) => {
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").trim().slice(0, 40).replace(/\s+/g, " "),
      top: Math.round(r.top + window.scrollY),
      h: Math.round(r.height),
      hasStatement: !!h2 && el.contains(h2),
    };
  });

  const kicker = h2
    ? Array.from(h2.parentElement.children).find(
        (n) => n.tagName === "P" && /who is/i.test(n.textContent || ""),
      )
    : null;

  const kids = h2 ? Array.from(h2.children) : [];
  const locked = kids.length > 0 && !kids[0].hasAttribute("data-part");
  const lines = locked
    ? kids.map((line) => {
        const masks = Array.from(line.children);
        return {
          n: masks.length,
          text: masks
            .map((m) => (m.textContent || "").trim())
            .filter(Boolean)
            .join(" "),
        };
      })
    : null;

  // the leaf spans are the words; a saffron one is an accent
  const leaves = Array.from(h2?.querySelectorAll("span") || []).filter(
    (n) => n.children.length === 0 && (n.textContent || "").trim(),
  );
  const accented = leaves
    .filter((n) => {
      const c = getComputedStyle(n).color;
      return c !== getComputedStyle(h2).color;
    })
    .map((n) => ({ word: n.textContent.trim(), color: getComputedStyle(n).color }));

  return {
    seat,
    label: h2?.getAttribute("aria-label") || null,
    hasKicker: !!kicker,
    locked,
    lines,
    accented,
    family: leaves[0] ? getComputedStyle(leaves[0]).fontFamily : null,
    size: leaves[0] ? getComputedStyle(leaves[0]).fontSize : null,
    maxWidth: h2 ? getComputedStyle(h2).maxWidth : null,
  };
}, PICK);

console.log(`\n=== MANIFESTO @ ${W}x${H} ===`);
console.log("\n-- SEAT (.afterHero children, in order) --");
out.seat.forEach((s, i) =>
  console.log(
    `  ${i}. ${s.tag} top=${String(s.top).padStart(5)} h=${String(s.h).padStart(4)}` +
      `${s.hasStatement ? "  <== STATEMENT" : ""}  "${s.text}"`,
  ),
);
const idx = out.seat.findIndex((s) => s.hasStatement);
console.log(
  `  statement is child ${idx} of ${out.seat.length} — ` +
    (idx === 0 ? "FIRST past the hero, before the grid  OK" : "NOT first  FAIL"),
);

console.log("\n-- COPY --");
console.log(`  aria-label: ${out.label}`);
console.log(`  kicker present: ${out.hasKicker}${out.hasKicker ? "  FAIL" : "  OK"}`);

console.log("\n-- WRAP --");
console.log(`  locked: ${out.locked}   lines: ${out.lines?.length}`);
out.lines?.forEach((l, i) => console.log(`  ${i + 1}. (${l.n}) ${l.text}`));
if (out.lines?.length) {
  const last = out.lines[out.lines.length - 1];
  console.log(
    `  last line masks: ${last.n}` + (last.n <= 1 ? "   <-- WIDOW  FAIL" : "   OK"),
  );
  console.log(`  max-width: ${out.maxWidth}`);
}

console.log("\n-- ACCENT --");
console.log(`  face: ${out.size} ${out.family}`);
console.log(
  `  saffron words: ${out.accented.map((a) => a.word).join(", ") || "(none)"}`,
);
if (out.accented[0]) console.log(`  colour: ${out.accented[0].color}`);

/* ---- SCRUB + CLIP: scroll past, then everything must be set and unclipped ---- */
await page.evaluate((PICK) => {
  const h2 = eval(PICK);
  window.scrollTo(
    0,
    h2.getBoundingClientRect().bottom + window.scrollY + window.innerHeight * 0.9,
  );
}, PICK);
await new Promise((r) => setTimeout(r, 1400));

const rest = await page.evaluate((PICK) => {
  const h2 = eval(PICK);
  const leaves = Array.from(h2.querySelectorAll("span")).filter(
    (n) => n.children.length === 0 && (n.textContent || "").trim(),
  );
  const moved = leaves
    .map((n) => ({
      word: n.textContent.trim(),
      y: +new DOMMatrixReadOnly(getComputedStyle(n).transform).m42.toFixed(1),
    }))
    .filter((r) => Math.abs(r.y) > 1);
  const clipped = Array.from(h2.querySelectorAll("span"))
    .filter((n) => n.children.length === 1 && n.children[0].children.length === 0)
    .map((n) => ({
      word: (n.textContent || "").trim(),
      over: n.scrollHeight - n.clientHeight,
    }))
    .filter((r) => r.over > 1);
  return { total: leaves.length, moved, clipped };
}, PICK);

console.log("\n-- SCRUB (after scrolling past) --");
console.log(
  `  words: ${rest.total}   not at rest: ${rest.moved.length}` +
    (rest.moved.length ? "  FAIL" : "  OK"),
);
rest.moved.slice(0, 6).forEach((m) => console.log(`    ${m.word} y=${m.y}`));

console.log("\n-- CLIP (post-scrub mask overflow) --");
console.log(
  rest.clipped.length
    ? rest.clipped.map((c) => `  ${c.word}: +${c.over}px  FAIL`).join("\n")
    : "  none  OK",
);

/* ---- ASSIST: the page must never move on its own ----
   Two self-scrolls used to live around the restaurants chapter: an
   arm-time glide (a forced lenis.scrollTo fired the instant the title hit
   its trigger band — always a defect) and the assembly's landing, which
   parked the grid's top edge at the top of the window once the sequence
   finished. This check told them apart by `data-assembly-step`, present
   only mid-run, and excused drift that fell outside that window.

   Both are gone with the assembly, and nothing is left that is entitled
   to move the page. So there is no window to excuse any more: creep down
   in small steps, STOP, and watch scrollY. Any movement at all while
   nothing is driving the wheel is the page scrolling itself. */
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise((r) => setTimeout(r, 700));
const assist = await page.evaluate(async () => {
  const step = 90;
  let worst = 0;
  let worstAt = 0;
  for (let i = 0; i < 42; i++) {
    window.scrollBy(0, step);
    await new Promise((r) => setTimeout(r, 130));
    const a = window.scrollY;
    // hands off — anything that moves now moved by itself
    await new Promise((r) => setTimeout(r, 340));
    const drift = Math.abs(window.scrollY - a);
    if (drift > worst) {
      worst = drift;
      worstAt = a;
    }
  }
  return { worst: Math.round(worst), worstAt: Math.round(worstAt) };
});
console.log("\n-- ASSIST (self-scroll while hands off) --");
console.log(
  `  worst drift: ${assist.worst}px at y=${assist.worstAt}` +
    (assist.worst > 24 ? "   <-- PAGE MOVED ITSELF  FAIL" : "   OK"),
);

await b.close();
