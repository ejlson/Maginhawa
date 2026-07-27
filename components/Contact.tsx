import styles from "./Contact.module.css";
import Reveal from "./Reveal";
import { CONTACT } from "@/lib/contact";

type ContactProps = {
  /**
   * True on /contact, where this section is the FIRST thing on the page and
   * needs top padding to clear the fixed nav — without it the "CONTACT US"
   * wordmark renders straight under the nav links and the two collide.
   * The home page leaves this off: there the section deliberately butts
   * straight up against the Locations film above it.
   */
  standalone?: boolean;
};

export default function Contact({ standalone = false }: ContactProps) {
  return (
    <section
      className={`${styles.section}${standalone ? ` ${styles.sectionTop}` : ""}`}
      id="contact-us"
    >
      <div className="container">
        <Reveal className={styles.wordmark} as="h2">
          {/* Full-width wordmark. lengthAdjust is "spacing", NOT
              "spacingAndGlyphs" — the latter stretches the letterforms
              themselves, which visibly widened Contralto's strokes. font-size
              17 sets "CONTACT US" close to the 100-unit box on its own, so
              only the letterfit is adjusted (matches the footer wordmark). */}
          <svg
            className={styles.wordSvg}
            viewBox="0 0 100 16"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Contact Us"
          >
            <text
              className={styles.wordText}
              x="0"
              y="13.4"
              fontSize="17"
              textLength="100"
              lengthAdjust="spacing"
            >
              CONTACT US
            </text>
          </svg>
        </Reveal>

        <div className={styles.grid}>
          <div className={`${styles.info} measure`}>
            <Reveal>
              <div className={styles.label}>Enquiries</div>
              <p>
                <a className={styles.infoLink} href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}>
                  {CONTACT.phone}
                </a>
              </p>
              <p>
                <a className={styles.infoLink} href={`mailto:${CONTACT.email}`}>
                  {CONTACT.email}
                </a>
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className={styles.label}>Opening Times</div>
              <p>{CONTACT.officeHours.days}</p>
              <p>{CONTACT.officeHours.time}</p>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <form
              className={styles.form}
              onSubmit={(e) => e.preventDefault()}
            >
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Name</span>
                <div className={styles.row}>
                  <label className="sr-only" htmlFor="contact-first">
                    First name
                  </label>
                  <input
                    id="contact-first"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder="First name"
                  />
                  <label className="sr-only" htmlFor="contact-last">
                    Last name
                  </label>
                  <input
                    id="contact-last"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="contact-email">
                  Email
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="contact-message">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={4}
                  placeholder="Tell us a little about your enquiry"
                />
              </div>
              <div className={styles.submitRow}>
                {/* submit wears the ReadyCta "Join Us" pill — the one
                    light moment on the maroon contact ground */}
                <button type="submit" className={styles.submitPill}>
                  <span className={styles.pillLabel}>Submit</span>
                  <svg
                    className={styles.pillArrow}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
