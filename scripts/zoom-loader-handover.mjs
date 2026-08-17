/* 4x zooms of the letter/window handover + a PIXEL measurement of stem overhang.
 *
 * The congruence table can only say the ink BOX and the hole BOX are the same
 * rectangle. It cannot see corner radius: a pill and a slab of identical w/h
 * both score dW=dH=0 while one of them cuts the letter's corners off. So this
 * pass classifies real pixels — maroon #411613 ink, cream #f5e9e0 overlay,
 * anything else is film — and asks, for every ink pixel, whether it lies
 * inside the rounded hole or out on bare cream.
 *
 * Usage: node zoom-handover.mjs <framesDir> <zoomDir> <trace.json>
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const [, , FRAMES, ZOOM, TRACE] = process.argv;
const CX = 720, CY = 450, CW = 320, CH = 130, Z = 4;

const trace = JSON.parse(fs.readFileSync(TRACE, "utf8"));
const rowAt = (ms) =>
  trace.rows.reduce((b, r) => (Math.abs(r.ms - ms) < Math.abs(b.ms - ms) ? r : b));

fs.mkdirSync(ZOOM, { recursive: true });
for (const f of fs.readdirSync(ZOOM)) fs.rmSync(path.join(ZOOM, f));

const frames = fs
  .readdirSync(FRAMES)
  .filter((f) => /^\d+ms\.png$/.test(f))
  .map((f) => ({ f, ms: +f.slice(0, -6) }))
  .sort((a, b) => a.ms - b.ms);

const near = (r, g, b, t, tol) =>
  Math.abs(r - t[0]) <= tol && Math.abs(g - t[1]) <= tol && Math.abs(b - t[2]) <= tol;
const MAROON = [0x41, 0x16, 0x13];
const CREAM = [0xf5, 0xe9, 0xe0];

/* signed distance from a point to a rounded rect; <0 inside */
function sdRoundRect(px, py, x, y, w, h, r) {
  const cx = x + w / 2, cy = y + h / 2;
  const qx = Math.abs(px - cx) - (w / 2 - r);
  const qy = Math.abs(py - cy) - (h / 2 - r);
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

console.log("  ms | hole w x h @ x,y            | ink px  outside  worst-out  where");
const report = [];
for (const { f, ms } of frames) {
  if (ms < 300 || ms > 700) continue;
  const src = path.join(FRAMES, f);
  await sharp(src)
    .extract({ left: CX - CW / 2, top: CY - CH / 2, width: CW, height: CH })
    .resize(CW * Z, CH * Z, { kernel: "nearest" })
    .png()
    .toFile(path.join(ZOOM, `z${String(ms).padStart(4, "0")}ms.png`));

  const r = rowAt(ms);
  if (r.hw == null || r.hw < 1) continue;
  const { data, info } = await sharp(src)
    .extract({ left: CX - CW / 2, top: CY - CH / 2, width: CW, height: CH })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let ink = 0, out = 0, worst = -1e9, wx = 0, wy = 0;
  const rowsOut = new Map();
  for (let yy = 0; yy < info.height; yy++) {
    for (let xx = 0; xx < info.width; xx++) {
      const i = (yy * info.width + xx) * ch;
      const R = data[i], G = data[i + 1], B = data[i + 2];
      // tolerance 26 keeps antialiased edge pixels out of the count: only
      // near-solid ink is asked the inside/outside question
      if (!near(R, G, B, MAROON, 26)) continue;
      ink++;
      const px = CX - CW / 2 + xx + 0.5, py = CY - CH / 2 + yy + 0.5;
      const d = sdRoundRect(px, py, r.hx, r.hy, r.hw, r.hh, r.hr ?? 0);
      if (d > 0.5) {
        out++;
        rowsOut.set(py, (rowsOut.get(py) || 0) + 1);
        if (d > worst) { worst = d; wx = px; wy = py; }
      }
    }
  }
  report.push({ ms, ink, out, worst: out ? +worst.toFixed(1) : 0, wx, wy, r });
  console.log(
    `${String(ms).padStart(5)} | ${String(r.hw).padStart(6)} x ${String(r.hh).padEnd(5)} @ ${String(r.hx).padStart(6)},${String(r.hy).padEnd(6)} | ` +
      `${String(ink).padStart(6)} ${String(out).padStart(7)}  ${out ? worst.toFixed(1) + "px @" + wx + "," + wy : "     —"}`,
  );
}
fs.writeFileSync(path.join(ZOOM, "overhang.json"), JSON.stringify(report, null, 1));
console.log(`\nzooms -> ${ZOOM}`);
