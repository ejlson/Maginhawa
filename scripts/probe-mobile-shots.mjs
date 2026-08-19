import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/4571a3c0-f3ac-4043-8c7b-dff92615811f/scratchpad";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
p.on("requestfailed", r => console.log("FAILED", r.url(), r.failure()?.errorText));
p.on("response", r => { if (r.status() >= 400) console.log("HTTP", r.status(), r.url()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise(r => setTimeout(r, 9000));
await p.screenshot({ path: `${OUT}/m-hero.png` });
await p.evaluate(async () => {
  const sec = document.querySelector('[class*="AboutSplit_section__"]');
  const y = sec.getBoundingClientRect().top + scrollY;
  for (let s = scrollY; s < y; s += innerHeight * 0.5) { window.scrollTo(0, s); await new Promise(r => setTimeout(r, 200)); }
  window.scrollTo(0, y - 10);
  await new Promise(r => setTimeout(r, 2500));
});
await p.screenshot({ path: `${OUT}/m-about.png` });
await b.close();
