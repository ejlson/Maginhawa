/* INDEPENDENT VERIFICATION of the Discover head rework (Phase 1).
   Written by the verification agent — deliberately NOT reusing the
   implementer's probe. Adds three things their probe never measured:
     - the h2's COMPUTED ACCESSIBLE NAME via CDP (not textContent guesswork)
     - the intro actually RUN at 981/1100, not just measured pre-intro
     - a RESIZE-AFTER-INTRO pass, for the stale inline font-size
   usage: node scripts/probe-verify-head.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "51365";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

async function freshPage(w, h) {
  const page = await b.newPage();
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => !document.body.classList.contains("is-loading"),
    { timeout: 120000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await sleep(900);
  return page;
}

/* geometry of the settled head, measured at the fitted size AND at the
   clamp size (inline font stripped in place, then restored) */
const MEASURE = () => {
  const sec = document.getElementById("restaurants");
  if (!sec) return { err: "no #restaurants" };
  const h2 = Array.from(sec.querySelectorAll("h2")).find(
    (n) => !n.closest("[aria-hidden]"),
  );
  if (!h2) return { err: "no settled h2" };
  const head = h2.parentElement;
  const cap = head.querySelector("p");
  const r = (n) => +n.toFixed(1);

  const read = () => {
    const spans = Array.from(h2.children).map((s) => {
      const q = s.getBoundingClientRect();
      return {
        t: (s.textContent || "").trim(),
        top: r(q.top),
        bottom: r(q.bottom),
        left: r(q.left),
        right: r(q.right),
      };
    });
    const hb = h2.getBoundingClientRect();
    const font = parseFloat(getComputedStyle(h2).fontSize);
    const [a, z] = [spans[0], spans[spans.length - 1]];
    return {
      font: +font.toFixed(2),
      h2H: r(hb.height),
      h2W: r(hb.width),
      h2Left: r(hb.left),
      h2Right: r(hb.right),
      spans,
      gapPx: spans.length === 2 ? r(z.left - a.right) : null,
      sameTop: spans.length === 2 ? Math.abs(a.top - z.top) : null,
      inkRight: r(Math.max(...spans.map((s) => s.right))),
      // ONE LINE = two boxes, same top, no overlap, h2 not two lines deep
      oneLine:
        spans.length === 2 &&
        Math.abs(a.top - z.top) <= 1 &&
        Math.abs(a.bottom - z.bottom) <= 1 &&
        a.right <= z.left + 0.5 &&
        hb.height < font * 1.6,
      lineRatio: +(hb.height / font).toFixed(3),
    };
  };

  const fitted = read();
  const inline = h2.style.fontSize;
  h2.style.fontSize = "";
  const clamp = read();
  h2.style.fontSize = inline;

  const hb = head.getBoundingClientRect();
  const parent = head.parentElement.getBoundingClientRect();
  const cb = cap ? cap.getBoundingClientRect() : null;
  const nav = document.querySelector("header, nav");
  const navB = nav ? nav.getBoundingClientRect() : null;
  // the "band" the standfirst is supposed to close: the head element, and
  // the inset span it lives in — reported separately so a head that does
  // not itself reach the editorial edge cannot hide behind its own box
  const grid = sec.querySelector("ul");
  const gb = grid ? grid.getBoundingClientRect() : null;

  return {
    vw: window.innerWidth,
    headLeft: r(hb.left),
    headRight: r(hb.right),
    headW: r(hb.width),
    headMid: r(hb.left + hb.width / 2),
    parentRight: r(parent.right),
    gridRight: gb ? r(gb.right) : null,
    inlineFontSize: inline || null,
    fitted,
    clamp,
    caption: cb
      ? {
          left: r(cb.left),
          right: r(cb.right),
          top: r(cb.top),
          bottom: r(cb.bottom),
          w: r(cb.width),
          lines: Math.round(
            cb.height / parseFloat(getComputedStyle(cap).lineHeight),
          ),
          textAlign: getComputedStyle(cap).textAlign,
          dRightVsHead: r(cb.right - hb.right),
          dRightVsGrid: gb ? r(cb.right - gb.right) : null,
          inRightHalf: cb.left > hb.left + hb.width / 2,
          bottomVsTitleBottom: r(cb.bottom - fitted.spans.at(-1).bottom),
        }
      : null,
    navBottom: navB ? r(navB.bottom) : null,
    // ink-vs-ink collision (box overlap across the shared track 9 is by design)
    collide: cb
      ? !(
          fitted.inkRight <= cb.left ||
          cb.right <= Math.min(...fitted.spans.map((s) => s.left)) ||
          Math.max(...fitted.spans.map((s) => s.bottom)) <= cb.top ||
          cb.bottom <= Math.min(...fitted.spans.map((s) => s.top))
        )
      : false,
    overflowsBand: fitted.inkRight > hb.right + 1,
  };
};

