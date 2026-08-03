/* Full inspection, now that the loader is known to release on a real
   pointer gesture + wheel (it never releases on scrollTo alone). */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1","--enable-gpu","--use-gl=angle"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto("https://unveil.fr/", { waitUntil: "networkidle2", timeout: 90000 });
await sleep(3000);
await page.mouse.move(700, 450); await page.mouse.move(720, 470);
await page.mouse.click(720, 470).catch(()=>{});
await sleep(6000);
await page.mouse.wheel({ deltaY: 300 }); await sleep(5000);

const info = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  const ctxOf = (el) => {
    for (const t of ["webgl2","webgl","2d"]) { try { if (el.getContext(t)) return t; } catch {} }
    return "unknown";
  };
  const r = c.getBoundingClientRect();
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  const dbg = gl && gl.getExtension("WEBGL_debug_renderer_info");
  const imgs = [...document.querySelectorAll("img")].slice(0,8).map(i=>({
    w: Math.round(i.getBoundingClientRect().width),
    h: Math.round(i.getBoundingClientRect().height),
    vis: getComputedStyle(i).visibility + "/" + getComputedStyle(i).display + "/op" + getComputedStyle(i).opacity,
    src: i.currentSrc.split("/").pop().slice(0,50),
  }));
  const threeD = [...document.querySelectorAll("*")].filter(e=>{
    const s=getComputedStyle(e);
    return s.perspective!=="none"||s.transformStyle==="preserve-3d"||(s.transform!=="none"&&s.transform.startsWith("matrix3d"));
  });
  return {
    canvas: { ctx: ctxOf(c), cssBox: `${Math.round(r.width)}x${Math.round(r.height)}`,
              buffer: `${c.width}x${c.height}`, dpr: devicePixelRatio,
              style: (c.getAttribute("style")||"").slice(0,90),
              parentCls: String(c.parentElement?.className).slice(0,50) },
    gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "?",
    glVersion: gl ? gl.getParameter(gl.VERSION) : "none",
    imgCount: document.querySelectorAll("img").length,
    imgSample: imgs,
    cssThreeDCount: threeD.length,
    docH: document.documentElement.scrollHeight, vh: innerHeight,
    text: document.body.innerText.replace(/\s+/g," ").slice(0,220),
  };
});
console.log("=== structure ===\n" + JSON.stringify(info, null, 1));

const frames = await page.evaluate(async () => {
  const ts = []; let stop = false;
  const tick = (t) => { ts.push(t); if (!stop) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  await new Promise(r => setTimeout(r, 200));
  for (let i=0;i<70;i++){ window.dispatchEvent(new WheelEvent("wheel",{deltaY:60,bubbles:true,cancelable:true}));
    await new Promise(r=>setTimeout(r,28)); }
  stop = true;
  const d = ts.slice(1).map((t,i)=>t-ts[i]).sort((a,b)=>a-b);
  const q = p => +d[Math.floor(d.length*p)].toFixed(1);
  return { frames:d.length, median:q(0.5), p90:q(0.9), p99:q(0.99), worst:+d[d.length-1].toFixed(1), over20:d.filter(x=>x>20).length };
});
console.log("\n=== frame intervals while the ribbon moves (ms) ===\n" + JSON.stringify(frames, null, 1));
await sleep(800);
await page.screenshot({ path: "/tmp/mgnhw_unveil/04-loaded.png" });
await page.mouse.move(700,450);
for (let i=0;i<25;i++){ await page.mouse.wheel({deltaY:120}); await sleep(40); }
await sleep(1200);
await page.screenshot({ path: "/tmp/mgnhw_unveil/05-ribbon.png" });
await b.close();
