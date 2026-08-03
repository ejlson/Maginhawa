/* THE WALK-IN NOTE HAS TO BE READABLE, AND ONLY A SCREENSHOT CAN SAY SO.
 *
 * "No booking needed at ..." used to sit on a 999px plaque filled with
 * rgba(18,0,0,0.68). The plaque is gone. What replaced it is a scrim shaped to
 * the note's own footprint, and whether that is enough depends entirely on the
 * footage underneath — which the stylesheet cannot know.
 *
 * METHOD (the same difference method probe-hero-contrast.mjs uses, because a
 * ring median lies here: the ellipse is DARKEST under the glyphs and nothing
 * at the skirt, so sampling beside the type measures the wrong ground):
 *   - shoot the note's box twice, once as it renders and once with
 *     `visibility: hidden` on the <p> ONLY — the ::before/::after scrims are
 *     children of it and vanish with it, which is exactly right: what we want
 *     to know is the contrast the reader gets, ink against everything the
 *     scrim has done to the frame.
 *
 *     ... except that also removes the scrim from the "ground" shot, which
 *     would flatter nothing — it would UNDER-report, measuring cream against
 *     bare footage. So the ground shot hides only the TEXT (color:
 *     transparent), leaving both scrims painted. The difference is then
 *     exactly the ink, over exactly the ground the ink actually has.
 *   - per pixel: coverage (how far it moved), the ink, and the ground;
 *   - the reported figure is the WORST 44px patch carrying enough ink to
 *     judge, so one vanished word cannot hide inside a percentile.
 *
 * SEVERAL FRAMES, NOT ONE, and both VIEWS. In wheel view the ground is the
 * film; in card view .cards lays a cream sheet across this corner and the note
 * inverts to maroon ink. Both are measured, and the film is seeked across its
 * length because a note can measure fine on a dark frame and vanish two
 * seconds later on a bright one.
 *
 * Floor: 4.5:1. --t-small is 14px, which is not large text under any reading.
 *
 * usage: node scripts/probe-walkin-contrast.mjs [port] [w] [h]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [PORT = "3261", W = "1440", H = "900"] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SEL = '[class*="walkIn"]';

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const page = await b.newPage();
await page.setViewport({ width: +W, height: +H, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${PORT}/restaurants`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);
await sleep(2200);
await page
  .waitForFunction(
    () => {
      const v = document.querySelector("video");
      return v && v.readyState >= 2;
    },
    { timeout: 20000 },
  )
  .catch(() => console.log("  ! video never reached readyState 2"));

const lum = (r, g, bl) => {
  const f = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
};
const ratio = (a, b2) => {
  const [hi, lo] = a > b2 ? [a, b2] : [b2, a];
  return (hi + 0.05) / (lo + 0.05);
};

const decode = async (b64) =>
  page.evaluate(async (s) => {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const x = c.getContext("2d");
    x.drawImage(bmp, 0, 0);
    return {
      w: bmp.width,
      h: bmp.height,
      d: Array.from(x.getImageData(0, 0, bmp.width, bmp.height).data),
    };
  }, b64);

const COVER_FLOOR = 12;
const CORE_FRAC = 0.55;
const CELL = 44; // device px at DPR 2 = 22 CSS px, about one patch of letterform
const SKIRT = 4;

const inkOff = (off) =>
  page.evaluate(
    (s, o) => {
      const e = document.querySelector(s);
      if (e) e.style.color = o ? "transparent" : "";
    },
    SEL,
    off,
  );

const sample = async () => {
  const box = await page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
  }, SEL);
  if (!box) return null;
  const clip = {
    x: Math.max(0, Math.floor(box.x - SKIRT)),
    y: Math.max(0, Math.floor(box.y - SKIRT)),
    width: Math.ceil(box.w + SKIRT * 2),
    height: Math.ceil(box.h + SKIRT * 2),
  };
  const lit = await decode(await page.screenshot({ clip, encoding: "base64" }));
  await inkOff(true); // hide the TEXT, keep both scrims painted
  await sleep(120);
  const bare = await decode(await page.screenshot({ clip, encoding: "base64" }));
  await inkOff(false);

  const { w, h } = lit;
  const rows = [];
  for (let i = 0; i < w * h; i++) {
    const j = i * 4;
    const a = [lit.d[j], lit.d[j + 1], lit.d[j + 2]];
    const g = [bare.d[j], bare.d[j + 1], bare.d[j + 2]];
    const cover =
      Math.abs(a[0] - g[0]) + Math.abs(a[1] - g[1]) + Math.abs(a[2] - g[2]);
    if (cover < COVER_FLOOR) continue;
    rows.push({
      ink: a,
      ground: g,
      cover,
      cell: (((i / w) | 0) / CELL | 0) * 10000 + ((i % w) / CELL | 0),
      r: ratio(lum(...a), lum(...g)),
    });
  }
  if (rows.length < 40) return null;
  const covs = rows.map((r) => r.cover).sort((x, y) => x - y);
  const p95 = covs[Math.floor(covs.length * 0.95)];
  const cores = rows.filter((r) => r.cover >= p95 * CORE_FRAC);
  if (cores.length < 25) return null;

  const byCell = new Map();
  for (const r of cores) {
    if (!byCell.has(r.cell)) byCell.set(r.cell, []);
    byCell.get(r.cell).push(r);
  }
  const patches = [];
  for (const list of byCell.values()) {
    if (list.length < 20) continue;
    list.sort((p1, p2) => p1.r - p2.r);
    patches.push(list[list.length >> 1]);
  }
  patches.sort((p1, p2) => p1.r - p2.r);
  const sorted = [...cores].sort((p1, p2) => p1.r - p2.r);
  const worst = patches[0] ?? sorted[0];
  return {
    ink: worst.ink,
    ground: worst.ground,
    worst: +worst.r.toFixed(2),
    median: +sorted[sorted.length >> 1].r.toFixed(2),
    patches: patches.length,
    px: cores.length,
  };
};

const setView = async (v) => {
  await page.evaluate((vv) => {
    const btn = document.querySelector(
      `button[aria-label="${vv === "cards" ? "Card" : "Wheel"} view"]`,
    );
    btn?.click();
  }, v);
  await sleep(1000);
};

/* Below 980px .cards is its own scroll box, so in card view the ground under
   this corner is not the sheet — it is whichever PHOTOGRAPH happens to be
   scrolled beneath it. Seeking the video does nothing there; scrolling the
   grid is what changes the ground, so that is what gets swept. */
