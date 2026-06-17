import styles from "./News.module.css";
import Placeholder from "./Placeholder";
import Reveal from "./Reveal";
import RevealText from "./RevealText";

const ITEMS = [
  {
    date: "18th Jan 2025",
    title: "London's best new cocktail: BINTANG's Clarified Ube Colada",
  },
  {
    date: "12th Jan 2025",
    title: "Inside the kitchen: how we reimagine Filipino classics",
  },
  {
    date: "04th Jan 2025",
    title: "A new opening lands on the heart of the high street",
  },
];

export default function News() {
  return (
    <section className={styles.section} id="news">
      <div className="container">
        <div className={styles.head}>
          <Reveal className={styles.eyebrow}>(News)</Reveal>
          <h2 className={styles.title}>
            <RevealText
              text="Explore the latest news, openings, and stories shaping the Maginhawa Group."
              stagger={0.022}
            />
          </h2>
        </div>

        <div className={styles.grid}>
          {ITEMS.map((item, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <article className={styles.card}>
                <Placeholder ratio="4 / 3" label="Article" />
                <span className={styles.date}>{item.date}</span>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.excerpt}>
                  At the heart of Bintang's cocktail menu is the Clarified Ube
                  Colada, a signature cocktail that encapsulates the vibrant
                  flavours and rich traditions of Filipino cuisine.
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
