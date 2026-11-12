// Open positions across the Maginhawa Group. Delete a block when the role is
// filled (README §5).

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

export const JOBS: JobOpening[] = [
  {
    id: "front-of-house-kentish-town",
    title: "Front of House Team",
    restaurantName: "Maginhawa Group",
    location: "Kentish Town, London",
    type: ["Full-time", "Part-time"],
    area: "Front of House",
    summary:
      "Look after guests across our Kentish Town restaurants, from dining rooms that take bookings to walk-in counters.",
    responsibilities: [
      "Welcome guests and make them feel looked after",
      "Take orders and talk people through the menu",
      "Work with the kitchen to keep service moving",
      "Keep the room clean, stocked and ready",
    ],
    requirements: [
      "A warm, friendly manner with guests",
      "Good communication and teamwork",
      "A reliable, calm approach when it gets busy",
      "Hospitality experience is a plus, not a must",
      "Right to work in the UK",
    ],
  },
  {
    id: "chef-all-sites",
    title: "Chef",
    restaurantName: "Maginhawa Group",
    location: "Kentish Town & Soho, London",
    type: "Full-time",
    area: "Kitchen",
    summary:
      "Cook in our kitchens across Kentish Town and Soho, where the food runs from Filipino and Filipino-Japanese to Caribbean.",
    responsibilities: [
      "Prep and cook dishes to a consistent standard",
      "Keep your section clean, organised and safe",
      "Work closely with your team through service",
    ],
    requirements: [
      "Care for good food and the people eating it",
      "Teamwork and a willingness to learn",
      "Kitchen experience at any level, in any cuisine",
      "Right to work in the UK",
    ],
  },
  {
    id: "head-baker-bunso",
    title: "Head Baker",
    restaurantSlug: "bunso",
    restaurantName: "Bunso",
    location: "Kentish Town, London",
    type: "Full-time",
    area: "Kitchen",
    summary:
      "Lead the bakery team at Bunso, the newest addition to the group, with laminated pastry and Asian flavours at the centre of the bake.",
    responsibilities: [
      "Run the bake day to day, from dough to counter",
      "Train and support the bakers on your team",
      "Develop new bakes and refine existing ones",
      "Look after quality, stock and food safety",
    ],
    requirements: [
      "Skill and confidence with lamination",
      "A deep knowledge of Asian flavours",
      "Good communication and teamwork",
      "A friendly, approachable manner",
      "Experience running a bakery is welcome but not essential",
      "Right to work in the UK",
    ],
  },
  {
    id: "baker-bunso",
    title: "Baker",
    restaurantSlug: "bunso",
    restaurantName: "Bunso",
    location: "Kentish Town, London",
    type: "Full-time",
    area: "Kitchen",
    summary:
      "Bake as part of the new bakery team at Bunso. We're hiring more than one baker.",
    responsibilities: [
      "Mix, shape and bake to recipe, batch after batch",
      "Keep your bench clean, tidy and safe",
      "Pitch in wherever the bakery team needs you",
    ],
    requirements: [
      "A friendly, positive attitude",
      "Care and attention to detail",
      "Reliability and a willingness to learn",
      "Baking experience at any level",
      "Right to work in the UK",
    ],
  },
  {
    id: "assistant-restaurant-manager-bunso",
    title: "Assistant Restaurant Manager",
    restaurantSlug: "bunso",
    restaurantName: "Bunso",
    location: "1a Hawley Road, London NW1 8RP",
    address: { street: "1a Hawley Road", locality: "London", postcode: "NW1 8RP" },
    type: "Full-time",
    area: "Front of House",
    summary:
      "We are still looking for an Assistant Restaurant Manager at Bunso. It's a key role with room for growth and development.",
    responsibilities: [
      "Help run service day to day alongside the Restaurant Manager",
      "Lead and support the front of house team",
      "Look after guests and the experience they have with us",
      "Step up and run the floor when needed",
    ],
    // the user's own requirements: a firmer bar than the other roles, on purpose
    requirements: [
      "2+ years' experience as a head waiter or supervisor",
      "Great customer service skills",
      "A great work ethic",
      "Right to work in the UK",
    ],
  },
  {
    id: "bartender-guanabana",
    title: "Bartender — Guanabana",
    restaurantSlug: "guanabana",
    restaurantName: "Guanabana",
    location: "85 Kentish Town Road, London NW1 8NY",
    address: { street: "85 Kentish Town Road", locality: "London", postcode: "NW1 8NY" },
    type: ["Full-time", "Part-time"],
    area: "Bar",
    summary:
      "Make drinks behind the bar at Guanabana, our Caribbean restaurant in Kentish Town. We're hiring more than one bartender.",
    responsibilities: [
      "Make cocktails and drinks to a consistent standard",
      "Look after guests at the bar and talk them through the drinks list",
      "Keep the bar clean, stocked and ready for service",
      "Work with the floor team to keep service moving",
    ],
    // the user's own requirements, like the Assistant Restaurant Manager's
    requirements: [
      "1–2 years' bartending experience",
      "Confident making cocktails",
      "A solid knowledge of the classics",
      "Right to work in the UK",
    ],
  },
  {
    id: "bartender-belly",
    title: "Bartender — Belly",
    restaurantSlug: "belly",
    restaurantName: "Belly",
    location: "157 Kentish Town Road, London NW1 8PD",
    address: { street: "157 Kentish Town Road", locality: "London", postcode: "NW1 8PD" },
    type: ["Full-time", "Part-time"],
    area: "Bar",
    summary:
      "Run the bar at Belly, our modern Filipino bistro in Kentish Town, where cocktails sit alongside the food.",
    responsibilities: [
      "Make cocktails and drinks to a high, consistent standard",
      "Look after guests at the bar and talk them through the drinks list",
      "Create new cocktails for the list, drawing on Asian flavours",
      "Keep the bar clean, stocked and ready for service",
    ],
    // the user's own requirements, like the Assistant Restaurant Manager's
    requirements: [
      "2–5 years' bartending experience",
      "Extensive knowledge of cocktails",
      "Knows all the classics",
      "Experience with Asian flavours",
      "Experience creating cocktails",
      "Right to work in the UK",
    ],
  },
];
