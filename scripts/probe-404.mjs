/* Acceptance probe for the 404 (app/not-found.tsx). Reads the two things a
   screenshot argues about and cannot settle: the clearance between the
   numeral's ink and the headline's, and whether each door's arrow is nearer
   its own label than the next door's. Run against the dev server; the path
   is any path that does not exist. */
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args:["--no-sandbox","--hide-scrollbars"] });
const p = await b.newPage();
await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:3000/restaurants/belly", { waitUntil:"networkidle2" });
await p.evaluate(() => document.fonts.ready);
await new Promise(r=>setTimeout(r,1500));
console.log(JSON.stringify(await p.evaluate(() => {
  const nav = document.querySelector('nav[aria-label="Where to go instead"]');
  const li = nav?.querySelectorAll("li") ?? [];
  const num = [...document.querySelectorAll("p")].find(e=>e.textContent.trim()==="404");
  const h1 = document.querySelector("h1");
  const r = e => { const b = e.getBoundingClientRect(); return {t:+b.top.toFixed(1),b:+b.bottom.toFixed(1),h:+b.height.toFixed(1),w:+b.width.toFixed(1)}; };
  return {
    navFound: !!nav,
    navBox: nav ? r(nav) : null,
    navDisplay: nav ? getComputedStyle(nav).display : null,
    liCount: li.length,
    firstLi: li[0] ? r(li[0]) : null,
    firstA: li[0]?.querySelector("a") ? { ...r(li[0].querySelector("a")), color: getComputedStyle(li[0].querySelector("a")).color } : null,
    numeral: num ? { ...r(num), lh: getComputedStyle(num).lineHeight, fs: getComputedStyle(num).fontSize } : null,
    h1: h1 ? r(h1) : null,
    /* box clearance between the numeral and the headline */
    numToTitle: num && h1 ? +(h1.getBoundingClientRect().top - num.getBoundingClientRect().bottom).toFixed(1) : null,
    /* per door: distance from its arrow to its OWN label vs to the next
       door's label. Positive `arrowOwn` smaller than `arrowNext` is the
       whole assertion. */
    arrows: [...li].map((el, i, all) => {
      const a = el.querySelector('[aria-hidden]')?.getBoundingClientRect();
      const own = el.querySelector('a > span > span')?.getBoundingClientRect();
      const next = all[i + 1]?.querySelector('a > span > span')?.getBoundingClientRect();
      if (!a || !own) return null;
      return {
        own: +(a.left - own.right).toFixed(1),
        next: next ? +(next.left - a.right).toFixed(1) : null,
      };
    }),
    docW: document.documentElement.clientWidth,
  };
}, null, 2)));
if (process.env.OUT) {
  await p.evaluate(() => window.scrollTo(0, 800));
  await new Promise(r=>setTimeout(r,900));
  await p.screenshot({ path: process.env.OUT + "/doors.png" });
}
await b.close();
