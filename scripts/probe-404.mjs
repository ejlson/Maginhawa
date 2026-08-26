/* Acceptance probe for the 404 (app/not-found.tsx). Reads the things a
   screenshot argues about and cannot settle:

     · does the HERO fit the space it is given — `scrollHeight - clientHeight`
       on the hero itself. This is the one that matters and the one this file
       used to miss entirely; see the warning below.
     · does the CTA clear the door list's top rule, which is the visible
       symptom of the above and the thing a reader actually notices
     · is every door reachable — the last door's bottom against the viewport
     · the clearance between the numeral's ink and the headline's
     · whether each door's arrow is nearer its OWN label than the next
       door's — it was not, in the first draft

   ⚠️ THIS PROBE ONCE PASSED A PAGE THAT WAS BROKEN ON EVERY PHONE. It
   asserted on `clipped` — the LAST DOOR'S bottom edge — and the doors are
   `flex: 0 0 auto`, pinned to the bottom of a fixed-height page. They cannot
   move, so that number cannot fail. Meanwhile the hero, which was `flex: 1 1
   auto; min-height: 0`, was being squeezed below its content's height and
   drawing the overflow on top of the doors: 13px of it at 375x812, 104px at
   320x568, 111px at 667x375. `clipped` read -20 the whole time. A measurement
   aimed at the part that cannot move is not a test. `heroOvf` below is.

   Run against the dev server; the path is any path that does not exist.
   PORT overrides the port — `npm run dev` takes another one when 3000 is
   busy, and a probe silently measuring a different project's dev server is
   the other way this file can report a green that means nothing. */
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args:["--no-sandbox","--hide-scrollbars"] });
const p = await b.newPage();
const PORT = process.env.PORT || "3000";
const URL = `http://localhost:${PORT}/this-path-does-not-exist`;

/* CONSENT=accepted suppresses the cookie card, which is the OTHER state this
   page has to be correct in and the one most readers are actually in — the
   card shows once. With the card up, app/not-found.module.css reserves
   `--consent-h` under the doors and a phone scrolls by roughly the card's
   height; with it down, the reserve is 0px and the page should be back on
   one screen. Run the probe both ways: the numbers only mean something as a
   pair. `mg-consent-v2` is CONSENT_KEY in lib/consent.ts. */
const seedConsent = process.env.CONSENT === "accepted";

/* ⚠️ NOT `networkidle2`, AND NOT A LONGER TIMEOUT EITHER. A Next dev server
   holds the HMR socket open for as long as the page lives, so "two or fewer
   connections for 500ms" is a condition this page can fail to reach on a
   busy machine no matter how long it is given — the probe then dies on a
   navigation timeout having measured nothing. The gate that actually matters
   for a layout measurement is the FONT: every number in this file moves when
   Contralto swaps in. So: wait for the document, then for `fonts.ready`,
   then settle. */
const load = async () => {
  await p.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  if (seedConsent) {
    /* written on the origin, then reloaded — the banner reads it on mount */
    await p.evaluate(() =>
      localStorage.setItem(
        "mg-consent-v2",
        JSON.stringify({ analytics: true, marketing: true, at: 0, v: 2 }),
      ),
    );
    await p.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  }
  await p.evaluate(() => document.fonts.ready);
  /* ⚠️ THE CARD IS CLIENT-ONLY, SO A FIXED SETTLE IS A COIN FLIP. CookieBanner
     starts with `ready = false` and only renders after its mount effect, so on
     a dev server whose hydration is slower than the settle it is simply not
     there yet — which showed up as the card appearing at 375x812 and not at
     390x844 in the same run, and made the `--consent-h` column meaningless.
     Wait for the thing itself, bounded: present when it should be, and a
     short fixed wait when it should not be (there is nothing to wait for). */
  if (seedConsent) {
    await new Promise((r) => setTimeout(r, 900));
  } else {
    await p
      .waitForSelector('[class*="CookieBanner_banner"]', { timeout: 6000 })
      .catch(() => {});
    await new Promise((r) => setTimeout(r, 500));
  }
};
/* Desktop first, then the phones. The landscape pair at the end are the
   worst case on the whole list — a 375px-tall window still owes a headline,
   a paragraph, a CTA and five doors. */
const SHAPES = [
  [1920, 1080], [1512, 982], [1440, 900], [1440, 700], [1280, 800],
  [1024, 768], [1024, 600], [900, 900],
  [430, 932], [393, 852], [390, 844], [375, 812], [375, 667], [360, 740],
  [320, 568], [844, 390], [667, 375],
];

