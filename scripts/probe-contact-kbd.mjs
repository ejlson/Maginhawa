/* /contact — keyboard reachability, focus visibility, and the reduced-motion
 * contract, at the four viewports this pass is verified against.
 *
 *   1. TAB ORDER. Walks the page with Tab and records every stop inside the
 *      dark zone: its accessible name, whether it is inside the form, and
 *      whether :focus-visible actually paints something (outline or a colour
 *      change). A cream ring is the house rule here — a maroon one would
 *      vanish into this section's own ground.
 *   2. LABELS. Every control's accessible name, per viewport, because the
 *      "Name" pair carries one visible label and two sr-only ones and that is
 *      exactly the arrangement that breaks silently.
 *   3. REDUCED MOTION. With the media feature forced, nothing on the page may
 *      declare a transition on a property that costs layout, and the new
 *      footer block's arrow must sit still.
 *
 * usage: node scripts/probe-contact-kbd.mjs [port]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3210";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();

const load = async () => {
  await page.goto(`http://localhost:${PORT}/contact`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(900);
};

const out = {};

for (const vp of [
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
  { w: 820, h: 1180 },
  { w: 390, h: 844 },
]) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  await load();

  const stops = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const s = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const name =
        el.getAttribute("aria-label") ||
        (el.labels && el.labels[0] && el.labels[0].innerText.trim()) ||
        el.innerText?.trim().slice(0, 34) ||
        el.placeholder ||
        el.tagName;
      return {
        tag: el.tagName,
        name,
        inForm: !!el.closest("form"),
        inVisit: !!el.closest("aside[aria-labelledby='come-and-see-us']"),
        // something must paint: a ring, or the pill's fill flip
        ring: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0,
        outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
        bg: cs.backgroundColor,
        underline: cs.textDecorationColor,
      };
    });
    if (s) stops.push(s);
  }
  const seen = new Set();
  out[`${vp.w}x${vp.h}`] = {
    stops: stops.filter((s) => {
      const k = s.tag + s.name;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }),
    unringed: stops.filter((s) => !s.ring).map((s) => s.name),
  };
}

/* ---- reduced motion ---- */
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "reduce" },
]);
await load();
out.reducedMotion = await page.evaluate(() => {
  const bad = [];
  const layoutProps =
    /width|height|margin|padding|top|left|right|bottom|inset|flex|grid|font-size/;
  for (const el of document.querySelectorAll("main *")) {
    const cs = getComputedStyle(el);
    const props = cs.transitionProperty;
    if (props && props !== "none" && layoutProps.test(props)) {
      bad.push(`${el.tagName}.${el.className} → ${props}`);
    }
  }
  const arrow = document.querySelector(
    "aside[aria-labelledby='come-and-see-us'] span[aria-hidden]",
  );
  return {
    layoutTransitions: bad.slice(0, 12),
    visitArrowTransition: arrow ? getComputedStyle(arrow).transitionProperty : null,
    // the reveals must have landed even with motion off
    revealOpacity: getComputedStyle(
      document.querySelector("#contact-us form").parentElement,
    ).opacity,
  };
});

console.log(JSON.stringify(out, null, 1));

await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
