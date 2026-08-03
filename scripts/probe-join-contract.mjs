/* THE CONTRACT PROBE — the five non-hero changes, each stated as something
   that can fail rather than something that can be admired.

   1. the eyebrow and its saffron dot are gone from BOTH heads
   2. the numeral is a split-flap board: it scrambles, then settles on
      JOBS.length, and it is quiet under prefers-reduced-motion
   3. the role rows read as a table, and are still a legal touch target
   4. "Send application" does not change size on hover OR press — only its
      inner shadow deepens
   5. the helper note's measure matches the textarea it explains

   usage: node scripts/probe-join-contract.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3187";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (cond, msg) => {
  if (!cond) fails++;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`);
};

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu", "--use-gl=angle"],
});

const open = async (w, h, reduce = false) => {
  const page = await b.newPage();
  await page.setViewport({ width: w, height: h });
  if (reduce)
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
  await page.goto(`http://localhost:${PORT}/careers`, {
    waitUntil: "networkidle0",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  return page;
};

// ---------------------------------------------------------------- 1. eyebrow
{
  console.log("\n=== 1. eyebrow + saffron dot removed ===");
  const page = await open(1440, 900);
  const r = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('[class*="rolesHead"], [class*="formRail"]')];
    // the dot was a ::before on the eyebrow recipe — look for BOTH the class
    // and any surviving saffron pseudo-element in the two heads
    const dots = heads.flatMap((h) =>
      [...h.querySelectorAll("*")].filter((el) => {
        const s = getComputedStyle(el, "::before");
        return (
          s.content !== "none" &&
          s.borderRadius.startsWith("50%") &&
          parseFloat(s.width) > 0 &&
          parseFloat(s.width) < 12
        );
      }),
    );
    return {
      eyebrows: document.querySelectorAll('[class*="eyebrow"]').length,
      dots: dots.length,
      texts: heads.map((h) => h.innerText.replace(/\s+/g, " ").trim()),
    };
  });
  ok(r.eyebrows === 0, `no .eyebrow element on the page (found ${r.eyebrows})`);
  ok(r.dots === 0, `no small round ::before dot in either head (found ${r.dots})`);
  ok(
    !/OPEN ROLES/i.test(r.texts.join(" ")) && !/^APPLY\b/im.test(r.texts.join("\n")),
    `neither head still reads "Open Roles" / "Apply"`,
  );
  console.log(`     heads: ${r.texts.map((t) => `"${t.slice(0, 46)}…"`).join("  |  ")}`);
  await page.close();
}

// ---------------------------------------------------------------- 2. counter
{
  console.log("\n=== 2. the split-flap numeral ===");
  const page = await open(1440, 900);
  await page.evaluate(() =>
    document.querySelector('[class*="count"]').scrollIntoView({ block: "center" }),
  );
  // sample the board while it should be scrambling
  const frames = [];
  for (let i = 0; i < 26; i++) {
    frames.push(
      await page.evaluate(
        () => document.querySelector('[class*="count"]')?.textContent ?? "",
      ),
    );
    await sleep(45);
  }
  await sleep(1600);
  const r = await page.evaluate(() => ({
    board: document.querySelector('[class*="count"]').textContent,
    sr: document.querySelector('[class*="count"]').getAttribute("aria-label"),
    hidden: document.querySelector('[class*="count"]').getAttribute("role") === "img",
    heading: document.querySelector('[class*="sectionTitle"]').innerText.replace(/\s+/g, " "),
    // the cell must not reflow the words beside it
    cellW: getComputedStyle(document.querySelector('[class*="flip"]')).width,
    // is the flap actually a 3D hinge?
    persp: getComputedStyle(document.querySelector('[class*="flip"]')).perspective,
    origin: getComputedStyle(document.querySelector('[class*="flipInner"]')).transformOrigin,
  }));
  const distinct = new Set(frames.filter(Boolean)).size;
  ok(distinct >= 4, `the board scrambled while arriving (${distinct} distinct faces sampled)`);
  ok(r.board === r.sr, `board settled on the real count (board "${r.board}", label "${r.sr}")`);
  ok(r.hidden, "the board is named as a whole (role=img + aria-label)");
  ok(/^6 positions across the group\.$/.test(r.heading.trim()), `heading reads "${r.heading.trim()}"`);
  ok(r.persp !== "none", `the cell carries its own camera (perspective ${r.persp})`);
  ok(r.origin.includes("100%") || /\d+px 1?\d*\.?\d*px/.test(r.origin), `flap hinges at its bottom edge (${r.origin})`);
  console.log(`     cell width ${r.cellW}`);
  await page.close();

  const rm = await open(1440, 900, true);
  await rm.evaluate(() =>
    document.querySelector('[class*="count"]').scrollIntoView({ block: "center" }),
  );
  const quiet = [];
  for (let i = 0; i < 14; i++) {
    quiet.push(
      await rm.evaluate(
        () => document.querySelector('[class*="count"]')?.textContent ?? "",
      ),
    );
    await sleep(50);
  }
  ok(
    new Set(quiet).size === 1 && quiet[0] === "6",
    `reduced motion: the numeral never scrambles (saw ${[...new Set(quiet)].join("/")})`,
  );
  await rm.close();
}

// ------------------------------------------------------------- 3. row rhythm
{
  console.log("\n=== 3. the role index rhythm ===");
  for (const [w, h, minTarget] of [
    [1440, 900, 44],
    [390, 844, 44],
  ]) {
    const page = await open(w, h);
    const r = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('[class*="roleRow"]')];
      const hs = rows.map((x) => x.getBoundingClientRect().height);
      const pad = parseFloat(getComputedStyle(rows[0]).paddingTop);
      const list = document.querySelector('[class*="roleList"]');
      return {
        hs: hs.map((x) => +x.toFixed(1)),
        pad,
        listH: list.getBoundingClientRect().height,
        rule: getComputedStyle(document.querySelector('[class*="roleItem"]')).borderBottomWidth,
      };
    });
    const min = Math.min(...r.hs);
    const max = Math.max(...r.hs);
    console.log(
      `  ${w}x${h}: rows ${min.toFixed(0)}–${max.toFixed(0)}px (pad ${r.pad}px)  list ${r.listH.toFixed(0)}px  rule ${r.rule}`,
    );
    ok(min >= minTarget, `every row clears the ${minTarget}px touch minimum (smallest ${min.toFixed(0)}px)`);
    if (w > 1000)
      ok(max <= 70, `a desktop row is table-tight, not a block (tallest ${max.toFixed(0)}px)`);
    ok(parseFloat(r.rule) > 0, "the row rule is still drawn");
    await page.close();
  }
}

// ------------------------------------------------------------- 4. submit CTA
{
  console.log("\n=== 4. Send application never changes size ===");
  const page = await open(1440, 900);
  const read = async () =>
    page.evaluate(() => {
      const el = document.querySelector('[class*="submitCta"]');
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        w: +r.width.toFixed(2),
        h: +r.height.toFixed(2),
        pad: s.padding,
        shadow: s.boxShadow,
        transform: s.transform,
      };
    });
  await page.evaluate(() =>
    document.querySelector('[class*="submitCta"]').scrollIntoView({ block: "center" }),
  );
  await sleep(700);
  const rest = await read();
  const box = await page.evaluate(() => {
    const r = document.querySelector('[class*="submitCta"]').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.move(box.x, box.y);
  await sleep(600);
  const hover = await read();
  await page.mouse.down();
  await sleep(220);
  const press = await read();
  await page.mouse.up();

  ok(rest.w === hover.w && rest.h === hover.h, `size identical rest→hover (${rest.w}x${rest.h} → ${hover.w}x${hover.h})`);
  ok(rest.w === press.w && rest.h === press.h, `size identical rest→press (${press.w}x${press.h})`);
  ok(rest.pad === hover.pad && rest.pad === press.pad, `padding never moves (${rest.pad})`);
  ok(
    [rest, hover, press].every((s) => s.transform === "none" || s.transform === "matrix(1, 0, 0, 1, 0, 0)"),
    "no scale/translate on the pill in any state",
  );
  ok(rest.shadow !== hover.shadow, "hover DEEPENS the recess");
  ok(hover.shadow !== press.shadow, "press deepens it further still");
  console.log(`     rest   ${rest.shadow}`);
  console.log(`     hover  ${hover.shadow}`);
  console.log(`     press  ${press.shadow}`);
  await page.close();
}

// ------------------------------------------------------------ 5. note measure
{
  console.log("\n=== 5. helper note matches the textarea ===");
  for (const [w, h] of [
    [1440, 900],
    [1920, 1080],
    [390, 844],
  ]) {
    const page = await open(w, h);
    const r = await page.evaluate(() => {
      const ta = document.querySelector('[class*="field"] textarea').getBoundingClientRect();
      const note = document.querySelector('[class*="note"]');
      const nb = note.getBoundingClientRect();
      // the RENDERED text run, not the box: a box can be wide and the copy
      // still wrap short if a max-width caps the measure
      const range = document.createRange();
      range.selectNodeContents(note);
      const runs = [...range.getClientRects()];
      return {
        ta: { l: ta.left, r: ta.right },
        note: { l: nb.left, r: nb.right },
        maxw: getComputedStyle(note).maxWidth,
        widest: Math.max(...runs.map((x) => x.width)),
        lines: runs.length,
      };
    });
    const dl = Math.abs(r.ta.l - r.note.l);
    const dr = Math.abs(r.ta.r - r.note.r);
    console.log(
      `  ${w}x${h}: textarea ${r.ta.l.toFixed(0)}–${r.ta.r.toFixed(0)}   note ${r.note.l.toFixed(0)}–${r.note.r.toFixed(0)}   max-width ${r.maxw}   widest run ${r.widest.toFixed(0)}px over ${r.lines} line(s)`,
    );
    ok(dl < 2 && dr < 2, `the note's box shares the textarea's measure (Δleft ${dl.toFixed(1)}, Δright ${dr.toFixed(1)})`);
    ok(
      r.widest > (r.ta.r - r.ta.l) * 0.72,
      `and the copy actually uses it (widest run is ${((r.widest / (r.ta.r - r.ta.l)) * 100).toFixed(0)}% of the field)`,
    );
    await page.close();
  }
}

console.log(`\n${fails === 0 ? "ALL PASS" : `${fails} FAILURE(S)`}\n`);
const shutdown = async () => {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    proc?.kill("SIGKILL");
  } catch {}
  process.exit(fails === 0 ? 0 : 1);
};
await shutdown();
