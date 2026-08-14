/* The two editorial "indent on hover" rows — the careers role row and the
   restaurant press row — measured in a real browser.

   Three questions, and the second is the one the change is for:

     · GEOMETRY. Where does every cell sit at rest, and where once the hover
       has settled? The indent moved off the layout path, and both frames
       have to land on the pixels they always did. Every viewport in the
       sweep is measured, because both rows re-flow at a breakpoint and the
       per-cell displacement is derived from the track list.

     · LAYOUT COST. `LayoutCount` off CDP across the transition window,
       against a control window of the same length with nothing hovered.
       Animating `padding` re-lays-out the row on every frame; a transform
       does not. The control matters because the page is never fully still —
       Lenis and the reveal observers lay out on their own — so the raw
       count means nothing without a baseline to subtract.

     · INTERPOLATION. A custom property is not itself animatable, and the
       indent is plumbed through one. What animates is `translate`, whose
       computed value the property feeds; this samples mid-transition to
       prove it eases across rather than snapping to the end.

   The keyboard path is measured too: `.roleRow` carries the same indent on
   `:focus-visible`, and Chrome only matches that pseudo-class when the last
   input was a key, so the probe presses Tab before it focuses.

   Usage: node scripts/probe-indent-hover.mjs [port]   (default 3210) */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3210";
const s = (ms) => new Promise((r) => setTimeout(r, ms));
const px = (n) => Math.round(n * 100) / 100;
const pad = (n, w) => String(px(n)).padStart(w);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();

/* Headless reports `hover: none`; puppeteer's own emulateMediaFeatures
   rejects the `hover` feature by name, so this goes straight to CDP. */
const cdp = await page.createCDPSession();
await cdp.send("Emulation.setEmulatedMedia", {
  media: "screen",
  features: [
    { name: "hover", value: "hover" },
    { name: "pointer", value: "fine" },
  ],
});
await cdp.send("Performance.enable");
const layoutCount = async () => {
  const { metrics } = await cdp.send("Performance.getMetrics");
  return metrics.find((m) => m.name === "LayoutCount").value;
};