const scrollCards = (to) =>
  page.evaluate((t) => {
    const el = document.querySelector('[class*="cards"]');
    if (!el) return 0;
    el.scrollTop = t * (el.scrollHeight - el.clientHeight);
    return el.scrollTop;
  }, to);

/* A PROPER SPREAD, not a handful. The note has no ground of its own any more,
   so its contrast is entirely a function of whichever frame is behind it, and
   the failures are on the PALE frames — the ones where the clip shows cream
   packaging and white labels. Sampling four times would step straight over
   them. The clip's own duration is read and divided, so this stays honest if
   the footage is ever replaced with something longer. */
const duration = await page.evaluate(() => {
  const v = document.querySelector("video");
  return v && isFinite(v.duration) && v.duration > 0 ? v.duration : 20;
});
const N_FRAMES = 28;
const TIMES = Array.from({ length: N_FRAMES }, (_, i) =>
  +((duration * i) / N_FRAMES).toFixed(2),
);
console.log(
  `\n===== walk-in note, ${W}x${H} — ${N_FRAMES} frames across ${duration.toFixed(1)}s of clip =====`,
);

for (const view of ["wheel", "cards"]) {
  await setView(view);
  const meta = await page.evaluate(([s, vw, vh]) => {
    const e = document.querySelector(s);
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    const before = getComputedStyle(e, "::before");
    const after = getComputedStyle(e, "::after");
    return {
      dataView: e.dataset.view,
      color: cs.color,
      background: cs.backgroundColor,
      border: cs.borderTopWidth,
      radius: cs.borderTopLeftRadius,
      backdrop: cs.backdropFilter,
      box: `${Math.round(r.width)}x${Math.round(r.height)} at right ${Math.round(vw - r.right)}, bottom ${Math.round(vh - r.bottom)}`,
      scrimDark: before.opacity,
      scrimCream: after.opacity,
    };
  }, [SEL, +W, +H]);
  console.log(
    `\n-- view=${view} (data-view=${meta.dataView}) --\n   ink ${meta.color} | background ${meta.background} | border ${meta.border} | radius ${meta.radius} | backdrop-filter ${meta.backdrop}\n   box ${meta.box} | dark scrim opacity ${meta.scrimDark}, cream scrim opacity ${meta.scrimCream}`,
  );

  const all = [];
  const scrollable =
    view === "cards" &&
    (await page.evaluate(() => {
      const el = document.querySelector('[class*="cards"]');
      return el ? el.scrollHeight - el.clientHeight > 20 : false;
    }));
  if (scrollable)
    console.log(
      "   (the card grid is a scroll box at this width — the ground is the PHOTOGRAPH under the corner, so the grid is swept instead of the clip)",
    );

  for (let i = 0; i < TIMES.length; i++) {
    const t = TIMES[i];
    if (scrollable) {
      await scrollCards(i / (TIMES.length - 1));
    } else {
      await page.evaluate((tt) => {
        document.querySelectorAll("video").forEach((v) => {
          v.pause();
          try {
            v.currentTime = tt;
          } catch {}
        });
      }, t);
    }
    await sleep(500);
    const r = await sample();
    if (!r) {
      console.log(`   t=${String(t).padStart(5)}s  (no ink found)`);
      continue;
    }
    const fail = r.worst < 4.5;
    console.log(
      `   t=${String(t).padStart(5)}s  ink(${r.ink.join(",")}) on ground(${r.ground.join(",")})   worst patch ${String(r.worst).padStart(6)}:1   median ${String(r.median).padStart(6)}:1  ${fail ? "  << under 4.5" : ""}`,
    );
    all.push({ ...r, t });
  }
  if (all.length) {
    const sorted = [...all].sort((a, c) => a.worst - c.worst);
    // p95 of the DISTRIBUTION OF BADNESS: the 5th percentile of the readings,
    // i.e. the value 95% of frames do better than
    const p95 = sorted[Math.floor(sorted.length * 0.05)];
    const median = sorted[sorted.length >> 1];
    const failing = all.filter((r) => r.worst < 4.5).length;
    console.log(
      `   >>> ${view.toUpperCase()} VIEW over ${all.length} frames — worst ${sorted[0].worst}:1 (t=${sorted[0].t}s) | p95 ${p95.worst}:1 | median ${median.worst}:1 | best ${sorted[sorted.length - 1].worst}:1`,
    );
    console.log(
      `       against the 4.5:1 body floor: ${failing} of ${all.length} frames FAIL — ${failing === 0 ? "PASS" : "FAIL"}`,
    );
  }
}

