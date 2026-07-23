import styles from "./Contact.module.css";
import Reveal from "./Reveal";

export default function Contact() {
  return (
    <section className={styles.section} id="contact-us">
      <div className="container">
        <Reveal className={styles.wordmark} as="h2">
          {/* SVG wordmark stretched to fill the full page width */}
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
              lengthAdjust="spacingAndGlyphs"
            >
              CONTACT US
            </text>
          </svg>
        </Reveal>

        <div className={styles.grid}>
          <div className={`${styles.info} measure`}>
            <Reveal>
              <div className={styles.label}>Location</div>
              <p>+44 01234 5678</p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className={styles.label}>Opening Times</div>
              <p>Mon – Sun</p>
              <p>09:00 – 17:00</p>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <form
              className={styles.form}
              onSubmit={(e) => e.preventDefault()}
            >
              <div className={styles.field}>
                <label>Name</label>
                <div className={styles.row}>
                  <input type="text" placeholder="First Name" />
                  <input type="text" placeholder="Last Name" />
                </div>
              </div>
              <div className={styles.field}>
                <label>Email</label>
                <input type="email" placeholder="Enter your email here" />
              </div>
              <div className={styles.field}>
                <label>Description</label>
                <input type="text" placeholder="Enter your description here" />
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
