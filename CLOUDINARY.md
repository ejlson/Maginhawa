# Media: photographs on Cloudinary, film on Cloudflare

The site is a **static export** (`output: "export"` → `out/`) deployed to
**Cloudflare Pages**. Its media is served from two places, and the split is
deliberate:

| | served by | why |
| --- | --- | --- |
| photographs | **Cloudinary** | `f_auto` (AVIF/WebP) + a width matched to the device saves far more bandwidth than it costs |
| film | **Cloudflare Pages**, from `public/videos/` | Pages bandwidth is free and unmetered, and film is where the bytes are |
| SVG | **Cloudflare Pages** | Cloudinary blocks SVG delivery by default and `f_auto` rasterises it |

---

## Why film is *not* on the CDN

This is the part that is easy to get wrong later, so the arithmetic is written
down. **The Cloudinary account is a free one and it is shared with another
site** (Cafe Mama, under the `cafemama/` public_id prefix). Measured
2026-08-14, before any of this site's traffic existed:

```
plan            Free — 25 credits/month
already spent   16.62 credits (66%), of which 13.17 is delivery bandwidth
headroom        ~8.4 credits ≈ 8.4GB/month, for BOTH sites
```

A free account that passes its cap is throttled **account-wide**, so a busy
month here would take the other site down with it. The films are ~198MB of
references across the site; on Pages they cost nothing and can never do that.

**Photographs earn their place on the quota; a 12MB film does not.**

---

## What made this possible: the films got smaller

`scripts/compress-media.mjs`, run 2026-08-14:

```
218MB → 70MB  (68% smaller), largest single file 18.6MB
```

The films were never 4K — they were 1080p encoded at **9.5–12.4 Mbps**, five to
eight times a sane web bitrate. The tile clips were the absurd ones: 
`tile-ramo.mp4` was 11.1MB of 50fps footage rendered into a card ~330px wide,
and is now 0.6MB. Audio was stripped (`-an`) from all of them — every `<video>`
on this site is `muted`, so the audio track was bytes shipped to be discarded.

Two things follow from that number, and both are load-bearing:

- **Every file is now under Cloudflare Pages' 25MB per-file ceiling**, which was
  the entire reason an external host looked compulsory in the first place.
- **`public/videos/` is no longer gitignored.** It was, while the films sat at
  capture bitrate — and that had a consequence nobody had spelled out: a host
  that builds from the repository never had the films at all, so every `<video>`
  on a deployed build was pointing at a file that was not there. They are
  committed now. Re-ignoring that directory silently breaks every film on the
  live site.

Originals are stashed in `media-src/originals/` (gitignored). To undo, copy
back from there.

---

## What is wired

| file | job |
| --- | --- |
| `lib/cloudinaryLoader.ts` | the `next/image` loader. `next.config.mjs` installs it, so **every `<Image>` and `getImageProps()` is migrated without a component being touched.** Never sees video — `next/image` does not handle `<video>`. |
| `lib/media.ts` | `asset(path)` — for what `next/image` cannot reach: `<video src>`, `poster`, raw `<img>`, and the CSS mask URLs. **Returns video paths unchanged**; only images become CDN URLs. |
| `scripts/cloudinary-upload.mjs` | walks `public/`, uploads **images only**, giving each a `public_id` the two above **predict from the path**. No manifest is read at runtime. |

**Three files have to agree about video.** `asset()` returns it untouched, the
uploader skips it, and the loader never sees it. Move film back onto the CDN and
all three change together — a disagreement is silent, and it is a 404 on every
`<video>` tag.

**Paths never change.** Every component still writes `/images/bintang.jpg` and
`/videos/tile-bintang.mp4`. The path is the asset's identity; these three files
are the only place that knows where that identity currently lives.

**It is off until it is configured.** With no `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`,
`asset()` returns its argument unchanged and `next.config.mjs` **does not install
the loader at all**. Deleting the variable is a complete rollback.

> The conditional install is load-bearing, not tidiness. `loader: "custom"` does
> not merely replace the loader function — it switches the built-in optimizer off
> and `/_next/image` stops being served. A first pass handled the unconfigured
> case *inside* the loader by returning the URL the default one would have
> produced; with that endpoint gone it was a 404, and it shipped twelve broken
> photographs on the home page. Do not move the check back into the loader.

Under `output: "export"` the unconfigured branch is `images: { unoptimized: true }`,
not `{}` — there is no optimizer at request time, and Next refuses the build
outright without it.

---

## Doing it

### 1. Credentials

The dashboard gives one `CLOUDINARY_URL` containing all three parts. Note that
the **key name is not the cloud name** — a key labelled "Maginhawa" can belong
to a cloud called something else entirely, and the symptom is
`{"error":{"message":"cloud_name mismatch"}}` on every call.

**The key needs upload rights.** Cloudinary's newer keys are role-scoped; one
without them authenticates fine on `/ping` and then 403s every upload with
`missing permissions (actions=["create"])`.

Free-tier ceilings: **10MB per image**, 100MB per video. Four photographs were
over the image ceiling (24–26MP camera originals) and were resized to 3000px on
the long edge — `belly3.jpg` went 20.0MB → 1.7MB with nothing visible given up,
since nothing on the site requests more than ~3840px.

