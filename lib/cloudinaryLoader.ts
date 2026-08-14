/* ═══════════════ THE next/image LOADER ═══════════════════════════════════
   INSTALLED IN next.config.mjs (`images.loader: "custom"`), which means Next
   calls THIS for every `<Image>` and every `getImageProps()` on the site.
   That is the whole reason the Cloudinary migration touches no component
   that renders a photograph: the eight venue cards, the blog media, the
   press wall, the About prints and the story deck all keep writing
   `/images/whatever.jpg` and this decides where that comes from.

   ⚠️ THIS FILE IS ONLY INSTALLED WHEN THE CLOUD NAME IS SET. next.config.mjs
   spreads the `images` block in conditionally, and the reason is worth
   knowing before anyone "simplifies" it: `loader: "custom"` does not just
   replace the loader function, it switches Next's image optimizer OFF and
   `/_next/image` stops being served. A first pass here handled the
   unconfigured case by returning the URL the built-in loader would have
   produced — which, with that endpoint gone, is a 404. It shipped twelve
   broken photographs on the home page and was found by a probe, not by
   reading. The unconfigured path must not exist in this file at all; it must
   exist by this file not being loaded.

   THE FALLBACK BELOW IS DEFENSIVE ONLY. If this somehow runs with no cloud
   name it returns the raw path — an unoptimised image at source size, which
   is a performance regression and not a broken page. Never point it back at
   `/_next/image`.

   ⚠️ AND IT MUST NOT BE `async`, MUST NOT IMPORT ANYTHING HEAVY, AND MUST
   RUN ON THE CLIENT. Next inlines this module into the client bundle and
   calls it during render, so it is a pure string function with no I/O. The
   env var it reads is NEXT_PUBLIC_, i.e. substituted at build time.

   ── WHY THE `width` IS WORTH HAVING ──
   Next hands us the width it has decided this image will be rendered at,
   from the `sizes` prop the call sites are already careful about (there are
   comments across this codebase about a wrong `sizes` costing a 4K decode on
   a 220px box). Passing it through as `w_<n>,c_limit` is what turns that
   care into bytes actually saved — the CDN renders the width asked for, and
   `c_limit` means a request larger than the source is a no-op rather than an
   upscale.
   ═══════════════════════════════════════════════════════════════════════ */

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || "maginhawa";

type LoaderArgs = { src: string; width: number; quality?: number };

export default function cloudinaryLoader({ src, width, quality }: LoaderArgs): string {
  // already an absolute URL (or a data/blob URI) — nothing here owns it
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }

  /* SVG STAYS LOCAL. Cloudinary blocks SVG delivery by default and `f_auto`
     rasterises it; see the same note in lib/media.ts. Returned untouched
     rather than sent through the optimizer, which is also what Next does
     with an SVG unless `dangerouslyAllowSVG` is set. */
  if (src.toLowerCase().split(/[?#]/)[0].endsWith(".svg")) return src;

  // unreachable in a correctly-configured build; see the banner
  if (!CLOUD) return src;

  const noQuery = src.split(/[?#]/)[0];
  const dot = noQuery.lastIndexOf(".");
  const stem = dot > 0 ? noQuery.slice(0, dot) : noQuery;
  const publicId = `${FOLDER}${stem.startsWith("/") ? stem : `/${stem}`}`;

  const t = ["f_auto", `q_${quality || "auto"}`, `w_${width}`, "c_limit"];
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${t.join(",")}/${publicId}`;
}
