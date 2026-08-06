/* FOLLOW-UP: two things the first pass raised.
   A. the settled standfirst's top sits ABOVE the fixed nav's bottom at 981
      and 1100 after the intro lands — is that a real ink collision or an
      overlap with an unpainted/transparent nav box? Settled with computed
      style, the nav's LINK rects, the caption's own line rects, and a 4x
      zoomed clip.
   B. the accessible name's mechanism: does the space survive if the spans
      are `display: inline` rather than inline-block? (i.e. how load-bearing
      is the display value for the name a screen reader gets)
   usage: node scripts/probe-verify-head2.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "51365";
const OUT = process.env.OUT || "/tmp";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

async function freshPage(w, h) {
  const page = await b.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => !document.body.classList.contains("is-loading"),
    { timeout: 120000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await sleep(900);
  return page;
}

const NAVPROBE = () => {
  const r = (n) => +n.toFixed(1);
  const sec = document.getElementById("restaurants");
  const h2 = Array.from(sec.querySelectorAll("h2")).find(
    (n) => !n.closest("[aria-hidden]"),
  );
  const cap = h2.parentElement.querySelector("p");
  // the caption's real INK: per-line client rects of its text range
  const rng = document.createRange();
  rng.selectNodeContents(cap);
  const lines = Array.from(rng.getClientRects()).map((q) => ({
    top: r(q.top),
    bottom: r(q.bottom),
    left: r(q.left),
    right: r(q.right),
  }));
  const navs = Array.from(document.querySelectorAll("header, nav")).map((n) => {
    const q = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    return {
      tag: n.tagName,
      cls: (n.className || "").toString().slice(0, 60),
      box: [r(q.left), r(q.top), r(q.right), r(q.bottom)],
      position: cs.position,
      opacity: cs.opacity,
      visibility: cs.visibility,
      display: cs.display,
      transform: cs.transform,
      bg: cs.backgroundColor,
      pointerEvents: cs.pointerEvents,
      // the painted children — links/wordmark — are the real ink
      kids: Array.from(n.querySelectorAll("a, button, span, svg, img"))
        .map((k) => {
          const kb = k.getBoundingClientRect();
          const kc = getComputedStyle(k);
          return kb.width > 2 && kb.height > 2 && kc.visibility !== "hidden" &&
            kc.opacity !== "0"
            ? {
                t: (k.textContent || k.tagName).trim().slice(0, 18),
                box: [r(kb.left), r(kb.top), r(kb.right), r(kb.bottom)],
                op: kc.opacity,
              }
            : null;
        })
        .filter(Boolean)
        .slice(0, 12),
    };
  });
  const capB = cap.getBoundingClientRect();
  return {
    scrollY: Math.round(window.scrollY),
    caption: { box: [r(capB.left), r(capB.top), r(capB.right), r(capB.bottom)], lines },
    navs,
    // ink-vs-ink: does any painted nav child overlap any caption LINE rect?
    inkHits: navs.flatMap((n) =>
      n.kids.flatMap((k) =>
        lines
          .filter(
            (L) =>
              !(k.box[2] <= L.left || L.right <= k.box[0] ||
                k.box[3] <= L.top || L.bottom <= k.box[1]),
          )
          .map((L) => ({ nav: n.cls, kid: k.t, kidBox: k.box, line: L })),
      ),
    ),
  };
};

for (const w of [981, 1100, 1280]) {
  console.log(`\n================ ${w}px ================`);
  const page = await freshPage(w, 900);
  let armed = false;
  for (let i = 0; i < 30 && !armed; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await sleep(350);
    armed = await page.evaluate(
      () => document.getElementById("restaurants")?.dataset.assemblyArmed === "1",
    );
  }
  await page.waitForFunction(
    () => !document.getElementById("restaurants")?.dataset.assemblyStep,
    { timeout: 40000 },
  );
  for (const [label, wait] of [["t+2.6s", 2600], ["t+6s", 3400]]) {
    await sleep(wait);
    const m = await page.evaluate(NAVPROBE);
    console.log(`-- ${label} (scrollY ${m.scrollY}) caption box ${JSON.stringify(m.caption.box)}`);
    console.log(`   caption line rects: ${JSON.stringify(m.caption.lines)}`);
    for (const n of m.navs)
      console.log(
        `   NAV <${n.tag}.${n.cls}> box ${JSON.stringify(n.box)} pos ${n.position} op ${n.opacity} vis ${n.visibility} bg ${n.bg} tf ${n.transform.slice(0, 40)}`,
      );
    for (const n of m.navs)
      for (const k of n.kids)
        console.log(`     kid "${k.t}" ${JSON.stringify(k.box)} op ${k.op}`);
    console.log(`   INK HITS: ${m.inkHits.length}`);
    for (const h of m.inkHits)
      console.log(`     >>> "${h.kid}" ${JSON.stringify(h.kidBox)} X caption line ${JSON.stringify(h.line)}`);
  }
  // 4x-ish zoomed clip of the top band so a human can settle it
  await page.screenshot({
    path: `${OUT}/head-nav-${w}.png`,
    clip: { x: 0, y: 0, width: w, height: 180 },
  });
  console.log(`   clip written: ${OUT}/head-nav-${w}.png`);
  await page.close();
}

/* ---- B. accname mechanism ---- */
console.log("\n================ ACCNAME MECHANISM ================");
{
  const page = await freshPage(1440, 900);
  await page.evaluate(() => {
    const sec = document.getElementById("restaurants");
    const h2 = Array.from(sec.querySelectorAll("h2")).find(
      (n) => !n.closest("[aria-hidden]"),
    );
    h2.id = "probe-settled-h2";
  });
  const c = await page.createCDPSession();
  await c.send("Accessibility.enable");
  const name = async (label) => {
    const doc = await c.send("DOM.getDocument", { depth: -1 });
    const { nodeId } = await c.send("DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: "#probe-settled-h2",
    });
    const { nodes } = await c.send("Accessibility.getPartialAXTree", {
      nodeId,
      fetchRelatives: false,
    });
    const self = nodes.find((n) => n.role?.value === "heading") || nodes[0];
    const extra = await page.evaluate(() => {
      const h2 = document.getElementById("probe-settled-h2");
      return {
        text: h2.textContent,
        inner: h2.innerText,
        disp: getComputedStyle(h2.children[0]).display,
        gap: +(
          h2.children[1].getBoundingClientRect().left -
          h2.children[0].getBoundingClientRect().right
        ).toFixed(1),
      };
    });
    console.log(
      `  ${label}: display=${extra.disp} visualGap=${extra.gap}px  AXname=${JSON.stringify(self?.name?.value)}  textContent=${JSON.stringify(extra.text)}  innerText=${JSON.stringify(extra.inner)}`,
    );
  };
  await name("as shipped (inline-block)");
  await page.evaluate(() => {
    for (const s of document.getElementById("probe-settled-h2").children)
      s.style.display = "inline";
  });
  await sleep(200);
  await name("forced display:inline");
  await page.evaluate(() => {
    for (const s of document.getElementById("probe-settled-h2").children) {
      s.style.display = "";
      s.style.marginRight = "0";
    }
  });
  await sleep(200);
  await name("inline-block, margin stripped");
  await page.close();
}

await b.close();
