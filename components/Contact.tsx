import styles from "./Contact.module.css";
import Reveal from "./Reveal";
import RevealText from "./RevealText";
import MagneticButton from "./MagneticButton";

export default function Contact() {
  return (
    <section className={styles.section} id="contact-us">
      <div className="container">
        <h2 className={styles.wordmark}>
          <span className={styles.wline}>
            <RevealText text="Contact Us" stagger={0.05} />
          </span>
        </h2>

        <div className={styles.grid}>
          <div className={styles.info}>
            <Reveal>
              <div className={styles.label}>Location</div>
              <p>+44 01234 5678</p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className={styles.label}>Opening Times</div>
              <p>Mon – Sun · 11:00 – 23:00</p>
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
                <MagneticButton label="Submit" type="submit" arrow={false} />
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
