/* HOW MANY 1080p DECODES IS THE HOME PAGE RUNNING AT ONCE?
 * Every concurrent <video> that is playing costs decode on the same machine
 * that has to composite the page. This walks every video element, names the
 * component that owns it (via the CSS-module class on an ancestor), and
 * reports which are actually decoding. */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 7000));
const census = await p.evaluate(() => {
  const owner = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const m = String(n.className || "").match(/([A-Z][A-Za-z]+)_[A-Za-z]+__/);
      if (m) return m[1];
    }
    return "?";
  };
  return [...document.querySelectorAll("video")].map((v, i) => {
    const r = v.getBoundingClientRect();
    return { i, owner: owner(v), src: (v.currentSrc || "").split("/").pop() || "—",
      ct: +v.currentTime.toFixed(1), paused: v.paused, rs: v.readyState,
      onScreen: r.bottom > 0 && r.top < innerHeight && r.width > 0,
      box: `${Math.round(r.width)}x${Math.round(r.height)}`,
      preload: v.preload, autoplay: v.autoplay, loop: v.loop };
  });
});
const playing = census.filter(v => !v.paused && v.src !== "—");
console.log("owner        src                      ct    rs  onScreen  box        preload  state");
for (const v of census) {
  console.log(
    `${v.owner.padEnd(12)} ${v.src.padEnd(24)} ${String(v.ct).padStart(5)}  ${v.rs}   ` +
    `${String(v.onScreen).padEnd(8)}  ${v.box.padEnd(10)} ${String(v.preload).padEnd(8)} ` +
    `${v.paused ? "paused" : "DECODING"}`);
}
console.log(`\n  ${census.length} video elements, ${playing.length} decoding concurrently`);
const bySrc = {};
playing.forEach(v => (bySrc[v.src] = (bySrc[v.src] || 0) + 1));
Object.entries(bySrc).filter(([, n]) => n > 1)
  .forEach(([s, n]) => console.log(`  ⚠️  ${s} is being decoded ${n}x at once`));
await b.close();
