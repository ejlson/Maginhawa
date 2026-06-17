import Link from "next/link";
import type { Metadata } from "next";
import Placeholder from "@/components/Placeholder";
import styles from "./restaurants.module.css";

export const metadata: Metadata = {
  title: "Restaurants — Maginhawa Group",
};

const RESTAURANTS = [
  { name: "Bintang", tag: "Filipino Fusion Restaurant", location: "Camden, London" },
  { name: "Belly", tag: "Modern Filipino Bistro", location: "Camden, London" },
  { name: "Mamasons", tag: "Filipino Ice Cream Parlour", location: "Camden · Soho, London" },
  { name: "Café Mama & Sons", tag: "Filipino x Japanese Café", location: "London" },
  { name: "Guanabana", tag: "Caribbean Cuisine", location: "Kentish Town, London" },
  { name: "Ramo Ramen", tag: "Filipino-Japanese Ramen", location: "Kentish Town · Soho" },
  { name: "Hoodwood", tag: "Caribbean Takeaway", location: "London" },
];

export default function RestaurantsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <Link href="/" className={styles.back}>
          ← Maginhawa
        </Link>
        <span className={styles.count}>{RESTAURANTS.length} Restaurants</span>
      </header>

      <h1 className={styles.title}>Restaurants</h1>

      <div className={styles.grid}>
        {RESTAURANTS.map((r) => (
          <Link key={r.name} href="/" className={styles.card}>
            <div className={styles.cardImg}>
              <Placeholder ratio="4 / 3" label={r.name} />
            </div>
            <div className={styles.cardMeta}>
              <h2 className={styles.cardName}>{r.name}</h2>
              <span className={styles.cardTag}>{r.tag}</span>
              <span className={styles.cardLoc}>{r.location}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