/* the accessible name a screen reader actually announces, from Chrome's
   own accname implementation — not from textContent */
async function accName(page) {
  await page.evaluate(() => {
    const sec = document.getElementById("restaurants");
    const h2 = Array.from(sec.querySelectorAll("h2")).find(
      (n) => !n.closest("[aria-hidden]"),
    );
    h2.id = "probe-settled-h2";
  });
  const raw = await page.evaluate(() => {
    const h2 = document.getElementById("probe-settled-h2");
    return {
      textContent: h2.textContent,
      innerText: h2.innerText,
      html: h2.innerHTML.replace(/\s+/g, " ").slice(0, 400),
      spanDisplays: Array.from(h2.children).map(
        (c) => getComputedStyle(c).display,
      ),
    };
  });
  const c = await page.createCDPSession();
  await c.send("Accessibility.enable");
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
  await c.detach();
  return {
    ...raw,
    axRole: self?.role?.value,
    axName: self?.name?.value,
    axNameJSON: JSON.stringify(self?.name?.value),
  };
}

async function runIntro(page, { trace = false } = {}) {
  let armed = false;
  for (let i = 0; i < 30 && !armed; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await sleep(350);
    armed = await page.evaluate(
      () => document.getElementById("restaurants")?.dataset.assemblyArmed === "1",
    );
  }
  if (!armed) return { armed: false };
  let tr = null;
  if (trace) {
    tr = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const sec = document.getElementById("restaurants");
          const intro = Array.from(sec.querySelectorAll("h2")).find((n) =>
            /introTitle/.test(n.className),
          );
          const masks = intro ? Array.from(intro.children) : [];
          const tx = (el) => {
            const t = getComputedStyle(el).transform;
            if (!t || t === "none") return 0;
            const m = t.match(/matrix\(([^)]+)\)/);
            return m ? parseFloat(m[1].split(",")[4]) : 0;
          };
          const rows = [];
          const t0 = performance.now();
          const tick = () => {
            const el = performance.now() - t0;
            rows.push({
              t: Math.round(el),
              step: sec.dataset.assemblyStep ?? "done",
              l: masks[0] ? Math.round(tx(masks[0])) : null,
              r: masks[1] ? Math.round(tx(masks[1])) : null,
              lit:
                document.querySelector('[data-lit="on"]') !== null,
            });
            if (el < 12000) requestAnimationFrame(tick);
            else resolve(rows);
          };
          requestAnimationFrame(tick);
        }),
    );
  } else {
    await page.waitForFunction(
      () => !document.getElementById("restaurants")?.dataset.assemblyStep,
      { timeout: 30000 },
    );
  }
  await sleep(2600);
  return { armed: true, trace: tr };
}

/* ============ 1. ACCESSIBLE NAME ============ */
console.log("=== 1. ACCESSIBLE NAME of the settled h2 ===");
for (const w of [390, 1440]) {
  const p = await freshPage(w, 900);
  const a = await accName(p);
  console.log(`  @${w}: role=${a.axRole}  AX name=${a.axNameJSON}`);
  console.log(`         textContent=${JSON.stringify(a.textContent)}`);
  console.log(`         innerText=${JSON.stringify(a.innerText)}`);
  console.log(`         span displays=${a.spanDisplays.join(",")}`);
  await p.close();
}