### 2. Upload

```bash
export CLOUDINARY_URL='cloudinary://<api_key>:<api_secret>@<cloud_name>'

node scripts/cloudinary-upload.mjs --dry-run    # list what it would do
node scripts/cloudinary-upload.mjs              # do it
node scripts/cloudinary-upload.mjs --force      # re-upload what is already there
```

Idempotent: `overwrite` + `invalidate` against an explicit `public_id`, so a
re-run replaces in place rather than creating `bintang_a7f3c1`. Without
`--force` it HEADs the delivery URL first, so a re-run after adding one
photograph uploads one photograph.

### 3. Turn it on

`.env.local` locally, and the same variable in the Cloudflare project's
settings — as a **build** variable, since `NEXT_PUBLIC_*` is inlined at build
time and one set only at runtime is never read:

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
# optional — defaults to "maginhawa". Must match on both sides.
NEXT_PUBLIC_CLOUDINARY_FOLDER=maginhawa
```

### 4. Verify

⚠️ **`NEXT_DIST_DIR` no longer works as an escape hatch, and `next start` no
longer runs at all.** Under `output: "export"` Next treats a custom `distDir` as
the *export output* directory and forces the build back to `.next` anyway — so
the old `NEXT_DIST_DIR=.next-prod` recipe clobbers a running dev server while
appearing to work. Stop `next dev` first, then:

```bash
npm run build
npx serve out -l 3100
```

Photographs should come from
`res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,w_…/maginhawa/images/…`,
and films from plain `/videos/….mp4` on your own origin. **A Cloudinary
`video/upload` URL anywhere in the output means the split has broken.**

---

## Deploying to Cloudflare

Settled: **Pages with a static export.** Verified there are no route handlers,
no middleware, nothing importing `next/server`; the one dynamic segment
(`app/restaurants/[slug]`) enumerates itself via `generateStaticParams`, and the
single `useSearchParams` already sits behind a Suspense boundary.

⚠️ **The project is a WORKERS project, not a Pages project** — confirmed from
the dashboard: deploy command `npx wrangler deploy`, version command
`npx wrangler versions upload`, and Bindings / Runtime / Trigger events tabs.
So `wrangler.toml` declares `[assets] directory = "./out"`. **`pages_build_output_dir`
is a Pages-only key and `wrangler deploy` rejects a config carrying it.**

Three settings, and **only one of them can live in the repo**:

- `wrangler.toml` carries the `[assets]` block, with
  `not_found_handling = "404-page"` (never `single-page-application`, which
  would return index.html with a 200 for every miss).
- The **build command is dashboard-only** — Settings → Build → Build command:
  `npm run build`.
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` must be a **build** variable —
  Settings → Build → *"Build variables and secrets"*. **Not** the runtime
  "Variables and secrets" section higher up the same page: Cloudflare states
  plainly that runtime variables are not available during the build, so one set
  there is read by nothing and every photograph silently stays local. This is
  the single easiest thing to get wrong, because both sections carry the same
  name on the same screen.

Without the build command set, Cloudflare skips the build and publishes the
repository root — which is how a 30.5MB design PDF in `assets/` once failed a
deploy that had nothing to do with media.

`_redirects` **is** honoured natively by Workers static assets (parsed from the
asset directory, not served as an asset), so the `/join-us` rule works the same
as it would on Pages.

`redirects()` cannot survive an export: Next prints a notice and **drops it**, so
the config keeps claiming a redirect that 404s. `/join-us → /careers` lives in
`public/_redirects`, which the export copies into `out/` verbatim. Cloudflare's
splat is `:splat`, not Next's `:path*`.

If an API route or middleware is ever added, the export breaks — the fix then is
`@opennextjs/cloudflare`, not deleting the export.

---

## Gotchas worth knowing before you hit them

- **A custom loader replaces the built-in one outright.** There is no falling
  through to Next's default. `lib/cloudinaryLoader.ts` returns the raw path in
  its unconfigured branch — an unoptimised image, not a broken one. Never point
  it back at `/_next/image`; that endpoint does not exist in this build.
- **Video does not take `f_auto`** if it is ever put back on the CDN. An explicit
  `.mp4` is a format request and `f_auto` is the absence of one; asking for both
  occasionally hands Safari a codec it downloads and will not play.
- **Case is significant in a `public_id`.** `public/images/ramoramen.JPG` becomes
  `maginhawa/images/ramoramen`. The uploader and the URL builders derive the stem
  from the same string so they agree, but a file renamed on a case-insensitive
  filesystem will not re-upload on its own. Use `--force`.
- **The folder variable is a contract.** `NEXT_PUBLIC_CLOUDINARY_FOLDER` is read
  by the uploader *and* both URL builders. Change it on one side only and every
  asset 404s. It is also what keeps this site's assets from colliding with the
  other site sharing the account.
- **`public_id` prefixes are not "folders" in the Media Library.** Uploading to
  `maginhawa/images/belly` does not create a folder node, so the Folders API and
  the console tree can both look empty while delivery works perfectly. Search
  with `public_id:maginhawa/*` rather than `folder:maginhawa/*`.
