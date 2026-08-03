/* WHAT A SCREEN READER ACTUALLY GETS FROM THE DECK.
 *
 * The deck's whole justification for being CSS 3D rather than a canvas is that
 * the nine chapter bodies stay in the DOM. That is a CRAWLER argument, and it
 * is checked (curl the route, the strings are there). It is not the same
 * argument as "a screen reader can read them", and nothing so far has checked
 * the second one.
 *
 * The risk is specific. SplitWords renders every word inside `aria-hidden`
 * masks and puts the whole string on the BLOCK as `aria-label`. On an <h2>/<h3>
 * that is legal and works. On a <p> — role=paragraph — `aria-label` is a
 * PROHIBITED attribute in ARIA 1.2, so a conforming AT is entitled to drop it,
 * and every word of the text underneath is aria-hidden. The paragraph would
 * then have no accessible text at all.
 *
 * So: dump the real accessibility tree (CDP, the same tree the platform API
 * exposes) for the deck's copy column and for the list branch's, and compare.
 * The list branch is the control — it renders plain <h3>/<p>.
 *
 * usage: node scripts/probe-a11y-deck.mjs [port]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu"],
});
const page = await b.newPage();

const settle = async (w, h) => {
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1500);
};

/* ---------- DOM-level facts first ---------- */
const domFacts = async (label) => {
  const r = await page.evaluate(() => {
    const out = { label: "", panels: [] };
    const panels = [...document.querySelectorAll('[class*="railPanel"]')];
    if (panels.length) {
      const act = document.querySelector('[class*="railPanelActive"]');
      panels.forEach((p, i) => {
        const h = p.querySelector('[class*="storyTitle"]');
        const body = p.querySelector('[class*="storyBody"]');
        out.panels.push({
          i,
          active: p === act,
          inert: p.hasAttribute("inert"),
          titleTag: h?.tagName.toLowerCase() ?? null,
          titleAriaLabel: h?.getAttribute("aria-label")?.slice(0, 30) ?? null,
          titleHiddenWords: h ? [...h.querySelectorAll("[aria-hidden]")].length : 0,
          bodyTag: body?.tagName.toLowerCase() ?? null,
          bodyAriaLabel: body?.getAttribute("aria-label")?.slice(0, 30) ?? null,
          bodyHiddenWords: body ? [...body.querySelectorAll("[aria-hidden]")].length : 0,
          bodyVisibleTextNodes: body
            ? [...body.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).length
            : 0,
        });
      });
    }
    const items = [...document.querySelectorAll('[class*="railItem"]')];
    out.cards = items.map((li) => {
      const a = li.querySelector("a,[class*=railCard]");
      return {
        tag: a?.tagName.toLowerCase(),
        href: a?.getAttribute("href") ?? null,
        ariaLabel: a?.getAttribute("aria-label") ?? null,
      };
    });
    return out;
  });
  console.log(`\n--- DOM (${label}) ---`);
  if (!r.panels.length) {
    console.log("  no deck panels (list branch)");
  } else {
    for (const p of r.panels)
      console.log(
        `  panel ${p.i} active=${p.active ? "Y" : "-"} inert=${p.inert ? "Y" : "-"} ` +
          `title=<${p.titleTag}> ariaLabel=${p.titleAriaLabel ? '"' + p.titleAriaLabel + '…"' : "none"} hiddenWords=${p.titleHiddenWords} | ` +
          `body=<${p.bodyTag}> ariaLabel=${p.bodyAriaLabel ? '"' + p.bodyAriaLabel + '…"' : "none"} hiddenWords=${p.bodyHiddenWords} bareTextNodes=${p.bodyVisibleTextNodes}`,
      );
    console.log("  cards:");
    r.cards.forEach((c, i) => console.log(`    ${i} <${c.tag}> href=${c.href} aria-label=${JSON.stringify(c.ariaLabel)}`));
  }
  return r;
};

/* ---------- the real AX tree ---------- */
const axDump = async (label) => {
  const snap = await page.accessibility.snapshot({ interestingOnly: false });
  const hits = [];
  const walk = (n, depth) => {
    if (!n) return;
    const name = (n.name || "").trim();
    if (/paragraph|heading|StaticText|text/i.test(n.role || "") || name) hits.push({ role: n.role, name: name.slice(0, 90) });
    (n.children || []).forEach((c) => walk(c, depth + 1));
  };
  walk(snap, 0);
  return hits;
};

/* the sentence we look for in the AX tree, chapter by chapter */
const NEEDLES = [
  "Chef Omar",
  "halal-certified Caribbean",
  "ice-cream parlour",
  "Filipino-Japanese ramen",
  "Jacket Exchange",
  "hand-crafted sandos",
  "modern Filipino bistro",
  "Michelin Guide",
  "kissaten",
];

console.log("================ DECK BRANCH (1440x900) ================");
await settle(1440, 900);
/* park the deck mid-pin so a chapter is genuinely active */
await page.evaluate(() => {
  const w = document.querySelector('[class*="railPinWrap"]');
  if (!w) return;
  const y = w.getBoundingClientRect().top + scrollY + (w.offsetHeight - innerHeight) * 0.3;
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true });
  else window.scrollTo(0, y);
});
await sleep(1600);
await domFacts("deck");
const deckAx = await axDump("deck");
console.log("\n--- AX TREE: is each chapter body NAMED anywhere? ---");
const deckText = deckAx.map((h) => h.name).join("  ");
NEEDLES.forEach((n, i) => console.log(`  ch${i} "${n}" -> ${deckText.includes(n) ? "present" : "*** ABSENT FROM AX TREE ***"}`));
console.log("\n--- AX nodes whose role is paragraph ---");
deckAx.filter((h) => h.role === "paragraph").slice(0, 14).forEach((h) => console.log(`   paragraph name=${JSON.stringify(h.name)}`));
console.log("\n--- AX nodes whose role is heading ---");
deckAx.filter((h) => h.role === "heading").slice(0, 14).forEach((h) => console.log(`   heading name=${JSON.stringify(h.name)}`));

console.log("\n================ LIST BRANCH (900x900) — control ================");
await settle(900, 900);
await page.evaluate(() => {
  const l = document.querySelector('[class*="storyList"]');
  if (!l) return;
  const y = l.getBoundingClientRect().top + scrollY + 400;
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true });
  else window.scrollTo(0, y);
});
await sleep(1200);
const listAx = await axDump("list");
const listText = listAx.map((h) => h.name).join("  ");
NEEDLES.forEach((n, i) => console.log(`  ch${i} "${n}" -> ${listText.includes(n) ? "present" : "*** ABSENT FROM AX TREE ***"}`));

await b.close();
