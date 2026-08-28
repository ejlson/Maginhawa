// Group contact details — single source of truth for the Contact section, the
// footer and any structured data that needs them.
//
// ⚠️ The values marked PLACEHOLDER below are not real. They shipped inline in
// Contact.tsx and are the first thing a partner, journalist or supplier checks,
// so they need replacing with the group's actual details before launch.
export const CONTACT = {
  /**
   * `null` until the group's real enquiries line is supplied — the same
   * discipline SOCIALS uses below, and for the same reason. This held
   * "+44 01234 5678" and rendered it as a live `tel:` link in the footer of
   * every page, so a reader tapping it dialled a stranger's number on a site
   * whose whole job is reading as established and credible. A missing phone
   * line costs less than a wrong one.
   *
   * Supply the number here and the footer row and the Contact page entry come
   * back automatically — both already guard on it.
   */
  phone: null as string | null,
  /** PLACEHOLDER — replace with the real enquiries inbox. */
  email: "info@mgnhw.com",
  /**
   * Press and media only, handled by the group's PR consultancy rather than
   * the general inbox above. Unlike its neighbours this one is REAL, which is
   * why it carries no PLACEHOLDER note — do not sweep it up with them.
   *
   * It is deliberately absent from the footer: the footer offers one way in,
   * and a journalist arrives via /contact where the two are labelled apart.
   */
  pressEmail: "lily@amywilliamsconsultancy.com",
  /**
   * PLACEHOLDER — head-office hours, not restaurant service hours. Each
   * restaurant keeps its own opening times on its detail page.
   */
  officeHours: { days: "Mon – Fri", time: "09:00 – 17:00" },
} as const;

/**
 * Social profiles for the footer's "Follow us" column.
 *
 * All three are confirmed group accounts and render as links. The `| null`
 * stays on the type: a profile that is retired or not yet opened goes back to
 * `null` and the footer renders it as plain text rather than a link to
 * nowhere. A social link that lands on the wrong company's page is worse than
 * one that isn't clickable — so never guess a URL to fill a row.
 *
 * The LinkedIn URL is the bare company path. LinkedIn hands out
 * `?originalSubdomain=uk` when you arrive from uk.linkedin.com; it is a
 * marker of how THAT visit reached the page, not part of the address, and it
 * is dropped here so every reader gets the same canonical link.
 */
export const SOCIALS: { label: string; url: string | null }[] = [
  { label: "LinkedIn", url: "https://www.linkedin.com/company/maginhawa-group/" },
  { label: "Facebook", url: "https://www.facebook.com/MaginhawaGroup/" },
  { label: "Instagram", url: "https://www.instagram.com/maginhawagroup/" },
];
