/* the deferred backdrop, proved on both sides: nothing fetched while the
   reader is on the hero, and a playing film by the time the band arrives. */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });

const shot = async (url, sel, label) => {
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise(r => setTimeout(r, 9000));
  const state = () => p.evaluate((s) => {
    const v = document.querySelector(s);
    if (!v) return null;
    return { preload: v.preload, ready: v.readyState, paused: v.paused,
      buf: v.buffered.length ? +v.buffered.end(v.buffered.length - 1).toFixed(1) : 0,
      t: +v.currentTime.toFixed(2), top: +v.getBoundingClientRect().top.toFixed(0) };
  }, sel);
  console.log(`\n── ${label} ──`);
  console.log("  on the hero, no scroll :", JSON.stringify(await state()));
  await p.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.45) {
      window.scrollTo(0, y); await new Promise(r => setTimeout(r, 260));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise(r => setTimeout(r, 2500));
  });
  console.log("  at the band            :", JSON.stringify(await state()));
  await p.close();
};

await shot("http://localhost:3000/", '[class*="Reservations_locVideo__"]', "home / Reservations backdrop");
await shot("http://localhost:3000/restaurants", '[class*="RestaurantsShowcase_bgVideo__"]', "/restaurants / showcase backdrop");
await b.close();
