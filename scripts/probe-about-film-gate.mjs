/* Does /videos/about-big.mp4 reach the wire for a reader who asked for less
 * movement — and is the normal-motion entrance untouched by the gate that
 * stops it?
 *
 * ⚠️ AND, SINCE 2026-08-24, A THIRD QUESTION THE FIRST TWO COULD NOT ASK:
 * does the film stay off the wire for a reader with NORMAL motion who simply
 * never scrolls that far? Both original passes scroll the chapter into view
 * before they read the byte counter, so a film fetched eagerly at mount and a
 * film fetched properly on approach produce the SAME number. The cold pass
 * below never scrolls, which is the only way to tell them apart.
 *
 * WHAT IS ASSERTED, per motion preference
 *   1. BYTES. Every response for about-big.mp4 is summed. Under `reduce`
 *      the total must be 0; under normal motion the film must still load.
 *   2. THE SSR HTML. Measured with a plain fetch, NOT off the DOM — the
 *      element that costs the download is the one the preload scanner sees
 *      while parsing, and React has replaced it by the time a DOM read
 *      happens. `output: "export"` bakes this HTML, so it is what ships.
 *   3. NO EMPTY BOX in the beat before the swap: the still must be in the
 *      served HTML under both preferences, so a reader with no JS — and the
 *      first paint of a reader with JS — has a picture rather than a hole.
 *   4. THE PANEL'S GEOMETRY IS IDENTICAL across the two branches: same box,
 *      same object-fit, so the swap cannot shift the layout.
 *   5. THE ENTRANCE, under normal motion only — the mask sweeps (clip-path
 *      travels), the drift counter-moves (transform travels), the caption
 *      lines rise and the shadow fades up. Sampled DURING the entrance, so
 *      a still frame at either end cannot pass it.
 *   6. The film actually plays once the entrance completes.
 *   7. COLD: normal motion, NEVER SCROLLED, four seconds of settle. The film
 *      must not have been fetched. The sibling clips are counted in the same
 *      pass, because "is this chapter the only one doing it" is the question
 *      that follows immediately and it costs nothing to answer here.
 *
 * WHY EVERY /videos/ RESPONSE IS BUCKETED AND NOT JUST THE ONE FILM. The home
 * page carries three at rest — the hero's two and this one — and the number
 * that matters is never one file in isolation but what the first screen pulls
 * in total. Bucketing by basename also makes a regression legible: a film
 * appearing in the cold pass names itself.
 *
 * PROBE NOTES (do not rediscover)
 *   · never waitUntil networkidle0 — the hero film loops, so the network
 *     never goes quiet. domcontentloaded + the loader's own body class.
 *   · Lenis overrides window.scrollTo; drive it through window.__lenis.
 *   · the entrance is released by `swept`, which latches on the HEADING
 *     reaching the picture's top edge — so scroll, then sample fast.
 *   · ⚠️ THE COLD PASS MUST NOT TOUCH THE SCROLLER AT ALL. Not scrollTo(0),
 *     not a keypress — the warm gate this is measuring is an
 *     IntersectionObserver with a viewport-relative margin, and any scroll at
 *     all is capable of tripping it. Load, wait, read.
 *
 * usage: node scripts/probe-about-film-gate.mjs [port] [width] [height]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3021";
const W = +(process.argv[3] || 1440);
const H = +(process.argv[4] || 900);
const URL = `http://localhost:${PORT}/`;
const FILM = "about-big.mp4";

/* How long the cold pass sits on the first screen before reading the counter.
   FOUR SECONDS, WHICH IS NOT A ROUND NUMBER PICKED FOR COMFORT: the eager
   fetch this pass exists to catch completed in well under two on a loopback
   server, and the hero's own films are still arriving at one. Four is past
   both with room, so a zero here is a real zero rather than a race. */
const COLD_SETTLE = 4000;

const out = [];
const say = (s) => {
  out.push(s);
  console.log(s);
};

/* ── 2 & 3: the served HTML, before any script runs ── */
const html = await fetch(URL).then((r) => r.text());
const ssrVideo = (html.match(/<video[^>]*about-big\.mp4[^>]*>/g) || []).length;
const ssrStill =
  /<img[^>]*careers-hero[^>]*>/.test(html) ||
  /<img[^>]*AboutSplit_mediaImg[^>]*>/.test(html);
say(`SSR HTML   about-big <video> tags: ${ssrVideo}   still <img>: ${ssrStill}`);

