#!/usr/bin/env node
/* ═══════════════ MAKE `public/` DEPLOYABLE WITHOUT A CDN ═══════════════════
   Re-encodes the films and the photographs in place, keeping the originals in
   media-src/originals/ (which is already gitignored, and is already where
   this project keeps masters).

   ── WHY THIS IS THE FIRST THING TO TRY, BEFORE ANY ASSET HOST ──
   The problem was never that this site has a lot of media. It is that the
   media is checked in at CAPTURE quality. MEASURED, 2026-08-14:

     videos    218MB → 70MB   (68% smaller)
     images     81MB →  7MB   (92% smaller)

   and after it, the largest single file is 18.6MB — under Cloudflare Pages'
   25MB per-file ceiling, which is the thing that made an external host look
   compulsory in the first place. No account, no card, no third party, no
   runtime dependency: the files just get smaller and everything else about
   the site stays exactly as it is.

   ── WHERE THE WASTE ACTUALLY IS, because it is not where you would guess ──
   · THE FILMS ARE 1080p, NOT 4K — they are simply encoded at 9.5–12.4 Mbps,
     which is five to eight times a sane web bitrate for that resolution.
     CRF 24 is the whole fix for the heroes.
   · THE TILE CLIPS ARE THE ABSURD ONES. tile-ramo.mp4 is 11.1MB of 50fps
     footage rendered into a card that is ~330px wide. At 540px/25fps it is
     0.6MB — a 95% cut with nothing visible given up, because the pixels were
     never being shown.
   · THE PHOTOGRAPHS ARE STRAIGHT OFF THE CAMERA. belly3.jpg is 6240×4160 and
     20MB; ramoramen.JPG is 7008×4672. The widest any of them is ever
     rendered is under 1500px. 2560px on the long edge is still generous
     headroom for a retina full-bleed, and it costs 0.7MB instead of 20.
   · AUDIO IS STRIPPED (`-an`) FROM EVERY FILM. Every <video> on this site is
     `muted` — there is no path through the UI that plays sound — so the
     audio track is bytes shipped to be discarded.

   ── RUN IT ──
     node scripts/compress-media.mjs                 # dry run: the table only
     node scripts/compress-media.mjs --write         # do it
     node scripts/compress-media.mjs --write --only videos
     node scripts/compress-media.mjs --write --crf 26   # smaller, softer

   Needs ffmpeg on PATH (`brew install ffmpeg`).

   ── IT IS SAFE TO RE-RUN AND SAFE TO UNDO ──
   The original is moved to media-src/originals/<path> BEFORE the encode, and
   a file that already has an original stashed is skipped — so a second run is
   a no-op rather than a re-encode of an encode (which is how quality dies
   quietly, generation by generation). To undo: copy back from
   media-src/originals/.

   ⚠️ IT DOES NOT TOUCH SVG, and it does not touch public/menu — those are
   menu SCANS that a reader is expected to zoom into, and softening the type
   on a menu is a legibility regression rather than a saving.
   ═════════════════════════════════════════════════════════════════════════ */

import { execFile } from "node:child_process";
import { mkdir, readdir, rename, stat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = resolve(process.cwd());
const PUBLIC = join(ROOT, "public");
const ORIGINALS = join(ROOT, "media-src", "originals");

const argv = process.argv.slice(2);
const WRITE = argv.includes("--write");
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const ONLY = arg("--only", null);
const CRF = arg("--crf", "24");

/* THE PHOTOGRAPH'S LONG EDGE. 2560 rather than 1920 because the widest thing
   on the site is a full-bleed chapter image on a 1440 window, and a 2× retina
   panel wants roughly twice that. next/image resamples down from here anyway;
   this number only decides how much headroom the SOURCE keeps. */
const IMAGE_LONG_EDGE = 2560;

/* THE TILE CLIPS' WIDTH. The card is ~331px wide on the 4-up home grid and
   ~220px on /restaurants; 540 is a 2× retina card with room to spare. The
   expansion plays the same clip at ~610px wide — still inside a 540-wide
   source once `object-fit: cover` has cropped it to a portrait, and the
   alternative is shipping 11MB to a card. */
const TILE_WIDTH = 540;

/* directories left alone entirely, each for its own reason */
const SKIP_DIRS = [
  // menu SCANS — a reader zooms into these to read 9pt type
  "menu",
];

const VIDEO_EXT = new Set(["mp4", "mov", "m4v"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png"]);

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.includes(e.name)) continue;
      await walk(full, out);
    } else out.push(full);
  }
  return out;
}

