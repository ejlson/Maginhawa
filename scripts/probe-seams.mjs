/* THE SEAMS NOBODY HAS WALKED — the places two systems meet on /about.
 *
 * Everything here is a boundary rather than a behaviour, which is why none of
 * it is covered by deck-check (geometry), probe-enter (assembly) or
 * probe-copy (the word masks). Each block below is one meeting point:
 *
 *   1. THE BREAKPOINT. The deck mounts at (min-width:1200px) and
 *      (min-height:640px). Both edges are checked from both sides, and the
 *      assertion is MUTUAL EXCLUSIVITY — exactly one of {deck, storyList} in
 *      the DOM at every size, never both, never neither.
 *   2. THE ROUND TRIP. /about -> /restaurants/belly -> back. Lenis is a module
 *      singleton that outlives the route; this exact path has broken scrolling
 *      twice before. Asserts the page still scrolls AND the deck still scrubs.
 *   3. THE KEYBOARD. Tab from the section above through all nine cards and out
 *      the other side, logging activeElement, the resulting seat, and whether
 *      focus ever lands inside an inert panel.
 *   4. THE HANDOFF. Where the deck releases and the Awards sheet arrives —
 *      does the sheet ever cover a deck that is still scrubbing.
 *   5. THE COLD LANDING. A reader who arrives mid-page (hash anchor, or a
 *      browser restoring scroll) lands inside the pin with no approach run.
 *      The deck must be seated, not stranded at its assembly offsets.
 *
 * usage: node scripts/probe-seams.mjs [port]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
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

const settle = async (path = "/about") => {
  await page.goto(`http://localhost:${PORT}${path}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1500);
};

const to = async (y) => {
  await page.evaluate((v) => {
    if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
    else window.scrollTo(0, v);
  }, y);
  await sleep(140);
};

/* ------------------------------------------------------------------ 1 */
console.log("\n=== 1. BREAKPOINT — deck / storyList mutual exclusivity ===");
console.log("   w      h    deck  list  bothOrNeither  hOverflow");
for (const [w, h] of [
  [1199, 900],
  [1200, 900],
  [1201, 900],
  [1200, 639],
  [1200, 640],
  [1200, 641],
  [1440, 900],
  [1440, 1600],
  [1440, 620],
  [1920, 1080],
  [1024, 900],
  [861, 900],
  [860, 900],
  [768, 1024],
  [375, 812],
]) {
  await page.setViewport({ width: w, height: h });
  await settle();
  const r = await page.evaluate(() => ({
    deck: !!document.querySelector('[class*="railPinWrap"]'),
    list: !!document.querySelector('[class*="storyList"]'),
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  const bad = r.deck === r.list;
  console.log(
    `${String(w).padStart(5)} ${String(h).padStart(5)}   ${r.deck ? "Y" : "-"}     ${
      r.list ? "Y" : "-"
    }      ${bad ? "*** BOTH/NEITHER ***" : "ok"}          ${
      r.sw > r.cw ? `*** ${r.sw} > ${r.cw} ***` : "none"
    }`,
  );
}

/* reduced motion, at a size that WOULD show the deck */
await page.setViewport({ width: 1440, height: 900 });
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "reduce" },
]);
await settle();
{
  const r = await page.evaluate(() => ({
    deck: !!document.querySelector('[class*="railPinWrap"]'),
    list: !!document.querySelector('[class*="storyList"]'),
  }));
  console.log(
    `reduced-motion 1440x900   ${r.deck ? "Y" : "-"}     ${r.list ? "Y" : "-"}      ${
      r.deck === r.list ? "*** BOTH/NEITHER ***" : r.deck ? "*** DECK MOUNTED ***" : "ok"
    }`,
  );
}
await page.emulateMediaFeatures([]);

/* ------------------------------------------------------------------ 2 */
console.log("\n=== 2. ROUND TRIP — /about -> /restaurants/belly -> back ===");
await page.setViewport({ width: 1440, height: 900 });
await settle();
const wrapGeom = async () =>
  page.evaluate(() => {
    const w = document.querySelector('[class*="railPinWrap"]');
    if (!w) return null;
    const r = w.getBoundingClientRect();
    return { top: r.top + scrollY, height: r.height };
  });
