/* ═══════════════════ WHERE THE PICTURES AND THE FILMS COME FROM ═══════════
   ONE FUNCTION BETWEEN EVERY ASSET PATH IN THIS CODEBASE AND THE URL THE
   BROWSER ACTUALLY FETCHES.

   ── WHY THIS EXISTS ──
   `public/` was 344MB across 105 files, and five of the videos were over
   25MB on their own. That was never a page-weight complaint, it was a
   hosting one: Cloudflare Pages refuses any single file over 25MB, so the
   site could not be deployed there at all while the films sat checked in
   beside the code at capture bitrate.

   ── AND THE ANSWER IS SPLIT IN TWO, WHICH IS THE THING TO UNDERSTAND ──
   Compressing the films (scripts/compress-media.mjs) took them under the
   25MB ceiling, so the ceiling stopped being a reason to need anybody. What
   remains is a genuine division of labour:

     FILM        → served by Cloudflare Pages out of `public/videos/`.
                   Bandwidth there is free and unmetered, and film is where
                   the bytes are.
     PHOTOGRAPHS → served by Cloudinary, because `f_auto` and a per-device
                   width save far more than they cost.

   The full reasoning, including the shared-account arithmetic that forces
   it, is on the `kind === "video"` branch in `asset()` below. Read that
   before moving anything across the line.

   ── IT IS OFF UNTIL IT IS CONFIGURED, AND THAT IS THE POINT ──
   With no `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` in the environment every
   function here returns its argument UNCHANGED, so the site serves out of
   `public/` exactly as it always has. Nothing about local development
   changes, no build step depends on an account existing, and a missing
   variable degrades to "the way it worked yesterday" rather than to a page
   of broken images. Set the variable and the same paths resolve to the CDN.

   ── THE PATHS THEMSELVES NEVER CHANGE ──
   Every caller still writes `/videos/tile-bintang.mp4` and
   `/images/bintang.jpg`. That is deliberate: those strings are also in
   lib/restaurants.ts, lib/blog.ts, lib/press.ts and half the components, and
   a migration that rewrote all of them into CDN URLs would be
   irreversible, unreadable in a diff, and wrong the moment the account
   moved. The path is the identity of the asset; this file is the only place
   that knows where that identity currently lives.

   ── WHO CALLS WHAT ──
   `next/image` DOES NOT CALL THIS. It goes through lib/cloudinaryLoader.ts,
   which next.config.mjs installs as the image loader — so every `<Image>` on
   the site is migrated without a single component being touched. This file
   is for everything next/image cannot reach: video sources, poster
   attributes, raw image tags, and the CSS mask URLs the venue marks are
   drawn with.
   ═════════════════════════════════════════════════════════════════════════ */

/* Read at module scope, which for a NEXT_PUBLIC_ variable means "inlined at
   build time". There is no runtime lookup to fail and nothing to await. */
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/* THE FOLDER EVERY ASSET LANDS IN, so this account can host something else
   tomorrow without a public_id collision. It must match the same variable in
   scripts/cloudinary-upload.mjs — the uploader writes the public_ids and
   this file predicts them, and the two agreeing is the whole contract. */
const FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || "maginhawa";

const VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif"]);

/* ⚠️ SVG IS DELIBERATELY ABSENT FROM `IMAGE_EXT`, and it is not an oversight.
   Cloudinary blocks SVG delivery by default on new accounts (an SVG is an
   executable document, so serving arbitrary ones from your own domain is a
   stored-XSS surface), and `f_auto` on one rasterises it. The fifteen SVGs
   in `public/` are a few kilobytes between them and are exactly the assets
   that cost nothing to keep local. They fall through `kindOf` as "other" and
   are returned untouched. */
type Kind = "image" | "video" | "other";

function kindOf(path: string): Kind {
  const dot = path.lastIndexOf(".");
  if (dot < 0) return "other";
  const ext = path.slice(dot + 1).toLowerCase();
  if (VIDEO_EXT.has(ext)) return "video";
  if (IMAGE_EXT.has(ext)) return "image";
  return "other";
}

