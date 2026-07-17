"use client";

import Link from "next/link";
import styles from "./ViewAllButton.module.css";
import { useRouteTransition } from "./PageTransition";

const LABEL = "View All Our Restaurants";

function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export default function ViewAllButton() {
  const navigate = useRouteTransition();

  return (
    <section className={styles.wrap}>
      <Link
        href="/restaurants"
        className={styles.btn}
        onClick={(e) => {
          e.preventDefault();
          navigate("/restaurants");
        }}
        aria-label={LABEL}
      >
        <span className={styles.label} aria-hidden>
          {LABEL}
        </span>
        <span className={styles.arrow} aria-hidden>
          <Arrow />
        </span>
      </Link>
    </section>
  );
}
