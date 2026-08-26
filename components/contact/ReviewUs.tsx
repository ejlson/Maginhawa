import Reveal from "@/components/ui/Reveal";
import styles from "./ReviewUs.module.css";
import { RESTAURANTS, type Restaurant } from "@/lib/restaurants";

// Dark-zone CTA: pick a restaurant, leave a Google review. Falls back to a
// Google Maps search when a per-restaurant "writereview?placeid=..." deep
// link isn't set yet — works for every restaurant out of the box, and the
// data field is there to upgrade with real Place IDs later.

// Coming-soon venues have no doors open yet — nothing to review.
const REVIEWABLE = RESTAURANTS.filter((r) => !r.comingSoon);

const reviewUrl = (r: Restaurant) =>
  r.googleReviewUrl ??
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${r.name} ${r.location}`
  )}`;

function GoogleMark() {
  // Tiny Google "G" mark in a single colour so it stays on-brand against the
  // maroon backdrop. Recognisable without dragging the multi-colour logo in.
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.6 12.227c0-.65-.057-1.275-.165-1.875H12v3.638h5.39a4.6 4.6 0 0 1-2 3.022v2.51h3.24c1.895-1.748 2.97-4.323 2.97-7.295Z" opacity="0.95" />
      <path d="M12 22c2.7 0 4.965-.895 6.62-2.428l-3.24-2.51c-.9.6-2.05.953-3.38.953-2.6 0-4.8-1.755-5.585-4.115H3.07v2.59A10 10 0 0 0 12 22Z" opacity="0.85" />
      <path d="M6.415 13.9a6 6 0 0 1 0-3.8V7.51H3.07a10 10 0 0 0 0 8.98l3.345-2.59Z" opacity="0.75" />
      <path d="M12 5.96c1.47 0 2.79.505 3.83 1.495l2.87-2.87C16.96 2.98 14.695 2 12 2A10 10 0 0 0 3.07 7.51l3.345 2.59C7.2 7.74 9.4 5.96 12 5.96Z" opacity="0.95" />
    </svg>
  );
}

export default function ReviewUs() {
  return (
    <section className={styles.section} id="leave-a-review">
      <div className="container">
        <div className={styles.head}>
          {/* The "Your Voice Matters" eyebrow that used to sit here is gone.
              It only gestured at what the headline below states outright, so
              it was furniture — and it cost the section a saffron dot and a
              line of vertical space for nothing. */}
          <Reveal className={styles.headMain}>
            <h2 className={styles.title}>
              Loved your visit? Leave us a Google review.
            </h2>
          </Reveal>
        </div>

        <Reveal>
          <ul className={styles.grid}>
            {REVIEWABLE.map((r) => (
              <li key={r.slug}>
                <a
                  className={styles.item}
                  href={reviewUrl(r)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Leave a Google review for ${r.name}`}
                >
                  <div className={styles.itemMain}>
                    <span className={styles.itemName}>{r.name}</span>
                    <span className={styles.itemTag}>{r.location}</span>
                  </div>
                  <span className={styles.itemCta}>
                    <GoogleMark />
                    <span>Review on Google</span>
                    <span className={styles.itemArrow} aria-hidden>
                      →
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
