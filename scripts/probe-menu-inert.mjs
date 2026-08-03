/* THE CLOSED OFF-CANVAS MENU, MEASURED FROM THE TAB KEY.
 *
 * The panel is parked off the right edge by a transform (x=118%), which hides
 * it visually and does NOTHING to the tab order. Its six links stayed
 * reachable on every route, so a sighted keyboard user lost the focus ring
 * past the viewport edge for six presses, and a screen reader user tabbed into
 * six links that `aria-hidden` announced as nothing — focusable AND hidden,
 * the worst pairing of the two.
 *
 * So this reads the geometry AND the tab order together: any stop whose box
 * sits beyond the viewport width is the bug, regardless of what the a11y
 * attributes claim. It then OPENS the menu and tabs again, because the fix is
 * only correct if it is reversible — `inert` that never lifts is a menu no
 * keyboard can use.
 *
 * usage: node scripts/probe-menu-inert.mjs [port] [route] [w] [h]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [PORT = "3191", ROUTE = "/contact", W = "1440", H = "900"] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu"],
});
const page = await b.newPage();
await page.setViewport({ width: +W, height: +H });
await page.goto(`http://localhost:${PORT}${ROUTE}`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
await page.evaluate(() => document.fonts.ready);
await sleep(1800);

const panelState = () =>
  page.evaluate(() => {
    const p = document.querySelector('aside[class*="Menu_panel"]');
    if (!p) return null;
    const cs = getComputedStyle(p);
    const links = [...p.querySelectorAll("a")];
    return {
      transform: cs.transform,
      pointerEvents: cs.pointerEvents,
      inert: p.inert,
      hasInertAttr: p.hasAttribute("inert"),
      ariaHidden: p.getAttribute("aria-hidden"),
      x: Math.round(p.getBoundingClientRect().x),
      links: links.length,
      tabindexed: links.filter((a) => a.hasAttribute("tabindex")).length,
    };
  });

// focus <body> so the sweep starts from the very top of the document
const resetFocus = () =>
  page.evaluate(() => {
    document.body.setAttribute("tabindex", "-1");
    document.body.focus();
    document.body.removeAttribute("tabindex");
  });

async function sweep(steps) {
  const stops = [];
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press("Tab");
    const s = await page.evaluate((vw) => {
      const el = document.activeElement;
      if (!el || el === document.body) return { tag: "body", label: "", offscreen: false, inMenu: false, x: 0 };
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        label: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32),
        x: Math.round(r.x),
        offscreen: r.x >= vw || r.right <= 0,
        inMenu: !!el.closest('aside[class*="Menu_panel"]'),
      };
    }, +W);
    stops.push(s);
  }
  return stops;
}

const show = (stops) =>
  stops.forEach((s, i) => {
    const flag = s.inMenu ? (s.offscreen ? "*** OFF-SCREEN MENU LINK ***" : "menu link (visible)") : s.offscreen ? "*** OFF-SCREEN ***" : "";
    console.log(`  ${String(i + 1).padStart(3)}  ${(s.tag + ' "' + s.label + '"').padEnd(42)} x=${String(s.x).padStart(5)}  ${flag}`);
  });

console.log(`\n=== ${ROUTE} @ ${W}x${H} — MENU CLOSED ===`);
console.log(" ", JSON.stringify(await panelState()));
console.log("\n  tab sweep from top of document:");
await resetFocus();
const closed = await sweep(14);
show(closed);

const bad = closed.filter((s) => s.inMenu || s.offscreen);
console.log(`\n  off-screen / menu stops while closed: ${bad.length}  ${bad.length === 0 ? "PASS" : "*** FAIL ***"}`);

// --- now open it: inert must lift, or the fix has traded one bug for a worse one
console.log(`\n=== ${ROUTE} — MENU OPENED (burger click) ===`);
// the sweep above tabbed into the form and scrolled the nav off-screen; go
// back to the top (through Lenis, which owns scroll here) or the burger has
// no clickable point
await page.evaluate(() => {
  if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
});
await sleep(900);

// the burger is mobile-only (display:none above 820px), so above that width
// there is no way to open the panel at all — which is exactly why its six
// links sitting in the desktop tab order was dead weight. Run this half at a
// narrow viewport.
const burgerShown = await page.evaluate(
  () => getComputedStyle(document.querySelector('button[class*="Nav_burger"]')).display !== "none",
);
if (!burgerShown) {
  console.log(`  burger is display:none at ${W}px (mobile-only, <=820px) — menu cannot be opened here.`);
  console.log("  re-run at a narrow width to exercise the open path, e.g.:");
  console.log(`    node scripts/probe-menu-inert.mjs ${PORT} ${ROUTE} 390 844`);
  await b.close();
  process.exit(0);
}
await page.click('button[aria-label="Open menu"]');
await sleep(1000); // the panel eases in over 0.55s
console.log(" ", JSON.stringify(await panelState()));

const afterOpen = await page.evaluate(() => {
  const el = document.activeElement;
  return { tag: el?.tagName.toLowerCase(), label: (el?.getAttribute("aria-label") || "").slice(0, 32) };
});
console.log(`  focus after opening: ${afterOpen.tag} "${afterOpen.label}"`);

console.log("\n  tab sweep from the burger:");
const opened = await sweep(9);
show(opened);

const reachable = opened.filter((s) => s.inMenu).length;
console.log(`\n  menu links reachable while open: ${reachable}/6  ${reachable === 6 ? "PASS" : "*** FAIL ***"}`);

// --- and Escape must put it back
await page.keyboard.press("Escape");
await sleep(1000);
const reclosed = await panelState();
console.log(`\n=== after Escape ===\n  ${JSON.stringify(reclosed)}`);
console.log(`  re-inerted: ${reclosed.inert === true ? "PASS" : "*** FAIL ***"}`);

await b.close();
