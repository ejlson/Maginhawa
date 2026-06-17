import styles from "./CTAStatement.module.css";
import RevealText from "./RevealText";

export default function CTAStatement() {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.statement}>
          <RevealText
            text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce commodo nunc in risus molestie, a posuere."
            stagger={0.03}
          />
        </h2>
      </div>
    </section>
  );
}
