/* /blog, AUDITED AGAINST THE REST OF THE SITE.
   Evidence for a set of design proposals, not a pass/fail gate. Everything
   here is a number the eye can be argued out of but a measurement cannot:

     SEATS      how many distinct left edges each page presents, and whether
                /blog hangs off the binding grid's column-2 seat the way the
                other cream chapters do (--grid-col2 in globals.css).
     WEIGHT     bytes and pixel dimensions actually transferred for imagery,
                and how much of it is decoded at a fraction of its size.
     CONTRAST   the small-text opacities /blog leans on, computed against the
                cream, versus the 4.5:1 floor.
     DEPTH      document height, image count and transform/observer activity,
                against / and /about — the pages /blog is supposed to belong
                with.
     MOTION     how many elements the page actually animates.

   usage: node scripts/probe-blog-audit.mjs [port]                         */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3220";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ROUTES = ["/blog", "/", "/about"];

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

for (const [vp, W, H] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
  console.log(`\n${"=".repeat(74)}\n  ${vp.toUpperCase()}  ${W}x${H}\n${"=".repeat(74)}`);

  for (const route of ROUTES) {
    const page = await b.newPage();
    await page.setViewport({ width: W, height: H });
    const net = [];
    page.on("response", async (r) => {
      const ct = r.headers()["content-type"] || "";
      if (!/^(image|video)\//.test(ct)) return;
      let len = Number(r.headers()["content-length"] || 0);
      if (!len) { try { len = (await r.buffer()).length; } catch {} }
      net.push({ url: r.url().split("/").pop().slice(0, 34), type: ct.split("/")[0], bytes: len });
    });

    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await sleep(1500);

    // scroll like a reader so lazy media and observers actually fire
    const docH = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let i = 0; i <= 24; i++) {
      await page.evaluate((v) => {
        if (window.__lenis) window.__lenis.scrollTo(v, { duration: 0.3 });
        else window.scrollTo(0, v);
      }, Math.round(((docH - H) * i) / 24));
      await sleep(200);
    }
    await sleep(600);

    const m = await page.evaluate((vw) => {
      const de = document.documentElement;
      const cs = getComputedStyle(de);
      const col2 = cs.getPropertyValue("--grid-col2").trim();
      const margin = cs.getPropertyValue("--grid-margin").trim();

      // distinct left edges of real content, rounded to the pixel
      const edges = new Map();
      for (const el of document.querySelectorAll("main *, section *, header *, footer *")) {
        const t = (el.textContent || "").trim();
        if (!t || el.children.length) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 20 || r.height < 6) continue;
        if (r.left < -50 || r.left > vw) continue;
        const k = Math.round(r.left);
        edges.set(k, (edges.get(k) || 0) + 1);
      }
      const sorted = [...edges.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);

      // imagery actually on the page and how oversized it is
      const imgs = [...document.querySelectorAll("img")].map((i) => ({
        natural: `${i.naturalWidth}x${i.naturalHeight}`,
        css: `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`,
        oversampleX: i.getBoundingClientRect().width ? +(i.naturalWidth / i.getBoundingClientRect().width).toFixed(2) : null,
        lazy: i.loading,
        srcset: !!i.srcset,
        nextImg: /\/_next\/image/.test(i.currentSrc || i.src),
      })).filter((i) => i.natural !== "0x0");

      // how much of the page moves
      const transformed = [...document.querySelectorAll("body *")].filter((e) => {
        const t = getComputedStyle(e).transform;
        return t && t !== "none";
      }).length;
      const willChange = [...document.querySelectorAll("body *")].filter((e) => {
        const w = getComputedStyle(e).willChange;
        return w && w !== "auto";
      }).length;

      // contrast of every small text run against its own background
      const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      const L = (r, g, bl) => 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
      const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const bgOf = (el) => {
        let n = el;
        while (n && n !== document.documentElement) {
          const c = parse(getComputedStyle(n).backgroundColor);
          if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) return c;
          n = n.parentElement;
        }
        return [250, 247, 241];
      };
      const low = [];
      for (const el of document.querySelectorAll("main *, footer *")) {
        const t = (el.textContent || "").trim();
        if (!t || el.children.length) continue;
        const s = getComputedStyle(el);
        const size = parseFloat(s.fontSize);
        if (size > 22) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 6) continue;
        const op = parseFloat(s.opacity);
        const fg = parse(s.color);
        const bg = bgOf(el);
        // composite the element's own opacity over its background
        const mix = [0, 1, 2].map((i) => fg[i] * op + bg[i] * (1 - op));
        const l1 = L(mix[0], mix[1], mix[2]);
        const l2 = L(bg[0], bg[1], bg[2]);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        if (ratio < 4.5)
          low.push({ cls: (el.className || "").toString().split(" ")[0] || el.tagName, size: +size.toFixed(0), op, ratio: +ratio.toFixed(2), text: t.slice(0, 34) });
      }
      const seen = new Set();
      const lowUniq = low.filter((x) => (seen.has(x.cls) ? false : seen.add(x.cls)));

      return {
        docH: de.scrollHeight,
        col2, margin,
        edges: sorted.slice(0, 8),
        imgCount: imgs.length,
        imgsNotNext: imgs.filter((i) => !i.nextImg).length,
        imgsNoSrcset: imgs.filter((i) => !i.srcset).length,
        worstOversample: imgs.map((i) => i.oversampleX).filter(Boolean).sort((a, b) => b - a).slice(0, 5),
        transformed, willChange,
        lowContrast: lowUniq.slice(0, 12),
        headings: [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => `${h.tagName} ${(h.textContent || "").trim().slice(0, 46)}`),
      };
    }, W);

    const totalImg = net.filter((n) => n.type === "image").reduce((a, n) => a + n.bytes, 0);
    const totalVid = net.filter((n) => n.type === "video").reduce((a, n) => a + n.bytes, 0);
    const biggest = net.sort((a, b) => b.bytes - a.bytes).slice(0, 5);

    console.log(`\n--- ${route} ---`);
    console.log(`  docHeight ............ ${m.docH}px  (${(m.docH / H).toFixed(1)} screens)`);
    console.log(`  --grid-margin ........ ${m.margin}      --grid-col2 (the binding seat) ... ${m.col2}`);
    console.log(`  dominant left edges .. ${m.edges.map(([x, n]) => `${x}px×${n}`).join("  ")}`);
    console.log(`  images ............... ${m.imgCount} on page, ${m.imgsNotNext} NOT through next/image, ${m.imgsNoSrcset} with no srcset`);
    console.log(`  worst oversample ..... ${m.worstOversample.map((x) => x + "x").join(", ") || "n/a"}`);
    console.log(`  bytes ................ images ${(totalImg / 1e6).toFixed(2)} MB   video ${(totalVid / 1e6).toFixed(2)} MB`);
    console.log(`  heaviest ............. ${biggest.map((x) => `${x.url} ${(x.bytes / 1e6).toFixed(2)}MB`).join("  ")}`);
    console.log(`  moving elements ...... ${m.transformed} transformed, ${m.willChange} will-change`);
    console.log(`  heading outline ...... ${m.headings.slice(0, 6).join(" | ")}${m.headings.length > 6 ? ` | (+${m.headings.length - 6})` : ""}`);
    if (m.lowContrast.length) {
      console.log(`  UNDER 4.5:1 ..........`);
      for (const c of m.lowContrast)
        console.log(`      .${c.cls.padEnd(26)} ${c.size}px op ${c.op}  ${c.ratio}:1   "${c.text}"`);
    } else console.log(`  contrast ............. all small text clears 4.5:1`);

    await page.close();
  }
}

await Promise.race([b.close(), sleep(4000)]);
process.exit(0);
