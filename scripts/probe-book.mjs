/* Reservations (#book) — does the invitation render, seat and behave?

   The section used to be a four-row booking index; it is now a live London
   clock, one statement, one saffron door to /restaurants and one line of
   supporting copy, centred on the film. This asserts the things that fail
   SILENTLY: pointer-events on the single link (`.cta` is pointer-events:none
   with only `.cta > *` restored), the blend removal, the single clip, both
   centre lines, the heading setting on one line, and that no trace of the old
   index survives.

   It also carries the three things about the clock that can only break at
   runtime — that it is LONDON's time and not the test machine's, that the
   placeholder and the real value occupy the same box, and that hydrating it
   produces no mismatch — plus the accent pill's four colour states.

   Lenis intercepts scrollIntoView, so scroll via __lenis.

   usage: node scripts/probe-book.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "50853";
const URL = `http://localhost:${PORT}/`;
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const lin = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const rgb = (css) => css.match(/[\d.]+/g).slice(0, 3).map(Number);
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

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

      // ---- the live clock ----
      clockText: sec.querySelector('[class*="Reservations_clock"]')?.innerText.trim(),
      clockTime: sec.querySelector('[class*="Reservations_clockTime"]')?.textContent,
      clockOrder: (() => {
        // it must sit ABOVE the heading, in the eyebrow's old slot
        const c = sec.querySelector('[class*="Reservations_clock"]');
        return c ? c.getBoundingClientRect().bottom <= h2.getBoundingClientRect().top + 1 : false;
      })(),

      // ---- the supporting copy ----
      supText: sec.querySelector('[class*="Reservations_support"]')?.innerText.replace(/\s+/g, " ").trim(),
      // AC-4.1 — on the block's centre line, BELOW the pill
      supMid: (() => {
        const el = sec.querySelector('[class*="Reservations_support"]');
        if (!el) return null;
        const rg = document.createRange();
        rg.selectNodeContents(el);
        const t = rg.getBoundingClientRect();
        return t.left + t.width / 2;
      })(),
      supBelowPill: (() => {
        const el = sec.querySelector('[class*="Reservations_support"]');
        return el && q ? el.getBoundingClientRect().top >= q.bottom - 1 : false;
      })(),

      // ---- the accent pill: rest, and the ring ----
      pillFill: a ? getComputedStyle(a).backgroundColor : null,
      pillInk: a ? getComputedStyle(a).color : null,
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

  /* ---------- the live clock ---------- */

  // AC-3.1 — the LONDON time, not the machine's. Recomputed here from the same
  // Intl contract the component uses; ±1 min covers the gap between the
  // component's last tick and this assertion.
  const now = new Date();
  const expect = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(now);
  const near = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(now.getTime() - 60_000));
  rec("AC-3.1", r.clockTime === expect || r.clockTime === near,
    `clock reads "${r.clockTime}"  Europe/London is ${expect} (or ${near} a minute ago)  — full line: "${r.clockText}"`);
  // AC-3.5 — no claim about opening, serving or availability. Asserted as a
  // vocabulary ban, because that is the failure mode: a well-meaning edit that
  // adds "still serving" to a sentence with no data behind it.
  rec("AC-3.5", !/\bopen|clos|serv|availab|book now|walk[- ]?in|table[s]? (tonight|now)|last order/i
    .test(`${r.clockText} ${r.supText}`),
    `clock + support copy make no availability claim: "${r.clockText}" / "${r.supText}"`);
  rec("clock-slot", r.clockOrder, `the clock sits above the heading`);

  /* ---------- the supporting copy ---------- */

  // AC-4.1 — centred, ABOVE the pill.
  // The order was inverted after this assertion was written: with the pill in
  // the middle of the stack it measured 43px above and 34px below, so it read
  // as centred inside the lockup rather than as its last move, and the section
  // ended on an explanation after handing the reader the action. The copy now
  // binds up to the heading it explains and the pill closes the block, so
  // `supBelowPill` must be FALSE.
  rec("AC-4.1s", Math.abs(r.supMid - r.secMidX) <= 1 && !r.supBelowPill,
    `support ink centre ${r.supMid?.toFixed(1)} vs section centre ${r.secMidX.toFixed(1)}; above the pill: ${!r.supBelowPill}`);
  // AC-4.3 — it must not simply say the heading or the button again
  rec("AC-4.3", !/pull up a chair|choose a restaurant/i.test(r.supText || ""),
    `support copy: "${r.supText}"`);

  /* ---------- the accent pill ---------- */

  // AC-2.1 — saffron fill, maroon label
  {
    const fill = rgb(r.pillFill);
    const ink = rgb(r.pillInk);
    const c = contrast(fill, ink);
    rec("AC-2.1p",
      fill.join(",") === "201,126,63" && ink.join(",") === "47,0,0" && c >= 4.5,
      `rest fill rgb(${fill}) label rgb(${ink}) → ${c.toFixed(2)}:1`);
  }

  // AC-2.2 / AC-2.4 — hover and active, measured from the live element rather
  // than read off the stylesheet, so a media query that never matched would show
  if (W >= 981) {
    const st = await p.evaluate(async () => {
      const a = document.querySelector('[class*="Reservations_action"]');
      const q = a.getBoundingClientRect();
      return { cx: q.x + q.width / 2, cy: q.y + q.height / 2 };
    });
    await p.mouse.move(st.cx, st.cy);
    await s(500);
    const hov = await p.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('[class*="Reservations_action"]'));
      return { bg: cs.backgroundColor, fg: cs.color };
    });
    const hc = contrast(rgb(hov.bg), rgb(hov.fg));
    rec("AC-2.2p", hc >= 4.5, `hover fill ${hov.bg} label ${hov.fg} → ${hc.toFixed(2)}:1`);

    // A press on this element is a press on a <Link>: releasing the button
    // fires a click and Next routes away to /restaurants mid-probe, taking
    // #book with it. Swallow exactly one click first — the state under test is
    // the :active paint, not the navigation (probe-book-magnet.mjs owns that).
    await p.evaluate(() => {
      document.querySelector('[class*="Reservations_action"]')
        .addEventListener("click", (e) => e.preventDefault(), { capture: true, once: true });
    });
    await p.mouse.down();
    await s(250);
    const act = await p.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('[class*="Reservations_action"]'));
      return { bg: cs.backgroundColor, fg: cs.color };
    });
    await p.mouse.up();
    // AC-2.4 — a press has to be SEEN. Anything under ~1.1:1 against the rest
    // fill is a change the eye does not register.
    const sep = contrast(rgb(act.bg), [201, 126, 63]);
    const ac = contrast(rgb(act.bg), rgb(act.fg));
    rec("AC-2.4p", sep >= 1.1 && ac >= 4.5,
      `active fill ${act.bg} — ${sep.toFixed(2)}:1 from the rest fill, label ${ac.toFixed(2)}:1 on it`);
    await p.mouse.move(5, 5);
    await s(400);

    // AC-2.3 — the ring against BOTH the pill's fill and the scrim behind it.
    // The cream outline sits at +3px offset, i.e. on the scrim; the inset
    // maroon ring sits on the fill. Each half is checked against what it
    // actually touches.
    // :focus-visible is a HEURISTIC, not a state you can request — Chrome sets
    // it only when focus moved by keyboard, and `focus({focusVisible:true})` is
    // quietly ignored here (it reports outline-style:none, i.e. the `:focus {
    // outline: none }` rule in globals.css, and the probe would then be
    // measuring the initial `medium currentColor` defaults). So land on the
    // previous focusable element programmatically and Tab into this one.
    await p.evaluate(() => {
      const all = [...document.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.offsetParent !== null || el.getClientRects().length);
      const i = all.indexOf(document.querySelector('[class*="Reservations_action"]'));
      all[Math.max(0, i - 1)].focus();
    });
    await p.keyboard.press("Tab");
    await s(300);
    const ring = await p.evaluate(() => {
      const a = document.querySelector('[class*="Reservations_action"]');
      const cs = getComputedStyle(a);
      return {
        focused: document.activeElement === a,
        style: cs.outlineStyle,
        outline: cs.outlineColor,
        width: cs.outlineWidth,
        offset: cs.outlineOffset,
        shadow: cs.boxShadow,
        fill: cs.backgroundColor,
      };
    });
    // the scrim's darkest-permitted backdrop under the pill: the composited
    // pool over a blown-white frame, measured at 0.759 alpha of rgba(18,0,0)
    const SCRIM_WORST = [255 - 237 * 0.759, 255 * (1 - 0.759), 255 * (1 - 0.759)];
    const vsFill = contrast(rgb(ring.outline), rgb(ring.fill));
    const vsScrim = contrast(rgb(ring.outline), SCRIM_WORST);
    const inner = /inset/.test(ring.shadow) ? contrast(rgb(ring.shadow), rgb(ring.fill)) : 0;
    rec("AC-2.3p", ring.focused && ring.style !== "none" && vsScrim >= 3 && inner >= 3,
      `focused=${ring.focused} ring ${ring.width} ${ring.style} ${ring.outline} @${ring.offset}: ${vsScrim.toFixed(2)}:1 vs the scrim it sits on, ${vsFill.toFixed(2)}:1 vs the fill; inset ring ${inner.toFixed(2)}:1 vs the fill`);
    await p.evaluate(() => document.activeElement.blur());
  }

  await p.close();
}

