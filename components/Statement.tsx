import styles from "./Statement.module.css";
import Reveal from "./Reveal";
import RevealText from "./RevealText";

export default function Statement() {
  return (
    <section className={styles.section} data-nav-theme="light">
      <div className="container">
        <div className={styles.wrap}>
          <Reveal className={styles.eyebrow} as="span">
            (Discover Our Restaurants)
          </Reveal>
          <h2 className={styles.statement}>
            <span className={styles.spacer} aria-hidden />
            <RevealText
              text="A vibrant Filipino/pan-Asian company in the heart of London. Explore our diverse range of stores that embody the essence of tradition with a modern twist."
              stagger={0.018}
            />
          </h2>
        </div>
      </div>
    </section>
  );
}
