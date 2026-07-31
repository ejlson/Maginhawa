/* TWO REPORTED BUGS, REPRODUCED THE WAY A READER MEETS THEM.

   Both reports are about state that only exists AFTER an in-app route
   transition, so the probe never uses page.goto() to reach a route the
   second time — it clicks the real nav, exactly as the user does.

     WHEEL   /restaurants reached by clicking "Restaurants" — does a real
             wheel notch over the name wheel move the scroller?
     RETURN  home → /restaurants → home (logo): does the Discover chapter
             still have its title, and is the reel still seated centrally?

   usage: node scripts/probe-bugs.mjs [port] [w] [h] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "50853";
const W = Number(process.argv[3] || 1440);
const H = Number(process.argv[4] || 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SCROLLER = '[class*="RestaurantsShowcase_scroller"]';

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.split("\n")[0]}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 160)}`);
});

/** click a top-nav link by its label and wait out the curtain */
const navClick = async (label) => {
  await page.evaluate((t) => {
    const a = [...document.querySelectorAll("header a, nav a")].find(
      (el) => el.textContent?.trim().toLowerCase() === t.toLowerCase(),
    );
    if (!a) throw new Error(`no nav link "${t}"`);
    a.click();
  }, label);
  await sleep(3200); // cover 560 + hold 250 + reveal 600, with slack
};

const navLogo = async () => {
  await page.evaluate(() => {
    const a =
      document.querySelector('a[class*="Nav_logo"]') ??
      [...document.querySelectorAll("a")].find(
        (el) => el.getAttribute("href") === "/",
      );
    if (!a) throw new Error("no logo link");
    a.click();
  });
  await sleep(3200);
};

const settled = async () => {
  await page.waitForFunction(
    () => !document.body.classList.contains("is-loading"),
    { timeout: 60000 },
  );
  await sleep(2000);
};

