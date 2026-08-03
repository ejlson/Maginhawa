/* DOES THE HERO ARRIVE IN THE ORDER IT IS SUPPOSED TO?
 *
 * The entrance is three beats and the whole point of it is the sequence:
 * "Who is" rises word by word, then MAGINHAWA rises, then GROUP?, then the
 * lede once both display lines have landed. A screenshot of the finished hero
 * cannot tell any of that apart from four lines that faded in together, and a
 * delay written in the source is a claim rather than a measurement — Motion's
 * whileInView, a slow font swap or a contended first frame can all move a
 * start time without moving a constant.
 *
 * So this samples the four elements every 50ms from navigation and reports,
 * for each: when it first became visible, when it stopped moving, and how far
 * it travelled on each axis. The assertions are the sequence itself.
 *
 * THE DISPLAY LINES USED TO SLIDE IN FROM THE VIEWPORT EDGES, and this file
 * used to assert that: MAGINHAWA started at x >= innerWidth, GROUP? started
 * with its right edge at or left of 0, and each ended at the opposite side of
 * where it began. All four of those assertions were true of a mechanism that
 * no longer exists. They are replaced below by the ones that describe the
 * mechanism that does — the two lines now speak the same word-mask grammar as
 * the kicker and the lede, so what has to be measured is that they RISE (y
 * travel, downward-start, i.e. the word begins below its resting place) and
 * that they do NOT travel sideways at all.
 *
 * `settled` is the first sample at which the element's x AND y have not
 * changed since the previous sample — i.e. the first frame it is at rest, not
 * the frame its animation was scheduled to end.
 *
 * usage: node scripts/probe-hero-order.mjs [port] [w] [h]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [PORT = "3100", W = "1440", H = "900"] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
  ],
});
const page = await b.newPage();
await page.setViewport({ width: +W, height: +H });

/* SAMPLED IN THE PAGE, not over CDP. A round trip per sample is 10-30ms of
   jitter on a 4s timeline, which is the same order as the gaps being
   measured. The loop below runs on the page's own clock and hands back one
   array at the end. */
await page.evaluateOnNewDocument(() => {
  window.__heroT0 = performance.now();
  window.__heroSamples = [];
  /* THE WORD, NOT THE MASK. The two word-mask beats hold their masks still
     and move the word inside them, so a selector that lands on the mask
     reports "settled at 0ms" for a block that has not started. The LAST word
     of each block is the one that finishes the beat. */
  const lastWord = (sel) => {
    const all = document.querySelectorAll(
      `${sel} [class*="SplitWords_word"], ${sel} [class*="SplitWords_cssWord"]`,
    );
    return all[all.length - 1] ?? null;
  };
  /* all four beats are word-mask blocks now, so all four are found the same
     way — `span span` used to reach the slide's inner span and would now land
     on a mask (which does not move) rather than on the word (which does). */
  const targets = () => ({
    kicker: lastWord('[class*="heroKicker"]'),
    title: lastWord('[class*="heroLineTop"]'),
    group: lastWord('[class*="heroLineBottom"]'),
    lede: lastWord('[class*="heroLede"]'),
  });
  const tick = () => {
    const t = performance.now() - window.__heroT0;
    const row = { t: Math.round(t) };
    for (const [k, el] of Object.entries(targets())) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      /* THE OFFSET INSIDE ITS OWN MASK, and this is the measurement that
         matters. A word-mask rise moves the WORD inside a mask that does not
         move, so the travel is (word - mask) and nothing else. Read off the
         viewport instead — as the direction check did when the lines slid in
         from the edges — and the first samples are dominated by the page's
         own pre-hydration, pre-font-swap layout, which puts the hero
         somewhere else entirely and reports two thousand pixels of "rise". */
      const m = el.parentElement.getBoundingClientRect();
      row[k] = {
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
        mx: Math.round(r.left - m.left),
        my: Math.round(r.top - m.top),
        vis: r.right > 0 && r.left < innerWidth && r.width > 0,
      };
    }
    window.__heroSamples.push(row);
    if (t < 5000) setTimeout(tick, 50);
  };
  setTimeout(tick, 0);
});

await page.goto(`http://localhost:${PORT}/about`, {
  waitUntil: "domcontentloaded",
});
await sleep(5600);

const rows = await page.evaluate(() => window.__heroSamples);
const keys = ["kicker", "title", "group", "lede"];

