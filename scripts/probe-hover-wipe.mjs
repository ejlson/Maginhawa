/* Does the hover film wipe open from the cursor, and does the tile survive
   it without re-rendering?

   Two things are checked, because the second is the one that bites:
     · the clip-path actually animates from a pinched circle at the pointer
       to an open one (not a straight opacity swap, and not a no-op)
     · the plate's rect does not move during the hover. Every plate carries a
       `layoutId`; any React re-render mid-hover re-measures it, and a
       re-measure was what used to throw the photograph off screen. The wipe
       is driven through the DOM precisely to avoid that, so this asserts it.

   Usage: node scripts/probe-hover-wipe.mjs [port]  */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
/* HEADLESS REPORTS (hover: none). The tile gates its film on
   `(hover: hover) and (pointer: fine)`, so without this the handler never
   runs and the probe reports a working wipe as broken.

   Straight to CDP: puppeteer's own emulateMediaFeatures keeps an allowlist
   that rejects `hover` outright ("Unsupported media feature"), but the
   protocol underneath accepts it. */
const cdp = await page.createCDPSession();
await cdp.send("Emulation.setEmulatedMedia", {
  media: "screen",
  features: [
    { name: "hover", value: "hover" },
    { name: "pointer", value: "fine" },
  ],
});
await page.goto(`http://localhost:${PORT}/`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 15000,
  })
  .catch(() => {});
await page.evaluate(async () => {
  await document.fonts.ready;
  return true;
});
await s(2500);

// walk down so the grid's intro finishes and the tiles are live
const h = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < h; y += 500) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await s(120);
}
await s(900);
const headY = await page.evaluate(() => {
  const h2 = [...document.querySelectorAll("h2")].find((e) =>
    /OurRestaurants/i.test(e.textContent.replace(/\s+/g, "")),
  );
  return h2 ? Math.round(h2.getBoundingClientRect().top + window.scrollY) : null;
});
await page.evaluate((v) => window.scrollTo(0, v - 120), headY);
/* LONG settle before measuring. Lenis keeps easing after scrollTo returns,
   and the first version of this probe measured the tile mid-glide then moved
   the mouse to coordinates that were ~140px stale by the time the event
   landed — so the pointer arrived on the gap between tiles and the film
   never armed. Waited out rather than polled: the page also finishes its
   reveal work in here. */
await s(3200);

/* hover the FIRST tile that actually has a clip, near its top-left corner —
   an off-centre entry is the only way to tell a cursor-anchored wipe from a
   centred one */
const box = await page.evaluate(() => {
  const cells = [...document.querySelectorAll('ul[aria-label="Our restaurants"] > li')];
  for (const c of cells) {
    if (c.querySelector("video")) {
      const r = c.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }
  }
  return null;
});
if (!box) {
  console.log("! no tile with a clip on screen");
  await browser.close();
  process.exit(0);
}

const enterX = Math.round(box.x + box.w * 0.22);
const enterY = Math.round(box.y + box.h * 0.18);

/* measured in PAGE coordinates, not viewport — the first run compared a
   pre-hover viewport rect against a post-hover one and reported a 154px
   "move" that was just the smooth scroller still settling */
const plateRect = () =>
  page.evaluate(() => {
    const v = document.querySelector('ul[aria-label="Our restaurants"] video');
    const r = v.closest("li").querySelector("[data-plate]").getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
    };
  });
const plateBefore = await plateRect();

/* TWO MOVES. A single move from the origin can land without Chrome ever
   synthesising the mouseenter the tile listens for; stepping in from just
   outside the plate produces a real crossing. */
await page.mouse.move(Math.round(box.x - 30), Math.round(box.y - 30));
await s(120);
await page.mouse.move(enterX, enterY);

const samples = [];
for (let i = 0; i < 14; i++) {
  await s(60);
  const f = await page.evaluate(() => {
    const v = document.querySelector('ul[aria-label="Our restaurants"] video');
    if (!v) return null;
    const cs = getComputedStyle(v);
    return {
      clip: cs.clipPath,
      opacity: Number(cs.opacity).toFixed(2),
      // computed, not inline — the property is set on this element but
      // reading .style only works if nothing else has resolved it
      wx: cs.getPropertyValue("--wipe-x").trim(),
      wy: cs.getPropertyValue("--wipe-y").trim(),
      cls: v.className,
      playing: !v.paused,
    };
  });
  if (f) samples.push(f);
}

/* Chrome does NOT resolve a circle() percentage radius to px in computed
   style, so a px-only pattern finds nothing and reports a working wipe as
   absent. Accept either unit. */
const radii = samples
  .map((f) => {
    const m = /circle\(([\d.]+)(px|%)/.exec(f.clip || "");
    return m ? Number(m[1]) : null;
  })
  .filter((r) => r !== null);
console.log("computed clip-path samples:", samples.slice(0, 4).map((f) => f.clip).join(" | "));
console.log("classes:", samples[samples.length - 1]?.cls || "(none)");

console.log("wipe origin written:", samples[0]?.wx || "(none)", samples[0]?.wy || "");
console.log("video playing:", samples.some((f) => f.playing));
console.log("clip radii over ~840ms:", radii.length ? radii.join(" → ") : "(none captured)");
/* The signature is a PINCH THEN AN OPEN, not a monotonic rise: the clip
   rests OPEN at 145%, drops to ~0 on the frame `playing` fires, and grows
   back. Comparing first to last therefore reports a working wipe as broken,
   which is what the first version of this check did. Find the trough and
   assert it opened from there. */
const min = Math.min(...radii);
const trough = radii.indexOf(min);
const opened = radii.length > 2 && trough > -1 && radii[radii.length - 1] > min + 40;
console.log(
  radii.length === 0
    ? "check — no circle() in the computed clip-path"
    : opened
      ? `PASS — pinched to ${min.toFixed(1)} then opened to ${radii[radii.length - 1].toFixed(1)}`
      : "check — the clip never pinched and reopened",
);

const anchored = samples.some((f) => f.wx && f.wx !== "50%");
console.log(
  anchored
    ? "PASS — the wipe opened from the cursor"
    : `FAIL — wipe origin stayed at the ${samples[0]?.wx || "?"} default; --wipe-x never reached the element`,
);

const plateAfter = await plateRect();
const moved =
  Math.abs(plateAfter.x - plateBefore.x) > 1 ||
  Math.abs(plateAfter.y - plateBefore.y) > 1 ||
  Math.abs(plateAfter.w - plateBefore.w) > 1;
console.log(
  `plate rect ${moved ? "MOVED — a re-measure got in" : "held still"}`,
  JSON.stringify({ before: plateBefore, after: plateAfter }),
);

await browser.close();
