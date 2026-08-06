/* Cut the lane band out of a full-page screenshot and stack the halves, so
   the whole 1440px row can be looked at closely instead of as a 2880x122
   sliver. Pure image surgery on what shoot-press-section.mjs produced —
   nothing here touches the page.

   Usage: node scripts/crop-press-strip.mjs <in.png> <out.png> [topCss] [hCss] */
import sharp from "sharp";

const [, , IN, OUT, TOP = "380", H = "74"] = process.argv;
const DPR = 2;
const top = Math.round(Number(TOP) * DPR);
const h = Math.round(Number(H) * DPR);

const meta = await sharp(IN).metadata();
const half = Math.round(meta.width / 2);
const bits = [];
for (let i = 0; i < 2; i++) {
  bits.push(
    await sharp(IN)
      .extract({ left: i * half, top, width: half, height: h })
      .toBuffer(),
  );
}
await sharp({
  create: {
    width: half,
    height: h * 2 + 16,
    channels: 3,
    background: { r: 243, g: 239, b: 230 },
  },
})
  .composite([
    { input: bits[0], left: 0, top: 0 },
    { input: bits[1], left: 0, top: h + 16 },
  ])
  .png()
  .toFile(OUT);
console.log(`wrote ${OUT}`);
