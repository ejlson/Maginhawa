/* THE CHAPTER CHANGE — "Our Restaurants." held while the About band climbs
   over it. Five things:

     KEPT     the chapter must get a beat AFTER its assembly hands scroll
              back and before anything starts covering it — measured as the
              scroll between the page unlocking and the band's top edge
              first appearing at the bottom of the window
     HOLD     the restaurant chapter's bottom edge must stay put (bar the
              deliberate few-vh lift) while the cover crosses the screen
     COVER    the About band's top edge must travel a clean viewport, from
              the bottom of the window to the top
     NO GAP   the cream chapter must never be visible below the maroon —
              a pin whose runway and margin disagree shows a seam
     AIR      how much maroon sits above the About film once the band has
              arrived

   usage: node scripts/probe-pin.mjs [port] */
import puppeteer from "puppeteer-core";
import { sleep, arm, started } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#restaurants", { timeout: 60000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 60000 },
);
await sleep(1200);

const sample = () =>
  page.evaluate(() => {
    const disc = document.querySelector("#restaurants");
    const zone = document.querySelector('div[class*="MaroonZone_zone"]');
    const d = disc.getBoundingClientRect();
    const z = zone.getBoundingClientRect();
    return {
      y: Math.round(window.scrollY),
      discBottom: Math.round(d.bottom),
      zoneTop: Math.round(z.top),
      docH: document.documentElement.scrollHeight,
    };
  });

const height = (await sample()).docH;

/* ---------- KEPT: the beat between "you may scroll" and "you are being
   covered". Walk in so the intro actually arms, then read the scroll
   position the moment the lock lifts. ---------- */
if (!(await arm(page))) throw new Error("the chapter's intro never armed");
await started(page);
await page.waitForFunction(
  () =>
    document.documentElement.style.overflow !== "hidden" &&
    !document.querySelector("[data-assembly-step]"),
  { timeout: 60000, polling: 200 },
);
const unlockedAt = (await sample()).y;

// the word that names the chapter, warming maroon → saffron
const inkAt = (label) =>
  page.evaluate(() => {
    const w = [...document.querySelectorAll('[class*="Discover_titleRise"]')];
    const last = w[w.length - 1];
    return { text: last.textContent, color: getComputedStyle(last).color };
  });
const inkEarly = await inkAt();
await sleep(1600);
const inkLate = await inkAt();

// creep forward from the unlock point until the band shows its edge
let coverAt = null;
for (let i = 0; i < 80 && coverAt === null; i++) {
  const s = await sample();
  if (s.zoneTop < 900) coverAt = s.y;
  else {
    await page.evaluate(() =>
      window.__lenis?.scrollTo(window.scrollY + 40, { immediate: true }),
    );
    await sleep(70);
  }
}

/* ---------- the cover itself ---------- */
const park = () =>
  page.evaluate(() => {
    const zone = document.querySelector('div[class*="MaroonZone_zone"]');
    window.__lenis?.scrollTo(
      window.scrollY + zone.getBoundingClientRect().top - innerHeight,
      { immediate: true },
    );
  });
await park();
await sleep(1200);

// NOVIDEO=1 pulls the films out just before the meter starts — the control
// for "is the cover's cost the animation, or a clip waking up under it?"
if (process.env.NOVIDEO) {
  await page.evaluate(() =>
    document.querySelectorAll("video").forEach((v) => v.remove()),
  );
  await sleep(400);
}

await page.evaluate(() => {
  window.__f = [];
  let last = performance.now();
  const tick = (t) => {
    window.__f.push(t - last);
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const track = [await sample()];
for (let i = 0; i < 20; i++) {
  await page.evaluate(() =>
    window.__lenis?.scrollTo(window.scrollY + 50, { immediate: true }),
  );
  await sleep(110);
  track.push(await sample());
}
const frames = await page.evaluate(() => window.__f.slice(2));

console.log("\n  scrollY   Our Restaurants. bottom   About top   gap below the band");
for (const s of track) {
  const gap = s.zoneTop - s.discBottom;
  console.log(
    `  ${String(s.y).padStart(7)}   ${String(s.discBottom).padStart(21)}   ${String(s.zoneTop).padStart(9)}   ${gap > 0 ? `${gap}px OF CREAM` : "none"}`,
  );
}

console.log(
  `\nKEPT:  ${coverAt === null ? "never covered" : `${coverAt - unlockedAt}px of scroll between the page unlocking and the band's edge appearing`}`,
);
console.log(
  `       (0 = the next chapter overruns the one still finishing; ~540px = the 60vh hold)`,
);
console.log(
  `INK:   "${inkLate.text}"  ${inkEarly.color} → ${inkLate.color}`,
);
console.log(`       (saffron-ink #8f5220 = rgb(143, 82, 32))`);

const held = track.filter((s) => s.zoneTop > 0 && s.zoneTop < 900);
const bottoms = held.map((s) => s.discBottom);
console.log(
  `HOLD:  the chapter's bottom edge moved ${Math.max(...bottoms) - Math.min(...bottoms)}px while it was being covered`,
);
console.log(`       (0 = a dead pin; ~62px = the lift it is supposed to have)`);

const tops = track.map((s) => s.zoneTop);
console.log(
  `COVER: the band's top edge ran ${Math.max(...tops)} → ${Math.min(...tops)}`,
);

/* The strip between the held chapter's bottom edge and the band's top
   edge. Harmless ONLY while the chapter's ground and the page's ground are
   the same colour — the chapter is transparent over the cream body, so the
   strip is the identical cream it sits on. Print both, so this stays a
   verdict rather than an assumption. */
const worstGap = Math.max(...track.map((s) => s.zoneTop - s.discBottom));
const grounds = await page.evaluate(() => ({
  chapter: getComputedStyle(document.querySelector("#restaurants"))
    .backgroundColor,
  page: getComputedStyle(document.body).backgroundColor,
}));
console.log(
  `STRIP: ${worstGap > 0 ? `${worstGap}px` : "0px"} showing below the chapter before the band reaches it`,
);
console.log(
  `       chapter ground ${grounds.chapter} over page ${grounds.page}  (transparent or equal = nothing to see)`,
);

const air = await page.evaluate(() => {
  const zone = document.querySelector('div[class*="MaroonZone_zone"]');
  const film = document.querySelector('[class*="AboutIntro_mediaFrame"]');
  return Math.round(
    film.getBoundingClientRect().top - zone.getBoundingClientRect().top,
  );
});
console.log(`AIR:   ${air}px of maroon above the About film`);

const after = (await sample()).docH;
console.log(`HEIGHT: document ${height} → ${after}px`);

const janky = frames.filter((f) => f > 32).length;
console.log(
  `\nframes: ${frames.length} | worst ${Math.max(...frames).toFixed(0)}ms | >32ms ${janky} (${((janky / frames.length) * 100).toFixed(0)}%)`,
);
// WHERE the long frames fall — a cluster at one end is a thing starting
// (a video waking, an image decoding), a scatter is the animation itself
console.log(
  `  timeline: ${frames.map((f) => (f > 100 ? "#" : f > 32 ? "+" : ".")).join("")}`,
);
await b.close();