const ext = (p) => p.slice(p.lastIndexOf(".") + 1).toLowerCase();
const mb = (n) => n / 1048576;

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

const files = (await walk(PUBLIC)).sort();
const jobs = [];
for (const f of files) {
  const rel = relative(PUBLIC, f).split(sep).join("/");
  if (ONLY && !rel.startsWith(ONLY.replace(/^\//, ""))) continue;
  const e = ext(f);
  const kind = VIDEO_EXT.has(e) ? "video" : IMAGE_EXT.has(e) ? "image" : null;
  if (!kind) continue; // svg and anything else
  const { size } = await stat(f);
  const base = rel.split("/").pop();
  // the tile clips are the ones that get resized as well as re-encoded
  const tile = kind === "video" && base.startsWith("tile-");
  jobs.push({ file: f, rel, kind, tile, size });
}

console.log(`${WRITE ? "ENCODING" : "DRY RUN"} — ${jobs.length} files, crf ${CRF}\n`);

let before = 0;
let after = 0;
let skipped = 0;

for (const j of jobs) {
  before += j.size;
  const stash = join(ORIGINALS, j.rel);

  /* ALREADY DONE, so leave it alone. The presence of a stashed original is
     the marker, not a size threshold: re-encoding an encode is generation
     loss, and it is invisible until three runs later. */
  if (await exists(stash)) {
    skipped++;
    after += j.size;
    console.log(`  keep   ${j.rel}  (original already stashed)`);
    continue;
  }

  if (!WRITE) {
    console.log(`  would  ${j.rel}  ${mb(j.size).toFixed(1)}MB  [${j.tile ? "tile" : j.kind}]`);
    after += j.size;
    continue;
  }

  await mkdir(dirname(stash), { recursive: true });
  await rename(j.file, stash); // the original is now the INPUT
  const args =
    j.kind === "video"
      ? [
          "-v", "error", "-y", "-i", stash,
          // every <video> on this site is muted — the audio track is bytes
          // shipped to be thrown away
          "-an",
          "-vf",
          j.tile
            ? `scale=${TILE_WIDTH}:-2,fps=25`
            : `scale='min(1920,iw)':-2`,
          "-c:v", "libx264",
          "-preset", "slow",
          "-crf", j.tile ? String(Number(CRF) + 1) : CRF,
          "-pix_fmt", "yuv420p",
          // moov atom at the front, so playback can start before the whole
          // file has arrived — on a 19MB hero that is the difference between
          // a first frame and a black box
          "-movflags", "+faststart",
          j.file,
        ]
      : [
          "-v", "error", "-y", "-i", stash,
          "-vf", `scale='min(${IMAGE_LONG_EDGE},iw)':-2`,
          "-q:v", "4",
          j.file,
        ];

  process.stdout.write(`  enc    ${j.rel}  ${mb(j.size).toFixed(1)}MB … `);
  try {
    await run("ffmpeg", args);
    const { size } = await stat(j.file);
    after += size;
    console.log(`${mb(size).toFixed(1)}MB  (−${(100 - (100 * size) / j.size).toFixed(0)}%)`);
  } catch (err) {
    // put it back rather than leaving a hole where a photograph was
    await rename(stash, j.file);
    after += j.size;
    console.log(`FAILED — original restored. ${String(err).slice(0, 120)}`);
  }
}

console.log(
  `\n${mb(before).toFixed(0)}MB → ${mb(after).toFixed(0)}MB` +
    (before ? `  (${(100 - (100 * after) / before).toFixed(0)}% smaller)` : "") +
    (skipped ? `, ${skipped} already done` : ""),
);
if (!WRITE) console.log("dry run — nothing was changed. Re-run with --write.");
else console.log(`originals in ${relative(ROOT, ORIGINALS)}/ — copy back from there to undo`);
