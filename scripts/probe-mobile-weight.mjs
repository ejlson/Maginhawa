import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
const bytes = new Map();
p.on("response", async res => {
  const url = res.url();
  const len = Number(res.headers()["content-length"] || 0);
  bytes.set(url, Math.max(bytes.get(url) || 0, len));
});
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise(r => setTimeout(r, 9000));
await p.screenshot({ path: "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/4571a3c0-f3ac-4043-8c7b-dff92615811f/scratchpad/hero-390.png" });
await p.evaluate(async () => {
  for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.45) {
    window.scrollTo(0, y); await new Promise(r => setTimeout(r, 300));
  }
});
const rows = [...bytes].filter(([u, n]) => n > 0).sort((a, b) => b[1] - a[1]);
const total = rows.reduce((s, [, n]) => s + n, 0);
const by = {};
for (const [u, n] of rows) {
  const ext = (u.split("?")[0].match(/\.(\w+)$/)?.[1] || "other").toLowerCase();
  by[ext] = (by[ext] || 0) + n;
}
console.log(`TOTAL over the whole page walk: ${(total / 1048576).toFixed(1)} MB across ${rows.length} responses`);
console.log("by type:", Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${(v/1048576).toFixed(1)}MB`).join("  "));
console.log("\nheaviest 18:");
for (const [u, n] of rows.slice(0, 18)) console.log(`  ${(n/1048576).toFixed(2)} MB  ${u.replace("http://localhost:3000","")}`);
await b.close();
