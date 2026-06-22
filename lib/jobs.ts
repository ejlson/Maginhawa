// Open positions across the Maginhawa Group. Placeholder data — replace
// with the real openings whenever they change.

export type JobOpening = {
  id: string;
  title: string;
  restaurantSlug?: string; // matches a slug in lib/restaurants.ts
  restaurantName: string;
  location: string;
  type: "Full-time" | "Part-time" | "Casual";
  area: "Kitchen" | "Front of House" | "Bar" | "Group";
  summary: string;
  responsibilities: string[];
  requirements: string[];
};

export const JOBS: JobOpening[] = [
  {
    id: "sous-chef-belly",
    title: "Sous Chef",
    restaurantSlug: "belly",
    restaurantName: "Belly",
    location: "Kentish Town, London",
    type: "Full-time",
    area: "Kitchen",
    summary:
      "Run service at Belly alongside the Head Chef — Filipino flavour read through a French bistro lens. Michelin Guide kitchen.",
    responsibilities: [
      "Run service alongside the Head Chef across all stations",
      "Manage a brigade of four chefs and two commis",
      "Own daily prep lists, ordering, and stock rotation",
      "Develop seasonal specials with the Head Chef",
    ],
    requirements: [
      "3+ years as Sous, or strong Chef de Partie ready to step up",
      "Comfortable on fish, meat, and pastry sections",
      "Right to work in the UK",
    ],
  },
  {
    id: "head-pastry-cafemama",
    title: "Head Pastry Chef",
    restaurantSlug: "cafemama",
    restaurantName: "Café Mama & Sons",
    location: "London",
    type: "Full-time",
    area: "Kitchen",
    summary:
      "Lead the pastry kitchen at Café Mama & Sons. Set the standard for daily viennoiserie, seasonal specials, and the heart-shaped croissants Forbes wrote about.",
    responsibilities: [
      "Lead the pastry section and a team of two",
      "Develop new bakes, viennoiserie, and seasonal specials",
      "Manage ordering, dough programmes, and overnight schedules",
      "Partner with the Group on weekly menus across café sites",
    ],
    requirements: [
      "5+ years in a serious bakery or pastry kitchen",
      "Strong viennoiserie and laminated dough skills",
      "Right to work in the UK",
    ],
  },
  {
    id: "fom-bintang",
    title: "Front of House Manager",
    restaurantSlug: "bintang",
    restaurantName: "Bintang",
    location: "Camden, London",
    type: "Full-time",
    area: "Front of House",
    summary:
      "Hold the room at Bintang — the original 1987 family restaurant. Lead a small team, train the next generation, keep the regulars happy.",
    responsibilities: [
      "Lead a front of house team of six",
      "Run service, manage bookings, host the room",
      "Train new starters on the floor and service standards",
      "Own weekly rotas, supplier ordering for drinks, and admin",
    ],
    requirements: [
      "3+ years as Restaurant or Floor Manager",
      "Strong wine and cocktail knowledge",
      "Right to work in the UK",
    ],
  },
  {
    id: "bartender-ramo-soho",
    title: "Bartender",
    restaurantSlug: "ramo",
    restaurantName: "Ramo Ramen",
    location: "Soho, London",
    type: "Full-time",
    area: "Bar",
    summary:
      "Build the Soho bar programme at Ramo Ramen — Filipino-Japanese drinking, from Clarified Ube Coladas to hojicha highballs.",
    responsibilities: [
      "Run the bar across busy evening services",
      "Develop seasonal menu specials with the Group bar lead",
      "Train support staff on classics and our house drinks",
      "Manage stock, cellar, and weekly orders",
    ],
    requirements: [
      "2+ years bartending in a busy cocktail bar or restaurant",
      "Confident on speed pours and dial-in batching",
      "Right to work in the UK",
    ],
  },
  {
    id: "server-mamasons",
    title: "Server",
    restaurantSlug: "mamasons",
    restaurantName: "Mamasons",
    location: "Camden, London",
    type: "Part-time",
    area: "Front of House",
    summary:
      "Serve Filipino dirty ice cream and pandesal scoops at our flagship Camden site. Fast-paced counter service, real London characters.",
    responsibilities: [
      "Take orders, scoop ice cream, run the counter",
      "Hold the room during peak Friday/Saturday rushes",
      "Keep the back-bar stocked and the floor clean through service",
    ],
    requirements: [
      "Hospitality experience preferred but not required",
      "Available weekends and evenings",
      "Right to work in the UK",
    ],
  },
  {
    id: "marketing-coordinator",
    title: "Marketing Coordinator",
    restaurantName: "Maginhawa Group",
    location: "Camden HQ, London",
    type: "Full-time",
    area: "Group",
    summary:
      "Sit with the small group team behind the seven restaurants. Plan content calendars, manage PR relationships, brief photographers, run the socials.",
    responsibilities: [
      "Run weekly content calendars across all seven restaurants",
      "Brief and manage press relationships and journalist visits",
      "Coordinate photography, video, and small campaigns",
      "Report on press coverage, reach, and growth",
    ],
    requirements: [
      "2+ years in marketing or PR, ideally in hospitality or food media",
      "Confident writer with a clean editorial eye",
      "Right to work in the UK",
    ],
  },
];
