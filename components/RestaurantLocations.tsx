import styles from "./RestaurantLocations.module.css";
import Placeholder from "./Placeholder";
import Parallax from "./Parallax";
import RevealText from "./RevealText";

export default function RestaurantLocations() {
  return (
    <section className={styles.section}>
      <Parallax speed={0.22} className={styles.bg}>
        <Placeholder ratio="auto" label="Map / locations showcase" />
      </Parallax>
      <h2 className={styles.heading}>
        <RevealText text="[ List of all the restaurant locations ]" stagger={0.03} />
      </h2>
    </section>
  );
}
