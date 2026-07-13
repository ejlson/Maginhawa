import { Fragment } from "react";
import Link from "next/link";
import styles from "./CareersTeaser.module.css";

// The four teams the group hires across — the ticker's repeating beat.
const TEAMS = ["Kitchen", "Front of House", "Brand", "Operations"];

/**
 * Careers teaser — a kinetic hiring ticker between the Blog covers and
 * the RestaurantLocations video. A stationary "We're Hiring" label sits
 * top-left over a full-width hairline; beneath it the four teams scroll
 * continuously in the display serif. The whole band is a single link
 * into /join-us. Same marquee mechanics as the PressStrip (duplicated
 * track, -50% loop).
 */
export default function CareersTeaser() {
  // one half of the looping track — rendered twice so the -50% keyframe
  // lands on an identical frame
  const sequence = (key: string) => (
    <span className={styles.seq} key={key}>
      {TEAMS.map((team) => (
        <Fragment key={team}>
          <span className={styles.team}>{team}</span>
          <span className={styles.dot} />
        </Fragment>
      ))}
    </span>
  );

  return (
    <section className={styles.section} data-nav-theme="light">
      {/* stationary label — the italic saffron beat, ruled off from the
          moving band below */}
      <div className={styles.head}>
        <em className={styles.hiring}>We&rsquo;re Hiring</em>
      </div>

      <Link
        href="/join-us"
        className={styles.band}
        aria-label="We're hiring across kitchen, front of house, brand and operations — see open roles"
      >
        <div className={styles.track} aria-hidden>
          {sequence("a")}
          {sequence("b")}
        </div>
      </Link>
    </section>
  );
}
