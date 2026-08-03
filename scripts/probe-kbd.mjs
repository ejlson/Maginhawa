/* KEYBOARD TRAVERSAL OF THE DECK, MEASURED AFTER IT HAS SETTLED.
 *
 * The first cut of this check sampled 230ms after each Tab and reported the
 * seat lagging the focused card by two chapters. That was the HARNESS: the
 * focus handler calls `lenis.scrollTo(y)` WITHOUT `immediate`, so Lenis eases
 * over ~1s, and the deck's own spring then takes a further ~260ms to settle.
 * Sampling inside that window measures the journey, not the destination.
 *
 * So this waits for the scroll to actually stop — polls scrollY until it is
 * unchanged across three frames, with a hard ceiling — and only then reads the
 * seat. It also keeps tabbing PAST the last card, which is where the real
 * hazard is: the copy panels are `inert` when inactive, and `inert` on a
 * subtree containing the focused element expels focus to <body>. If the seat
 * moves while focus is sitting in a panel, the reader loses their place.
 *
 * usage: node scripts/probe-kbd.mjs [port] [w] [h]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [PORT = "3100", W = "1440", H = "900"] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu"],
});
const page = await b.newPage();
await page.setViewport({ width: +W, height: +H });
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
await page.evaluate(() => document.fonts.ready);
await sleep(1600);

const settleScroll = () =>
  page.evaluate(
    () =>
      new Promise((res) => {
        let last = -1;
        let same = 0;
        let n = 0;
        const tick = () => {
          const y = Math.round(window.scrollY);
          if (y === last) same++;
          else same = 0;
          last = y;
          if (same >= 6 || ++n > 180) return res(y);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );

const g = await page.evaluate(() => {
  const w = document.querySelector('[class*="railPinWrap"]');
  return { top: w.getBoundingClientRect().top + scrollY, height: w.offsetHeight };
});
console.log(`pin wrap top=${g.top} height=${g.height}`);

await page.evaluate((y) => {
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true });
  else window.scrollTo(0, y);
}, Math.max(0, g.top - 1500));
await sleep(700);
await page.evaluate(() => {
  document.body.setAttribute("tabindex", "-1");
  document.body.focus();
  document.body.removeAttribute("tabindex");
});

console.log("\n  step  focus                                        cardIdx  seat  panelMatch  scrollY");
let reached = false;
let afterDeck = 0;
for (let step = 0; step < 80; step++) {
  await page.keyboard.press("Tab");
  await settleScroll();
  await sleep(420); // let the deck's spring finish after the scroll stops
  const s = await page.evaluate(() => {
    const el = document.activeElement;
    const items = [...document.querySelectorAll('[class*="railItem"]')];
    const card = el?.closest?.('[class*="railCard"]');
    const cardIdx = card ? items.findIndex((li) => li.contains(card)) : -1;
    const panels = [...document.querySelectorAll('[class*="railPanel"]')];
    const act = document.querySelector('[class*="railPanelActive"]');
    return {
      tag: el?.tagName.toLowerCase() ?? "none",
      isBody: el === document.body,
      label: (el?.getAttribute?.("aria-label") || el?.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40),
      cardIdx,
      seat: panels.indexOf(act),
      inPanel: !!el?.closest?.('[class*="railPanel"]'),
      inInert: !!el?.closest?.("[inert]"),
      y: Math.round(window.scrollY),
    };
  });
  if (s.cardIdx >= 0) reached = true;
  if (!reached) continue;
  if (s.cardIdx < 0) afterDeck++;
  const match = s.cardIdx >= 0 ? (s.cardIdx === s.seat ? "MATCH" : `*** off by ${s.seat - s.cardIdx} ***`) : s.inPanel ? `panel(inert=${s.inInert})` : s.isBody ? "*** FOCUS LOST TO BODY ***" : "-";
  console.log(
    `  ${String(step).padStart(4)}  ${(s.tag + ' "' + s.label + '"').padEnd(44)} ${String(s.cardIdx).padStart(7)}  ${String(s.seat).padStart(4)}  ${match.padEnd(24)} ${s.y}`,
  );
  if (afterDeck >= 4) break;
}

await b.close();
