import styles from "./DarkZone.module.css";

/**
 * Continuous maroon wrapper for the bottom of the page: the
 * RestaurantLocations video (shrinking from full-bleed), Careers teaser,
 * Contact, FAQ, and Footer all share this one dark background so the
 * chapter reads as one connected section instead of a stack of blocks.
 */
export default function DarkZone({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.zone} data-nav-theme="dark">
      {children}
    </div>
  );
}
