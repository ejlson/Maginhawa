import styles from "./Footer.module.css";
import Reveal from "./Reveal";

const LEFT = [
  { h: "Home", items: ["Restaurants", "About Us", "Blog", "Careers", "Contact Us"] },
  { h: "Restaurants", items: ["List View", "Grid View"] },
  { h: "Blog", items: ["Latest Post", "Archives"] },
  { h: "About Us", items: ["Meet the Owner", "Our Story", "Awards & Recognition"] },
  { h: "Careers", items: ["Open Roles", "Apply"] },
];

const CONTACT = ["Email", "Instagram", "LinkedIn", "X", "Facebook"];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.cols}>
        <div className={styles.leftCols}>
          {LEFT.map((c) => (
            <div key={c.h} className={styles.col}>
              <h4>{c.h}</h4>
              <ul>
                {c.items.map((i, idx) => (
                  <li key={idx}>
                    <a href="#top">{i}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={`${styles.col} ${styles.contactCol}`}>
          <h4>Contact Us</h4>
          <ul>
            {CONTACT.map((i) => (
              <li key={i}>
                <a href="#contact-us">{i}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.spacer} />

      <Reveal className={styles.wordmarkReveal} y={36}>
        <svg
          className={styles.wordmark}
          viewBox="0 0 100 37"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Maginhawa"
        >
          <text
            className={styles.wline}
            x="0"
            y="18"
            fontSize="25"
            textLength="100"
            lengthAdjust="spacing"
          >
            MAGIN
          </text>
          <text
            className={styles.wline}
            x="0"
            y="36"
            fontSize="25"
            textLength="100"
            lengthAdjust="spacing"
          >
            HAWA
          </text>
        </svg>
      </Reveal>

      <div className={styles.bottomRow}>
        <span>© 2026 Maginhawa Group</span>
        <div>
          <span>By </span>
          <span className={styles.developer}>(EJ)</span>
        </div>
        {/* <span>By (EJ)</span> */}
      </div>
    </footer>
  );
}
