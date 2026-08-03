/* THE /contact AUDIT — the three questions this pass has to answer.
 *
 * Precondition, and the easy one to get wrong: this page is built out of
 * `Reveal`, which is `whileInView`. A `fullPage` screenshot does NOT fire
 * IntersectionObserver, so a naive capture renders every un-entered section as
 * blank ground and every measurement as `opacity:0` garbage. `readThrough()`
 * walks the page down in viewport steps, the way a reader does, first.
 *
 *   1. RAIL. Every text left edge in the dark zone, clustered. The contract is
 *      40 / 503 / 929 at 1440 — the Footer's rails. Also reports the review
 *      table's RULE edges separately: the rail governs where TEXT starts, the
 *      table governs where RULES fall, and this pass has to close the box
 *      without moving the type.
 *   2. THE CONTACT BLOCK. Both columns' top and bottom edges, the first
 *      baseline on each side, and the form's field geometry. The complaint is
 *      that the two halves end at very different heights and read as two
 *      unrelated things.
 *   3. THE FOOTER INVITE. Its box, so the size of the hole removing it leaves
 *      is a measured number rather than a guess.
 *
 * usage: node scripts/probe-contact-audit.mjs [port] [route]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3210";
const ROUTE = process.argv[3] || "/contact";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();

const settle = async () => {
  await page.goto(`http://localhost:${PORT}${ROUTE}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1000);
};

const to = async (y) => {
  await page.evaluate((v) => {
    if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true });
    else window.scrollTo(0, v);
  }, y);
  await sleep(150);
};

const readThrough = async () => {
  const h = await page.evaluate(
    () => document.documentElement.scrollHeight - innerHeight,
  );
  const step = Math.round(page.viewport().height * 0.5);
  for (let y = 0; y <= h; y += step) {
    await to(y);
    await sleep(160);
  }
  await to(h);
  await sleep(700);
  await to(0);
  await sleep(700);
};

const report = {};

for (const vp of [
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
  { w: 820, h: 1180 },
  { w: 390, h: 844 },
]) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  await settle();
  await readThrough();

  report[`${vp.w}x${vp.h}`] = await page.evaluate(() => {
    const round = (n) => Math.round(n * 10) / 10;
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return {
        x: round(r.x),
        right: round(r.right),
        y: round(r.y + scrollY),
        bottom: round(r.bottom + scrollY),
        w: round(r.width),
        h: round(r.height),
      };
    };
    const q = (s, root = document) => root.querySelector(s);
    const qa = (s, root = document) => [...root.querySelectorAll(s)];

    /* ---- 1. rail ---- */
    const zone = q("main > div");
    const textEdges = {};
    if (zone) {
      for (const el of qa("h1,h2,h3,h4,p,span,a,li,div,label,input,textarea", zone)) {
        const t = (el.innerText || el.placeholder || "").trim();
        if (!t) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.opacity === "0") continue;
        // only leaf-ish text so containers don't drown the signal
        if (el.children.length > 2) continue;
        const k = String(Math.round(r.x));
        (textEdges[k] ||= []).push(t.slice(0, 28).replace(/\s+/g, " "));
      }
    }
    const edges = Object.entries(textEdges)
      .map(([x, s]) => ({ x: +x, n: s.length, sample: s.slice(0, 3) }))
      .sort((a, b) => a.x - b.x)
      .filter((e) => e.n >= 1);

    /* ---- review table: where the RULES fall ---- */
    const review = q("#leave-a-review");
    let table = null;
    if (review) {
      const ul = q("ul", review);
      const items = qa("li > a", review);
      const firstName = q("li a span", review);
      if (ul) {
        const cs0 = items[0] ? getComputedStyle(items[0]) : null;
        table = {
          gridBox: box(ul),
          gridBorderTop: getComputedStyle(ul).borderTopWidth,
          firstCell: items[0] ? box(items[0]) : null,
          lastCellInRow: items[2] ? box(items[2]) : null,
          firstNameBox: firstName ? box(firstName) : null,
          cellBorderLeft: cs0 ? cs0.borderLeftWidth : null,
          cellPaddingLeft: cs0 ? cs0.paddingLeft : null,
          cellPaddingRight: cs0 ? cs0.paddingRight : null,
          containerBox: box(q(".container", review)),
          cols: getComputedStyle(ul).gridTemplateColumns,
        };
      }
    }

    /* ---- 2. the contact block ---- */
    const contact = q("#contact-us");
    let block = null;
    if (contact) {
      const info = qa("div", contact).find(
        (d) => d.className && /info/.test(d.className),
      );
      const form = q("form", contact);
      const labels = qa("form .field, form label, form span", contact);
      const fields = qa("form input, form textarea", contact);
      const wordmark = q("svg", contact);
      block = {
        sectionBox: box(contact),
        wordmarkBox: wordmark ? box(wordmark) : null,
        infoBox: info ? box(info) : null,
        formBox: form ? box(form) : null,
        /* `.info` is a stretched grid item so its own box is the whole row —
           what matters is where its CONTENT stops against where the form's
           does. This is the "two columns end at very different heights"
           number. */
        infoContentBottom: info ? box(info.lastElementChild).bottom : null,
        submitBottom: q("button[type=submit]", contact)
          ? box(q("button[type=submit]", contact)).bottom
          : null,
        infoTailMinusSubmit:
          info && q("button[type=submit]", contact)
            ? Math.round(
                info.lastElementChild.getBoundingClientRect().bottom -
                  q("button[type=submit]", contact).getBoundingClientRect()
                    .bottom,
              )
            : null,
        bandRule: (() => {
          const g = q(".container > div:nth-child(2)", contact);
          if (!g) return null;
          const cs = getComputedStyle(g);
          return { width: cs.borderTopWidth, box: box(g) };
        })(),
        gridCols: q(".container > div:nth-child(2)", contact)
          ? getComputedStyle(q(".container > div:nth-child(2)", contact))
              .gridTemplateColumns
          : null,
        firstInfoLabel: (() => {
          const l = info && qa("div", info)[1];
          return l ? { text: l.innerText.trim(), ...box(l) } : null;
        })(),
        fields: fields.map((f) => ({
          id: f.id,
          tag: f.tagName,
          ...box(f),
        })),
        submitBox: q("button[type=submit]", contact)
          ? box(q("button[type=submit]", contact))
          : null,
      };
    }

    /* ---- 3. the footer invite, and what replaced it ---- */
    const footer = q("footer");
    let invite = null;
    if (footer) {
      const h2 = q("h2", footer);
      const inviteEl = h2 ? h2.parentElement : null;
      const top = footer.firstElementChild;
      const visit = q("aside[aria-labelledby='come-and-see-us']");
      invite = {
        footerBox: box(footer),
        topBandBox: top ? box(top) : null,
        topBandCols: top ? getComputedStyle(top).gridTemplateColumns : null,
        // present === the invitation is still rendered on this route
        inviteBox: inviteEl ? box(inviteEl) : null,
        inviteTitle: h2 ? h2.innerText.trim() : null,
        inviteDisplay: inviteEl ? getComputedStyle(inviteEl).display : null,
        markBox: q("a[aria-label*='home']", footer)
          ? box(q("a[aria-label*='home']", footer))
          : null,
        blurbBox: q("p", footer) ? box(q("p", footer)) : null,
        visitBox: visit ? box(visit) : null,
        visitLinks: visit
          ? qa("a", visit).map((a) => ({
              label: (a.getAttribute("aria-label") || a.innerText).trim(),
              href: a.getAttribute("href"),
              ...box(a),
            }))
          : null,
        // the whole point of the overlay: does it clear the footer's rule?
        ruleTop: (() => {
          const rule = qa("div", footer).find((d) => {
            const r = d.getBoundingClientRect();
            return r.height <= 2 && r.width > 200;
          });
          return rule ? box(rule).y : null;
        })(),
      };
    }

    /* ---- 4. contrast, measured against the actual ground ---- */
    const lum = (c) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
    };
    const parse = (s) => {
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
    };
    const groundOf = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c && c.a > 0.9) return c.rgb;
        n = n.parentElement;
      }
      return [255, 255, 255];
    };
    const ratio = (el, colorStr) => {
      const cs = getComputedStyle(el);
      const c = parse(colorStr ?? cs.color);
      if (!c) return null;
      const g = groundOf(el);
      // element opacity multiplies through
      let op = 1;
      let n = el;
      while (n && n !== document.documentElement) {
        op *= parseFloat(getComputedStyle(n).opacity || "1");
        n = n.parentElement;
      }
      const a = c.a * op;
      const blend = c.rgb.map((v, i) => v * a + g[i] * (1 - a));
      const l1 = lum(blend);
      const l2 = lum(g);
      const hi = Math.max(l1, l2);
      const lo = Math.min(l1, l2);
      return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
    };
    const px = (el) => parseFloat(getComputedStyle(el).fontSize);
    const samples = [];
    const add = (label, el, colorStr) => {
      if (!el) return;
      samples.push({
        label,
        px: Math.round(px(el) * 10) / 10,
        weight: getComputedStyle(el).fontWeight,
        ratio: ratio(el, colorStr),
      });
    };
    const contactEl = q("#contact-us");
    if (contactEl) {
      add("contact label", qa("div", contactEl).find((d) => /^ENQUIRIES$/i.test(d.innerText.trim())));
      add("contact body (phone)", q("a[href^='tel']", contactEl));
      add("office-hours note", qa("p", contactEl).find((p) => /Head-office/.test(p.innerText)));
      const inp = q("input", contactEl);
      if (inp) {
        add(
          "placeholder",
          inp,
          getComputedStyle(inp, "::placeholder").color,
        );
        samples.push({
          label: "field underline (UI, needs 3:1)",
          px: null,
          weight: null,
          ratio: ratio(inp, getComputedStyle(inp).borderBottomColor),
        });
      }
      add("wordmark", q("text", contactEl), getComputedStyle(q("text", contactEl)).fill);
    }
    const reviewEl = q("#leave-a-review");
    if (reviewEl) {
      add("review title", q("h2", reviewEl));
      add("review lede", qa("p", reviewEl)[0]);
      add("restaurant name", q("li a span", reviewEl));
      add("restaurant tag", qa("li a span", reviewEl)[1]);
      const ul = q("ul", reviewEl);
      if (ul) {
        samples.push({
          label: "table rule (decorative)",
          px: null,
          weight: null,
          ratio: ratio(ul, getComputedStyle(ul).borderTopColor),
        });
      }
    }
    const visitEl = q("aside[aria-labelledby='come-and-see-us']");
    if (visitEl) {
      add("visit title", q("h2", visitEl));
      add("visit name", q("li a span", visitEl));
      add("visit address", qa("li a span", visitEl)[1]);
      add("visit all-link", q("a[href='/restaurants']", visitEl));
    }

    /* ---- 5. every form control's accessible name ---- */
    const controls = qa("#contact-us input, #contact-us textarea").map((c) => {
      const lab =
        document.querySelector(`label[for='${c.id}']`)?.innerText.trim() ||
        c.getAttribute("aria-label") ||
        null;
      return { id: c.id, label: lab, placeholder: c.placeholder };
    });

    return {
      docW: document.documentElement.clientWidth,
      scrollH: document.documentElement.scrollHeight,
      hasHOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      edges,
      table,
      block,
      invite,
      contrast: samples,
      controls,
      headings: qa("h1,h2,h3,h4").map(
        (h) => `${h.tagName} ${h.innerText.trim().slice(0, 40)}`,
      ),
    };
  });
}

console.log(JSON.stringify(report, null, 1));

await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
