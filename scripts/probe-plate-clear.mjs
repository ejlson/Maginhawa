/* Does the plate still cross the "R" of Restaurants during the split?
   Last time I called this "minor" and "for a beat" without measuring; it was
   +199.1px at worst across 41 of 371 frames. So this samples the WHOLE split
   and reports the worst intrusion on each side, in pixels.

   usage: node scripts/probe-plate-clear.mjs [port]   (run from the repo root) */
import puppeteer from "puppeteer-core";

const PORT = process.argv[2] || "3300";

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"],
});

for (const W of [1440, 1920, 1280]) {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: 900 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));

  /* find the split section and its scroll range */
  const range = await page.evaluate(() => {
    const sec = document.querySelector("[class*='Discover_section']");
    if (!sec) return null;
    const r = sec.getBoundingClientRect();
    return { top: scrollY + r.top, h: sec.offsetHeight };
  });
  if (!range) {
    console.log(`${W}: no Discover section`);
    await page.close();
    continue;
  }

  let worstL = -1e9,
    worstR = -1e9,
    worstAt = null,
    frames = 0,
    bad = 0;

  const N = 90;
  for (let i = 0; i <= N; i++) {
    const y = range.top + (range.h * i) / N;
    await page.evaluate((t) => {
      const l = window.__lenis || window.lenis;
      if (l && typeof l.scrollTo === "function") l.scrollTo(t, { immediate: true });
      else window.scrollTo(0, t);
    }, y);
    await new Promise((r) => setTimeout(r, 60));

    const m = await page.evaluate(() => {
      const plate = document.querySelector("[class*='introPlate']");
      const words = [...document.querySelectorAll("[class*='introWord']")];
      if (!plate || words.length < 2) return null;
      const p = plate.getBoundingClientRect();
      if (p.width < 4 || +getComputedStyle(plate).opacity < 0.02) return null;
      /* left word is "Our", right word is "Restaurants." */
      const bs = words.map((w) => w.getBoundingClientRect()).sort((a, z) => a.left - z.left);
      const L = bs[0],
        R = bs[bs.length - 1];
      return {
        /* positive = the plate has crossed INTO the word */
        intoLeft: +(L.right - p.left).toFixed(1),
        intoRight: +(p.right - R.left).toFixed(1),
        plateW: Math.round(p.width),
      };
    });
    if (!m) continue;
    frames++;
    if (m.intoLeft > worstL) worstL = m.intoLeft;
    if (m.intoRight > worstR) {
      worstR = m.intoRight;
      worstAt = `${((i / N) * 100).toFixed(0)}%`;
    }
    if (m.intoLeft > 0 || m.intoRight > 0) bad++;
  }

  console.log(
    `${W}px — sampled ${frames} frames with the plate visible; ` +
      `worst intrusion left ${worstL.toFixed(1)}px, right ${worstR.toFixed(1)}px (at ${worstAt}); ` +
      `${bad} frame(s) overlapping  ${bad === 0 ? "CLEAN" : "OVERLAP"}`,
  );
  await page.close();
}

setTimeout(() => process.exit(0), 1200);
await b.close().catch(() => {});
process.exit(0);
