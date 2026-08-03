/* DOES THE SEAT CARD FIT? — the deck mounts from 640px of viewport height, and
   nothing has checked what the chapter in the front seat looks like there.
 *
 * The seat card is 367–468px of projected height depending on the scale band,
 * and it is centred on --rail-seat-y inside a 100svh pin with `overflow: clip`.
 * At 900px that is comfortable. At the 640px floor the card, the copy block and
 * the year wheel all have to share the same 640px, and the pin will silently
 * crop whatever does not fit — cropping is the pin's job, so nothing errors.
 *
 * For each viewport this parks the deck on a settled chapter and reports the
 * seat card's rect against the pin, the copy block's rect, and how much of each
 * is outside. Checked at several seats because the size variants differ by 56px
 * of card height and the copy block by 31px of offset.
 *
 * usage: node scripts/probe-fit.mjs [port] */
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

/* the middle of each chapter's dwell — mirrors RAIL_STOPS in About.tsx */
const seatFrac = (i) => 0.04 + (0.92 / 8) * (i + (i < 8 ? 0.55 / 2 : 0));

for (const [W, H] of [
  [1200, 640],
  [1280, 700],
  [1440, 800],
  [1440, 900],
  [1440, 1200],
  [1920, 1080],
  [1920, 1600],
]) {
  await page.setViewport({ width: W, height: H });
  await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1500);

  const g = await page.evaluate(() => {
    const w = document.querySelector('[class*="railPinWrap"]');
    if (!w) return null;
    return { top: w.getBoundingClientRect().top + scrollY, travel: w.offsetHeight - innerHeight };
  });
  if (!g) {
    console.log(`\n=== ${W}x${H} — no deck ===`);
    continue;
  }
  console.log(`\n=== ${W}x${H} ===`);
  console.log("  seat  cardTop cardBot cardH | cutTop cutBot | copyTop copyBot | wheelCut");
  for (const i of [0, 2, 5, 8]) {
    await page.evaluate((y) => {
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
    }, g.top + g.travel * seatFrac(i));
    await sleep(900);
    const r = await page.evaluate((idx) => {
      const items = [...document.querySelectorAll('[class*="railItem"]')];
      const card = items[idx]?.querySelector('[class*="railCard"]');
      const pin = document.querySelector('[class*="railPin"]:not([class*="railPinWrap"])');
      const copy = document.querySelector('[class*="railPanelActive"]');
      const wheel = document.querySelector('[class*="storyNumberTrack"]')?.parentElement;
      const cr = card?.getBoundingClientRect();
      const pr = pin?.getBoundingClientRect();
      const or = copy?.getBoundingClientRect();
      const wr = wheel?.getBoundingClientRect();
      return {
        cardTop: cr ? Math.round(cr.top) : null,
        cardBot: cr ? Math.round(cr.bottom) : null,
        cardH: cr ? Math.round(cr.height) : null,
        pinTop: pr ? Math.round(pr.top) : null,
        pinBot: pr ? Math.round(pr.bottom) : null,
        copyTop: or ? Math.round(or.top) : null,
        copyBot: or ? Math.round(or.bottom) : null,
        wheelTop: wr ? Math.round(wr.top) : null,
        wheelBot: wr ? Math.round(wr.bottom) : null,
        vh: innerHeight,
        activeIdx: [...document.querySelectorAll('[class*="railPanel"]')].indexOf(copy),
      };
    }, i);
    const cutTop = Math.max(0, r.pinTop - r.cardTop);
    const cutBot = Math.max(0, r.cardBot - r.pinBot);
    const copyCut = (r.copyTop < 0 ? `top${-r.copyTop}` : "") + (r.copyBot > r.vh ? ` bot${r.copyBot - r.vh}` : "");
    console.log(
      `  ${String(i).padStart(4)}  ${String(r.cardTop).padStart(7)} ${String(r.cardBot).padStart(7)} ${String(r.cardH).padStart(5)} | ` +
        `${cutTop > 0 ? "*** " + cutTop + " ***" : "  0  "} ${cutBot > 0 ? "*** " + cutBot + " ***" : "  0  "} | ` +
        `${String(r.copyTop).padStart(7)} ${String(r.copyBot).padStart(7)} ${copyCut ? "*** copy cut " + copyCut + " ***" : ""} | ` +
        `${r.wheelTop < 0 || r.wheelBot > r.vh ? `*** wheel ${r.wheelTop}..${r.wheelBot} of ${r.vh} ***` : "ok"}` +
        (r.activeIdx !== i ? `   (seat reported ${r.activeIdx})` : ""),
    );
  }
}
await b.close();
