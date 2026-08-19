/* Careers hero face swap — the measurements the change is allowed to move and
   the ones it is not.

   The headline moves from --font-display (FreightBig, mixed case) to
   --font-display-big (Contralto) set in caps, which changes three things a
   screenshot will not tell you:

     1. the CAP-TOP RATIO the corner labels are seated on. `.heroLabels` sits
        at `0.212 * --hero-title-size - 0.327 * --t-label`, and 0.212 is a
        MEASURED distance from the flex column's top edge to the ink top of
        the first line — a function of the face's ascender-to-cap, the 0.98
        line-height's half-leading and the mask's 0.30em padding. A new face
        moves it, and nothing errors when it does: the labels just drift off
        the cap line.
     2. the LINE WIDTHS. Caps are wider than mixed case, and the 390px column
        is 358px. A wrap here puts three line boxes around a photograph the
        split opens between exactly two.
     3. the FOLD. Beat 3 (the standfirst) has to close above it at 1440x900.

   Run against the dev server. Prints a table; assert nothing, read it. */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = process.env.URL || "http://localhost:3000/careers";

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();

const measure = async (width, height) => {
  await page.setViewport({ width, height });
  await page.goto(URL, { waitUntil: "networkidle2" });
  await page.evaluate(() => document.fonts.ready);
  // the entrance is ~2.5s of clock; let it settle so nothing is mid-transform
  await new Promise((r) => setTimeout(r, 3500));
  return page.evaluate(() => {
    const split = document.querySelector('[class*="heroSplit"]');
    const top = document.querySelector('[class*="heroLineTop"]');
    const bot = document.querySelector('[class*="heroLineBot"]');
    const labels = document.querySelector('[class*="heroLabels"]');
    const stand = document.querySelector('[class*="heroStand"]');
    const band = document.querySelector('[class*="heroBand"]');

    /* CAP TOP BY INK, not by line box. A zero-height strut gives the
       baseline; canvas actualBoundingBoxAscent gives cap height above it. */
    const capTopOf = (el) => {
      const cs = getComputedStyle(el);
      const strut = document.createElement("span");
      strut.style.cssText = "display:inline-block;width:0;height:0;overflow:hidden";
      el.appendChild(strut);
      const baseline = strut.getBoundingClientRect().top;
      strut.remove();
      const c = document.createElement("canvas").getContext("2d");
      c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = c.measureText(el.textContent.trim().slice(0, 1) || "W");
      return baseline - m.actualBoundingBoxAscent;
    };

    const lineBoxes = (el) => {
      // count rendered line boxes via client rects of a range over the element
      const r = document.createRange();
      r.selectNodeContents(el);
      const rects = [...r.getClientRects()].filter((x) => x.height > 1);
      const tops = new Set(rects.map((x) => Math.round(x.top)));
      return tops.size;
    };

    const inkWidth = (el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      const rects = [...r.getClientRects()].filter((x) => x.height > 1);
      if (!rects.length) return 0;
      return Math.max(...rects.map((x) => x.right)) - Math.min(...rects.map((x) => x.left));
    };

    const cs = getComputedStyle(top);
    const titlePx = parseFloat(
      getComputedStyle(document.querySelector('[class*="hero"]'))
        .getPropertyValue("--hero-title-size")
    ) || parseFloat(cs.fontSize);

    const sRect = split.getBoundingClientRect();
    return {
      face: cs.fontFamily,
      transform: cs.textTransform,
      tracking: cs.letterSpacing,
      titlePx: parseFloat(cs.fontSize),
      colW: +sRect.width.toFixed(1),
      capTopRatio: +((capTopOf(top) - sRect.top) / parseFloat(cs.fontSize)).toFixed(4),
      labelCapDelta: +(capTopOf(top) - capTopOf(labels.querySelector("span"))).toFixed(2),
      topLines: lineBoxes(top),
      botLines: lineBoxes(bot),
      topInk: +inkWidth(top).toFixed(1),
      botInk: +inkWidth(bot).toFixed(1),
      standGap: +(
        stand.getBoundingClientRect().top - bot.getBoundingClientRect().bottom
      ).toFixed(1),
      bandTop: +band.getBoundingClientRect().top.toFixed(1),
      standBottom: +stand.getBoundingClientRect().bottom.toFixed(1),
      foldClear: +(window.innerHeight - stand.getBoundingClientRect().bottom).toFixed(1),
      /* the whole vertical stack, so a fit can be solved rather than guessed */
      vh: window.innerHeight,
      heroTop: +document.querySelector('[class*="hero"]').getBoundingClientRect().top.toFixed(1),
      /* the two slacks the centring is supposed to equalise: air above the
         first line's box and below the standfirst, inside the hero box */
      airTop: +(top.getBoundingClientRect().top -
        document.querySelector('[class*="hero"]').getBoundingClientRect().top).toFixed(1),
      airBot: +(document.querySelector('[class*="hero"]').getBoundingClientRect().bottom -
        stand.getBoundingClientRect().bottom).toFixed(1),
      labelSeated: getComputedStyle(labels).position === "absolute",
      lineH: +top.getBoundingClientRect().height.toFixed(1),
      bandH: +band.getBoundingClientRect().height.toFixed(1),
      standH: +stand.getBoundingClientRect().height.toFixed(1),
      bandAir: getComputedStyle(document.querySelector('[class*="hero"]')).getPropertyValue("--band-air").trim(),
      /* labels vs headline ink: negative means they overlap */
      labelClear: (() => {
        const l = [...labels.querySelectorAll("span")].map((x) => x.getBoundingClientRect());
        const r = document.createRange(); r.selectNodeContents(top);
        const ink = [...r.getClientRects()].filter((x) => x.height > 1);
        if (!ink.length || !l.length) return null;
        const left = Math.min(...ink.map((x) => x.left));
        const right = Math.max(...ink.map((x) => x.right));
        return +Math.min(left - l[0].right, l[l.length - 1].left - right).toFixed(1);
      })(),
    };
  });
};

for (const [w, h] of [[1920, 1080], [1512, 982], [1440, 900], [1280, 800], [1280, 1024], [1024, 768], [768, 1024], [900, 900], [390, 844], [320, 844]]) {
  const m = await measure(w, h);
  console.log(`\n---- ${w}x${h} ----`);
  for (const [k, v] of Object.entries(m)) console.log(`  ${k.padEnd(14)} ${v}`);
}
await b.close();
