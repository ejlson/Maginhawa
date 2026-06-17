import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/tmp/mgnhw_render";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(5000);

const shots = [
  { needle: "From heritage Filipino", file: "swap_statement.png" },
  { needle: "A vibrant Filipino", file: "swap_whoweare.png" },
];

for (const s of shots) {
  const ok = await page.evaluate((needle) => {
    const norm = (t) => t.replace(/\s+/g, "");
    const key = norm(needle);
    const h2 = [...document.querySelectorAll("h2")].find((n) =>
      norm(n.textContent).includes(key)
    );
    if (!h2) return false;
    const y = h2.getBoundingClientRect().top + window.scrollY - 220;
    window.scrollTo({ top: y, behavior: "instant" });
    return true;
  }, s.needle);
  if (!ok) {
    console.log("NOT FOUND:", s.needle);
    continue;
  }
  await sleep(1600); // let reveal animation settle
  await page.screenshot({ path: `${OUT}/${s.file}` });
  console.log("shot", s.needle);
}
await browser.close();
