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
            <Parallax inset ratio="3 / 4" speed={0.16}>
              <Placeholder label="Image" />
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
      </div>
    </section>
  );
}
