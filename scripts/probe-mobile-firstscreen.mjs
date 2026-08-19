/* what a phone actually pays for the FIRST SCREEN — bytes on the wire before
   the reader has scrolled anywhere. The total over a full page walk is the
   same whatever the preload strategy is; when they are requested is the
   whole of the felt difference. */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
/* ⚠️ BYTES ON THE WIRE, NOT `content-length`. A ranged or aborted media
   request still advertises the whole file in its header, so counting headers
   reported 7.4MB for a clip whose element had `readyState 0` and an empty
   buffer. CDP's `encodedDataLength` at loadingFinished is what was actually
   transferred. */
const rows = [];
const t0 = Date.now();
const cdp = await p.target().createCDPSession();
await cdp.send("Network.enable");
const urls = new Map();
cdp.on("Network.requestWillBeSent", e => urls.set(e.requestId, e.request.url));
cdp.on("Network.loadingFinished", e => {
  const u = urls.get(e.requestId);
  if (u && e.encodedDataLength > 0)
    rows.push({ t: (Date.now() - t0) / 1000, n: e.encodedDataLength, u: u.replace("http://localhost:3000", "") });
});
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise(r => setTimeout(r, 12000));   // sit on the hero, do not scroll
const bytes = new Map();
for (const r of rows) bytes.set(r.u, (bytes.get(r.u) || 0) + r.n);
const total = [...bytes.values()].reduce((a, c) => a + c, 0);
console.log(`FIRST SCREEN (12s, no scroll): ${(total / 1048576).toFixed(2)} MB over ${bytes.size} responses`);
for (const [u, n] of [...bytes].sort((a, b) => b[1] - a[1]).slice(0, 10))
  console.log(`  ${(n / 1048576).toFixed(2)} MB  ${u.slice(0, 96)}`);
await b.close();