/* ============ 2. FULL INTRO @1440 + choreography ============ */
console.log("\n=== 2. FULL INTRO @1440x900 ===");
const p1440 = await freshPage(1440, 900);
const intro = await runIntro(p1440, { trace: true });
console.log(`  armed: ${intro.armed}`);
if (intro.armed) {
  const s = intro.trace.filter((r) => r.l !== null);
  const minL = Math.min(...s.map((r) => r.l));
  const maxR = Math.max(...s.map((r) => r.r));
  console.log(`  frames carrying masks: ${s.length} / ${intro.trace.length} total`);
  console.log(`  left  mask min translateX: ${minL}px`);
  console.log(`  right mask max translateX: ${maxR}px`);
  console.log(`  steps: ${[...new Set(intro.trace.map((r) => r.step))].join(" -> ")}`);
  console.log(`  saffron lit at end: ${intro.trace.at(-1).lit}`);
  console.log(
    `  SPLIT RAN: ${minL < -40 && maxR > 40 ? "YES" : "NO"}`,
  );
}
const m1440 = await p1440.evaluate(MEASURE);
console.log("  settled head @1440:");
console.log(JSON.stringify(m1440, null, 2));

/* ============ 3. RESIZE AFTER INTRO (stale inline font-size) ============ */
console.log("\n=== 3. RESIZE AFTER INTRO — stale inline font-size? ===");
for (const w of [980, 768, 390]) {
  await p1440.setViewport({ width: w, height: 900 });
  await sleep(1200);
  const m = await p1440.evaluate(MEASURE);
  console.log(
    `  resized 1440 -> ${w}: inline=${m.inlineFontSize} computed=${m.fitted.font}px ` +
      `h2H=${m.fitted.h2H} lineRatio=${m.fitted.lineRatio} ` +
      `spans=${JSON.stringify(m.fitted.spans.map((s) => [s.left, s.right, s.top]))} ` +
      `inkRight=${m.fitted.inkRight} bandRight=${m.headRight} overflows=${m.overflowsBand}`,
  );
}
await p1440.close();

/* ============ 4. INTRO ACTUALLY RUN AT THE TIGHT WIDTHS ============ */
console.log("\n=== 4. FULL INTRO at the tight desktop widths ===");
for (const w of [981, 1100, 1280]) {
  const p = await freshPage(w, 900);
  const got = await runIntro(p);
  const m = await p.evaluate(MEASURE);
  console.log(
    `  ${w}px armed:${got.armed} inline:${m.inlineFontSize} ` +
      `fitted ${m.fitted.font}px oneLine:${m.fitted.oneLine ? "Y" : "N"} (ratio ${m.fitted.lineRatio}, gap ${m.fitted.gapPx}px) | ` +
      `clamp ${m.clamp.font}px oneLine:${m.clamp.oneLine ? "Y" : "N"} (ratio ${m.clamp.lineRatio}) | ` +
      `capR-bandR ${m.caption.dRightVsHead} capTop ${m.caption.top} navBottom ${m.navBottom} | ` +
      `collide:${m.collide} inkRight ${m.fitted.inkRight} vs capLeft ${m.caption.left}`,
  );
  await p.close();
}

/* ============ 5. SWEEP — settled boxes, no intro ============ */
console.log("\n=== 5. SWEEP (fresh page, settled boxes, no intro run) ===");
for (const w of [460, 700, 980, 981, 1100, 1280, 1440, 1920]) {
  const p = await freshPage(w, 900);
  const m = await p.evaluate(MEASURE);
  console.log(
    `  ${String(w).padStart(4)}px  band ${m.headLeft}..${m.headRight} (parentR ${m.parentRight}, gridR ${m.gridRight})` +
      `  cap ${m.caption.left}..${m.caption.right} (dR head ${m.caption.dRightVsHead}, dR grid ${m.caption.dRightVsGrid}, lines ${m.caption.lines}, align ${m.caption.textAlign})` +
      `  | fitted ${m.fitted.font}px one:${m.fitted.oneLine ? "Y" : "N"} r${m.fitted.lineRatio} gap${m.fitted.gapPx}` +
      `  clamp ${m.clamp.font}px one:${m.clamp.oneLine ? "Y" : "N"} r${m.clamp.lineRatio}` +
      `  | collide:${m.collide} overflow:${m.overflowsBand}`,
  );
  await p.close();
}

await b.close();
