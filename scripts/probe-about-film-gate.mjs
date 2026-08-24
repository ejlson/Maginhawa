/* Does /videos/about-big.mp4 reach the wire for a reader who asked for less
 * movement — and is the normal-motion entrance untouched by the gate that
 * stops it?
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
 *
 * PROBE NOTES (do not rediscover)
 *   · never waitUntil networkidle0 — the hero film loops, so the network
 *     never goes quiet. domcontentloaded + the loader's own body class.
 *   · Lenis overrides window.scrollTo; drive it through window.__lenis.
 *   · the entrance is released by `swept`, which latches on the HEADING
 *     reaching the picture's top edge — so scroll, then sample fast.
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

async function run(reduce) {
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

  /* BYTES ON THE WIRE. `encodedDataLength` off the CDP event rather than the
     content-length header: a ranged 206 reports the slice it actually sent,
     and a header can promise bytes a request never took. */
  let bytes = 0;
  const hits = [];
  await cdp.send("Network.enable");
  cdp.on("Network.responseReceived", (e) => {
    if (e.response.url.includes(FILM))
      hits.push({ status: e.response.status, len: e.response.headers["content-length"] });
  });
  cdp.on("Network.loadingFinished", () => {});
  page.on("response", async (r) => {
    if (!r.url().includes(FILM)) return;
    const cl = +(r.headers()["content-length"] || 0);
    bytes += cl;
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
  await new Promise((r) => setTimeout(r, 1200));

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
  return { bytes, hits, shape, moved, play, visible, errs };
}

for (const reduce of [true, false]) {
  const r = await run(reduce);
  say(`\n=== ${reduce ? "prefers-reduced-motion: reduce" : "normal motion"} ===`);
  say(`  ${FILM} bytes on the wire : ${r.bytes}   responses: ${JSON.stringify(r.hits)}`);
  say(`  rendered in the panel     : ${r.shape.kind}  loading=${r.shape.imgLoading}  box=${JSON.stringify(r.shape.box)} fit=${r.shape.fit} pos=${r.shape.pos} frameH=${r.shape.frameH}`);
  say(`  distinct values across the entrance (1 = did not move):`);
  say(`      mask ${r.moved.mask}  drift ${r.moved.drift}  shadow ${r.moved.shadow}  caption ${r.moved.caption}`);
  say(`  film state                : ${JSON.stringify(r.play)}`);
  say(`  panel at rest             : ${JSON.stringify(r.visible)}`);
  const hyd = r.errs.filter((e) => /hydrat|did not match|server rendered/i.test(e));
  say(`  console errors/warnings   : ${r.errs.length}  (hydration: ${hyd.length})`);
  for (const e of r.errs.slice(0, 4)) say(`      · ${e.replace(/\s+/g, " ").slice(0, 160)}`);
}
