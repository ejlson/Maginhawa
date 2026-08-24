/* THE SEAMS BETWEEN CHAPTERS, MEASURED INK TO INK.

   A section's box tells you nothing about the gap a reader sees: chapters
   pad differently, one of them pulls itself up by a whole viewport, and two
   of them are sticky. What a reader sees is the distance from the LAST
   PAINTED PIXEL of one chapter to the FIRST of the next, so that is what
   this measures — walking the DOM for boxes that actually paint (type,
   pictures, rules, filled grounds) and reporting the runs of bare ground
   between them.

   usage: node scripts/probe-home-seams.mjs [port] [width] [height]       */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900);

const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", protocolTimeout: 300000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.setViewport({ width: W, height: H });
await p.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2", timeout: 90000 });
await p.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 40000 }).catch(() => {});
await new Promise(r => setTimeout(r, 1500));

const out = await p.evaluate(() => {
  const vh = innerHeight;
  const sections = [];
  const hero = document.querySelector("main > section");
  const name = (el) => {
    const m = (el.className || "").toString().match(/([A-Za-z]+)_/);
    return m ? m[1] : el.tagName.toLowerCase();
  };
  const roots = [];
  if (hero) roots.push([hero, "Hero"]);
  [...document.querySelector("main .afterHero").children].forEach(el => roots.push([el, name(el)]));

  /* ⚠️ THE ELEMENT'S OWN TRANSFORM IS BACKED OUT. Half this page arrives by
     translating into place, and at scroll 0 several chapters are parked a
     third of a viewport from where they will be read. Measuring the parked
     position reports a seam nobody ever sees. `getBoundingClientRect`
     includes transforms, so the accumulated translate is subtracted back
     off to give the element's LAID-OUT box. */
  const laidOut = (el) => {
    const r = el.getBoundingClientRect();
    let dx = 0, dy = 0, n = el;
    while (n && n !== document.body) {
      const t = getComputedStyle(n).transform;
      if (t && t !== "none") { const m = new DOMMatrixReadOnly(t); dx += m.e; dy += m.f; }
      n = n.parentElement;
    }
    return { top: r.top + scrollY - dy, bottom: r.bottom + scrollY - dy, left: r.left - dx, width: r.width };
  };

  const paints = (el, cs) => {
    if (el.matches("img,video,svg,picture,canvas")) return true;
    if (cs.backgroundImage !== "none") return true;
    const bg = cs.backgroundColor;
    if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return true;
    if (parseFloat(cs.borderTopWidth) || parseFloat(cs.borderBottomWidth)) return true;
    return [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  };

  for (const [root, label] of roots) {
    const spans = [];
    const walk = (el) => {
      for (const c of el.children) {
        const cs = getComputedStyle(c);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const r = laidOut(c);
        if (r.bottom > r.top && r.width > 0 && paints(c, cs)) spans.push([r.top, r.bottom]);
        if (c.children.length) walk(c);
      }
    };
    walk(root);
    if (!spans.length) continue;
    sections.push({ label, ink: [Math.min(...spans.map(s => s[0])), Math.max(...spans.map(s => s[1]))],
                    box: [laidOut(root).top, laidOut(root).bottom] });
  }
  return { vh, docH: document.documentElement.scrollHeight, sections };
});

console.log(`\n══ HOME SEAMS ${W}×${H} — ink to ink, transforms backed out ══\n`);
console.log("  CHAPTER        laid-out box        ink runs from → to      height");
out.sections.forEach(s => console.log(
  `  ${s.label.padEnd(13)} ${String(Math.round(s.box[0])).padStart(5)}→${String(Math.round(s.box[1])).padStart(5)}   ` +
  `${String(Math.round(s.ink[0])).padStart(5)}→${String(Math.round(s.ink[1])).padStart(5)}   ` +
  `${String(Math.round(s.ink[1] - s.ink[0])).padStart(5)}px  (${((s.ink[1] - s.ink[0]) / out.vh).toFixed(2)} screens)`));

console.log("\n  SEAM                              gap        as a share of the window");
for (let i = 1; i < out.sections.length; i++) {
  const a = out.sections[i - 1], c = out.sections[i];
  const gap = Math.round(c.ink[0] - a.ink[1]);
  const vhs = gap / out.vh;
  const bar = gap > 0 ? "·".repeat(Math.min(48, Math.round(gap / 8))) : "▓".repeat(Math.min(48, Math.round(-gap / 8)));
  const note = gap < 0 ? "  OVERLAP (a pin, or a pulled-up ground)" : "";
  console.log(`  ${(a.label + " → " + c.label).padEnd(30)} ${String(gap).padStart(6)}px  ${vhs.toFixed(2).padStart(5)}vh  ${bar}${note}`);
}
await b.close();
