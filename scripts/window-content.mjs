/* SWATCH OR PICTURE? A window can be "big enough" and still open on nothing.
   Sample the pixels INSIDE the hole (inset 2px so the clip's antialiased edge
   and the N's own stems don't count) and report luminance spread + local
   contrast. A flat colour field has near-zero neighbour-difference; a legible
   crop of a photograph does not. Reported alongside the hole size and the
   film's currentTime, so size and content can be told apart. */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const [, , FRAMES, TRACE] = process.argv;
const T = JSON.parse(fs.readFileSync(TRACE, "utf8"));
const rowAt = (ms) => T.rows.reduce((b, r) => (Math.abs(r.ms - ms) < Math.abs(b.ms - ms) ? r : b));

const files = fs
  .readdirSync(FRAMES)
  .filter((f) => /^\d+ms\.png$/.test(f))
  .map((f) => ({ f, ms: +f.slice(0, -6) }))
  .sort((a, b) => a.ms - b.ms);

console.log("   ms | hole w x h    | film ct | mean L | sd L | mean |dL| neighbour | reads as");
for (const { f, ms } of files) {
  if (ms < 380 || ms > 1000) continue;
  const r = rowAt(ms);
  if (r.hw == null || r.hw < 20) continue;
  const left = Math.round(r.hx + 3), top = Math.round(r.hy + 3);
  const w = Math.max(4, Math.round(r.hw - 6)), h = Math.max(4, Math.round(r.hh - 6));
  const { data, info } = await sharp(path.join(FRAMES, f))
    .extract({ left, top, width: w, height: h })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const c = info.channels;
  const L = [];
  for (let i = 0; i < info.width * info.height; i++)
    L.push(0.2126 * data[i * c] + 0.7152 * data[i * c + 1] + 0.0722 * data[i * c + 2]);
  const mean = L.reduce((s, v) => s + v, 0) / L.length;
  const sd = Math.sqrt(L.reduce((s, v) => s + (v - mean) ** 2, 0) / L.length);
  let d = 0, n = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 1; x < info.width; x++) {
      d += Math.abs(L[y * info.width + x] - L[y * info.width + x - 1]);
      n++;
    }
  const grad = d / n;
  console.log(
    `${String(ms).padStart(5)} | ${String(r.hw).padStart(6)} x ${String(r.hh).padEnd(5)} | ` +
      `${String(r.vct).padStart(6)}  | ${mean.toFixed(1).padStart(6)} | ${sd.toFixed(1).padStart(4)} | ` +
      `${grad.toFixed(2).padStart(9)}                | ${grad < 1.2 ? "SWATCH" : grad < 2.2 ? "soft" : "PICTURE"}`,
  );
}
