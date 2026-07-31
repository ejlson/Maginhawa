/* The three scrubs, and the seam they hand off to.

   --parallax-y ends (should be −4% / +4%), --settle reaching 1 before the
   film's bottom clears the viewport top, the plate's left edge landing on
   --pad-x at settle 1, and the film→DarkZone seam holding at every station.
   Plus the reduced-motion guard, which pins --settle and squares the corners.

   usage: node scripts/probe-book-motion.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "50853";
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});

const boot = async (p, reduce) => {
  if (reduce) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 });
  await s(2500);
};
// absolute page y, since the scrubs are element-relative and we want to walk
// the whole traverse including the approach BEFORE the section's top arrives
const goto = (p, y) =>
  p.evaluate((v) => {
    window.__lenis ? window.__lenis.scrollTo(v, { immediate: true }) : window.scrollTo(0, v);
  }, y);

{
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await boot(p, false);

  const geo = await p.evaluate(() => {
    const el = document.querySelector("#book");
    return { top: el.getBoundingClientRect().top + window.scrollY, h: el.offsetHeight, vh: window.innerHeight };
  });
  console.log(`\n#book top ${geo.top}  height ${geo.h}  viewport ${geo.vh}`);

  // --parallax-y ends: traverse is [start end → end start], so progress 0 is
  // the section's top at the viewport bottom and 1 is its bottom at the top
  for (const [label, y] of [
    ["progress 0", geo.top - geo.vh],
    ["progress 1", geo.top + geo.h],
  ]) {
    await goto(p, y);
    await s(700);
    const v = await p.evaluate(() => document.querySelector("#book").style.getPropertyValue("--parallax-y"));
    console.log(`  --parallax-y at ${label}: ${v || "(unset)"}`);
  }

  // the departure: settle, the plate's left edge, and the seam
  console.log("  --- departure ---");
  for (let i = 0; i <= 10; i++) {
    const y = geo.top + geo.h - geo.vh + (i / 10) * geo.vh;
    await goto(p, y);
    await s(450);
    const r = await p.evaluate(() => {
      const el = document.querySelector("#book");
      const rev = el.querySelector('[class*="Reservations_reveal"]');
      const zone = document.querySelector('[class*="DarkZone_zone"]');
      const cs = getComputedStyle(rev);
      // the painted plate edge, read out of the resolved clip-path inset
      const m = cs.clipPath.match(/inset\(([^)]*)\)/);
      return {
        settle: parseFloat(el.style.getPropertyValue("--settle") || "0"),
        dark: parseFloat(el.style.getPropertyValue("--dark") || "0"),
        inset: m ? m[1] : cs.clipPath,
        padX: getComputedStyle(document.documentElement).getPropertyValue("--pad-x").trim(),
        seam: zone.getBoundingClientRect().top - el.getBoundingClientRect().bottom,
        secBottom: el.getBoundingClientRect().bottom,
      };
    });
    console.log(
      `  +${String(Math.round((i / 10) * geo.vh)).padStart(4)}px  settle ${r.settle.toFixed(3)}  dark ${r.dark.toFixed(2)}  inset ${r.inset}  seam ${r.seam.toFixed(2)}px  bottom ${r.secBottom.toFixed(0)}`,
    );
    if (i === 10) console.log(`           (--pad-x resolves to ${r.padX})`);
  }
  await p.close();
}

{
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await boot(p, true);
  const geo = await p.evaluate(() => {
    const el = document.querySelector("#book");
    return { top: el.getBoundingClientRect().top + window.scrollY, h: el.offsetHeight, vh: window.innerHeight };
  });
  await goto(p, geo.top + geo.h - geo.vh + geo.vh * 0.5);
  await s(800);
  const r = await p.evaluate(() => {
    const el = document.querySelector("#book");
    const rev = el.querySelector('[class*="Reservations_reveal"]');
    return {
      clip: getComputedStyle(rev).clipPath,
      settle: getComputedStyle(el).getPropertyValue("--settle").trim(),
    };
  });
  console.log(`\nprefers-reduced-motion: reduce`);
  console.log(`  clip-path  ${r.clip}`);
  console.log(`  --settle   ${r.settle}`);
  await p.close();
}

await b.close();
