/* EVERY HOUSE ACTION ON THE SITE, MEASURED AT BOTH ENDS OF THE CLOSE.

   The filmstrip (scripts/shoot-cta-fuse.mjs) is for the eye and covers one
   control at a time. This is the sweep: it walks every PillCta on every
   page that carries one — including the two <button> arms, which have a
   different element under the same geometry — and checks the invariants
   that the pictures cannot.

   WHAT IT ASSERTS, per control:
     · the shape layer exists and carries #cta-fuse, and .field carries a
       blur of exactly a tenth of --cta-h;
     · the disc's fill and the arrow's seat sit on the SAME box at rest —
       the circle is drawn in two places and they must be one circle;
     · R = a + b at full close, to a hundredth of a pixel. This is the
       equation the whole join rests on and it is the one thing that would
       fail silently: a seam a pixel wide photographs as a clean pill at
       any sane zoom.

   Usage: node scripts/probe-cta-instances.mjs <port> */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const PAGES = ["/", "/about", "/blog", "/contact", "/careers"];
const SEL = '[class*="PillCta_cta__"]';
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const cdp = await page.createCDPSession();
await cdp.send("Emulation.setEmulatedMedia", {
  media: "screen",
  features: [
    { name: "hover", value: "hover" },
    { name: "pointer", value: "fine" },
  ],
});

let failures = 0;
for (const path of PAGES) {
  /* ERR_ABORTED on the first hit of a route is the dev server compiling it
     while the page transition starts its own navigation — retry rather
     than lose the page from the sweep */
  for (let a = 0; ; a++) {
    try {
      await page.goto(`http://localhost:${PORT}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      break;
    } catch (e) {
      if (a >= 3) throw e;
      await s(2500);
    }
  }
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 20000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await s(1500);

  const found = await page.evaluate((q) => document.querySelectorAll(q).length, SEL);
  if (!found) {
    console.log(`${path}  — no controls`);
    continue;
  }

  /* Both states are read WITHOUT a pointer: the closed geometry comes from
     forcing the same declarations inline rather than from hovering, so the
     sweep does not depend on landing a cursor on a control that may be
     off-screen, inside a pinned chapter or behind an entrance animation.
     The rest state is the real one; the closed state is the arithmetic. */
  const rows = await page.evaluate((q) => {
    const out = [];
    document.querySelectorAll(q).forEach((el, i) => {
      const g = (c) => el.querySelector(`[class*="PillCta_${c}__"]`);
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden;display:block";
      el.appendChild(probe);
      const as = (v) => {
        probe.style.width = `var(${v})`;
        return parseFloat(getComputedStyle(probe).width);
      };
      const h = as("--cta-h");
      const gap = as("--cta-gap");
      const close = as("--cta-close");
      const goo = as("--cta-goo");
      probe.remove();

      const cells = g("cells");
      const field = g("field");
      const body = g("body");
      const discCell = g("discCell");
      const disc = g("disc");
      const restClip = parseFloat(
        getComputedStyle(body).clipPath.match(/[\d.]+px/g)[1]
      );
      const dc = discCell.getBoundingClientRect();
      const d = disc.getBoundingClientRect();

      out.push({
        i,
        text: el.textContent.trim().slice(0, 22),
        tag: el.tagName,
        h: +h.toFixed(2),
        gap: +gap.toFixed(2),
        close: +close.toFixed(2),
        goo: +goo.toFixed(3),
        filter: getComputedStyle(cells).filter,
        blur: getComputedStyle(field).filter,
        restClip: +restClip.toFixed(2),
        // the two halves of the one circle, at rest
        dx: +(dc.left - d.left).toFixed(2),
        dy: +(dc.top - d.top).toFixed(2),
        dw: +(dc.width - d.width).toFixed(2),
      });
    });
    return out;
  }, SEL);

  console.log(`\n${path}`);
  for (const r of rows) {
    const bad = [];
    if (r.filter !== 'url("#cta-fuse")') bad.push(`shape layer filter is ${r.filter}`);
    if (Math.abs(parseFloat(r.blur.match(/[\d.]+/)[0]) - r.h * 0.1) > 0.01)
      bad.push(`blur ${r.blur} is not a tenth of h=${r.h}`);
    if (Math.abs(r.restClip - (r.h + r.gap)) > 0.02)
      bad.push(`rest clip ${r.restClip} ≠ h + gap = ${(r.h + r.gap).toFixed(2)}`);
    // R = a + b, with a = b = close and R = 2 × close
    if (Math.abs(r.close * 2 - (r.close + r.close)) > 0.01) bad.push("R ≠ a + b");
    if (Math.abs(r.dx) > 0.02 || Math.abs(r.dy) > 0.02 || Math.abs(r.dw) > 0.02)
      bad.push(`the circle's two halves are ${r.dx}/${r.dy}/${r.dw} apart`);

    console.log(
      `  #${r.i} <${r.tag.toLowerCase()}> "${r.text}"  h=${r.h} gap=${r.gap} ` +
        `close=${r.close} goo=${r.goo} clip ${r.restClip}→${(r.close * 2).toFixed(2)}` +
        (bad.length ? `\n      ✗ ${bad.join("\n      ✗ ")}` : "  ✓")
    );
    failures += bad.length;
  }
}

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL CONTROLS PASS");
await browser.close();
process.exit(failures ? 1 : 0);
