import styles from "./WhoWeAre.module.css";
import Placeholder from "./Placeholder";
import Reveal from "./Reveal";
import RevealText from "./RevealText";
import Parallax from "./Parallax";

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed a vestibulum nulla, eu imperdiet lorem. Proin scelerisque eget elit in dapibus. Vestibulum id lorem sapien.";

export default function WhoWeAre() {
  return (
    <section className={styles.section} id="about-us">
      <div className="container">
        <div className={styles.statementWrap}>
          <Reveal className={styles.sEyebrow} as="span">
            (Who are We?)
          </Reveal>
          <h2 className={styles.statement}>
            <span className={styles.spacer} aria-hidden />
            <RevealText
              text="A vibrant Filipino/pan-Asian company in the heart of London. Explore our diverse range of stores that embody the essence of tradition with a modern twist."
              stagger={0.018}
            />
          </h2>
        </div>

        <div className={styles.body}>
          {[0, 1, 2].map((i) => (
            <Reveal key={i} className={styles.col} delay={i * 0.08}>
              {LOREM}
            </Reveal>
          ))}
          <Reveal delay={0.24}>
            <Parallax speed={0.16}>
              <Placeholder ratio="3 / 4" label="Image" />
            </Parallax>
          </Reveal>
        </div>

        <div className={styles.cta}>
          <button className={styles.pill}>
            Learn More <u>About Us</u>
          </button>
          <button className={styles.circle} aria-label="Learn more about us">
            →
          </button>
        </div>

        <div className={styles.feature}>
          <Reveal className={styles.featureLeft}>
            <Placeholder ratio="3 / 4" label="Portrait" />
          </Reveal>
          <Reveal delay={0.1}>
            <Parallax speed={0.12}>
              <Placeholder ratio="16 / 10" label="Interior" />
            </Parallax>
          </Reveal>
        </div>

        <div className={styles.logoRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Reveal key={i} delay={i * 0.07}>
              <Placeholder ratio="1 / 1" label={`Brand ${i + 1}`} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
