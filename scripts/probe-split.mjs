/* Geometry probe for the split moment: reports the real boxes of the two
   words, the deck and its clipping ancestors once the deck has gathered.
   usage: node scripts/probe-split.mjs [port] [atMs] */
import puppeteer from "puppeteer-core";
import { play } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "55075";
const AT = Number(process.argv[3] || 2400);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await sleep(4500);
const { armed } = await play(page);
console.log(armed ? "armed" : "NEVER ARMED");
await sleep(AT);

const out = await page.evaluate(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      l: Math.round(r.left),
      r: Math.round(r.right),
      t: Math.round(r.top),
      b: Math.round(r.bottom),
      w: Math.round(r.width),
    };
  };
  const section = document.querySelector("#restaurants");
  const title = section.querySelector("h2");
  // the WORD MASKS only — each word is a mask span wrapping a rise span, so
  // a bare `span` selector returns four elements and word[1] is the inside
  // of "Our" rather than "Restaurants."
  const words = [...title.children].filter((n) => n.tagName === "SPAN");
  // every ancestor that could be doing the clipping
  const clippers = [];
  let n = section;
  while (n && n !== document.documentElement) {
    const cs = getComputedStyle(n);
    if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
      clippers.push({
        el: n.tagName + "." + (n.className?.toString().slice(0, 40) || ""),
        ox: cs.overflowX,
        oy: cs.overflowY,
        box: box(n),
      });
    }
    n = n.parentElement;
  }
  const plates = [...section.querySelectorAll("[data-plate]")].map(box);
  // the deck's on-screen extent, back plates included
  const deck = [...section.querySelectorAll("div")].filter((d) =>
    d.className?.toString().includes("introPlate"),
  );
  const dl = Math.min(...deck.map((d) => d.getBoundingClientRect().left));
  const dr = Math.max(...deck.map((d) => d.getBoundingClientRect().right));
  return {
    vw: innerWidth,
    section: box(section),
    stage: box(section.querySelector("div")),
    title: box(title),
    our: box(words[0]),
    rest: box(words[1]),
    deckL: Math.round(dl),
    deckR: Math.round(dr),
    clippers,
    seat0: plates[0],
  };
});

console.log(JSON.stringify(out, null, 2));
console.log("\n— gaps —");
console.log("our.right -> deck.left :", out.deckL - out.our.r);
console.log("deck.right -> rest.left:", out.rest.l - out.deckR);
console.log("deck centre            :", (out.deckL + out.deckR) / 2, "vs vw/2", out.vw / 2);
await browser.close();
