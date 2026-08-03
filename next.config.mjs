/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  /* The probe scripts measure a PRODUCTION build while a dev server is
     usually still running against this same checkout. Both write `.next`,
     and whichever ran last wins — which shows up as a served page whose
     every asset 400s, because the build it was compiled against is gone.
     Setting NEXT_DIST_DIR gives the production build its own directory so
     the two can coexist:

       NEXT_DIST_DIR=.next-prod npm run build
       NEXT_DIST_DIR=.next-prod npx next start -p 3100 */
  distDir: process.env.NEXT_DIST_DIR || ".next",

  /* /join-us -> /careers. The nav item has always read CAREERS and the URL
     said something else, which is a contradiction a reader can see in the
     status bar. The route moved; this keeps every link that was ever
     printed, bookmarked, emailed or indexed working.

     PERMANENT (308), not a temporary redirect: the old path is not coming
     back, and a 301/308 is what tells a crawler to transfer the page's
     history to the new URL rather than to keep both and pick one. The hash
     forms (#open-roles, #apply, and the per-job #ids in the page's JobPosting
     JSON-LD) survive for free — a fragment is never sent to the server, so
     the browser reapplies it to the redirect target. */
  async redirects() {
    return [
      { source: "/join-us", destination: "/careers", permanent: true },
      // anything that was ever nested under it, for the same reason
      { source: "/join-us/:path*", destination: "/careers/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
