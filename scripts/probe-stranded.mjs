/* WHICH words are left below their masks, and on which blocks — the follow-up
   to probe-routes' bare count. A number is not a defect; a named block is.
   Also reports the /restaurants index height, which came back as exactly one
   viewport.
   usage: node scripts/probe-stranded.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu"],
});

for (const route of ["/", "/about", "/restaurants"]) {
  const page = await b.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1500);

  /* sweep the way a READER does — a trusted wheel, not a teleport, so
     IntersectionObservers and any step machine actually get their chance */
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.mouse.move(720, 450);
  for (let i = 0; i < Math.ceil(H / 300); i++) {
    await page.mouse.wheel({ deltaY: 300 });
    await sleep(60);
  }
  await sleep(2500);

  const s = await page.evaluate(() => {
    const words = [...document.querySelectorAll('[class*="SplitWords_word"],[class*="SplitWords_cssWord"]')];
    const byBlock = new Map();
    for (const w of words) {
      const m = new DOMMatrixReadOnly(getComputedStyle(w).transform);
      const block = w.closest("h1,h2,h3,p,span[class]") ?? w.parentElement;
      const key = (block?.tagName ?? "?") + " ." + (block?.className || "").toString().split(" ")[0] + " :: " + (block?.getAttribute("aria-label") || block?.textContent || "").trim().replace(/\s+/g, " ").slice(0, 44);
      const rec = byBlock.get(key) ?? { total: 0, stranded: 0, inert: 0 };
      rec.total++;
      if (Math.abs(m.m42) > 1.5) rec.stranded++;
      if (w.closest("[inert]")) rec.inert++;
      byBlock.set(key, rec);
    }
    return {
      h: document.documentElement.scrollHeight,
      blocks: [...byBlock].filter(([, r]) => r.stranded > 0).map(([k, r]) => `${r.stranded}/${r.total} stranded (inert:${r.inert})  ${k}`),
      /* the restaurants index: what is actually on it */
      main: document.querySelector("main")?.getBoundingClientRect().height ?? null,
      cards: document.querySelectorAll("main a").length,
      bodyText: (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 160),
    };
  });
  console.log(`\n=== ${route} ===  height ${s.h}  main ${s.main}  links-in-main ${s.cards}`);
  if (route === "/restaurants") console.log("  text:", s.bodyText);
  if (!s.blocks.length) console.log("  no stranded words");
  s.blocks.forEach((x) => console.log("  " + x));
  await page.close();
}
await b.close();
