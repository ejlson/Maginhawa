// The walk-in note in place — wheel view at desktop, card view (cream sheet)
// and the phone, since the plaque has to hold on all three grounds.
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "50853";
const OUT = process.env.OUT || "/tmp/mgnhw_walkin";
const s = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});

for (const [W, H, view, name] of [
  [1440, 900, "wheel", "desk_wheel"],
  [1440, 900, "cards", "desk_cards"],
  [900, 800, "cards", "narrow_cards"],
  [390, 844, "wheel", "phone_wheel"],
]) {
  const p = await b.newPage();
  await p.setViewport({ width: W, height: H });
  await p.goto(`http://localhost:${PORT}/restaurants`, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 });
  await s(2500);
  if (view === "cards") {
    await p.evaluate(() => {
      [...document.querySelectorAll('[class*="viewToggle"] button')]
        .find((n) => n.getAttribute("aria-label") === "Card view")
        .click();
    });
    await s(1000);
  }
  await p.screenshot({ path: `${OUT}/${name}.png` });
  await p.close();
}

await b.close();
console.log(`shot → ${OUT}`);