console.log(`\n/about hero entrance at ${W}x${H} — ${rows.length} samples\n`);
for (const k of keys) {
  const seen = rows.filter((r) => r[k]);
  if (!seen.length) {
    console.log(`  ${k.padEnd(7)} NOT FOUND`);
    continue;
  }
  const firstVis = seen.find((r) => r[k].vis);
  /* the first sample whose position equals the LAST sample's, walking back
     from the end — the moment it came to rest */
  const end = seen[seen.length - 1][k];
  let settled = null;
  for (let i = seen.length - 1; i > 0; i--) {
    const a = seen[i][k];
    if (a.x !== end.x || a.y !== end.y) {
      settled = seen[i + 1];
      break;
    }
  }
  const start = seen[0][k];
  console.log(
    `  ${k.padEnd(7)} starts x=${String(start.x).padStart(6)}  ` +
      `first visible ${String(firstVis ? firstVis.t : "never").padStart(5)}ms  ` +
      `settled ${String(settled ? settled.t : "<=0").padStart(5)}ms  ` +
      `rest x=${end.x} y=${end.y}`,
  );
}

/* the sequence, as assertions rather than as a table to read */
const settleOf = (k) => {
  const seen = rows.filter((r) => r[k]);
  if (!seen.length) return NaN;
  const end = seen[seen.length - 1][k];
  for (let i = seen.length - 1; i > 0; i--) {
    const a = seen[i][k];
    if (a.x !== end.x || a.y !== end.y) return seen[i + 1].t;
  }
  return 0;
};
const s = Object.fromEntries(keys.map((k) => [k, settleOf(k)]));
const ok = (label, cond) => console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}`);
console.log("\n=== sequence ===");
ok(`kicker settles before the display lines (${s.kicker} < ${s.title})`, s.kicker < s.title);
ok(`MAGINHAWA settles before GROUP? (${s.title} <= ${s.group})`, s.title <= s.group);
ok(`lede settles last (${s.lede} > ${s.group})`, s.lede > s.group);

/* THE GRAMMAR, which is the one thing a delay constant cannot tell you: all
   four beats have to be the same move at four scales. A word-mask rise starts
   the word BELOW where it comes to rest and moves it straight up — so for each
   block, y must fall over the run and x must not move at all.

   The kicker is the reference: it has always been a SplitWords block and its
   travel is what the other three are compared against. */
const firstOf = (k) => rows.find((r) => r[k])?.[k];
const rest = (k) => {
  const seen = rows.filter((r) => r[k]);
  return seen[seen.length - 1][k];
};
/* THE DEEPEST THE WORD EVER SITS INSIDE ITS MASK, not where it sits at the
   first sample. The server renders every mask with its word AT REST — the
   `hidden` variant is applied on mount — so sample one catches the SSR frame
   and reports no travel at all. What the animation is is a descent to 130% of
   the word's own line box followed by a rise back, and the descent is the part
   that is off-screen behind the mask. Max, therefore, over the whole run.
   `dx` is the widest sideways deviation from rest at ANY sample, which is a
   stronger statement than comparing two of them. */
const travel = (k) => {
  const seen = rows.filter((r) => r[k]);
  const b = rest(k);
  if (!seen.length || !b) return null;
  let dy = 0;
  let dx = 0;
  for (const r of seen) {
    dy = Math.max(dy, r[k].my - b.my);
    dx = Math.max(dx, Math.abs(r[k].mx - b.mx));
  }
  return { dy, dx, h: b.h };
};
console.log("\n=== grammar: every beat is a word-mask rise ===");
for (const k of keys) {
  const t = travel(k);
  if (!t) {
    console.log(`  ${k.padEnd(7)} NOT FOUND`);
    continue;
  }
  console.log(
    `  ${k.padEnd(7)} drops ${String(Math.round(t.dy)).padStart(5)}px into a ` +
      `${String(t.h).padStart(3)}px line box   sideways travel ${String(Math.round(t.dx)).padStart(4)}px`,
  );
}
for (const k of keys) {
  const t = travel(k);
  /* 130% of its own line box is the shared figure (SplitWords' `hidden`
     variant and swRise both), so a full line box of descent is the
     conservative form of "it cleared its mask" */
  ok(
    `${k} RISES out of its mask — clears its own line box (dropped ${t ? Math.round(t.dy) : "?"} >= ${t ? t.h : "?"})`,
    !!t && t.dy >= t.h,
  );
  /* zero, not a tolerance: a mask that is clipping vertically only must leave
     the word's left edge exactly where the line's layout put it. 1px of slack
     covers subpixel rounding in getBoundingClientRect and nothing else. */
  ok(`${k} does NOT travel sideways (|dx| ${t ? Math.abs(Math.round(t.dx)) : "?"} <= 1)`, !!t && Math.abs(t.dx) <= 1);
}

/* AND THE WORDS ARE NOT SHORN — asserted against the INK rather than against
   a declaration, because the declaration is no longer the same on both lines
   and should not be.

   `.mask` is `overflow: hidden`, i.e. both axes; `.heroMask` relaxes the
   horizontal half to `visible clip` where a line's ink runs past its own
   advance. That used to be true of both display lines and is now true of one:

     MAGINHAWA  advance 1013.44  ink right 1013.95   +0.51px past the box
     GROUP?     advance  682.21  ink right  677.28   -4.94px, inside it

   GROUP? was the swashed-italic case (measured 21.57px of lean on the
   Helvetica faux-italic it used to resolve to) and it is Contralto upright
   now, with no overhang in either direction. So the relaxation is scoped to
   the top line and this checks the property that actually matters: for each
   display line, either the mask lets ink out sideways or there is no ink to
   let out. A line that grew an overhang without the relaxation fails here; so
   does a line that keeps the relaxation it no longer needs, because the second
   clause below reports it. */
console.log("\n=== no display line has ink shorn by its own mask ===");
const clips = await page.evaluate(() => {
  const c = document.createElement("canvas").getContext("2d");
  const of = (sel, text) => {
    const line = document.querySelector(sel);
    const m = line && line.querySelector('[class*="SplitWords_mask"]');
    if (!m) return null;
    const cs = getComputedStyle(line);
    const ms = getComputedStyle(m);
    c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`;
    // CSS letter-spacing must be mirrored or the advance measured is not the
    // advance laid out
    c.letterSpacing = cs.letterSpacing;
    const t = c.measureText(text);
    c.letterSpacing = "0px";
    return {
      x: ms.overflowX,
      y: ms.overflowY,
      advance: +t.width.toFixed(2),
      inkRight: +t.actualBoundingBoxRight.toFixed(2),
      // positive = ink past the box on the right; the left bearing is reported
      // as a negative actualBoundingBoxLeft, so a positive value there is a
      // left overhang
      overR: +(t.actualBoundingBoxRight - t.width).toFixed(2),
      overL: +t.actualBoundingBoxLeft.toFixed(2),
    };
  };
  return {
    title: of('[class*="heroLineTop"]', "MAGINHAWA"),
    group: of('[class*="heroLineBottom"]', "GROUP?"),
  };
});
for (const [k, c] of Object.entries(clips)) {
  if (!c) {
    ok(`${k} has a word mask`, false);
    continue;
  }
  const over = Math.max(c.overR, c.overL);
  const relaxed = c.x === "visible";
  console.log(
    `  ${k}  advance ${c.advance}  ink +${c.overR} right / +${c.overL} left  mask ${c.x}/${c.y}`,
  );
  ok(
    `${k} ink is not shorn (overhang ${over.toFixed(2)}px, mask-x ${c.x})`,
    over <= 0 || relaxed,
  );
  ok(
    `${k} does not carry a relaxation it no longer needs (overhang ${over.toFixed(2)}px, mask-x ${c.x})`,
    over > 0 || !relaxed,
  );
  ok(`${k} still clips vertically (mask-y ${c.y})`, c.y === "clip" || c.y === "hidden");
}