const read = () => p.evaluate(() => {
  const nav = document.querySelector('nav[aria-label="Where to go instead"]');
  const li = nav?.querySelectorAll("li") ?? [];
  const hero = document.querySelector("#main-content section");
  const ul = nav?.querySelector("ul");
  const cta = document.querySelector('#main-content a[href="/"]');
  const num = [...document.querySelectorAll("p")].find(e=>e.textContent.trim()==="404");
  const h1 = document.querySelector("h1");
  const r = e => { const b = e.getBoundingClientRect(); return {t:+b.top.toFixed(1),b:+b.bottom.toFixed(1),h:+b.height.toFixed(1),w:+b.width.toFixed(1)}; };
  return {
    navFound: !!nav,
    navBox: nav ? r(nav) : null,
    navDisplay: nav ? getComputedStyle(nav).display : null,
    liCount: li.length,
    firstLi: li[0] ? r(li[0]) : null,
    firstA: li[0]?.querySelector("a") ? { ...r(li[0].querySelector("a")), color: getComputedStyle(li[0].querySelector("a")).color } : null,
    numeral: num ? { ...r(num), lh: getComputedStyle(num).lineHeight, fs: getComputedStyle(num).fontSize } : null,
    h1: h1 ? r(h1) : null,
    /* box clearance between the numeral and the headline */
    numToTitle: num && h1 ? +(h1.getBoundingClientRect().top - num.getBoundingClientRect().bottom).toFixed(1) : null,
    /* per door: distance from its arrow to its OWN label vs to the label of
       the door beside it. `own < next` is the assertion — an arrow closer
       to the next door's title than to its own reads as that one's marker,
       which is what the first draft shipped.

       ⚠️ ONLY A DOOR ON THE SAME ROW COUNTS. The grid is auto-fit, so below
       ~5 columns the next door in DOM order sits on the row underneath and
       to the LEFT, and comparing against it reports a false ambiguity at
       every narrow width. Same `top` is the row test. */
    arrows: [...li].map((el, i, all) => {
      const a = el.querySelector('[aria-hidden]')?.getBoundingClientRect();
      const own = el.querySelector('a > span > span')?.getBoundingClientRect();
      if (!a || !own) return null;
      const nextEl = all[i + 1];
      const sameRow =
        nextEl &&
        Math.abs(nextEl.getBoundingClientRect().top - el.getBoundingClientRect().top) < 2;
      const next = sameRow ? nextEl.querySelector('a > span > span')?.getBoundingClientRect() : null;
      return {
        own: +(a.left - own.right).toFixed(1),
        next: next ? +(next.left - a.right).toFixed(1) : null,
      };
    }),
    docW: document.documentElement.clientWidth,
    /* ⚠️ REPORT THE STATE THAT WAS ACTUALLY MEASURED, NOT THE ONE REQUESTED.
       An earlier run printed "consent card: SHOWING" over a set of numbers
       taken with no card on the page — the env var says what was ASKED for,
       this says what was there. They are allowed to differ (the card needs
       a purpose configured in .env.local; with none, `consentRequired` is
       false and it never renders) and the summary has to say which. */
    bannerUp: !!document.querySelector('[class*="CookieBanner_banner"]'),
    consentH:
      getComputedStyle(document.documentElement)
        .getPropertyValue("--consent-h")
        .trim() || "0px",
    /* ⚠️ THE ONE THAT ACTUALLY FAILS. A flex item squeezed below its content
       does not scale the content down — it draws it outside its own box, on
       top of whatever is next. This is that overflow, in pixels, and it must
       be <= 0 at every shape. */
    heroOvf: hero ? +(hero.scrollHeight - hero.clientHeight).toFixed(1) : null,
    /* the same failure as a reader sees it: clearance from the CTA pill's
       bottom edge to the door list's top RULE. Negative means the rule is
       drawn across the pill. */
    ctaGap: cta && ul
      ? +(ul.getBoundingClientRect().top - cta.getBoundingClientRect().bottom).toFixed(1)
      : null,
    /* The last door's bottom edge against the FOLD. This is no longer a
       pass/fail: `.page` is `min-height` now and the page scrolls, so a
       positive number means "one scroll away", not "gone". It is still worth
       printing, because it is the number that says whether the one-screen
       brief survived at a given shape — 0 or below is one screen.

       ⚠️ WHEN `.page` CARRIED `overflow: hidden` THIS WAS THE ONLY
       ASSERTION IN THE FILE, and it could not fail: the doors are
       `flex: 0 0 auto` at the bottom of a fixed-height page. `scrollHeight`
       was useless for the same reason — clipped to the viewport by
       definition. Both were measuring the immovable part. `heroOvf` above
       is the one with teeth. */
    clipped: (() => {
      const last = li[li.length - 1];
      if (!last) return null;
      return +(last.getBoundingClientRect().bottom - window.innerHeight).toFixed(1);
    })(),
    scrolls: +(document.documentElement.scrollHeight - window.innerHeight).toFixed(1),
  };
});

