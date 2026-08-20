/* ── WHAT THIS PROTECTS: THE PAGE STILL READS WITH SCRIPTS OFF ──
 *
 * Every route is prerendered, so the words are in the HTML — but the loader's
 * scroll lock and every entrance animation are written into that HTML in
 * their HIDDEN state, and only script removes them. A browser with
 * JavaScript on can never see the difference, which is why this exists.
 *
 * The <noscript> block in app/layout.tsx is the counter-rule. This walks the
 * things it has to keep true, with JS genuinely disabled at the page level,
 * and then again with it on to prove the animations still animate.
 *
 *   npm run build && npx serve out -l 3100
 *   node scripts/probe-nojs.mjs http://localhost:3100
 */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.argv[2] || "http://localhost:3100";
const PATHS = ["/blog", "/blog/a-note-on-service", "/", "/restaurants"];

const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });

const measure = () => ({
  bodyOverflow: getComputedStyle(document.body).overflow,
  scrollable: document.documentElement.scrollHeight > innerHeight + 40,
  entrances: [...document.querySelectorAll("[data-entrance]")].map((e) => ({
    o: +getComputedStyle(e).opacity,
    clip: getComputedStyle(e).clipPath,
  })),
});

for (const js of [false, true]) {
  console.log(`\n════ JavaScript ${js ? "ON" : "OFF"} ════`);
  for (const path of PATHS) {
    const p = await b.newPage();
    await p.setJavaScriptEnabled(js);
    await p.setViewport({ width: 1280, height: 900 });
    await p.goto(BASE + path, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, js ? 3000 : 800));
    const m = await p.evaluate(measure);
    const hidden = m.entrances.filter((e) => e.o < 0.99).length;
    const clipped = m.entrances.filter((e) => e.clip !== "none").length;
    console.log(
      `${path.padEnd(26)} overflow=${m.bodyOverflow.padEnd(7)} scrollable=${String(m.scrollable).padEnd(5)} ` +
        `entrances=${String(m.entrances.length).padStart(2)} hidden=${hidden} clipped=${clipped}`,
    );
    await p.close();
  }
}
await b.close();
