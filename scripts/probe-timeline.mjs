/* Acceptance probe for the archive timeline — run against the PROD build on
   :3100. Checks the states a screenshot can't: spotlight with a sibling
   actually hovered, shutter clip vs transform, title reveal durations,
   per-item parallax rates, reduced motion, heading outline, overflow. */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = "http://localhost:3100/about";
const results = [];
const ok = (name, pass, detail = "") =>
  results.push({ name, pass: !!pass, detail: String(detail) });

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error" || /hydrat/i.test(m.text())) consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));

const sel = {
  ol: '[class*="timeline"]',
  li: '[class*="timeline"] > li',
};
const q = (i) => `document.querySelectorAll('${sel.li}')[${i}]`;
const part = (i, cls) => `${q(i)}.querySelector('[class*="${cls}"]')`;

async function stateAt(width, height) {
  await page.setViewport({ width, height });
  await page.goto(URL, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 400));
}

/* ---------- desktop 1440 ---------- */
await stateAt(1440, 900);
ok("AC2.1 nine items @1440", (await page.$$(sel.li)).length === 9);
ok("AC2.2 h2 reads Our Story", await page.$eval("h2[class*='storyHeading']", (e) => e.textContent) === "Our Story");

// heading outline: the h2 then nine h3s inside the story section
const outline = await page.evaluate(() => {
  const story = document.querySelector("section[class*='story']");
  const hs = [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => h.tagName + ":" + (h.textContent || "").slice(0, 24));
  const inStory = [...document.querySelectorAll("section[class*='story'] :is(h2,h3)")].map((h) => h.tagName);
  return { inStory: inStory.join(","), sample: hs.length, hasStory: !!story };
});
ok("AC8.1 story outline h2 + 9×h3", outline.inStory === "H2,H3,H3,H3,H3,H3,H3,H3,H3,H3", outline.inStory);

// unentered far item: frame clip has 100% bottom inset before it is reached
const clipUnentered = await page.evaluate(`getComputedStyle(${part(8, "frame")}).clipPath`);
ok("AC4.1 unentered frame clip bottom=100%", /100%/.test(clipUnentered), clipUnentered);

// years: all nine present, visible, correct alpha at desktop (0.3), <time> not aria-hidden
const years = await page.evaluate(() => {
  const ys = [...document.querySelectorAll("[class*='timeline'] time")];
  return {
    n: ys.length,
    hidden: ys.filter((y) => y.getAttribute("aria-hidden")).length,
    color: getComputedStyle(ys[0]).color,
    dt: ys.map((y) => y.getAttribute("datetime")).join(","),
  };
});
ok("AC6.3 nine <time> years, none aria-hidden", years.n === 9 && years.hidden === 0, JSON.stringify(years));
ok("AC3.7 year ink is cream @0.30 desktop", /250, 247, 241/.test(years.color) && /0\.3\)?/.test(years.color), years.color);