/** does a trusted wheel notch over the name wheel move it? */
const testWheel = async (label) => {
  const el = await page.$(SCROLLER);
  if (!el) {
    console.log(`  ${label}: *** NO SCROLLER IN THE DOM ***`);
    return;
  }
  const before = await page.evaluate((s) => {
    const n = document.querySelector(s);
    const r = n.getBoundingClientRect();
    return {
      scrollTop: n.scrollTop,
      clientH: n.clientHeight,
      scrollH: n.scrollHeight,
      rowH: document.querySelector('[class*="RestaurantsShowcase_row"]')
        ?.getBoundingClientRect().height,
      cx: Math.round(r.left + r.width / 2),
      cy: Math.round(r.top + r.height / 2),
      active: document.querySelector('[aria-current="true"]')?.textContent?.trim(),
    };
  }, SCROLLER);

  // WHO IS ACTUALLY UNDER THE CURSOR, and does the event reach anyone?
  const hit = await page.evaluate(
    (s, x, y) => {
      const target = document.querySelector(s);
      const stack = document.elementsFromPoint(x, y).map((el) => {
        const cs = getComputedStyle(el);
        return `${el.nodeName.toLowerCase()}.${(el.className?.toString?.() ?? "").split(" ")[0].slice(0, 28)}[pe=${cs.pointerEvents},z=${cs.zIndex}]`;
      });
      // instrument: did the wheel reach the window, and was it defaultPrevented
      // by the time it got there?
      window.__probe = { win: 0, onScroller: 0, prevented: 0 };
      window.addEventListener(
        "wheel",
        (e) => {
          window.__probe.win++;
          if (e.defaultPrevented) window.__probe.prevented++;
        },
        { capture: false, passive: true },
      );
      target.addEventListener("wheel", () => window.__probe.onScroller++, {
        capture: true,
        passive: true,
      });
      return { stack: stack.slice(0, 6), containsScroller: document.elementsFromPoint(x, y).includes(target) };
    },
    SCROLLER,
    before.cx,
    before.cy,
  );
  console.log(`  ${label}: under cursor → ${hit.stack.join("  <  ")}`);
  console.log(`  ${label}: cursor is over the scroller: ${hit.containsScroller}`);

  await page.mouse.move(before.cx, before.cy);
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel({ deltaY: 120 });
    await sleep(60);
  }
  await sleep(1500);

  const probe = await page.evaluate(() => window.__probe);
  console.log(
    `  ${label}: wheel events — reached the scroller ${probe.onScroller}, bubbled to window ${probe.win} (of which ${probe.prevented} already defaultPrevented)`,
  );

  const after = await page.evaluate((s) => {
    const n = document.querySelector(s);
    return {
      scrollTop: n.scrollTop,
      active: document.querySelector('[aria-current="true"]')?.textContent?.trim(),
      docY: Math.round(scrollY),
    };
  }, SCROLLER);

  // decisive: is scrollTop writable, and is rAF alive on this page?
  const mech = await page.evaluate(async (s) => {
    const n = document.querySelector(s);
    const t0 = n.scrollTop;
    n.scrollTop = t0 + 100;
    const wroteImmediately = n.scrollTop;
    const settledWrite = await new Promise((res) =>
      setTimeout(() => res(n.scrollTop), 400),
    );
    n.scrollTop = t0;
    const rafFrames = await new Promise((res) => {
      let c = 0;
      const t = setTimeout(() => res(c), 500);
      const tick = () => {
        c++;
        if (c < 100) requestAnimationFrame(tick);
        else {
          clearTimeout(t);
          res(c);
        }
      };
      requestAnimationFrame(tick);
    });
    return {
      wroteImmediately: wroteImmediately - t0,
      heldAfter400ms: settledWrite - t0,
      rafFrames,
      visibility: document.visibilityState,
      hasLenis: !!window.__lenis,
      lenisStopped: window.__lenis?.isStopped,
      bodyClass: document.body.className,
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  }, SCROLLER);
  console.log(`  ${label}: mechanics → ${JSON.stringify(mech)}`);

  const moved = after.scrollTop - before.scrollTop;
  console.log(
    `  ${label}: rowH=${before.rowH?.toFixed(2)} scrollTop ${before.scrollTop}→${after.scrollTop} (${moved > 0 ? "+" : ""}${Math.round(moved)}px) · "${before.active}" → "${after.active}" · window.scrollY=${after.docY}`,
  );
  console.log(
    `  ${label}: ${Math.abs(moved) > 4 ? "SCROLLS" : "*** DEAD ***"}`,
  );
};