const trackTf = () =>
  page.evaluate(() => {
    const t = document.querySelector('[class*="railTrack"]');
    return t ? getComputedStyle(t).transform : null;
  });

let g = await wrapGeom();
await to(g.top + (g.height - 900) * 0.5);
const beforeTf = await trackTf();
console.log("before: track transform =", beforeTf);

/* navigate away via a real in-page link so it is a client-side transition */
const nav = await page.evaluate(() => {
  const a = [...document.querySelectorAll('a[href^="/restaurants/"]')][0];
  if (!a) return null;
  a.click();
  return a.getAttribute("href");
});
console.log("clicked:", nav);
await sleep(2600);
console.log("now at:", await page.evaluate(() => location.pathname));
const detailScroll = await page.evaluate(async () => {
  const before = window.scrollY;
  if (window.__lenis) window.__lenis.scrollTo(900, { immediate: true });
  else window.scrollTo(0, 900);
  await new Promise((r) => setTimeout(r, 300));
  return { before, after: window.scrollY };
});
console.log("detail page scroll:", JSON.stringify(detailScroll), detailScroll.after > 100 ? "ok" : "*** DEAD ***");

await page.goBack({ waitUntil: "domcontentloaded" });
await sleep(2600);
console.log("back at:", await page.evaluate(() => location.pathname));
const backScroll = await page.evaluate(async () => {
  if (window.__lenis) window.__lenis.scrollTo(600, { immediate: true });
  else window.scrollTo(0, 600);
  await new Promise((r) => setTimeout(r, 300));
  return window.scrollY;
});
console.log("after back, scrollY:", backScroll, backScroll > 100 ? "ok" : "*** SCROLL DEAD ***");
g = await wrapGeom();
if (!g) console.log("*** deck NOT in DOM after back ***");
else {
  await to(g.top + (g.height - 900) * 0.2);
  const a = await trackTf();
  await to(g.top + (g.height - 900) * 0.75);
  await sleep(500);
  const c = await trackTf();
  console.log("after back, track at p=0.20:", a);
  console.log("after back, track at p=0.75:", c);
  console.log("scrub alive:", a !== c ? "ok" : "*** FROZEN ***");
}

/* ------------------------------------------------------------------ 3 */
console.log("\n=== 3. KEYBOARD — tab through the deck and out ===");
await settle();
g = await wrapGeom();
await to(Math.max(0, g.top - 1400));
/* focus the document from the top, then tab until we reach the first card */
await page.evaluate(() => {
  document.body.setAttribute("tabindex", "-1");
  document.body.focus();
  document.body.removeAttribute("tabindex");
});
const seen = [];
let reachedDeck = false;
let steps = 0;
while (steps < 90) {
  await page.keyboard.press("Tab");
  steps++;
  await sleep(230);
  const s = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const card = el.closest?.('[class*="railCard"]');
    const panel = el.closest?.('[class*="railPanel"]');
    const inInert = !!el.closest?.("[inert]");
    const items = [...document.querySelectorAll('[class*="railItem"]')];
    const cardIdx = card ? items.findIndex((li) => li.contains(card)) : -1;
    const active = document.querySelector('[class*="railPanelActive"]');
    const panels = [...document.querySelectorAll('[class*="railPanel"]')];
    return {
      tag: el.tagName.toLowerCase(),
      label: (el.getAttribute("aria-label") || el.textContent || "")
        .trim()
        .slice(0, 42),
      cardIdx,
      inPanel: !!panel,
      inInert,
      activePanel: panels.indexOf(active),
      y: Math.round(window.scrollY),
    };
  });
  if (!s) break;
  if (s.cardIdx >= 0) reachedDeck = true;
  if (reachedDeck) seen.push(s);
  if (reachedDeck && s.cardIdx < 0 && seen.length > 9) break;
}
for (const s of seen)
  console.log(
    `  card=${String(s.cardIdx).padStart(2)} activePanel=${String(
      s.activePanel,
    ).padStart(2)} inInert=${s.inInert ? "*** YES ***" : "no "} y=${String(
      s.y,
    ).padStart(6)}  ${s.tag} "${s.label}"`,
  );
