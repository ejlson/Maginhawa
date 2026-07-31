/* THE TILE HOVER. The plate's film is fetched on the first hover, and the
   clips run from 2.5MB to 25MB — so between the pointer arriving and the
   first frame existing there is a window in which the video element has
   NOTHING to draw. Revealing it in that window replaces the photograph
   with an empty box, which reads as the picture vanishing under the cursor.

   This samples the tile every frame from the moment the pointer lands and
   asks one question: was anything ever drawn that was neither the still
   nor the film?

   usage: node scripts/probe-hover.mjs [port] */
import puppeteer from "puppeteer-core";
import { sleep, arm } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--autoplay-policy=no-user-gesture-required",
  ],
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
await arm(page);
await page.waitForFunction(
  () =>
    document.documentElement.style.overflow !== "hidden" &&
    !document.querySelector("[data-assembly-step]"),
  { timeout: 60000, polling: 200 },
);
await sleep(1500);

// Belly's tile wears the 25MB clip — the worst case, and the one where the
// photograph used to disappear for seconds
const tiles = await page.evaluate(() =>
  [...document.querySelectorAll("[data-plate]")].map((el, i) => {
    const r = el.getBoundingClientRect();
    return { i, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }),
);

console.log("\n  tile   opacity of the film while it had no frame   verdict");
for (const t of tiles.slice(0, 8)) {
  await page.mouse.move(20, 20);
  await sleep(150);
  // watch every frame from the instant the pointer lands
  await page.evaluate((i) => {
    window.__w = [];
    const plate = document.querySelectorAll("[data-plate]")[i];
    const tick = () => {
      const v = plate.querySelector("video");
      if (v)
        window.__w.push({
          o: Number(getComputedStyle(v).opacity),
          // 0/1 = nothing decoded yet; ≥2 = there is a frame to draw
          rs: v.readyState,
        });
      if (window.__w.length < 240) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, t.i);
  await page.mouse.move(t.x, t.y);
  await sleep(2600);
  const w = await page.evaluate(() => window.__w ?? []);
  // the failure: the film carrying any opacity while it has no frame
  const blind = w.filter((s) => s.o > 0.02 && s.rs < 2);
  const worst = blind.length ? Math.max(...blind.map((s) => s.o)) : 0;
  const played = w.some((s) => s.rs >= 2 && s.o > 0.5);
  console.log(
    `  ${String(t.i).padStart(4)}   ${String(worst.toFixed(2)).padStart(43)}   ${
      blind.length
        ? `BLANK — the photo was replaced by an empty box for ${blind.length} frames`
        : played
          ? "film took over only once it had a frame"
          : "still held (film never loaded)"
    }`,
  );
}
await b.close();
