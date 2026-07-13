import styles from "./NumbersStrip.module.css";
import Reveal from "./Reveal";

// The group's story compressed into four editorial numerals — every value
// grounded in copy elsewhere on the site (Camden kitchen 1987, "seven
// dining rooms today", "thirty-eight years of Filipino kitchens", Belly
// added to the Michelin Guide in 2026).
const NUMBERS: { value: string; label: string }[] = [
  { value: "1987", label: "Established, Kentish Town" },
  { value: "7", label: "Restaurants" },
  { value: "38", label: "Years of kitchen experience" },
  { value: "2026", label: "Michelin Guide" },
];

/**
 * Numbers strip — the bridge between the About Us chapter (who we are)
 * and the Blog covers (what people write about us): credibility at a
 * glance, in one hairline-ruled row. Static by design — the page already
 * carries two kinetic bands (press logos, hiring ticker).
 */
export default function NumbersStrip() {
  return (
    <section className={styles.section} data-nav-theme="light">
      <dl className={styles.strip}>
        {NUMBERS.map((n, i) => (
          <Reveal key={n.label} delay={i * 0.06} className={styles.item}>
            <dt className={styles.label}>{n.label}</dt>
            <dd className={styles.value}>{n.value}</dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