/* ===================================================================
   The clock's runtime contract: hydration, reserved width, teardown.
   =================================================================== */
console.log(`\n===== the live clock =====`);
{
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });

  const noise = [];
  p.on("console", (m) => noise.push(`${m.type()}: ${m.text()}`));
  p.on("pageerror", (e) => noise.push(`pageerror: ${e.message}`));

  /* Fingerprint the clock's timer BEFORE any of the page's script runs.
     `LondonClock` re-arms with `60000 - (Date.now() % 60000) + 250`, so at the
     instant of the call the requested delay matches that expression to within a
     millisecond or two. Nothing else on the page schedules against the wall
     clock's minute boundary, which makes this a specific identifier rather than
     a delay-range guess — and it is the only way to prove the teardown, since
     React 19 makes a setState on an unmounted component a silent no-op and so
     emits no warning to look for. */
  await p.evaluateOnNewDocument(() => {
    const st = window.setTimeout.bind(window);
    const ct = window.clearTimeout.bind(window);
    const log = { scheduled: [], cleared: [], fired: [] };
    window.__clockTimers = log;
    window.setTimeout = (fn, d, ...rest) => {
      const boundary = 60000 - (Date.now() % 60000) + 250;
      const mine = typeof d === "number" && Math.abs(d - boundary) <= 4;
      const id = st((...a) => {
        if (mine) log.fired.push(id);
        return typeof fn === "function" ? fn(...a) : fn;
      }, d, ...rest);
      if (mine) log.scheduled.push(id);
      return id;
    };
    window.clearTimeout = (id) => {
      if (log.scheduled.includes(id)) log.cleared.push(id);
      return ct(id);
    };
  });

  await p.goto(URL, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 });
  await p.evaluate(() => document.fonts.ready);
  await s(2500);

  // AC-3.2 — a hard load must produce no hydration diagnostic. In a production
  // build React reports a mismatch as minified error #418/#423/#425 rather than
  // the dev sentence, so both spellings are watched for; there is no dev
  // overlay to check against a `next start` server.
  const hyd = noise.filter((n) =>
    /hydrat|did not match|didn't match|Minified React error #(418|423|425)/i.test(n));
  rec("AC-3.2", hyd.length === 0,
    hyd.length ? hyd.join(" | ") : `no hydration diagnostic in ${noise.length} console message(s)`);

  // the server's HTML must carry the placeholder, never a real time — that is
  // what makes the mismatch impossible rather than merely unobserved
  const ssr = await (await fetch(URL)).text();
  rec("AC-3.2b", ssr.includes("--:--") && !/It’s\s*<[^>]*>\s*\d\d:\d\d/.test(ssr),
    `server HTML ships the "--:--" placeholder, not a rendered time`);

  // AC-3.3 — the token's box is the same width holding the placeholder and
  // holding a real value. Measured on the live element by swapping its text,
  // so the two measurements share one set of computed styles.
  const widths = await p.evaluate(() => {
    const el = document.querySelector('[class*="Reservations_clockTime"]');
    const line = el.closest("p");
    const real = el.textContent;
    const w = () => +el.getBoundingClientRect().width.toFixed(2);
    const lw = () => +line.getBoundingClientRect().width.toFixed(2);
    const out = { real: w(), lineReal: lw() };
    el.textContent = "--:--";
    out.placeholder = w();
    out.linePlaceholder = lw();
    // and the widest value the formatter can ever produce
    el.textContent = "23:59";
    out.widest = w();
    el.textContent = real;
    return out;
  });
  rec("AC-3.3",
    Math.abs(widths.real - widths.placeholder) < 0.5 && Math.abs(widths.widest - widths.placeholder) < 0.5,
    `token width — placeholder ${widths.placeholder}px, live ${widths.real}px, widest (23:59) ${widths.widest}px`);

  // AC-3.4 — navigate away through the nav and confirm the chain is torn down.
  // A client-side route change keeps the JS context, so the wrapper's tally
  // survives to be read on the other side.
  const before = await p.evaluate(() => ({ ...window.__clockTimers }));
  await p.evaluate(() => {
    const link = [...document.querySelectorAll("header a, nav a")]
      .find((a) => a.getAttribute("href") === "/about") ||
      [...document.querySelectorAll("header a, nav a")].find((a) => a.getAttribute("href")?.startsWith("/"));
    link.click();
  });
  await s(3000);
  const after = await p.evaluate(() => ({
    ...window.__clockTimers,
    gone: !document.querySelector('[class*="Reservations_clock"]'),
    path: location.pathname,
  }));
  const live = after.scheduled.filter((id) => !after.cleared.includes(id) && !after.fired.includes(id));
  rec("AC-3.4", after.gone && live.length === 0,
    `left for ${after.path}; clock unmounted: ${after.gone}; clock timers scheduled ${after.scheduled.length} (${before.scheduled.length} before the route change), cleared ${after.cleared.length}, fired ${after.fired.length}, still armed ${live.length}`);

  const late = noise.filter((n) => /unmounted|memory leak|Cannot update/i.test(n));
  rec("AC-3.4b", late.length === 0, late.length ? late.join(" | ") : `no unmount warning after the route change`);

  await p.close();
}

