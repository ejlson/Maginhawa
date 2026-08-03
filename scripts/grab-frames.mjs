/* No ffmpeg on this machine, and the repo has ZERO landscape photographs
   (38 scanned, every one portrait 0.56–0.67) — but six 1080p videos, which
   are 16:9. Decode candidate frames in a real browser and write them out, so
   the careers hero can have a genuine landscape image at brand quality, from
   footage the group already owns and shot.

   usage: node scripts/grab-frames.mjs [port]   (run from the repo root) */
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";

const PORT = process.argv[2] || "3000";
const OUT = "/tmp/mgnhw_frames";
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1920, height: 1080 });
/* served from the site's own origin so the canvas is never tainted */
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });

const VIDEOS = [
  "bintang-hero",
  "hero-draft3-1080",
  "belly-hero",
  "hero-cafemama",
  "forpilot1",
];

for (const name of VIDEOS) {
  for (const t of [2, 6, 11]) {
    const dataUrl = await page
      .evaluate(
        async (src, at) => {
          const v = document.createElement("video");
          v.src = src;
          v.muted = true;
          await new Promise((res, rej) => {
            v.onloadeddata = res;
            v.onerror = rej;
            setTimeout(rej, 25000);
          }).catch(() => {});
          if (!v.videoWidth) return null;
          v.currentTime = Math.min(at, (v.duration || 20) - 0.2);
          /* seeked, not a flat sleep — a large file can take seconds to land
             on the frame, and drawing early gives a black canvas */
          await new Promise((res) => {
            v.onseeked = res;
            setTimeout(res, 6000);
          });
          const c = document.createElement("canvas");
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          c.getContext("2d").drawImage(v, 0, 0);
          return c.toDataURL("image/jpeg", 0.92);
        },
        `/videos/${name}.mp4`,
        t,
      )
      .catch(() => null);

    if (!dataUrl) {
      console.log(`  ${name} @${t}s — could not decode`);
      continue;
    }
    const buf = Buffer.from(dataUrl.split(",")[1], "base64");
    writeFileSync(`${OUT}/${name}_${t}s.jpg`, buf);
    console.log(`  ${name} @${t}s -> ${Math.round(buf.length / 1024)}KB`);
  }
}

console.log(`\n  frames -> ${OUT}`);
setTimeout(() => process.exit(0), 2500);
await b.close().catch(() => {});
process.exit(0);
