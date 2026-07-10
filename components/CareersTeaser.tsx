// import Link from "next/link";
// import styles from "./CareersTeaser.module.css";
// import Reveal from "./Reveal";

// /**
//  * Careers teaser — sits between the News chapter and the RestaurantLocations
//  * sticky video. A translucent liquid-glass panel that dips into the top of
//  * the video below, so the maroon of the DarkZone reads through the card
//  * for a subtle stacking effect.
//  */
// export default function CareersTeaser() {
//   return (
//     <section className={styles.section} data-nav-theme="light">
//       <Reveal className={styles.card}>
//         <span className={styles.eyebrow}>Careers</span>

//         <h2 className={styles.statement}>
//           Cooking, hosting, or building the group behind the scenes —{" "}
//           <em className={styles.highlight}>we&rsquo;re hiring</em> across every
//           kitchen and the London office.
//         </h2>

//         <p className={styles.body}>
//           From chefs and front of house to brand, events, and operations, build your career with Maginhawa Group across our restaurants and London office.
//         </p>

//         <Link href="/join-us" className={styles.cta} aria-label="See open roles">
//           <span className={styles.ctaLabel}>See Open Roles</span>
//           <svg
//             className={styles.ctaArrow}
//             viewBox="0 0 48 10"
//             fill="none"
//             stroke="currentColor"
//             strokeWidth="1"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             aria-hidden
//           >
//             <path d="M0 5 H42" />
//             <path d="M38 1 L42 5 L38 9" />
//           </svg>
//         </Link>
//       </Reveal>
//     </section>
//   );
// }

import Link from "next/link";
import styles from "./CareersTeaser.module.css";
import Reveal from "./Reveal";
import MaskImage from "./MaskImage";

export default function CareersTeaser() {
  return (
    <section className={styles.section} data-nav-theme="light">
      <div className={styles.row}>
      <Reveal className={styles.card}>
        <span className={styles.eyebrow}>Careers</span>

        <h2 className={styles.statement}>
          Join the team behind London&rsquo;s Filipino food stories —{" "}
          <em className={styles.highlight}>we&rsquo;re hiring</em> across our
          kitchens, restaurants, and head office.
        </h2>

        <p className={styles.body}>
          From chefs and front of house to brand, events, and operations, build
          your career with Maginhawa Group across our restaurants and London
          office.
        </p>

        <div className={styles.roles} aria-label="Example roles">
          <span>Kitchen</span>
          <span>Front of House</span>
          <span>Brand</span>
          <span>Operations</span>
        </div>

        <Link href="/join-us" className={styles.cta} aria-label="See open roles">
          <span className={styles.ctaLabel}>See Open Roles</span>
          <svg
            className={styles.ctaArrow}
            viewBox="0 0 48 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M0 5 H42" />
            <path d="M38 1 L42 5 L38 9" />
          </svg>
        </Link>
      </Reveal>

      {/* photograph beside the card — a separate element, revealed with a
          bottom-up mask wipe as the section scrolls in */}
      <MaskImage
        className={styles.photo}
        src="/images/guanabana.jpg"
        alt="Inside Guanabana, Kentish Town"
        width={1346}
        height={2393}
        fill
        sizes="(max-width: 900px) 100vw, 34vw"
      />
      </div>
    </section>
  );
}