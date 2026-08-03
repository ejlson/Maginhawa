/* THE HYGIENE RULES, READ OFF THE RENDERED PAGE rather than off the diff.
   One perspective; will-change on the track only and only while it is live;
   no backdrop-filter inside the deck; card edges as specified; and the promoted
   layer actually released when the section leaves.
   usage: node scripts/probe-hygiene.mjs [port] */
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
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
await page.evaluate(() => document.fonts.ready);
await sleep(1600);

const at = async (label, y) => {
  await page.evaluate((v) => {
    if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
    else window.scrollTo(0, v);
  }, y);
  await sleep(900);
  const r = await page.evaluate(() => {
    const all = [...document.querySelectorAll("*")];
    const persp = all.filter((e) => getComputedStyle(e).perspective !== "none");
    const wc = all.filter((e) => {
      const w = getComputedStyle(e).willChange;
      return w && w !== "auto";
    });
    const bf = all.filter((e) => {
      const s = getComputedStyle(e);
      return (s.backdropFilter && s.backdropFilter !== "none") || (s.webkitBackdropFilter && s.webkitBackdropFilter !== "none");
    });
    const cards = [...document.querySelectorAll('[class*="railCard"]')];
    const track = document.querySelector('[class*="railTrack"]');
    return {
      perspEls: persp.map((e) => (e.className || "").toString().split(" ")[0] + ":" + getComputedStyle(e).perspective),
      willChange: wc.map((e) => (e.className || "").toString().split(" ")[0] + ":" + getComputedStyle(e).willChange).slice(0, 12),
      willChangeCount: wc.length,
      backdrop: bf.map((e) => (e.className || "").toString().split(" ")[0]),
      trackWC: track ? getComputedStyle(track).willChange : null,
      cardsWithWC: cards.filter((c) => getComputedStyle(c).willChange !== "auto").length,
      cardCount: cards.length,
      cardSample: cards[0]
        ? {
            boxShadow: getComputedStyle(cards[0]).boxShadow,
            contain: getComputedStyle(cards[0]).contain,
            backfaceVisibility: getComputedStyle(cards[0]).backfaceVisibility,
            border: getComputedStyle(cards[0]).borderTopWidth + " " + getComputedStyle(cards[0]).borderTopColor,
          }
        : null,
    };
  });
  console.log(`\n=== ${label} (y=${y}) ===`);
  console.log("  perspective on:", JSON.stringify(r.perspEls));
  console.log("  will-change count:", r.willChangeCount, JSON.stringify(r.willChange));
  console.log("  .railTrack will-change:", r.trackWC);
  console.log("  cards with will-change:", r.cardsWithWC, "of", r.cardCount);
  console.log("  backdrop-filter on:", JSON.stringify(r.backdrop));
  if (r.cardSample) console.log("  card:", JSON.stringify(r.cardSample));
};

const g = await page.evaluate(() => {
  const w = document.querySelector('[class*="railPinWrap"]');
  return { top: w.getBoundingClientRect().top + scrollY, h: w.offsetHeight };
});
await at("far above the deck", 0);
await at("mid pin", g.top + (g.h - 900) * 0.45);
await at("far below the deck", g.top + g.h + 3000);

/* ---------------------------------------------------------------------------
   THE GLASS CURSOR MUST NOT BE OVER THE DECK.

   The whole pinned-video scope is data-cursor="glass", so the disc followed
   the pointer across the chapter being read, the copy beside it and the year
   wheel — refracting type over nine photographs that are themselves rotating
   in 3D. The section opts out with data-cursor="default", which until now was
   a no-op: it declined to be a glass ZONE and then fell straight through to
   the "is there visible photography here?" test, which nine large photographs
   answer yes to. (See resolve() in CustomCursor.tsx.)

   Checked as the cursor's own state — `html.glass-cursor` is the class the
   component toggles wherever the disc is active — rather than by reading the
   attribute, because the attribute being present was never the thing in
   doubt. Sampled over the hero (must be ON: the film is the zone) and over
   three points in the deck (must be OFF). */
{
  await page.evaluate(
    (y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
    g.top + (g.h - 900) * 0.45,
  );
  await sleep(1200);
  const probe = async (x, y) => {
    await page.mouse.move(x, y);
    await sleep(260);
    return page.evaluate(() =>
      document.documentElement.classList.contains("glass-cursor"),
    );
  };
  const overCard = await probe(720, 500);
  const overCopy = await probe(1180, 460);
  const overWheel = await probe(200, 440);
  await page.evaluate(
    (y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
    0,
  );
  await sleep(1200);
  const overHero = await probe(720, 700);

  console.log("\n=== glass cursor zones ===");
  const ok = (l, c) => console.log(`  ${c ? "PASS" : "FAIL"}  ${l}`);
  ok("ON over the hero film", overHero === true);
  ok("OFF over a deck card", overCard === false);
  ok("OFF over the chapter copy", overCopy === false);
  ok("OFF over the year wheel", overWheel === false);
}

await Promise.race([b.close().catch(() => {}), sleep(3000)]);
try {
  b.process()?.kill("SIGKILL");
} catch {}
process.exit(0);
