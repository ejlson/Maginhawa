import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1"] });
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${process.argv[2] || "3000"}/contact`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(()=>{});
await new Promise(r => setTimeout(r, 1800));
const out = await page.evaluate(() => {
  const px = n => Math.round(n);
  const items = [...document.querySelectorAll("[class*='ReviewUs_item__']")].map(e => {
    const r = e.getBoundingClientRect();
    return { txt: (e.textContent||"").trim().slice(0,18), x: px(r.left), y: px(r.top + scrollY), w: px(r.width) };
  });
  const sec = document.querySelector("[class*='ReviewUs_section'], [class*='ReviewUs']");
  const chain = []; let e = sec;
  while (e && e !== document.body) { const s = getComputedStyle(e); const r = e.getBoundingClientRect();
    chain.push({ cls: String(e.className).slice(0,28), ovf: `${s.overflowX}/${s.overflowY}`,
      box: `${px(r.left)}..${px(r.right)}`, tf: s.transform.slice(0,24), pos: s.position }); e = e.parentElement; }
  return { items, chain, track: (() => { const t = document.querySelector("[class*='ReviewUs_track'], [class*='ReviewUs_list'], [class*='ReviewUs_rail']");
    if (!t) return null; const s = getComputedStyle(t); const r = t.getBoundingClientRect();
    return { cls: String(t.className).slice(0,28), display: s.display, tf: s.transform.slice(0,30), box: `${px(r.left)}..${px(r.right)}`, ovf: `${s.overflowX}/${s.overflowY}` }; })() };
});
console.log("items:"); out.items.forEach(i => console.log(`   x${String(i.x).padStart(6)}  y${String(i.y).padStart(5)}  w${String(i.w).padStart(4)}   ${i.txt}`));
console.log("\ntrack:", JSON.stringify(out.track));
console.log("\nancestors:"); out.chain.forEach(c => console.log(`   ${c.cls.padEnd(28)} ovf ${c.ovf.padEnd(16)} ${c.box.padEnd(14)} ${c.pos} ${c.tf}`));
setTimeout(() => process.exit(0), 2500); await b.close().catch(()=>{}); process.exit(0);
