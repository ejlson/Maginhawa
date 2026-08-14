#!/usr/bin/env node
/* ═══════════════ PUT `public/` ON CLOUDINARY ═══════════════════════════════
   Walks public/, uploads every picture and every film, and gives each one a
   public_id that lib/media.ts and lib/cloudinaryLoader.ts can PREDICT from
   the path alone — so nothing in the app has to read a manifest.

     public/images/bintang.jpg   →   maginhawa/images/bintang
     public/videos/tile-ramo.mp4 →   maginhawa/videos/tile-ramo

   ── RUN IT ──
     export CLOUDINARY_CLOUD_NAME=…      (or CLOUDINARY_URL, see below)
     export CLOUDINARY_API_KEY=…
     export CLOUDINARY_API_SECRET=…
     node scripts/cloudinary-upload.mjs --dry-run     # list, upload nothing
     node scripts/cloudinary-upload.mjs               # do it
     node scripts/cloudinary-upload.mjs --only videos # one subtree

   CLOUDINARY_URL is also read, since that is the single variable the
   Cloudinary dashboard hands you:
     cloudinary://<api_key>:<api_secret>@<cloud_name>

   ── NO SDK, ON PURPOSE ──
   The `cloudinary` npm package is a production dependency this app would
   never import — the app only ever builds URLs, which is string work. The
   signed upload API is a POST with a SHA-1 of the sorted parameters, and
   node has had `fetch`, `FormData` and `Blob` built in for several majors.
   One fewer dependency in the tree beats forty lines saved here.

   ── WHAT IT SKIPS, AND WHY ──
   · SVG.  Cloudinary blocks SVG delivery by default (an SVG is executable,
           so serving arbitrary ones off your own domain is a stored-XSS
           surface) and `f_auto` rasterises it. The fifteen in public/ are a
           few kB between them and stay local. lib/media.ts and the image
           loader both leave .svg paths untouched, so this is one decision
           spelled in three places and they must agree.
   · Anything already uploaded, UNLESS --force. The check is a HEAD against
           the delivery URL, which costs nothing and means a re-run after
           adding one photograph uploads one photograph.

   ── IT IS IDEMPOTENT ──
   `overwrite: true` + `invalidate: true` with an explicit public_id, so a
   re-run replaces in place and purges the CDN edge rather than creating
   `bintang_a7f3c1`. Running it twice is safe; running it after replacing a
   file locally is how you publish that replacement.
   ═════════════════════════════════════════════════════════════════════════ */

import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const ROOT = resolve(process.cwd());
const PUBLIC = join(ROOT, "public");
const FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || "maginhawa";

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const FORCE = argv.includes("--force");
const ONLY = (() => {
  const i = argv.indexOf("--only");
  return i >= 0 ? argv[i + 1] : null;
})();

/* ── CREDENTIALS ── CLOUDINARY_URL wins if present, since it is the one
   string the dashboard gives you and splitting it here beats asking someone
   to split it by hand into three variables. */
function credentials() {
  const url = process.env.CLOUDINARY_URL;
  if (url) {
    const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url.trim());
    if (!m) throw new Error("CLOUDINARY_URL is set but is not cloudinary://key:secret@cloud");
    return { key: m[1], secret: m[2], cloud: m[3] };
  }
  const cloud = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) {
    throw new Error(
      "Missing credentials. Set CLOUDINARY_URL, or all three of " +
        "CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.",
    );
  }
  return { cloud, key, secret };
}

/* the same sets lib/media.ts keeps, and they must stay in step — a file this
   script uploads but the app never asks for is wasted quota, and one the app
   asks for but this never uploaded is a 404 in production. */
const VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif"]);

/* ⚠️ VIDEO IS DELIBERATELY NOT UPLOADED, and this is the newer of the two
   deliberate exclusions here. `asset()` in lib/media.ts returns video paths
   UNCHANGED, so the films are served by Cloudflare Pages out of
   `public/videos/` — uploading them would put bytes on a shared free quota
   that nothing on the site would ever request.

   The reason it is Pages and not the CDN is on the `kind === "video"` branch
   in lib/media.ts: this Cloudinary account is free, is shared with another
   site, and had 8GB of monthly headroom left between the two of them, while
   Pages serves bandwidth free and unmetered. Film is where the bytes are.

   If you ever move film back onto the CDN, change BOTH files together — a
   disagreement here is silent, and it is a 404 on every <video> tag. */
const kindOf = (p) => {
  const ext = p.slice(p.lastIndexOf(".") + 1).toLowerCase();
  if (VIDEO_EXT.has(ext)) return null; // served by the host — see above
  if (IMAGE_EXT.has(ext)) return "image";
  return null; // svg and anything unrecognised stays local
};

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile() && !entry.name.startsWith(".")) out.push(full);
  }
  return out;
}

/** the web path (`/images/bintang.jpg`) for a file on disk */
const webPath = (file) => "/" + relative(PUBLIC, file).split(sep).join("/");

