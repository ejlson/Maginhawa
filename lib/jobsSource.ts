import fs from "node:fs";
import path from "node:path";
import cms from "./cms.json";
import { getRestaurant } from "./restaurants";
import type { EmploymentType, JobOpening } from "./jobs";

/* ═══ THE OPEN ROLES, FROM THE CMS SNAPSHOT ═══
 *
 * scripts/pull-cms.mjs writes the Studio's "Job board" (open roles only, in
 * the Studio's order, already checked field by field) to .cms/jobs.json
 * before every build. This turns it into the JobOpening shape the careers
 * page has always used. Build-time only: it reads the file system, so only
 * server code (app/careers/page.tsx) imports it.
 */

type CmsRole = Omit<JobOpening, "restaurantSlug" | "restaurantName" | "type"> & {
  restaurant: string;
  type: [EmploymentType, ...EmploymentType[]];
};

const WHOLE_GROUP = "group";

function fromCms(r: CmsRole): JobOpening {
  const { restaurant, type, ...rest } = r;
  if (restaurant === WHOLE_GROUP) {
    return { ...rest, restaurantName: "Maginhawa Group", type: type.length === 1 ? type[0] : type };
  }
  /* The Studio's restaurant values are this site's slugs. The name shown is
     this site's own ("Bunso"), so a role reads like the rest of the site. */
  const place = getRestaurant(restaurant);
  if (!place) {
    throw new Error(
      `Job board role "${r.title}" is at "${restaurant}", which lib/restaurants.ts does not know. ` +
        "Add the restaurant there, or pick another in the Studio.",
    );
  }
  return {
    ...rest,
    restaurantSlug: place.slug,
    restaurantName: place.name,
    type: type.length === 1 ? type[0] : type,
  };
}

let cache: JobOpening[] | null = null;

export function getJobs(): JobOpening[] {
  if (cache) return cache;
  const file = path.join(process.cwd(), cms.jobsSnapshot);
  if (!fs.existsSync(file)) {
    throw new Error(
      `No job board snapshot at ${cms.jobsSnapshot}. Run \`npm run build\` or \`npm run dev\`, which pull it ` +
        "first (scripts/pull-cms.mjs), not `next build` or `next dev` on their own.",
    );
  }
  const snap = JSON.parse(fs.readFileSync(file, "utf8")) as { roles: CmsRole[] };
  cache = snap.roles.map(fromCms);
  return cache;
}
