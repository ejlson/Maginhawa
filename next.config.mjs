/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  /* The probe scripts measure a PRODUCTION build while a dev server is
     usually still running against this same checkout. Both write `.next`,
     and whichever ran last wins — which shows up as a served page whose
     every asset 400s, because the build it was compiled against is gone.
     NEXT_DIST_DIR was the escape hatch that let the two coexist.

     ⚠️ `output: "export"` BELOW BROKE THAT ESCAPE HATCH, AND IT BREAKS IT
     SILENTLY. Under export Next reinterprets a custom distDir as the
     directory to write the EXPORTED SITE into, and then forces the real
     build directory back to `.next` behind your back —
     next/dist/export/utils.js, verbatim:

         return config.output === 'export' && config.distDir !== '.next'

     …after which build/index.js does `config.distDir = '.next'`. So

         NEXT_DIST_DIR=.next-prod npm run build

     no longer protects the dev server — it writes `.next` anyway and
     clobbers it exactly as before, while putting the export in `.next-prod`
     instead of `out/`. It looks like it worked. It did not.

     ── SO: STOP THE DEV SERVER BEFORE A PRODUCTION BUILD. ──
     There is no flag that avoids this while the site exports. Plain
     `npm run build` is also what Cloudflare runs, so it is the only
     configuration worth measuring:

       (stop `next dev` first)
       npm run build && npx serve out -l 3100

     `distDir` is left overridable because the value is still read for
     non-export tooling, but under export it is a footgun — pass it only if
     you have read the paragraph above. */
  distDir: process.env.NEXT_DIST_DIR || ".next",

  /* ── THE BUILD EMITS A FOLDER OF FILES, AND THAT IS WHAT CLOUDFLARE WANTS ──
     `next build` on its own leaves a `.next` directory that only `next start`
     knows how to serve. Cloudflare Pages does not run a Node server; it
     uploads a directory and serves it from the edge. `output: "export"`
     is what turns the build into that directory — `out/`, containing real
     `.html` files.

     ⚠️ THE FIRST DEPLOY FAILED BECAUSE THE PROJECT HAD NO BUILD COMMAND AT
     ALL. The log read "No build command specified. Skipping build step." and
     then "Validating asset output directory", i.e. Cloudflare took the
     REPOSITORY ROOT as the thing to publish and started uploading the source
     tree — which is why it tripped over `assets/menu/.../wall-panel.pdf` at
     30.5MB and refused the whole deploy. That PDF is not a symptom of a media
     problem: `assets/` is source material the site never serves (nothing in
     app/, components/ or lib/ references it). It was only ever there because
     the whole repository was being published. Building into `out/` puts it
     out of reach, along with node_modules, the probe scripts and graphify-out.

     THIS SITE CAN BE EXPORTED BECAUSE IT IS ACTUALLY STATIC — checked, not
     assumed: no route handlers, no middleware, nothing importing next/server,
     one dynamic segment (app/restaurants/[slug]) which enumerates itself
     through generateStaticParams, and the one useSearchParams call
     (components/BlogIndex.tsx) already sits behind the Suspense boundary
     prerendering needs. Add an API route or middleware later and this line is
     what will start failing; the fix then is an adapter
     (@opennextjs/cloudflare), not deleting the export. */
  output: "export",

  /* ── EVERY PHOTOGRAPH ON THE SITE GOES THROUGH ONE FUNCTION ──
     `public/` is 344MB, five videos are over Cloudflare Pages' 25MB
     per-file ceiling, and `public/videos/` is gitignored outright — so the
     media has to be delivered from a CDN before this can be hosted
     anywhere that builds from the repository. A CUSTOM LOADER is what makes
     that a config change instead of a rewrite: Next calls
     lib/cloudinaryLoader.ts for every <Image> and every getImageProps() on
     the site, so no component that renders a picture is touched at all.
     Videos, raw <img> tags, poster attributes and the CSS mask URLs are
     next/image's blind spot and go through lib/media.ts's `asset()`.

     ⚠️ IT IS INSTALLED CONDITIONALLY, AND THAT IS NOT TIDINESS — IT IS THE
     ONLY CORRECT SHAPE. `loader: "custom"` does not merely replace the
     loader FUNCTION; it switches the built-in image optimizer off, and
     `/_next/image` stops being served at all. So a loader that "falls back"
     by returning the URL the default one would have produced returns a URL
     that now 404s — measured, on this site, as twelve broken photographs on
     the home page alone.

     Reading the variable HERE instead means the unconfigured case never
     installs the loader, so Next's own optimizer is untouched and local
     development is byte-for-byte what it was. Deleting the variable is a
     complete rollback. (The loader keeps a defensive fallback of its own for
     the case where it is somehow installed without one — see its banner —
     but that branch should be unreachable.)

     NEXT_PUBLIC_ IS INLINED AT BUILD TIME, so a host must set this as a
     BUILD variable. Set only at runtime, this block never fires.

     ── WHY THE UNCONFIGURED BRANCH IS NO LONGER EMPTY ──
     It used to be `: {}`, which was right while this built for a Node host:
     no key at all meant Next's own optimizer stayed installed. Under
     `output: "export"` there IS no optimizer to leave alone — nothing is
     running at request time to resize anything — and Next refuses the build
     outright with "Image Optimization using the default loader is not
     compatible with export". `unoptimized: true` is the acknowledgement that
     images come out of `public/` at source size.

     So the two branches are no longer "CDN or normal", they are "CDN or
     source-size". That is a real cost — belly3.jpg alone is 19MB — and it is
     the honest one: without a CDN there is nowhere for a resize to happen.
     Setting the cloud name is what buys it back, and deleting the variable is
     still a complete rollback to a site that builds and works. */
  ...(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    ? { images: { loader: "custom", loaderFile: "./lib/cloudinaryLoader.ts" } }
    : { images: { unoptimized: true } }),

  /* ⚠️ `redirects()` USED TO LIVE HERE AND HAS MOVED TO `public/_redirects`.
     It is not supported under `output: "export"` — a redirect is something a
     server does, and an exported build has no server. Next does not fail on
     it either; it prints a notice and DROPS IT, which is the bad case: the
     config still reads as though /join-us works and the deployed site 404s.

     Cloudflare Pages implements the same thing natively by reading a
     `_redirects` file from the published directory, and `public/` is copied
     into `out/` verbatim by the export — so that file is the version that is
     actually in force. The full reasoning for the rule moved with it. */
};

export default nextConfig;