/** the public_id lib/media.ts will predict for that web path */
const publicIdFor = (web) => {
  const dot = web.lastIndexOf(".");
  return `${FOLDER}${dot > 0 ? web.slice(0, dot) : web}`;
};

/* Cloudinary's signature: every parameter you are sending EXCEPT file,
   api_key and resource_type, sorted by name, joined `k=v` with `&`, with the
   api_secret appended, SHA-1'd. Get the parameter set wrong in either
   direction and the API answers 401 with no hint as to which. */
function sign(params, secret) {
  const body = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(body + secret).digest("hex");
}

async function alreadyThere(cloud, kind, id) {
  // a HEAD on the delivery URL: no API quota, no rate limit, and it answers
  // the only question that matters (can the browser fetch this today)
  const url =
    kind === "video"
      ? `https://res.cloudinary.com/${cloud}/video/upload/${id}.mp4`
      : `https://res.cloudinary.com/${cloud}/image/upload/${id}`;
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}

async function upload({ cloud, key, secret }, file, web, kind) {
  const id = publicIdFor(web);
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { invalidate: "true", overwrite: "true", public_id: id, timestamp: String(timestamp) };

  const form = new FormData();
  const bytes = await readFile(file);
  form.append("file", new Blob([bytes]), file.split(sep).pop());
  form.append("api_key", key);
  for (const [k, v] of Object.entries(signed)) form.append(k, v);
  form.append("signature", sign(signed, secret));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${kind}/upload`, {
    method: "POST",
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${res.status} ${json?.error?.message ?? res.statusText}`);
  }
  return json;
}

// ── main ────────────────────────────────────────────────────────────────
const creds = credentials();
const files = (await walk(PUBLIC)).sort();

const jobs = [];
let skippedLocal = 0;
for (const file of files) {
  const web = webPath(file);
  if (ONLY && !web.startsWith(`/${ONLY.replace(/^\//, "")}`)) continue;
  const kind = kindOf(web);
  if (!kind) {
    skippedLocal++;
    continue;
  }
  const { size } = await stat(file);
  jobs.push({ file, web, kind, size, id: publicIdFor(web) });
}

const mb = (n) => (n / 1024 / 1024).toFixed(1) + "MB";
const total = jobs.reduce((a, j) => a + j.size, 0);

console.log(`cloud   ${creds.cloud}`);
console.log(`folder  ${FOLDER}`);
console.log(`files   ${jobs.length} to consider, ${mb(total)} (${skippedLocal} stay local — svg/other)\n`);

/* ⚠️ THE PLAN CEILING IS THE ONE FAILURE WORTH PREDICTING. Cloudinary's free
   tier caps a single video at 100MB and an image at 10MB; the paid tiers
   raise both. Nothing here is over 100MB today (the largest film is 44MB),
   but a 4K export dropped into public/ next month would be, and a 400 from
   the API on file 61 of 90 is a worse way to find out. */
for (const j of jobs) {
  if (j.kind === "video" && j.size > 100 * 1024 * 1024) {
    console.log(`  ⚠️  ${j.web} is ${mb(j.size)} — over the 100MB free-tier video ceiling`);
  }
  if (j.kind === "image" && j.size > 10 * 1024 * 1024) {
    console.log(`  ⚠️  ${j.web} is ${mb(j.size)} — over the 10MB free-tier image ceiling`);
  }
}

const manifest = {};
let done = 0;
let skipped = 0;
let failed = 0;

for (const j of jobs) {
  manifest[j.web] = j.id;

  if (DRY) {
    console.log(`  DRY   ${j.web}  →  ${j.id}  (${mb(j.size)})`);
    continue;
  }

  if (!FORCE && (await alreadyThere(creds.cloud, j.kind, j.id))) {
    skipped++;
    console.log(`  have  ${j.web}`);
    continue;
  }

  process.stdout.write(`  up    ${j.web}  (${mb(j.size)}) … `);
  try {
    const r = await upload(creds, j.file, j.web, j.kind);
    done++;
    console.log(`ok  ${r.width ?? "?"}×${r.height ?? "?"}`);
  } catch (e) {
    failed++;
    console.log(`FAILED  ${e.message}`);
  }
}

/* THE MANIFEST IS A RECORD, NOT A DEPENDENCY. Nothing in the app reads it —
   lib/media.ts derives the same public_ids from the paths, which is what
   keeps a newly-added photograph from needing a regenerated file to work.
   It is written so a human can diff what is on the CDN against what is in
   the repo, and so a future migration off Cloudinary has the mapping. */
await writeFile(
  join(ROOT, "cloudinary-manifest.json"),
  JSON.stringify({ cloud: creds.cloud, folder: FOLDER, generated: new Date().toISOString(), assets: manifest }, null, 2) + "\n",
);

console.log(
  `\n${DRY ? "dry run — nothing uploaded" : `uploaded ${done}, already present ${skipped}, failed ${failed}`}`,
);
console.log(`manifest written to cloudinary-manifest.json`);
if (failed) process.exitCode = 1;
