/* Is the year wheel's numeral being clipped, and by what? Walks up from the
   digit to find every ancestor whose box or overflow cuts it.
   usage: node scripts/probe-wheel.mjs [port] */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1","--enable-gpu"] });
const page = await b.newPage();

for (const [w, h] of [[1440,900],[1920,1080],[1280,860]]) {
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(()=>{});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1500);
  const g = await page.evaluate(() => {
    const wrap = document.querySelector('[class*="railPinWrap"]');
    return wrap ? { top: wrap.getBoundingClientRect().top + scrollY, height: wrap.getBoundingClientRect().height } : null;
  });
  if (!g) { console.log(`\n${w}x${h}: no deck`); continue; }
  await page.evaluate((y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y), g.top + (g.height - h) * 0.25);
  await sleep(1600);

  const r = await page.evaluate(() => {
    const num = document.querySelector('[class*="storyNumberTrack"]');
    if (!num) return { err: "no numeral track" };
    const nr = num.getBoundingClientRect();
    const chain = [];
    let el = num.parentElement;
    while (el && el !== document.body) {
      const s = getComputedStyle(el);
      const er = el.getBoundingClientRect();
      const clipsX = s.overflowX !== "visible" || s.maskImage !== "none" || s.webkitMaskImage !== "none";
      chain.push({
        cls: String(el.className).slice(0, 34),
        box: `${Math.round(er.left)}..${Math.round(er.right)}`,
        overflowX: s.overflowX,
        mask: s.maskImage !== "none" || s.webkitMaskImage !== "none",
        /* how far the numeral pokes out of THIS ancestor on each side */
        cutL: clipsX ? Math.round(er.left - nr.left) : 0,
        cutR: clipsX ? Math.round(nr.right - er.right) : 0,
        cutT: Math.round(er.top - nr.top),
        cutB: Math.round(nr.bottom - er.bottom),
        overflowY: s.overflowY,
      });
      el = el.parentElement;
    }
    return {
      numeral: `x ${Math.round(nr.left)}..${Math.round(nr.right)} w${Math.round(nr.width)}   y ${Math.round(nr.top)}..${Math.round(nr.bottom)} h${Math.round(nr.height)}`,
      chain: chain.filter((c) => c.mask || c.overflowX !== "visible" || c.overflowY !== "visible"),
    };
  });
  console.log(`\n${w}x${h}  numeral ${r.numeral || r.err}`);
  (r.chain || []).forEach((c) =>
    console.log(`   ${c.cls.padEnd(34)} ${c.box.padEnd(14)} ovf ${c.overflowX}/${c.overflowY} mask:${c.mask}  cuts L${c.cutL} R${c.cutR} T${c.cutT} B${c.cutB}`));
}

/* ---------------------------------------------------------------------------
   DOES THE WHEEL EVER ANIMATE TO A NUMBER IT IS ALREADY SHOWING?

   The chapters run 1987, 2007, 2017, 2018, 2019, 2025, 2025, 2026, 2026 — two
   consecutive pairs. Indexed by chapter, the suffix track scrolled a full step
   at 6->7 and again at 8->9 and landed on identical digits: half a second of
   movement that says something changed when nothing did, twice in the last
   four chapters. It is invisible in a screenshot at either end of the move,
   which is why it survived several passes.

   The check is the track's own transform per chapter: equal years must give
   the same transform, and different years must not. */
{
  const page = await b.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/about`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1800);

  const g = await page.evaluate(() => {
    const w = document.querySelector('[class*="railPinWrap"]');
    if (!w) return null;
    const r = w.getBoundingClientRect();
    return { top: r.top + scrollY, travel: r.height - innerHeight };
  });

  if (!g) {
    console.log("\n(no deck at 1440x900 — the wheel walk needs the deck)");
  } else {
    const YEARS = [
      "1987",
      "2007",
      "2017",
      "2018",
      "2019",
      "2025",
      "2025",
      "2026",
      "2026",
    ];
    /* dwell centres: lead + step*(i + dwell/2), with lead 0.04, step 0.92/8 */
    const rows = [];
    console.log("\n=== year wheel, chapter by chapter ===");
    for (let i = 0; i < 9; i++) {
      const frac = 0.04 + (0.92 / 8) * (i + (i < 8 ? 0.275 : 0));
      await page.evaluate(
        (y) =>
          window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
        g.top + g.travel * frac,
      );
      await sleep(1100);
      const m = await page.evaluate(() => {
        const tracks = document.querySelectorAll(
          '[class*="storyNumberTrack"]',
        );
        const suffix = tracks[tracks.length - 1];
        const live = [...document.querySelectorAll('[class*="railPanel"]')]
          .findIndex((p) => !p.hasAttribute("inert"));
        const shown = [
          ...document.querySelectorAll(
            '[class*="storySuffixColumn"] [class*="isActive"]',
          ),
        ].map((e) => e.textContent);
        return {
          transform: getComputedStyle(suffix).transform,
          live,
          shown: shown.join(","),
        };
      });
      rows.push({ i, year: YEARS[i], ...m });
      console.log(
        `  chapter ${i + 1}  ${YEARS[i]}  live ${m.live + 1}  showing "${m.shown}"  track ${m.transform}`,
      );
    }

    const ok = (l, c) => console.log(`  ${c ? "PASS" : "FAIL"}  ${l}`);
    console.log("\n=== the wheel only moves when the year does ===");
    let still = true;
    let moves = true;
    for (let i = 1; i < rows.length; i++) {
      const same = rows[i].year === rows[i - 1].year;
      const moved = rows[i].transform !== rows[i - 1].transform;
      if (same && moved) {
        still = false;
        console.log(
          `    chapter ${i} -> ${i + 1}: same year ${rows[i].year}, but the track MOVED`,
        );
      }
      if (!same && !moved) {
        moves = false;
        console.log(
          `    chapter ${i} -> ${i + 1}: ${rows[i - 1].year} -> ${rows[i].year}, but the track did not move`,
        );
      }
    }
    ok("no move between chapters sharing a year (6->7, 8->9)", still);
    ok("still moves whenever the year actually changes", moves);
    ok(
      "exactly one numeral is marked active at every chapter",
      rows.every((r) => r.shown.split(",").length === 1),
    );
  }
  await page.close();
}

await Promise.race([b.close().catch(() => {}), sleep(3000)]);
try {
  b.process()?.kill("SIGKILL");
} catch {}
process.exit(0);
