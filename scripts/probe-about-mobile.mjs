import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
for (const [w, h] of [[360,780],[390,844]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise(r => setTimeout(r, 8000));
  const res = await p.evaluate(async () => {
    const q = s => document.querySelector(s);
    const sec = q('[class*="AboutSplit_section__"]');
    const media = q('[class*="AboutSplit_media__"]');
    const frame = q('[class*="AboutSplit_mediaFrame__"]');
    const head = q('[class*="AboutSplit_heading__"]');
    const lead = q('[class*="AboutSplit_lead__"]');
    const body = q('[class*="AboutSplit_readingBlock__"]');
    const samples = [];
    // scroll the About section through the window and sample
    const secTop = sec.getBoundingClientRect().top + scrollY;
    for (const f of [-0.9, -0.5, -0.2, 0, 0.3, 0.7]) {
      window.scrollTo(0, secTop + f * innerHeight);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise(r => setTimeout(r, 250));
      samples.push({
        at: f,
        leadTf: getComputedStyle(lead).transform,
        bodyTf: getComputedStyle(body).transform,
        headTop: +head.getBoundingClientRect().top.toFixed(0),
        mediaBottom: +media.getBoundingClientRect().bottom.toFixed(0),
        clip: getComputedStyle(frame).clipPath,
        headOpacity: getComputedStyle(lead).opacity,
      });
    }
    // settle: let the sweep finish
    await new Promise(r => setTimeout(r, 2200));
    const gap = +(head.getBoundingClientRect().top - media.getBoundingClientRect().bottom).toFixed(1);
    return { samples, gap, clipFinal: getComputedStyle(frame).clipPath,
      scrollW: document.documentElement.scrollWidth, vw: innerWidth,
      doors: [...document.querySelectorAll('[class*="AboutSplit_doorFrame__"]')]
        .map(e => { const r = e.getBoundingClientRect(); return `${r.left.toFixed(0)}..${r.right.toFixed(0)}`; }) };
  });
  console.log(`\n════ ${w}x${h} ════`);
  for (const s of res.samples) console.log(" ", JSON.stringify(s));
  console.log("  picture→heading gap:", res.gap, "px");
  console.log("  clip after settle:", res.clipFinal);
  console.log("  doors:", res.doors.join("  "));
  console.log("  horiz overflow:", res.scrollW > res.vw, `(${res.scrollW} vs ${res.vw})`);
  await p.close();
}
await b.close();
