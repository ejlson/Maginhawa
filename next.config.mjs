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
};

export default nextConfig;
