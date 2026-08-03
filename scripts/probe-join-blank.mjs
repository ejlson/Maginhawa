import puppeteer from "puppeteer-core";
const PORT = process.argv[2] || "3100";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox","--force-device-scale-factor=1"] });
const page = await b.newPage();
const errs = [], failed = [];
page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0,180)); });
page.on("pageerror", e => errs.push("PAGEERROR: " + String(e).slice(0,180)));
page.on("response", r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().split("/").pop().slice(0,50)}`); });
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/careers`, { waitUntil: "networkidle2", timeout: 45000 });
await new Promise(r => setTimeout(r, 3000));
const r = await page.evaluate(() => ({
  isLoading: document.body.classList.contains("is-loading"),
  bodyText: (document.body.innerText || "").replace(/\s+/g," ").slice(0,160),
  nodes: document.querySelectorAll("*").length,
  heroImg: !!document.querySelector('img[src*="careers-hero"]'),
  docH: document.documentElement.scrollHeight,
}));
console.log(JSON.stringify(r, null, 1));
console.log("console errors:", errs.length); errs.slice(0,6).forEach(e => console.log("  ", e));
console.log("failed requests:", failed.length); failed.slice(0,6).forEach(f => console.log("  ", f));
setTimeout(() => process.exit(0), 2000); await b.close().catch(()=>{}); process.exit(0);
