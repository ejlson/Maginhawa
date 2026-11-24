// The shape of an open position across the Maginhawa Group, and helpers the
// careers page uses. The roles themselves are edited in the Studio's "Job
// board" and read at build time by lib/jobsSource.ts (README §5). This file
// stays free of Node APIs: components/careers/JoinUs.tsx, a client
// component, imports it.

export type EmploymentType = "Full-time" | "Part-time" | "Casual";

export type JobOpening = {
  id: string;
  title: string;
  restaurantSlug?: string; // matches a slug in lib/restaurants.ts
  restaurantName: string;
  location: string;
  // the full address for the JSON-LD, when `location` is a street address
  // rather than "Area, City" (the page otherwise reads the area from it)
  address?: { street: string; locality: string; postcode: string };
  // one type, or a list when a role is offered on more than one basis
  type: EmploymentType | [EmploymentType, ...EmploymentType[]];
  area: "Kitchen" | "Front of House" | "Bar" | "Group";
  summary: string;
  responsibilities: string[];
  requirements: string[];
  posted: string; // YYYY-MM-DD, when the role was first advertised
};

/** A role's employment types as a list, whichever form `type` is written in. */
export const jobTypes = (job: Pick<JobOpening, "type">): EmploymentType[] =>
  Array.isArray(job.type) ? job.type : [job.type];

/** The types as one phrase for display: "Full-time", "Full-time or part-time".
 *  The role's tag and its pane meta both read this, so they cannot disagree. */
export function jobTypeLabel(job: Pick<JobOpening, "type">): string {
  const words = jobTypes(job).map((t, i) => (i === 0 ? t : t.toLowerCase()));
  return words.length === 1
    ? words[0]
    : `${words.slice(0, -1).join(", ")} or ${words[words.length - 1]}`;
}
