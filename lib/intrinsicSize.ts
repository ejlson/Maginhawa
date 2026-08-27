/* ═══ THE INTRINSIC SIZE OF A FILE IN public/, READ AT BUILD TIME ═══

   ⚠️ SERVER ONLY. This reads the filesystem, so it may be imported from a
   server component or a build script and from nowhere else. Importing it
   into anything with "use client" at the top breaks the build.

   ── WHY THIS EXISTS ──
   The menu sheets are raw <img> tags (see the note on the tag in
   components/venues/MenuPage.tsx) and they carried no width or height,
   because "no intrinsic size is on file for any of them" and the set is
   nineteen files across four different aspect ratios — A4 portrait at 0.707,
   A4 landscape at 1.414, 9:16 phone screens at 0.563, and Bintang's 0.714.

   MEASURED, production export, 390x844, CPU 4x: /menus/cafemama scored
   CLS 0.227 — Google's "poor" band starts at 0.25 and "needs improvement"
   at 0.1. The sheets are `width: 100%; height: auto`, so until each one
   decodes its box is zero tall and everything below it jumps. That is not a
   trade-off anybody chose; it is the cost of the dimensions not being
   available where the markup is written.

   They are available. They are in the first twenty-four bytes of the file.

   ── WHY A HEADER READER AND NOT sharp ──
   `sharp` is already a devDependency and would do this in one call. It is
   also a native binary, and this runs during `next build` — which is what
   Cloudflare runs on a machine this repository does not control. A
   twenty-line pure-JS header parse has no install step, no platform binary
   and no failure mode that only appears on the deploy host.

   ── WHY NOT A GENERATED MANIFEST ──
   cloudinary-manifest.json is the precedent and it is the wrong one here: a
   manifest is a second copy of a fact that the file already states, and it
   goes stale silently the first time somebody replaces a menu sheet without
   re-running the script. Reading the file is always right.                */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Intrinsic = { width: number; height: number };

/* JPEG frame markers carry the dimensions. C4 (Huffman table), C8 (JPEG
   extension) and CC (arithmetic coding conditioning) share the range and are
   NOT frames — reading dimensions out of one of those returns garbage. */
const isJpegFrame = (m: number) =>
  m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;

function parse(buf: Buffer): Intrinsic | null {
  // PNG — 8-byte signature, then IHDR: width at 16, height at 20, both BE32
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // JPEG — walk the segment chain to the first frame header
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i += 1; continue; } // resync past padding
      const marker = buf[i + 1];
      if (isJpegFrame(marker)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2; // standalone markers carry no length
        continue;
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  }

  // WebP — RIFF container, three possible chunk layouts
  if (buf.length >= 30 && buf.toString("ascii", 0, 4) === "RIFF" &&
      buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
      return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    }
    if (chunk === "VP8 ") {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

/* `src` is a path as the markup writes it — rooted at `public/`, e.g.
   "/menu/belly/food.png". Only the header is needed, but the files are on
   local disk at build time and a full read is simpler than a partial one. */
export function intrinsicSize(src: string): Intrinsic | null {
  try {
    return parse(readFileSync(join(process.cwd(), "public", src.replace(/^\//, ""))));
  } catch {
    /* A missing or unreadable file must not fail the build — the page still
       renders, it just renders without the reservation it would have had.
       Returning null rather than throwing keeps that a degradation. */
    return null;
  }
}
