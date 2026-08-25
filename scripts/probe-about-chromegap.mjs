/* THE CREAM BAND UNDER THE PINNED FILM, on a phone.

   .videoBackdrop is `position: sticky; height: 100svh`. svh is the SMALL
   viewport — the height a phone has while its URL bar and toolbar are shown.
   Scroll and that chrome retracts, the visible viewport grows towards lvh, and
   a sticky box measured in svh is then SHORTER than the screen it is pinned
   to. The strip it no longer covers shows .page's cream, which is what the
   reader sees at the bottom of the screen through the story timeline.

   Desktop Chrome has no retracting chrome, so svh == lvh there and the fault
   cannot arise on its own. The probe MODELS the phone instead: TOOLBAR is the
   lvh − svh delta, and case A rewrites the backdrop's height AND
   .videoContent's matching negative margin as `100svh − TOOLBAR`, which is
   what the OLD rule resolved to once the chrome was gone. Case B overrides
   nothing — it measures the stylesheet as it now ships, in a viewport already
   the size of lvh.

   Reported per stop, over stops that keep the whole screen inside the scope:
   the height of the uncovered strip, and how much of that strip's last row is
   painted cream rather than film.

   usage: node scripts/probe-about-chromegap.mjs [port]                     */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const W = 390, H = 844;      // iPhone 14 Pro, chrome retracted
const TOOLBAR = 87;          // lvh − svh on that phone
const STOPS = 14;
// .page's cream, measured: rgb(245,233,224). A pixel counts as cream if it is
// within 18 per channel of it — tight enough to exclude the scrim's lightest
// frame, loose enough to survive the grain overlay.
const CREAM = [245, 233, 224], TOL = 18;

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "networkidle0", timeout: 180000 });
await new Promise(r => setTimeout(r, 1800));

const cls = await page.evaluate(() => {
  const pick = (f) => { for (const e of document.querySelectorAll("[class]"))
    for (const c of e.classList) if (c.includes(f)) return c; return null; };
  return { backdrop: pick("videoBackdrop"), content: pick("videoContent"), scope: pick("videoScope") };
});
if (!cls.backdrop) { console.log("could not find .videoBackdrop"); await b.close(); process.exit(1); }

const sb = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const scratch = await sb.newPage(); await scratch.setContent("<canvas>");
const readStrip = (b64) => scratch.evaluate(async (b64, CREAM, TOL) => {
  const i = new Image(); i.src = "data:image/png;base64," + b64; await i.decode();
  const c = document.createElement("canvas"); c.width = i.width; c.height = i.height;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(i, 0, 0);
  const d = g.getImageData(0, 0, i.width, i.height).data;
  let s = [0, 0, 0], n = 0, cream = 0;
  for (let p = 0; p < d.length; p += 4) {
    s[0] += d[p]; s[1] += d[p + 1]; s[2] += d[p + 2]; n++;
    if (Math.abs(d[p] - CREAM[0]) <= TOL && Math.abs(d[p + 1] - CREAM[1]) <= TOL
        && Math.abs(d[p + 2] - CREAM[2]) <= TOL) cream++;
  }
  return { rgb: s.map(v => Math.round(v / n)), cream: +(100 * cream / n).toFixed(1) };
}, b64, CREAM, TOL);

async function run(shrink) {
  // the cookie banner is fixed to the bottom of the screen and would sit in
  // the very strip being measured — hidden, not consented to
  const css = `[class*="CookieBanner"]{display:none !important}` + (shrink
    ? `.${cls.backdrop}{height:calc(100svh - ${TOOLBAR}px) !important}
       .${cls.content}{margin-top:calc(-100svh + ${TOOLBAR}px) !important}`
    : "");
  const tag = await page.addStyleTag({ content: css });
  const geo = await page.evaluate((s) => {
    const sc = document.querySelector("." + s.scope);
    return { top: Math.round(sc.getBoundingClientRect().top + scrollY), h: sc.offsetHeight };
  }, cls);
  const rows = [];
  for (let k = 0; k < STOPS; k++) {
    // every stop keeps the whole screen inside the scope, so the strip can
    // only ever be film or the cream showing past it
    const y = Math.round(geo.top + (k / (STOPS - 1)) * Math.max(0, geo.h - H));
    const g = await page.evaluate(async (y, s, H) => {
      scrollTo(0, y);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise(r => setTimeout(r, 240));
      const r = document.querySelector("." + s.backdrop).getBoundingClientRect();
      return { gap: Math.max(0, Math.round(H - r.bottom)), h: Math.round(r.height), sy: Math.round(scrollY) };
    }, y, cls, H);
    // the strip the backdrop no longer reaches — or, when it does, the same
    // band of screen, so the two cases are compared over identical pixels
    const strip = await page.screenshot({
      clip: { x: 0, y: g.sy + H - TOOLBAR, width: W, height: TOOLBAR },
      captureBeyondViewport: false, encoding: "base64" });
    rows.push({ k, ...g, ...(await readStrip(strip)) });
  }
  await tag.evaluate(t => t.remove());
  return rows;
}

const A = await run(true), B = await run(false);
console.log(`viewport ${W}x${H} · modelled lvh−svh = ${TOOLBAR}px · strip = the bottom ${TOOLBAR}px of screen`);
console.log(`.page cream = rgb(${CREAM.join(",")}) ±${TOL}\n`);
console.log(" stop   A: the old 100svh rule                  B: as shipped (100lvh)");
console.log("        uncovered  strip rgb        cream%     uncovered  strip rgb        cream%");
for (let i = 0; i < A.length; i++) {
  const f = (a) => `${String(a.gap).padStart(6)}px  rgb(${a.rgb.join(",").padEnd(11)})  ${String(a.cream).padStart(5)}%`;
  console.log(`  ${String(i).padStart(2)}    ${f(A[i])}    ${f(B[i])}`);
}
const mean = (r) => +(r.reduce((s, x) => s + x.cream, 0) / r.length).toFixed(1);
console.log(`\nmean cream in the strip — old rule ${mean(A)}%  ·  as shipped ${mean(B)}%`);
await b.close(); await sb.close();