const open = async (path) => {
  await page.goto(`http://localhost:${PORT}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 20000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await s(1800);
};

/* Park the row mid-screen and wait for the scroll to stop moving. Lenis
   eases every scroll, so a rect read straight after the jump is a rect of a
   row still in flight. */
const settleOn = async (sel) => {
  await page.evaluate((q) => {
    const el = document.querySelector(q);
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 380);
  }, sel);
  let last = -1;
  for (let i = 0; i < 40; i++) {
    await s(100);
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y === last) break;
    last = y;
  }
  await s(600);
};

/* Every cell's left and right edge, plus the row's own border box — that box
   is the tint, so it is what proves the background still spans the full row
   rather than travelling with the text. */
const frame = (sel) =>
  page.evaluate((q) => {
    const row = document.querySelector(q);
    const r = row.getBoundingClientRect();
    const cs = getComputedStyle(row);
    return {
      row: { left: r.left, right: r.right, width: r.width },
      padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
      background: cs.backgroundColor,
      transition: cs.transitionProperty,
      cells: [...row.children].map((c) => {
        const b = c.getBoundingClientRect();
        return {
          cls: (c.className.match(/_([A-Za-z]+)__/) || [, c.className])[1],
          left: b.left,
          right: b.right,
        };
      }),
    };
  }, sel);

const centreOf = (sel) =>
  page.evaluate((q) => {
    const r = document.querySelector(q).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);

const report = (label, f) => {
  console.log(`  ${label}`);
  console.log(`    row      ${px(f.row.left)} → ${px(f.row.right)}  (${px(f.row.width)}w)`);
  console.log(`    padding  ${f.padding}   bg ${f.background}`);
  console.log(`    trans    ${f.transition}`);
  for (const c of f.cells) console.log(`    · ${c.cls.padEnd(14)} ${pad(c.left, 8)} → ${pad(c.right, 8)}`);
};

const diff = (a, b) => {
  console.log(
    `    row edges      Δleft ${pad(b.row.left - a.row.left, 8)}  Δright ${pad(b.row.right - a.row.right, 8)}  Δwidth ${pad(b.row.width - a.row.width, 8)}`
  );
  a.cells.forEach((c, i) => {
    const d = b.cells[i];
    console.log(
      `    · ${c.cls.padEnd(14)} Δleft ${pad(d.left - c.left, 8)}  Δright ${pad(d.right - c.right, 8)}`
    );
  });
};

/* Layouts across one transition, minus layouts across an idle window of the
   same length. */
const layoutCost = async (sel, settle) => {
  await page.mouse.move(5, 5);
  await s(400);
  const c0 = await layoutCount();
  await s(settle);
  const control = (await layoutCount()) - c0;

  const box = await centreOf(sel);
  const h0 = await layoutCount();
  await page.mouse.move(box.x, box.y);
  await s(settle);
  const hovered = (await layoutCount()) - h0;
  return { control, hovered, attributable: hovered - control };
};

/* Is the leading cell part-way between its two resting places a third of the
   way through the transition, or already parked at the end? */
const midFlight = async (sel, at) => {
  await page.mouse.move(5, 5);
  await s(500);
  const rest = (await frame(sel)).cells[0].left;
  const box = await centreOf(sel);
  await page.mouse.move(box.x, box.y);
  await s(at);
  const mid = (await frame(sel)).cells[0].left;
  await s(700);
  const end = (await frame(sel)).cells[0].left;
  await page.mouse.move(5, 5);
  await s(500);
  return {
    rest: px(rest),
    mid: px(mid),
    end: px(end),
    interpolating: mid > rest + 0.5 && mid < end - 0.5,
  };
};

console.log(`\n=== indent-on-hover, off the layout path — localhost:${PORT} ===`);

const CASES = [
  {
    path: "/careers",
    sel: '[class*="roleRow"]',
    label: ".roleRow  (/careers)",
    settle: 520,
    keyboard: true,
    /* 860 is the row's own breakpoint; 800 lands under it, on the stacked
       track list, where the coefficients differ */
    viewports: [1440, 1100, 900, 800],
  },
  {
    path: "/restaurants/belly",
    sel: '[class*="pressItem"]',
    label: ".pressItem  (/restaurants/belly)",
    settle: 420,
    keyboard: false,
    viewports: [1440, 1100, 800, 700], // 720 is this row's breakpoint
  },
];

for (const c of CASES) {
  for (const width of c.viewports) {
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await open(c.path);
    await page.waitForSelector(c.sel, { timeout: 20000 });
    await settleOn(c.sel);

    console.log(`\n--- ${c.label}  @ ${width}px ---`);
    await page.mouse.move(5, 5);
    await s(500);
    const rest = await frame(c.sel);
    report("rest", rest);

    const box = await centreOf(c.sel);
    await page.mouse.move(box.x, box.y);
    await s(800);
    const hover = await frame(c.sel);
    report("hover (settled)", hover);
    console.log("  rest → hover");
    diff(rest, hover);

    if (c.keyboard) {
      /* A bare .focus() from script does not match :focus-visible unless the
         most recent input was a key, so Tab first, then focus, then assert
         the pseudo-class actually took before trusting the numbers. */
      await page.mouse.move(5, 5);
      await s(500);
      await page.keyboard.press("Tab");
      const fv = await page.evaluate((q) => {
        const el = document.querySelector(q);
        el.focus();
        return el.matches(":focus-visible");
      }, c.sel);
      await s(800);
      const focus = await frame(c.sel);
      console.log(`  focus-visible matched: ${fv}`);
      console.log("  rest → focus-visible");
      diff(rest, focus);
      const sameAsHover = focus.cells.every(
        (f, i) => Math.abs(f.left - hover.cells[i].left) < 0.02
      );
      console.log(`  focus frame identical to hover frame: ${sameAsHover}`);
      await page.evaluate((q) => document.querySelector(q).blur(), c.sel);
      await s(400);
    }

    if (width === 1440) {
      console.log(`  layouts across the transition: ${JSON.stringify(await layoutCost(c.sel, c.settle))}`);
      console.log(`  mid-flight: ${JSON.stringify(await midFlight(c.sel, Math.round(c.settle * 0.35)))}`);
    }
  }
}

console.log("");
await browser.close();