/* WHICH CORNER WOULD HAVE WORKED. With no ground of its own, the note's only
   remaining defence is where it sits, so this reports the brightest-frame
   luminance of each corner of the film across the same spread — the darkest
   corner is the one a cream note could live in unaided. Reported as the
   contrast solid cream would return there, so it is directly comparable with
   the numbers above. */
console.log("\n--- which corner of the film is reliably dark? ---");
{
  await page.evaluate(() =>
    document.querySelector('button[aria-label="Wheel view"]')?.click(),
  );
  await sleep(900);
  const noteBox = await page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  }, SEL);
  await page.evaluate(
    (s) => (document.querySelector(s).style.visibility = "hidden"),
    SEL,
  );
  const M = 60;
  const corners = {
    "top-left": { x: M, y: M },
    "top-right": { x: +W - M - noteBox.w, y: M },
    "bottom-left": { x: M, y: +H - M - noteBox.h },
    "bottom-right": { x: +W - M - noteBox.w, y: +H - M - noteBox.h },
  };
  const acc = {};
  for (const t of TIMES) {
    await page.evaluate((tt) => {
      document.querySelectorAll("video").forEach((v) => {
        v.pause();
        try {
          v.currentTime = tt;
        } catch {}
      });
    }, t);
    await sleep(420);
    for (const [name, c] of Object.entries(corners)) {
      const img = await decode(
        await page.screenshot({
          clip: { x: c.x, y: c.y, width: noteBox.w, height: noteBox.h },
          encoding: "base64",
        }),
      );
      const ls = [];
      for (let i = 0; i < img.w * img.h; i++) {
        const j = i * 4;
        ls.push(lum(img.d[j], img.d[j + 1], img.d[j + 2]));
      }
      ls.sort((a, c2) => a - c2);
      const p90 = ls[Math.floor(ls.length * 0.9)]; // the bright tenth
      const r = ratio(0.9318, p90); // solid cream against it
      (acc[name] ??= []).push(r);
    }
  }
  await page.evaluate(
    (s) => (document.querySelector(s).style.visibility = ""),
    SEL,
  );
  for (const [name, rs] of Object.entries(acc)) {
    rs.sort((a, c) => a - c);
    console.log(
      `   ${name.padEnd(13)} cream would read worst ${rs[0].toFixed(2)}:1, median ${rs[rs.length >> 1].toFixed(2)}:1 across ${rs.length} frames`,
    );
  }
}

await page.close();
b.disconnect();
process.exit(0);