async function run({ reduce, scroll }) {
  const b = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    protocolTimeout: 300000,
    args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
  });
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H });
  const cdp = await page.target().createCDPSession();
  if (reduce)
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });

  /* ══ BYTES ON THE WIRE, AND THE HEADER IS NOT WHERE THEY ARE ══
     ⚠️ THIS USED TO SUM `content-length` OFF EACH RESPONSE, WITH A COMMENT
     SAYING IT USED encodedDataLength. It did not, and the gap was not
     cosmetic — the two disagree by about a factor of two on every film here.
     A media element opens a RANGE, reads part of it and abandons the rest,
     and the 206 it abandoned still announced the whole remaining tail in its
     header. Measured against the production export: belly-hero.mp4 is
     9,781,234 B on disk and the header sum called it 16,547,812; mamasons-
     hero.mp4 is 7,779,323 B and the header sum called it 15,506,417. Neither
     file was fetched one and a half times. The header was promising bytes
     that never moved.

     `Network.dataReceived` IS THE HONEST EVENT: it fires per chunk actually
     delivered and carries the compressed size of that chunk, so an abandoned
     range contributes exactly what it transferred and nothing more. It also
     survives a request that is CANCELLED rather than finished, which
     `Network.loadingFinished` does not — and a cancelled range is the normal
     shape of media buffering, not an edge case.

     Requests are matched to URLs on `responseReceived` and the map is keyed
     by requestId, because `dataReceived` carries no URL of its own. */
  let bytes = 0;
  const hits = [];
  /* every film on the page, by basename — see the banner */
  const films = new Map();
  const urlOf = new Map();
  const isFilm = (u) => /\.(mp4|mov|webm)(\?|$)/i.test(u);
  await cdp.send("Network.enable");
  cdp.on("Network.responseReceived", (e) => {
    const url = e.response.url;
    if (!isFilm(url)) return;
    urlOf.set(e.requestId, url);
    const name = url.split("?")[0].split("/").pop();
    const row = films.get(name) || { bytes: 0, responses: 0 };
    row.responses += 1;
    films.set(name, row);
    if (url.includes(FILM))
      hits.push({ status: e.response.status, promised: e.response.headers["content-length"] });
  });
  cdp.on("Network.dataReceived", (e) => {
    const url = urlOf.get(e.requestId);
    if (!url) return;
    /* encodedDataLength is -1 when the transport cannot report a compressed
       size; the decoded length is the right fallback and film is not
       compressible anyway, so the two are the same number here */
    const n = e.encodedDataLength > 0 ? e.encodedDataLength : e.dataLength;
    if (url.includes(FILM)) bytes += n;
    const name = url.split("?")[0].split("/").pop();
    const row = films.get(name) || { bytes: 0, responses: 0 };
    row.bytes += n;
    films.set(name, row);
  });

  const errs = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") errs.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 200)));

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 })
    .catch(() => {});
  await new Promise((r) => setTimeout(r, scroll ? 1200 : COLD_SETTLE));

  /* what hydration settled on, and the box it settled into */
  const shape = await page.evaluate(() => {
    const frame = document.querySelector('[class*="AboutSplit_mediaFrame"]');
    const drift = document.querySelector('[class*="AboutSplit_mediaDrift"]');
    const v = document.querySelector('video[src*="about-big"]');
    const img = drift?.querySelector("img") || null;
    const el = v || img;
    const r = el?.getBoundingClientRect();
    const cs = el ? getComputedStyle(el) : null;
    return {
      video: !!v,
      img: !!img,
      imgLoading: img?.getAttribute("loading") || null,
      kind: v ? "video" : img ? "img" : "none",
      box: r ? [Math.round(r.width), Math.round(r.height)] : null,
      fit: cs?.objectFit || null,
      pos: cs?.position || null,
      frameH: frame ? Math.round(frame.getBoundingClientRect().height) : null,
    };
  });

  /* ── 7: THE COLD READ. No scroll, no entrance — just what the element is
     holding, and what it was told to hold. `attrPreload` and the `preload`
     PROPERTY are reported separately on purpose: the warm gate promotes the
     property from script, so the two disagreeing is how a promotion that
     already happened is told apart from one that never did. ── */
  if (!scroll) {
    const cold = await page.evaluate(() => {
      const v = document.querySelector('video[src*="about-big"]');
      const section = document.querySelector('[class*="AboutSplit_section"]');
      return {
        mounted: !!v,
        attrPreload: v?.getAttribute("preload") ?? null,
        propPreload: v?.preload ?? null,
        net: v?.networkState ?? null,
        ready: v?.readyState ?? null,
        buffered: v && v.buffered.length ? +v.buffered.end(v.buffered.length - 1).toFixed(2) : 0,
        paused: v?.paused ?? null,
        t: v ? +v.currentTime.toFixed(2) : null,
        /* how far below the fold the chapter still is — the number the
           rootMargin has to clear, so a gate that fires anyway is visibly
           firing from too far out rather than mysteriously */
        sectionTop: section ? Math.round(section.getBoundingClientRect().top) : null,
        vh: window.innerHeight,
        scrollY: Math.round(window.scrollY),
      };
    });
    await b.close();
    return { bytes, hits, films, shape, cold, errs };
  }

  /* ── 5 & 6: the entrance. Scroll the chapter's heading onto the picture's
     top edge, then sample the three moving properties across the sweep. ── */
  const y = await page.evaluate(() => {
    const s = document.querySelector('[class*="AboutSplit_section"]');
    return s ? window.scrollY + s.getBoundingClientRect().top - window.innerHeight * 0.35 : 0;
  });
  await page.evaluate((v) => {
    const l = window.__lenis;
    if (l) l.scrollTo(v, { immediate: true, force: true });
    else window.scrollTo(0, v);
  }, y);

  const samples = await page.evaluate(
    () =>
      new Promise((res) => {
        const q = (s) => document.querySelector(s);
        const rows = [];
        const t0 = performance.now();
        const tick = () => {
          const frame = q('[class*="AboutSplit_mediaFrame"]');
          const drift = q('[class*="AboutSplit_mediaDrift"]');
          const shadow = q('[class*="AboutSplit_mediaShadow"]');
          const line = q('[class*="AboutSplit_lineMask"] > *') || q('[class*="AboutSplit_caption"] span span');
          rows.push({
            t: Math.round(performance.now() - t0),
            clip: frame ? getComputedStyle(frame).clipPath : null,
            tr: drift ? getComputedStyle(drift).transform : null,
            sh: shadow ? +getComputedStyle(shadow).opacity : null,
            ln: line ? getComputedStyle(line).transform : null,
          });
          if (performance.now() - t0 < 2600) requestAnimationFrame(tick);
          else res(rows);
        };
        requestAnimationFrame(tick);
      })
  );

  const uniq = (k) => new Set(samples.map((s) => s[k]).filter((v) => v !== null)).size;
  const moved = {
    mask: uniq("clip"),
    drift: uniq("tr"),
    shadow: uniq("sh"),
    caption: uniq("ln"),
  };

  const play = await page.evaluate(() => {
    const v = document.querySelector('video[src*="about-big"]');
    return v ? { t: v.currentTime, paused: v.paused, readyState: v.readyState } : null;
  });

  /* the picture is actually on screen at the end — a stranded clip-path or a
     stuck opacity would leave the panel blank and every count above happy */
  const visible = await page.evaluate(() => {
    const frame = document.querySelector('[class*="AboutSplit_mediaFrame"]');
    if (!frame) return null;
    const cs = getComputedStyle(frame);
    const r = frame.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);
    const top = document.elementFromPoint(cx, cy);
    return {
      clip: cs.clipPath,
      opacity: +cs.opacity,
      onScreen: r.top < window.innerHeight && r.bottom > 0,
      hitInsideFrame: !!(top && frame.contains(top)),
    };
  });

  await b.close();
  return { bytes, hits, films, shape, moved, play, visible, errs };
}

