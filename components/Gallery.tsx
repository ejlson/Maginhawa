import styles from "./Gallery.module.css";
import Placeholder from "./Placeholder";
import Parallax from "./Parallax";

const ITEMS = [
  { cls: styles.i1, ratio: "3 / 4", speed: 0.12 },
  { cls: styles.i2, ratio: "16 / 10", speed: 0.26 },
  { cls: styles.i3, ratio: "1 / 1", speed: 0.1 },
  { cls: styles.i4, ratio: "4 / 3", speed: 0.2 },
  { cls: styles.i5, ratio: "1 / 1", speed: 0.16 },
  { cls: styles.i6, ratio: "1 / 1", speed: 0.3 },
  { cls: styles.i7, ratio: "3 / 4", speed: 0.14 },
  { cls: styles.i8, ratio: "16 / 9", speed: 0.22 },
];

export default function Gallery() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.grid}>
          {ITEMS.map((item, i) => (
            <div key={i} className={item.cls}>
              <Parallax speed={item.speed}>
                <Placeholder ratio={item.ratio} label={`Gallery ${i + 1}`} />
              </Parallax>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