/** the public_id the uploader gives this file: the path, minus its leading
 *  slash and its extension, under the account folder. Derived rather than
 *  looked up in a manifest — a manifest is a second source of truth that
 *  goes stale the first time somebody adds a picture. */
function publicId(path: string): string {
  const noQuery = path.split(/[?#]/)[0];
  const dot = noQuery.lastIndexOf(".");
  const stem = dot > 0 ? noQuery.slice(0, dot) : noQuery;
  return `${FOLDER}${stem}`;
}

function isRemote(path: string): boolean {
  return /^(https?:)?\/\//.test(path) || path.startsWith("data:") || path.startsWith("blob:");
}

export type AssetOptions = {
  /** cap the delivered width in pixels. `c_limit` never UPSCALES, so a
   *  width larger than the source is a no-op rather than a blurry stretch. */
  width?: number;
  /** override Cloudinary's automatic quality — a number (1–100) or one of
   *  its `auto` variants. Left alone unless a specific asset needs it. */
  quality?: number | "auto" | "auto:good" | "auto:eco" | "auto:low";
};

/**
 * The URL for an asset that lives at `path` under `public/`.
 *
 * Returns `path` unchanged when the CDN is not configured, when the path is
 * already absolute, and for any file type that stays local (SVG, and
 * anything without a recognised extension).
 *
 * ── THE TRANSFORMATIONS, AND WHY EACH ONE ──
 *  f_auto  content negotiation: AVIF or WebP to the browsers that take them,
 *          the original format to the ones that do not. It is the single
 *          biggest win available and it costs nothing to be wrong about.
 *  q_auto  perceptual quality targeting. On the hero films in particular
 *          this is the transcode that makes the difference — these were
 *          exported at source bitrate and several are 4K.
 *  c_limit only ever shrinks (see `width` above).
 *
 * VIDEO KEEPS ITS `.mp4` EXTENSION and does NOT take `f_auto`. The two
 * conflict: an explicit extension is a format request, and `f_auto` is the
 * absence of one. Naming the container keeps `<video src>` predictable —
 * every browser this site supports plays H.264 in MP4, and `q_auto` already
 * carries the bitrate win. Ask for `f_auto` here and Safari occasionally
 * receives a codec it will happily *download* and not play.
 */
/* THE SIGNATURE TAKES `undefined` AND HANDS IT BACK, which is not laziness.
   Several of the fields this is called on are genuinely optional in the data
   — an outlet with no mark on file, a venue with no film — and every one of
   those call sites already renders conditionally on the value. Forcing them
   to write `logo ? asset(logo) : undefined` would put the same guard in a
   dozen places to satisfy a signature, when "no path in, no path out" is
   exactly the behaviour they want. */
export function asset(path: string, opts?: AssetOptions): string;
export function asset(path: string | undefined, opts?: AssetOptions): string | undefined;
export function asset(path: string | undefined, opts: AssetOptions = {}): string | undefined {
  if (!CLOUD || !path || isRemote(path)) return path;

  const kind = kindOf(path);
  if (kind === "other") return path;

  /* ⚠️ FILM IS SERVED BY THE HOST, NOT BY THE CDN — AND THAT IS THE WHOLE
     POINT OF THE SPLIT. This used to return a Cloudinary video URL. It must
     not, and the reason is arithmetic rather than taste:

     THE CLOUDINARY ACCOUNT IS A FREE ONE AND IT IS SHARED WITH ANOTHER SITE
     (Cafe Mama, under the `cafemama/` prefix). Measured 2026-08-14, before
     any of this site's traffic: 16.62 of the plan's 25 monthly credits were
     already spent, 13.17 of them on delivery bandwidth alone. That leaves
     roughly 8GB of headroom a month for BOTH sites — and when a free account
     passes its cap Cloudinary throttles delivery ACCOUNT-WIDE, so a busy
     month here would take the other site down. Film is where the bytes are.

     CLOUDFLARE PAGES, WHICH ALREADY HOSTS THIS SITE, SERVES BANDWIDTH FREE
     AND UNMETERED. So the films are committed to `public/videos/` and served
     from the deploy: no quota, no ceiling, nothing shared with anybody. That
     is only possible because they are now compressed under Pages' 25MB
     per-file limit (scripts/compress-media.mjs) — which is also the ceiling
     that made a CDN look compulsory in the first place.

     Photographs stay on Cloudinary deliberately: `f_auto` (AVIF/WebP) plus a
     width matched to the device SAVES far more bandwidth than the images
     themselves cost in credits, so they earn their place on the quota in a
     way that a 12MB film simply does not.

     ⚠️ THREE FILES HAVE TO AGREE ABOUT THIS. scripts/cloudinary-upload.mjs
     must not upload videos (nothing would read them), and
     lib/cloudinaryLoader.ts never saw them anyway — next/image does not
     handle <video>. Change one and change all three. */
  if (kind === "video") return path;

  const t: string[] = ["f_auto", `q_${opts.quality ?? "auto"}`];
  if (opts.width) t.push(`w_${Math.round(opts.width)}`, "c_limit");

  // no extension: naming a format is what would stop f_auto negotiating one
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${t.join(",")}/${publicId(path)}`;
}

/** The 1200x630 share card for a photograph that is not shaped like one. */
export const OG_W = 1200;
export const OG_H = 630;

/* ── THE SHARE CARD FOR AN ARBITRARY PHOTOGRAPH ────────────────────────────
   app/layout.tsx already tells this story for the SITE card, and the short
   version is: every `openGraph` block on this site declares
   `width: 1200, height: 630` while pointing at a portrait photograph.
   images/bintang.jpg is 1614x2421 — an aspect of 0.67:1, described to every
   platform as a 1.91:1 landscape. The declared numbers are what the card is
   laid out against BEFORE the bytes arrive, so the shape is wrong wherever
   it renders, and `summary_large_image` in particular wants 2:1.

   The root layout solved its own case by hand-cropping one file to
   `public/og/maginhawa-og.jpg`. That does not scale to eight venues, and the
   per-page blocks were left pointing at the raw photographs — which is also
   how images/ramoramen.JPG, at 7008x4672 and 8.69MB, became the declared
   share card for /menus/ramo. WhatsApp does not fetch a preview over
   roughly 300KB and Twitter caps at 5MB, so the heaviest cards render as
   nothing at all rather than as the wrong shape.

   ⚠️ `c_fill` IS THE ONE THAT CROPS; `c_limit` WOULD NOT. c_limit only ever
   shrinks within the box and preserves aspect, which is right for a photo
   on a page and useless here — it would return a 1200x1800 portrait and
   leave the declaration lying exactly as before. c_fill fills the stated box
   and discards what does not fit, and `g_auto` is what chooses WHAT it
   discards: Cloudinary's content-aware gravity keeps the subject rather than
   the geometric centre, which on a portrait of a dining room is the
   difference between the table and a band of ceiling.

   ── THE UNCONFIGURED BRANCH RETURNS THE SITE CARD, NOT THE PHOTOGRAPH ──
   Everything else in this file degrades to "the path you gave me", because
   the local file is a correct if unoptimised answer. Here it is not: the
   local file is the portrait whose shape is the defect, so handing it back
   would preserve the bug in the one branch that cannot be measured. The
   hand-cropped site card is genuinely 1200x630, so an unconfigured build
   gets a correctly-shaped card of the group rather than a mis-shaped one of
   the venue. Less specific, still true. */
export function ogImage(path: string | undefined): string {
  if (!path || !CLOUD || isRemote(path) || kindOf(path) !== "image") {
    return "/og/maginhawa-og.jpg";
  }
  const t = ["f_auto", "q_auto", `w_${OG_W}`, `h_${OG_H}`, "c_fill", "g_auto"];
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${t.join(",")}/${publicId(path)}`;
}