const order = seen.filter((s) => s.cardIdx >= 0).map((s) => s.cardIdx);
console.log("card order:", JSON.stringify(order));
console.log(
  "in chapter order:",
  JSON.stringify(order) === JSON.stringify([...order].sort((a, z) => a - z))
    ? "ok"
    : "*** OUT OF ORDER ***",
);
console.log(
  "focus ever inert:",
  seen.some((s) => s.inInert) ? "*** YES ***" : "no",
);
console.log(
  "focus drives seat:",
  seen.filter((s) => s.cardIdx >= 0 && s.cardIdx === s.activePanel).length,
  "/",
  order.length,
  "cards matched their panel",
);

/* ------------------------------------------------------------------ 4 */
console.log("\n=== 4. HANDOFF — deck release vs the Awards sheet ===");
await settle();
g = await wrapGeom();
const travel = g.height - 900;
console.log("  pinFrac  pinTop  coverTop  vpH  seat  overlap");
for (const f of [0.8, 0.9, 0.95, 0.99, 1.0, 1.02, 1.06]) {
  await to(g.top + travel * f);
  await sleep(420);
  const r = await page.evaluate(() => {
    const pin = document.querySelector('[class*="railPin"]:not([class*="railPinWrap"])');
    const cov = document.querySelector('[class*="coverage"]');
    const panels = [...document.querySelectorAll('[class*="railPanel"]')];
    const act = document.querySelector('[class*="railPanelActive"]');
    return {
      pinTop: pin ? Math.round(pin.getBoundingClientRect().top) : null,
      pinBot: pin ? Math.round(pin.getBoundingClientRect().bottom) : null,
      covTop: cov ? Math.round(cov.getBoundingClientRect().top) : null,
      vpH: innerHeight,
      seat: panels.indexOf(act),
    };
  });
  const overlap = r.covTop !== null && r.pinTop !== null && r.covTop < r.pinBot && r.covTop < r.vpH;
  console.log(
    `  ${String(f).padStart(6)}  ${String(r.pinTop).padStart(6)}  ${String(
      r.covTop,
    ).padStart(8)}  ${String(r.vpH).padStart(4)}  ${String(r.seat).padStart(3)}  ${
      overlap ? "sheet over pin" : "-"
    }`,
  );
}

/* ------------------------------------------------------------------ 5 */
console.log("\n=== 5. COLD LANDING — arrive mid-pin with no approach ===");
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 })
  .catch(() => {});
/* jump straight in before anything has had a chance to run an approach */
const cold = await page.evaluate(() => {
  const w = document.querySelector('[class*="railPinWrap"]');
  if (!w) return null;
  const top = w.getBoundingClientRect().top + scrollY;
  const y = top + (w.offsetHeight - innerHeight) * 0.45;
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true });
  else window.scrollTo(0, y);
  return y;
});
console.log("teleported to", cold);
await sleep(2200);
const coldState = await page.evaluate(() => {
  const items = [...document.querySelectorAll('[class*="railItem"]')];
  const panels = [...document.querySelectorAll('[class*="railPanel"]')];
  const act = document.querySelector('[class*="railPanelActive"]');
  const track = document.querySelector('[class*="railTrack"]');
  return {
    track: track ? getComputedStyle(track).transform : null,
    itemTfs: items.map((li) => getComputedStyle(li).transform).map((s) => (s === "none" ? "none" : s.slice(0, 60))),
    seat: panels.indexOf(act),
    cardRects: [...document.querySelectorAll('[class*="railCard"]')].map((c) => {
      const r = c.getBoundingClientRect();
      return { w: Math.round(r.width), top: Math.round(r.top) };
    }),
  };
});
console.log("track:", coldState.track);
console.log("seat:", coldState.seat);
console.log("item transforms (should be `none` at rest, non-none only for exiting cards):");
coldState.itemTfs.forEach((s, i) => console.log(`   ${i}: ${s}`));
console.log("card widths:", JSON.stringify(coldState.cardRects.map((r) => r.w)));

await b.close();
