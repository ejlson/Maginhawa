/* FAQ BOX — the grid's measured box against its container and the page rail.
 *
 * The contract on /contact's dark zone is the Footer's rail: text left edges
 * cluster at 40 / 503 / 929 at 1440, and the right edge closes at
 * width − 40. This reports, per viewport:
 *
 *   - the FAQ `.layout` grid's own box and its resolved column template
 *   - the `.container` it lives in (they are the SAME element: the div wears
 *     `container` and `layout` together, so container padding and grid tracks
 *     are one box — that is why the two boxes are identical, not a bug)
 *   - the FAQ head / list / row boxes (the list is the accordion)
 *   - the Contact `.grid` above and the ReviewUs table below, because the
 *     table DELIBERATELY reaches half a gutter outside the rail to draw its
 *     own frame and the two must never be confused
 *   - every element on the page whose box escapes the page margin, and
 *     documentElement.scrollWidth vs clientWidth (the real overflow tell),
 *     measured both with hidden scrollbars and with a real one
 *
 * Reveal is whileInView, so the page is read through in viewport steps first —
 * a fullPage capture or a cold measure returns opacity:0 garbage.
 *
 * usage: node scripts/probe-faq-box.mjs [port]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3260";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = [
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
  { w: 820, h: 1180 },
  { w: 390, h: 844 },
];

const run = async (hideScrollbars) => {
  const args = ["--no-sandbox", "--force-device-scale-factor=1"];
  if (hideScrollbars) args.push("--hide-scrollbars");
  const b = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args,
  });
  const page = await b.newPage();

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/contact`, {
      waitUntil: "domcontentloaded",
    });
    await page
      .waitForFunction(() => !document.body.classList.contains("is-loading"), {
        timeout: 60000,
      })
      .catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await sleep(700);

    // read the page down the way a reader does — Reveal is whileInView
    const h = await page.evaluate(
      () => document.documentElement.scrollHeight - innerHeight,
    );
    for (let y = 0; y <= h; y += Math.round(vp.h * 0.6)) {
      await page.evaluate((v) => {
        if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
        else window.scrollTo(0, v);
      }, y);
      await sleep(110);
    }
    await sleep(400);
    // open a row so the answer's box is live too
    await page.evaluate(() => document.querySelectorAll("#faq button")[2]?.click());
    await sleep(500);

    const out = await page.evaluate(() => {
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          l: +r.left.toFixed(1),
          r: +r.right.toFixed(1),
          w: +r.width.toFixed(1),
        };
      };
      const cw = document.documentElement.clientWidth;
      const margin = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--grid-margin",
        ),
      );

      const faq = document.querySelector("#faq");
      const layout = faq?.querySelector(":scope > div");
      const cs = layout ? getComputedStyle(layout) : null;
      const contact = document.querySelector("#contact-us");
      const review = document.querySelector("#leave-a-review");

      return {
        viewport: cw,
        gridMargin: margin,
        rail: { left: margin, right: +(cw - margin).toFixed(1) },
        doc: {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: cw,
          overflows:
            document.documentElement.scrollWidth !==
            document.documentElement.clientWidth,
        },
        faqSection: box(faq),
        faqContainerAndGrid: box(layout),
        faqTemplate: cs?.gridTemplateColumns ?? null,
        faqColumnGap: cs?.columnGap ?? null,
        faqPadding: cs ? `${cs.paddingLeft} / ${cs.paddingRight}` : null,
        faqHead: box(layout?.children[0]),
        faqList: box(layout?.querySelector("ul")),
        faqRow: box(layout?.querySelector("ul button")),
        faqAnswerOpen: box(
          [...(layout?.querySelectorAll("ul p") ?? [])].find(
            (p) => p.getBoundingClientRect().height > 0,
          ),
        ),
        contactGridRule: box(contact?.querySelector(":scope div > div")),
        reviewFrame: box(review?.querySelector("ul")),
        // everything on the page that escapes the page margin
        escapes: [...document.querySelectorAll("body *")]
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(
            (x) =>
              x.r.width > 0 &&
              x.r.height > 0 &&
              (x.r.right > cw - margin + 0.5 || x.r.left < margin - 0.5) &&
              getComputedStyle(x.el).position !== "fixed",
          )
          .slice(0, 14)
          .map((x) => ({
            tag: x.el.tagName,
            cls: (x.el.className?.toString() ?? "").slice(0, 44),
            l: +x.r.left.toFixed(1),
            r: +x.r.right.toFixed(1),
          })),
      };
    });

    console.log(
      `\n===== ${vp.w}x${vp.h}  scrollbars=${hideScrollbars ? "hidden" : "real"} =====`,
    );
    console.log(JSON.stringify(out, null, 2));
  }

  await page.close();
  b.disconnect();
};

await run(true);
await run(false);
process.exit(0);
