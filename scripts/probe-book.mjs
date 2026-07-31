/* Reservations (#book) — does the invitation render, seat and behave?

   The section used to be a four-row booking index; it is now one statement
   and one door to /restaurants, centred on the film. This asserts the things
   that fail SILENTLY: pointer-events on the single link (`.cta` is
   pointer-events:none with only `.cta > *` restored), the blend removal, the
   single clip, both centre lines, the heading setting on one line, and that
   no trace of the old index survives.

   Lenis intercepts scrollIntoView, so scroll via __lenis.

   usage: node scripts/probe-book.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "50853";
const URL = `http://localhost:${PORT}/`;
const s = (ms) => new Promise((r) => setTimeout(r, ms));

let fails = 0;
const rec = (id, ok, detail) => {
  if (!ok) fails++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${id}  ${detail}`);
};

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"],
});

// the heading must set on ONE line at every width down to the phone
for (const [W, H] of [[1920, 1080], [1440, 900], [1280, 800], [981, 800], [390, 844]]) {
  const p = await b.newPage();
  await p.setViewport({ width: W, height: H });
  const mp4 = [];
  p.on("request", (r) => {
    if (r.url().endsWith(".mp4")) mp4.push(r.url().split("/").pop());
  });
  // networkidle0 never settles — the backdrop clip streams forever
  await p.goto(URL, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  });
  await p.evaluate(() => document.fonts.ready);
  await s(2200);

  // park the film at full view so everything is laid out and painted
  await p.evaluate(() => {
    const el = document.querySelector("#book");
    const y = el.getBoundingClientRect().top + window.scrollY;
    window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
  });
  await s(1200);

  const r = await p.evaluate(() => {
    const sec = document.querySelector("#book");
    const cta = sec.querySelector('[class*="Reservations_cta"]');
    const book = sec.querySelector('[class*="Reservations_book"]');
    const h2 = sec.querySelector("h2");
    const links = [...sec.querySelectorAll("a")];
    const a = links[0];
    const cs = getComputedStyle(cta);
    const h2cs = getComputedStyle(h2);
    const root = getComputedStyle(document.documentElement);
    const q = a?.getBoundingClientRect();
    return {
      linkCount: links.length,
      href: a?.getAttribute("href"),
      resolved: a?.href,
      label: a?.innerText.trim(),
      pe: a ? getComputedStyle(a).pointerEvents : null,
      // is the link the actual hit target at its own centre?
      hit: q
        ? (() => {
            const el = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2);
            return !!(el && a.contains(el));
          })()
        : false,
      pill: q ? { w: Math.round(q.width), h: Math.round(q.height) } : null,
      ul: sec.querySelectorAll("ul").length,
      li: sec.querySelectorAll("li").length,
      venues: sec.querySelectorAll("[data-venue]").length,
      text: sec.innerText.replace(/\s+/g, " ").trim(),
      h2text: h2.textContent,
      // one line? compare the rendered height against a single line box
      h2h: Math.round(h2.getBoundingClientRect().height),
      h2line: Math.round(parseFloat(h2cs.fontSize) * parseFloat(h2cs.lineHeight) / parseFloat(h2cs.fontSize)),
      h2lineH: h2cs.lineHeight,
      h2font: h2cs.fontFamily,
      h2size: h2cs.fontSize,
      // getPropertyValue hands back the raw clamp() string, which cannot be
      // compared to a resolved font-size — so resolve the token the only way
      // the cascade will: paint it onto a throwaway element and read it back.
      tDisplay: (() => {
        const probe = document.createElement("span");
        probe.style.cssText = "position:absolute;visibility:hidden;font-size:var(--t-display)";
        document.body.append(probe);
        const v = getComputedStyle(probe).fontSize;
        probe.remove();
        return v;
      })(),
      tDisplayRaw: root.getPropertyValue("--t-display").trim(),
      blend: cs.mixBlendMode,
      z: cs.zIndex,
      // The h2 is a full-width block, so its RECT centre is centred by
      // construction and proves nothing. A Range over its text node gives the
      // inked box — where the glyphs actually sit.
      h2Mid: (() => {
        const rg = document.createRange();
        rg.selectNodeContents(h2);
        const q = rg.getBoundingClientRect();
        return q.left + q.width / 2;
      })(),
      pillMid: q ? q.x + q.width / 2 : null,
      secMidX: sec.getBoundingClientRect().left + sec.getBoundingClientRect().width / 2,
      secMidY: sec.getBoundingClientRect().top + sec.offsetHeight / 2,
      blockMidY: book.getBoundingClientRect().top + book.getBoundingClientRect().height / 2,
      secH: sec.offsetHeight,
      innerH: window.innerHeight,
      stageH: sec.querySelector('[class*="Reservations_stage"]').offsetHeight,
      videos: [...sec.querySelectorAll("video")].map((v) => v.currentSrc).filter(Boolean),
      svgText: sec.querySelectorAll("svg text").length,
      stretch: /textLength|lengthAdjust/.test(sec.innerHTML),
      h1: sec.querySelectorAll("h1").length,
      bookBottom: book.getBoundingClientRect().bottom,
      bookTop: book.getBoundingClientRect().top,
      stageTop: sec.querySelector('[class*="Reservations_stage"]').getBoundingClientRect().top,
      stageBottom: sec.querySelector('[class*="Reservations_stage"]').getBoundingClientRect().bottom,
    };
  });

  console.log(`\n===== ${W}x${H} =====`);
  rec("AC-1.1", r.linkCount === 1 && r.href === "/restaurants",
    `${r.linkCount} <a> in #book, href=${r.href} → ${r.resolved}  label="${r.label}"`);
  rec("AC-1.2", r.ul === 0 && r.li === 0 && r.venues === 0,
    `ul=${r.ul} li=${r.li} [data-venue]=${r.venues}`);
  rec("AC-1.3", !/Bintang|Guanabana|Ramo|Belly|Kentish|Brewer|opentable|sevenrooms|resdiary/i.test(r.text)
    && !/Reservations/i.test(r.text),
    `section text: "${r.text}"`);
  rec("AC-1.4", r.h2text === "Pull up a chair.", `<h2> = ${JSON.stringify(r.h2text)}`);
  rec("AC-2.1", r.svgText === 0 && !r.stretch,
    `svg<text>=${r.svgText}  textLength/lengthAdjust in html: ${r.stretch}`);
  rec("AC-2.2", !/contralto/i.test(r.h2font), `h2 fontFamily = ${r.h2font}`);
  rec("AC-2.3", r.h2size === r.tDisplay || Math.abs(parseFloat(r.h2size) - parseFloat(r.tDisplay)) < 0.5,
    `h2 font-size ${r.h2size}  --t-display resolves to ${r.tDisplay}  (${r.tDisplayRaw})`);
  rec("AC-2.4a", Math.abs(r.h2Mid - r.secMidX) <= 1 && Math.abs(r.pillMid - r.secMidX) <= 1,
    `section centre ${r.secMidX.toFixed(1)}  heading ink centre ${r.h2Mid.toFixed(1)}  pill centre ${r.pillMid.toFixed(1)}`);
  rec("AC-2.4b", Math.abs(r.blockMidY - r.secMidY) <= r.secH * 0.02,
    `block vertical centre ${r.blockMidY.toFixed(1)} vs section centre ${r.secMidY.toFixed(1)} — off by ${Math.abs(r.blockMidY - r.secMidY).toFixed(1)}px (2% of ${r.secH} = ${(r.secH * 0.02).toFixed(1)}px)`);
  if (W >= 981) {
    // one line: Chrome resolves a unitless line-height to px, so the h2's
    // rendered height may not exceed one line box (+ a 35% tolerance for the
    // font's own overshoot)
    rec("AC-2.5", r.h2h <= parseFloat(r.h2lineH) * 1.35,
      `h2 height ${r.h2h}px  one line box ${parseFloat(r.h2lineH).toFixed(1)}px`);
  }
  rec("AC-4.1", r.blend === "normal" && r.z === "2", `.cta mixBlendMode=${r.blend} z-index=${r.z}`);
  rec("pointer", r.pe === "auto" && r.hit, `link pointer-events=${r.pe} hit-testable=${r.hit} pill=${r.pill?.w}x${r.pill?.h}`);
  rec("AC-7.1", r.videos.length === 1, `videos with a src: ${r.videos.map((v) => v.split("/").pop()).join(", ")} | mp4 requests: ${[...new Set(mp4)].join(", ")}`);
  rec("AC-9.1", Math.abs(r.secH - 1.25 * r.innerH) <= 2, `section ${r.secH}  stage ${r.stageH}  1.25*innerH ${1.25 * r.innerH}`);
  rec("clip", r.bookTop >= r.stageTop - 1 && r.bookBottom <= r.stageBottom + 1,
    `stage ${Math.round(r.stageTop)}..${Math.round(r.stageBottom)}  block ${Math.round(r.bookTop)}..${Math.round(r.bookBottom)}`);
  rec("h1", r.h1 === 0, `<h1> in #book: ${r.h1}`);

  await p.close();
}

await b.close();
console.log(`\n${fails === 0 ? "ALL PASS" : `${fails} FAILURE(S)`}`);
process.exit(fails === 0 ? 0 : 1);