let bannerSeen = false;
let worstHero = -Infinity;
let worstCta = Infinity;
let oneScreen = 0;
const fails = [];
for (const [w, h] of SHAPES) {
  /* the phone shapes get real mobile emulation — a desktop UA at 375px wide
     is not the thing being shipped to */
  const phone = w <= 640 || h <= 520;
  await p.setViewport({
    width: w, height: h,
    isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1,
  });
  await load();
  const m = await read();
  /* ⚠️ A MISSING PAGE MUST NOT READ AS A PASSING ONE. Every measurement below
     is `null` when its element is absent, and `null <= 0` is TRUE in JS — so
     a dev server answering 500, or serving Next's own built-in 404 instead of
     app/not-found.tsx, produced a full run of `null`s and the summary line
     "all shapes pass". That is worse than a crash. If the doors are not on
     the page, there is nothing here to measure and the run is void. */
  if (!m.navFound || m.liCount !== 5 || m.heroOvf === null) {
    console.error(
      `\n${w}x${h}: the 404 did not render — nav ${m.navFound}, doors ` +
        `${m.liCount}, hero ${m.heroOvf === null ? "missing" : "found"}.\n` +
        `Nothing was measured. Check the server on PORT=${PORT} is serving ` +
        `app/not-found.tsx and not an error stub.`,
    );
    process.exit(2);
  }
  bannerSeen = bannerSeen || m.bannerUp;
  worstHero = Math.max(worstHero, m.heroOvf);
  worstCta = Math.min(worstCta, m.ctaGap);
  if (m.clipped <= 0) oneScreen += 1;
  const arrows = m.arrows.filter(Boolean);
  const arrowOk = arrows.every((a) => a.next === null || a.own < a.next);
  const ok = m.heroOvf <= 0 && m.ctaGap >= 0 && arrowOk;
  if (!ok) fails.push(`${w}x${h}`);
  console.log(
    `${String(w).padStart(4)}x${String(h).padEnd(4)}  heroOvf ${String(m.heroOvf).padStart(6)}` +
      `  ctaGap ${String(m.ctaGap).padStart(7)}` +
      `  clipped ${String(m.clipped).padStart(7)}` +
      `  scrolls ${String(m.scrolls).padStart(5)}` +
      `  numToTitle ${String(m.numToTitle).padStart(6)}` +
      `  arrows ${arrowOk ? "ok " : "AMB"}` +
      `  card ${m.bannerUp ? String(m.consentH).padStart(6) : "  none"}` +
      `${ok ? "" : "  <-- FAIL"}`,
  );
}
console.log(
  `\nconsent card: asked for ${seedConsent ? "DISMISSED" : "SHOWING"}, ` +
    `actually ${bannerSeen ? "ON the page" : "ABSENT"}` +
    (!seedConsent && !bannerSeen
      ? " — no purpose configured in .env.local, so this run says nothing " +
        "about the --consent-h clearance"
      : "") +
    `\n` +
    `worst hero overflow: ${worstHero}px (must be <= 0 — a squeezed hero ` +
    `draws itself on top of the doors)\n` +
    `tightest CTA-to-rule gap: ${worstCta}px (must be >= 0 — below zero the ` +
    `door list's rule crosses the pill)\n` +
    `one screen, no scroll: ${oneScreen}/${SHAPES.length} shapes ` +
    `(the rest scroll, which is allowed — nothing is unreachable)\n` +
    (fails.length ? `FAILED at ${fails.join(", ")}` : "all shapes pass"),
);
if (fails.length) process.exitCode = 1;
if (process.env.OUT) {
  await p.setViewport({ width: 1440, height: 900 });
  await load();
  await p.screenshot({ path: process.env.OUT + "/nf.png" });
}
await b.close();