/** the Discover chapter's staging, as seen when you scroll to it */
const inspectDiscover = async (label) => {
  await page.evaluate(() => {
    const el = document.querySelector('[class*="ChapterPin"]') ?? document.querySelector("#discover");
    window.__lenis?.scrollTo(scrollY + el.getBoundingClientRect().top, {
      immediate: true,
    });
  });
  await sleep(2600);

  const s = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        top: Math.round(r.top),
        left: Math.round(r.left),
        w: Math.round(r.width),
        h: Math.round(r.height),
        op: cs.opacity,
        vis: cs.visibility,
        tf: cs.transform === "none" ? "none" : cs.transform.slice(0, 44),
        clip: cs.clipPath,
        text: (el.textContent ?? "").trim().slice(0, 32),
      };
    };
    const plates = [...document.querySelectorAll('[class*="Discover_plate"]')].map(
      (p) => Math.round(p.getBoundingClientRect().left),
    );
    return {
      scrollY: Math.round(scrollY),
      vw: innerWidth,
      title: pick('[class*="Discover_title"]'),
      lede: pick('[class*="Discover_lede"]'),
      head: pick('[class*="Discover_head"]'),
      reel: pick('[class*="Discover_reel"]'),
      strip: pick('[class*="Discover_strip"]'),
      firstPlate: plates[0],
      plateCount: plates.length,
      // the two title paths: the intro line and the resting <h2>'s word masks
      introTitle: pick('[class*="Discover_introTitle"]'),
      rises: [...document.querySelectorAll('[class*="Discover_titleRise"]')].map(
        (el) => {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return `"${el.textContent}" tf=${cs.transform} op=${cs.opacity} top=${Math.round(r.top)} h=${Math.round(r.height)}`;
        },
      ),
      sectionVars: (() => {
        const el = document.querySelector('[class*="Discover_section"]') ?? document.querySelector("#discover");
        if (!el) return null;
        const cs = getComputedStyle(el);
        const out = {};
        for (const n of ["--intro", "--p", "--seat", "--enter", "--x"]) {
          const v = cs.getPropertyValue(n).trim();
          if (v) out[n] = v;
        }
        return out;
      })(),
    };
  });

  console.log(`\n  --- ${label} --- (scrollY ${s.scrollY}, vw ${s.vw})`);
  for (const k of ["head", "title", "lede", "reel", "strip"]) {
    const v = s[k];
    console.log(
      `  ${k.padEnd(6)} ${v ? `top=${String(v.top).padStart(5)} left=${String(v.left).padStart(5)} ${String(v.w).padStart(5)}x${String(v.h).padStart(4)} op=${v.op} tf=${v.tf} clip=${v.clip}  "${v.text}"` : "ABSENT"}`,
    );
  }
  console.log(`  plates: ${s.plateCount}, first at x=${s.firstPlate}`);
  console.log(`  introTitle: ${s.introTitle ? `${s.introTitle.w}x${s.introTitle.h} op=${s.introTitle.op} tf=${s.introTitle.tf}` : "ABSENT"}`);
  s.rises.forEach((r) => console.log(`  titleRise ${r}`));
  console.log(`  vars: ${JSON.stringify(s.sectionVars)}`);
  return s;
};

/* ================================================================= */
console.log(`\n########## ${W}x${H} ##########`);

console.log(`\n=== A. home (fresh load) ===`);
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await settled();
const first = await inspectDiscover("DISCOVER on a fresh home load");
await page.screenshot({ path: `/tmp/discover-fresh-${W}.png` });

console.log(`\n=== B. click "Restaurants" in the nav ===`);
await navClick("Restaurants");
console.log(`  at ${page.url()}`);
await sleep(1500);
await testWheel("wheel after IN-APP nav");
await page.screenshot({ path: `/tmp/restaurants-inapp-${W}.png` });

console.log(`\n=== C. click the logo back to home ===`);
await navLogo();
console.log(`  at ${page.url()}`);
const second = await inspectDiscover("DISCOVER after the round trip");
await page.screenshot({ path: `/tmp/discover-return-${W}.png` });

console.log(`\n=== DELTAS (fresh → returned) ===`);
for (const k of ["head", "title", "lede", "reel", "strip"]) {
  const a = first[k];
  const c = second[k];
  if (!a && !c) continue;
  if (!a || !c) {
    console.log(`  ${k}: ${!a ? "appeared" : "*** DISAPPEARED ***"}`);
    continue;
  }
  const d = [];
  for (const f of ["top", "left", "w", "h", "op", "tf", "clip"]) {
    if (a[f] !== c[f]) d.push(`${f} ${a[f]} → ${c[f]}`);
  }
  console.log(`  ${k.padEnd(6)} ${d.length ? d.join("  ·  ") : "identical"}`);
}
if (first.firstPlate !== second.firstPlate) {
  console.log(`  *** first plate x ${first.firstPlate} → ${second.firstPlate} ***`);
}

console.log(`\n=== D. fresh load of /restaurants, for comparison ===`);
await page.goto(`http://localhost:${PORT}/restaurants`, {
  waitUntil: "domcontentloaded",
});
await page.waitForSelector(SCROLLER, { timeout: 60000 });
await sleep(2500);
await testWheel("wheel after DIRECT load");

console.log(
  `\n=== ERRORS (${errors.length}) ===\n${errors.slice(0, 12).map((e) => "  " + e).join("\n") || "  none"}`,
);

await b.close();
