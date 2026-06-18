import styles from "./Blog.module.css";
import Placeholder from "./Placeholder";
import Parallax from "./Parallax";
import Reveal from "./Reveal";
import RevealText from "./RevealText";

const FEATURED = {
  date: "24th Jan 2025",
  title: "From Manila to Camden: the story behind our newest opening",
  excerpt:
    "We sat down with Chef Omar to trace the journey from a family kitchen in Manila to the heart of the London high street — the flavours, the people, and the ideas shaping where the Maginhawa Group goes next.",
};

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

export default function Blog() {
  return (
    <section className={styles.section} id="blog">
      <div className="container">
        <div className={styles.head}>
          <Reveal className={styles.eyebrow} as="span">
            (Blog)
          </Reveal>
          <h2 className={styles.title}>
            <span className={styles.spacer} aria-hidden />
            <RevealText
              text="Explore the latest stories, openings, and ideas shaping the Maginhawa Group."
              stagger={0.018}
            />
          </h2>
        </div>

        <Reveal>
          <article className={styles.featured}>
            <Parallax
              inset
              ratio="16 / 10"
              speed={0.14}
              className={styles.featuredMedia}
            >
              <Placeholder label="Latest article" />
            </Parallax>
            <div className={styles.featuredBody}>
              <span className={styles.featuredTag}>Latest · {FEATURED.date}</span>
              <h3 className={styles.featuredTitle}>{FEATURED.title}</h3>
              <p className={styles.featuredExcerpt}>{FEATURED.excerpt}</p>
              <a href="#blog" className={styles.featuredLink}>
                Read the story <span aria-hidden>→</span>
              </a>
            </div>
          </article>
        </Reveal>

        <div className={styles.grid}>
          {ITEMS.map((item, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <article className={styles.card}>
                <Parallax inset ratio="4 / 3" speed={0.12}>
                  <Placeholder label="Article" />
                </Parallax>
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