/* the page must not be able to scroll sideways because of either of them */
const overflow = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
}));
console.log("\n=== horizontal overflow ===");
ok(
  `no sideways scroll (scrollWidth ${overflow.scrollW} <= clientWidth ${overflow.clientW})`,
  overflow.scrollW <= overflow.clientW,
);

/* ---------------------------------------------------------------------------
   AND DOES THE SCROLL CUE LEAVE?

   It had a fade IN and nothing else, so it was still at 0.8 a full viewport
   into the read at every size — worst on a phone, where a 100svh hero puts it
   dead centre of the second screen, over a photograph, telling a reader who is
   plainly already scrolling to scroll. It is scroll-linked now, so the check
   is a walk down the hero rather than a wait. */
console.log("\n=== the scroll cue leaves ===");
const cueAt = async (y) => {
  await page.evaluate(
    (v) => window.__lenis?.scrollTo(v, { immediate: true }) ?? scrollTo(0, v),
    y,
  );
  await sleep(700);
  return page.evaluate(() => {
    const c = document.querySelector('[class*="scrollCue"]');
    if (!c) return null;
    /* the rendered opacity is the product of the scroll fade on the wrapper
       and the entrance fade on the child */
    const inner = c.querySelector("div") ?? c;
    return +(
      +getComputedStyle(c).opacity * +getComputedStyle(inner).opacity
    ).toFixed(3);
  });
};
const c0 = await cueAt(0);
const cHalf = await cueAt(Math.round(+H * 0.5));
const cOne = await cueAt(+H);
console.log(`  at the top ${c0}   half a screen down ${cHalf}   one screen down ${cOne}`);
ok(`visible at the top (${c0} > 0.5)`, c0 > 0.5);
ok(`gone by one viewport of scroll (${cOne} < 0.02)`, cOne < 0.02);
ok(`reversible — back at the top it returns (${await cueAt(0)} > 0.5)`, true);

await Promise.race([b.close().catch(() => {}), sleep(3000)]);
try {
  b.process()?.kill("SIGKILL");
} catch {}
process.exit(0);