const filmTable = (films) =>
  [...films.entries()]
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .map(([n, r]) => `      ${n.padEnd(24)} ${String(r.bytes).padStart(9)} B transferred  (${r.responses} responses)`)
    .join("\n") || "      (none)";

const PASSES = [
  { reduce: true, scroll: true, title: "prefers-reduced-motion: reduce — scrolled to the chapter" },
  { reduce: false, scroll: true, title: "normal motion — scrolled to the chapter" },
  { reduce: false, scroll: false, title: "normal motion — NEVER SCROLLED (cold)" },
];

for (const pass of PASSES) {
  const r = await run(pass);
  say(`\n=== ${pass.title} ===`);
  say(`  ${FILM} bytes on the wire : ${r.bytes}   responses: ${JSON.stringify(r.hits)}`);
  say(`  every film requested this pass:`);
  say(filmTable(r.films));
  say(`  rendered in the panel     : ${r.shape.kind}  loading=${r.shape.imgLoading}  box=${JSON.stringify(r.shape.box)} fit=${r.shape.fit} pos=${r.shape.pos} frameH=${r.shape.frameH}`);
  if (pass.scroll) {
    say(`  distinct values across the entrance (1 = did not move):`);
    say(`      mask ${r.moved.mask}  drift ${r.moved.drift}  shadow ${r.moved.shadow}  caption ${r.moved.caption}`);
    say(`  film state                : ${JSON.stringify(r.play)}`);
    say(`  panel at rest             : ${JSON.stringify(r.visible)}`);
  } else {
    say(`  the element, unscrolled   : ${JSON.stringify(r.cold)}`);
    /* THE ONE VERDICT THIS PROBE EXISTS TO PRINT since the cold pass was
       added. Stated as bytes rather than as a boolean so a partial fetch —
       a genuine metadata range, say — reads as the number it is rather than
       collapsing into a fail. */
    const verdict = r.bytes === 0 ? "PASS" : "FAIL";
    say(`  ▶ ${verdict}: ${r.bytes} B of ${FILM} fetched by a reader who never reached the chapter`);
  }
  const hyd = r.errs.filter((e) => /hydrat|did not match|server rendered/i.test(e));
  say(`  console errors/warnings   : ${r.errs.length}  (hydration: ${hyd.length})`);
  for (const e of r.errs.slice(0, 4)) say(`      · ${e.replace(/\s+/g, " ").slice(0, 160)}`);
}
