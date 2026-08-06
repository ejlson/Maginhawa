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
              {/* the phone line only appears once there is a real number to
                  dial — see lib/contact.ts. Email carries enquiries alone
                  until then. */}
              {CONTACT.phone ? (
                <p>
                  <a
                    className={styles.infoLink}
                    href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
                  >
                    {CONTACT.phone}
                  </a>
                </p>
              ) : null}
              <p>
                <a className={styles.infoLink} href={`mailto:${CONTACT.email}`}>
                  {CONTACT.email}
                </a>
              </p>
            </Reveal>
            {/* THE LABEL IS LOAD-BEARING — do not let it drift back to
                "Opening Times". On a restaurant group's contact page that
                wording reads as when the RESTAURANTS are open, and these are
                not those: lib/contact.ts:13 marks the value a placeholder for
                head-office hours, and the field is called `officeHours`. An
                unqualified "09:00 – 17:00" under the wrong label is the kind
                of wrong that sends someone to a locked door on a Saturday.
                A second line spelling the same distinction out in prose used
                to sit under the times. It has been removed: "OFFICE HOURS"
                already carries it, and the sentence was the label restated at
                greater length. If the label ever changes, the sentence has to
                come back with it. */}
            <Reveal delay={0.08} className={styles.infoTail}>
              <div className={styles.label}>Office Hours</div>
              <p>{CONTACT.officeHours.days}</p>
              <p>{CONTACT.officeHours.time}</p>
            </Reveal>
          </div>

          {/* the form takes the second and third tracks of the shared
              dark-zone rail — see .formCell */}
          <Reveal delay={0.1} className={styles.formCell}>
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
