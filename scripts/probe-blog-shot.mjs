import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/4571a3c0-f3ac-4043-8c7b-dff92615811f/scratchpad";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox","--autoplay-policy=no-user-gesture-required"] });
for (const [w, h, tag] of [[390, 844, "m"], [1440, 900, "d"]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise(r => setTimeout(r, 9000));
  const info = await p.evaluate(async () => {
    const sec = document.querySelector('[class*="Blog_section__"]');
    const y = sec.getBoundingClientRect().top + scrollY;
    for (let s = scrollY; s < y; s += innerHeight * 0.5) { window.scrollTo(0, s); await new Promise(r => setTimeout(r, 200)); }
    window.scrollTo(0, y - 20); await new Promise(r => setTimeout(r, 2500));
    const box = e => { if (!e) return null; const r = e.getBoundingClientRect();
      return { x:+r.x.toFixed(0), y:+r.y.toFixed(0), w:+r.width.toFixed(0), h:+r.height.toFixed(0), op:getComputedStyle(e).opacity, disp:getComputedStyle(e).display }; };
    const all = [...sec.querySelectorAll("a")].map(a => ({ href: a.getAttribute("href"), cls:(a.className||"").slice(0,34), ...box(a) }));
    return { sectionTop: +sec.getBoundingClientRect().top.toFixed(0), sectionH: +sec.getBoundingClientRect().height.toFixed(0),
      links: all, text: sec.innerText.replace(/\n+/g, " | ").slice(0, 420) };
  });
  console.log(`\n──── ${w}x${h} ────`);
  console.log("  section h", info.sectionH);
  for (const l of info.links) console.log(`   ${l.href}  ${l.cls}  ${l.w}x${l.h} @${l.x},${l.y} op${l.op}`);
  console.log("  text:", info.text);
  await p.screenshot({ path: `${OUT}/${tag}-blog.png`, fullPage: false });
  await p.close();
}
await b.close();
