// Group contact details — single source of truth for the Contact section, the
// footer and any structured data that needs them.
//
// ⚠️ The values marked PLACEHOLDER below are not real. They shipped inline in
// Contact.tsx and are the first thing a partner, journalist or supplier checks,
// so they need replacing with the group's actual details before launch.
export const CONTACT = {
  /** PLACEHOLDER — replace with the group's real enquiries line. */
  phone: "+44 01234 5678",
  /** PLACEHOLDER — replace with the real enquiries inbox. */
  email: "hello@maginhawa.group",
  /**
   * PLACEHOLDER — head-office hours, not restaurant service hours. Each
   * restaurant keeps its own opening times on its detail page.
   */
  officeHours: { days: "Mon – Fri", time: "09:00 – 17:00" },
} as const;

/**
 * Social profiles for the footer's "Follow us" column.
 *
 * `url: null` means we do not have a real profile URL yet — those render as
 * plain text rather than links. Instagram is the group's one confirmed
 * account (it's also the one referenced in lib/jsonld.tsx).
 *
 * ⚠️ Supply the LinkedIn and Facebook URLs and they become links automatically.
 * They are deliberately NOT guessed: a social link that lands on the wrong
 * company's page is worse than one that isn't clickable yet.
 */
export const SOCIALS: { label: string; url: string | null }[] = [
  { label: "LinkedIn", url: null },
  { label: "Facebook", url: null },
  { label: "Instagram", url: "https://www.instagram.com/maginhawagroup/" },
];