// scroll item 1 into view -> entrance; then check final clip + transform none
await page.evaluate(`${q(0)}.scrollIntoView({ block: "center" })`);
await new Promise((r) => setTimeout(r, 150));
const midClip = await page.evaluate(`getComputedStyle(${part(0, "frame")}).clipPath`);
await new Promise((r) => setTimeout(r, 900));
const settled = await page.evaluate(`(() => { const s = getComputedStyle(${part(0, "frame")}); return { clip: s.clipPath, tr: s.transform, transProp: s.transitionProperty, transDur: s.transitionDuration }; })()`);
ok("AC4.1 entered frame clip fully open", /inset\(0(px|%)/.test(settled.clip), settled.clip);
ok("AC3.3 frame transform none (rest)", settled.tr === "none", settled.tr);
ok("row6 clip transition 700ms", settled.transProp.includes("clip-path") && settled.transDur.includes("0.7s"), `${settled.transProp} ${settled.transDur}`);
ok("AC4.1 mid-flight bottom inset seen (best effort)", /(\d+(\.\d+)?)%/.test(midClip), midClip);

// parallax: two items transform differently at the same scroll position
await page.evaluate(`${q(1)}.scrollIntoView({ block: "center" })`);
await new Promise((r) => setTimeout(r, 500));
const p1 = await page.evaluate(`getComputedStyle(${part(1, "parallax")}).transform`);
const p2 = await page.evaluate(`getComputedStyle(${part(2, "parallax")}).transform`);
ok("AC5.2 items drift at different rates", p1 !== "none" && p1 !== p2, `${p1} vs ${p2}`);

// spotlight + shutter + title reveal — hover item 2 while item 1..3 visible
const box = await (await page.$$(sel.li))[1].boundingBox();
const restingInner = await page.evaluate(`(() => { const s = getComputedStyle(${part(0, "titleInner")}); return { tr: s.transform, dur: s.transitionDuration, delay: s.transitionDelay }; })()`);
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await new Promise((r) => setTimeout(r, 1100));
const hoverState = await page.evaluate(`(() => {
  const sib = getComputedStyle(${part(0, "itemBody")});
  const sibYear = getComputedStyle(${q(0)}.querySelector('time'));
  const hovBody = getComputedStyle(${part(1, "itemBody")});
  const hovFrame = getComputedStyle(${part(1, "frame")});
  const hovInner = getComputedStyle(${part(1, "titleInner")});
  return { sibOpacity: sib.opacity, sibYearColor: sibYear.color, hovOpacity: hovBody.opacity,
           frameClip: hovFrame.clipPath, frameTr: hovFrame.transform,
           innerTr: hovInner.transform, innerDur: hovInner.transitionDuration, innerDelay: hovInner.transitionDelay };
})()`);
ok("AC3.2 sibling body dims to 0.3", Math.abs(parseFloat(hoverState.sibOpacity) - 0.3) < 0.02, hoverState.sibOpacity);
ok("AC3.9 sibling YEAR stays lit under spotlight", /250, 247, 241/.test(hoverState.sibYearColor) && /0\.3\)?/.test(hoverState.sibYearColor), hoverState.sibYearColor);
ok("AC3.2 hovered body opacity 1", parseFloat(hoverState.hovOpacity) === 1, hoverState.hovOpacity);
ok("AC3.3 shutter = 5% clip inset", /5%/.test(hoverState.frameClip), hoverState.frameClip);
ok("AC3.3 frame transform unchanged on hover", hoverState.frameTr === "none", hoverState.frameTr);
ok("AC3.4 title revealed on hover (translate 0)", hoverState.innerTr === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(hoverState.innerTr), hoverState.innerTr);
ok("AC3.4 durations 800 hovered / 600 resting", hoverState.innerDur.includes("0.8s") && restingInner.dur.includes("0.6s"), `${hoverState.innerDur} vs ${restingInner.dur}`);
ok("AC3.4 200ms delay both directions", hoverState.innerDelay.includes("0.2s") && restingInner.delay.includes("0.2s"), `${hoverState.innerDelay} vs ${restingInner.delay}`);
ok("AC3.4 resting title parked ~130%", /matrix\(1, 0, 0, 1, 0, \d/.test(restingInner.tr), restingInner.tr);

// keyboard parity: focus a link -> same spotlight via :focus-within
await page.mouse.move(4, 4);
await new Promise((r) => setTimeout(r, 900));
await page.evaluate(`${q(3)}.querySelector('a').focus()`);
await new Promise((r) => setTimeout(r, 1000));
const focusState = await page.evaluate(`(() => ({
  sib: getComputedStyle(${part(0, "itemBody")}).opacity,
  self: getComputedStyle(${part(3, "itemBody")}).opacity,
  inner: getComputedStyle(${part(3, "titleInner")}).transform,
}))()`);
ok("AC8.2 focus produces spotlight + reveal", Math.abs(parseFloat(focusState.sib) - 0.3) < 0.02 && parseFloat(focusState.self) === 1 && (focusState.inner === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(focusState.inner)), JSON.stringify(focusState));

ok("AC6.5 no h-overflow @1440", await page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"));

/* ---------- 1920 ---------- */
await stateAt(1920, 1080);
ok("AC2.1 nine items @1920", (await page.$$(sel.li)).length === 9);
ok("AC6.5 no h-overflow @1920", await page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"));
ok("AC6.3 years visible @1920", await page.evaluate(`[...document.querySelectorAll("[class*='timeline'] time")].every(t => t.getBoundingClientRect().width > 0)`));

/* ---------- mobile 375 (touch) ---------- */
await page.setViewport({ width: 375, height: 812, hasTouch: true, isMobile: true });
await page.goto(URL, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 400));
const mobile = await page.evaluate(`(() => {
  const inner = getComputedStyle(${part(0, "titleInner")});
  const title = getComputedStyle(${part(0, "storyTitle")});
  const frame = ${part(0, "frame")}.getBoundingClientRect();
  const body = ${part(0, "itemBody")}.getBoundingClientRect();
  const year = getComputedStyle(${q(0)}.querySelector('time'));
  return { innerTr: inner.transform, titlePos: title.position, frameFrac: frame.width / body.width,
           yearColor: year.color, overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth };
})()`);
ok("AC6.1 titles not translated on touch", mobile.innerTr === "none", mobile.innerTr);
ok("AC6.1 title in flow (not absolute) narrow", mobile.titlePos !== "absolute", mobile.titlePos);
ok("row29/§8 frame ~72% at 375px", Math.abs(mobile.frameFrac - 0.72) < 0.02, mobile.frameFrac.toFixed(3));
ok("28c year alpha 0.40 narrow", /0\.4\)?/.test(mobile.yearColor), mobile.yearColor);
ok("AC6.5 no h-overflow @375", mobile.overflow);
ok("AC2.1 nine items @375", (await page.$$(sel.li)).length === 9);

/* ---------- 320 + 768 overflow ---------- */
for (const w of [320, 768, 980, 1280]) {
  await page.setViewport({ width: w, height: 800 });
  await page.goto(URL, { waitUntil: "networkidle2" });
  ok(`AC6.5 no h-overflow @${w}`, await page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"));
}

/* ---------- reduced motion @1440 ---------- */
await page.setViewport({ width: 1440, height: 900 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(URL, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 400));
await page.evaluate(`${q(4)}.scrollIntoView({ block: "center" })`);
await new Promise((r) => setTimeout(r, 300));
const rm = await page.evaluate(`(() => {
  const frame = getComputedStyle(${part(4, "frame")});
  const par = getComputedStyle(${part(4, "parallax")});
  const inner = getComputedStyle(${part(4, "titleInner")});
  return { clip: frame.clipPath, par: par.transform, inner: inner.transform };
})()`);
ok("AC5.3/6.4 reduced: parallax transform none", rm.par === "none", rm.par);
ok("AC6.4 reduced: frame open, no wipe", /inset\(0(px|%)/.test(rm.clip), rm.clip);
ok("AC6.4 reduced: title untranslated", rm.inner === "none", rm.inner);
const rmBox = await (await page.$$(sel.li))[4].boundingBox();
await page.mouse.move(rmBox.x + rmBox.width / 2, Math.min(rmBox.y + 40, 880));
await new Promise((r) => setTimeout(r, 400));
ok("AC6.4 reduced: no spotlight dim on hover", await page.evaluate(`getComputedStyle(${part(3, "itemBody")}).opacity`) === "1");

ok("AC7.5 zero console/hydration errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

await b.close();
const fails = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  — " + r.detail : ""}`);
console.log(`\n${results.length - fails.length}/${results.length} passed`);
process.exit(fails.length ? 1 : 0);