/* ===================================================================
   AC-5.4 — reduced motion. The clock is CONTENT, not motion: it must
   still render and still be live when the magnet and the settle are off.
   =================================================================== */
console.log(`\n===== reduced motion =====`);
{
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await p.goto(URL, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 });
  await s(2500);
  await p.evaluate(() => {
    const el = document.querySelector("#book");
    const y = el.getBoundingClientRect().top + window.scrollY;
    window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
  });
  await s(1000);
  // drag the pointer across the pill — with reduced motion the magnet never
  // attaches a style prop at all, so the transform stays the string `none`
  const c = await p.evaluate(() => {
    const q = document.querySelector('[class*="Reservations_magnetHost"]').getBoundingClientRect();
    return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
  });
  for (const dx of [-120, -40, 0, 40]) {
    await p.mouse.move(c.x + dx, c.y);
    await s(120);
  }
  const rm = await p.evaluate(() => {
    const sec = document.querySelector("#book");
    return {
      transform: getComputedStyle(document.querySelector('[class*="Reservations_magnet"]')).transform,
      settle: getComputedStyle(sec).getPropertyValue("--settle").trim(),
      clip: getComputedStyle(sec.querySelector('[class*="Reservations_reveal"]')).clipPath,
      clock: sec.querySelector('[class*="Reservations_clockTime"]')?.textContent,
    };
  });
  const expect = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date());
  rec("AC-5.4", rm.transform === "none" && rm.settle === "0" && /inset\(0px\)/.test(rm.clip),
    `magnet transform ${rm.transform}  --settle "${rm.settle}"  clip-path ${rm.clip}`);
  rec("AC-5.4b", /^\d\d:\d\d$/.test(rm.clock || ""),
    `clock still live under reduced motion: "${rm.clock}" (London is ${expect})`);
  await p.close();
}

await b.close();
console.log(`\n${fails === 0 ? "ALL PASS" : `${fails} FAILURE(S)`}`);
process.exit(fails === 0 ? 0 : 1);
