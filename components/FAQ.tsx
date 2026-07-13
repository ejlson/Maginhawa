"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Reveal from "./Reveal";
import styles from "./FAQ.module.css";

// Tight set of practical questions guests ask before they visit. Adds an
// `FAQPage` Schema.org block (rendered with the answers) so Google's FAQ rich
// result + AI search summaries can lift this content directly.
const ITEMS: { q: string; a: string }[] = [
  {
    q: "Do I need to book a table?",
    a: "Belly, Bintang, Guanabana and Ramo Ramen all take reservations — you'll find a booking link on each restaurant's page. Café Mama & Sons, Mamasons and Hoodwood run as walk-in or takeaway, so come as you are.",
  },
  {
    q: "Can you cater for dietary requirements?",
    a: "Every kitchen has vegetarian, vegan and gluten-free options, and we're happy to adapt where we can. Add a note to your booking or ask your server when you sit down — we'll point you to the dishes we can adjust.",
  },
  {
    q: "Do you do private hire or large groups?",
    a: "We host private dinners, supper clubs and full-restaurant hires across the group. For parties of eight or more, reach out via the contact form above and we'll come back to you with options.",
  },
  {
    q: "Where are your restaurants in London?",
    a: "We're rooted in north and central London. Belly, Guanabana and Ramo Ramen call Kentish Town home; Bintang and Mamasons are in Camden, with Mamasons and Ramo Ramen also in Soho; and Café Mama & Sons, Hoodwood and Bunso round out the family. Each restaurant's page has its address and directions.",
  },
  {
    q: "What kind of food does Maginhawa Group serve?",
    a: "Filipino at heart, pan-Asian and Caribbean by kitchen. Across the group you'll find Filipino comfort food and ube ice cream, Filipino-Japanese ramen, hand-crafted sandos and baked goods, grilled pan-Asian plates, and Caribbean flavours. Every menu lives on its restaurant's page.",
  },
  {
    q: "Do you offer takeaway or delivery?",
    a: "Several of our kitchens — including Café Mama & Sons, Mamasons and Hoodwood — run takeaway, and most of the group is on the major delivery apps. Check your favourite restaurant's page for what's available near you.",
  },
  {
    q: "What does “Maginhawa” mean?",
    a: "Maginhawa is Tagalog for “comfortable” — a life of ease. It's also the name of Quezon City's most famous food street, and comfort is the thread that runs through everything we cook.",
  },
  {
    q: "How do I apply to work at Maginhawa Group?",
    a: "We hire across our kitchens, front of house, brand, events and operations. Browse the open roles and apply directly on our careers page — we read every application.",
  },
];

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6l5 5 5-5" />
    </svg>
  );
}

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ITEMS.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <section className={styles.section} id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container">
        <div className={styles.head}>
          <div className={styles.headTop}>
            <Reveal as="span" className={styles.eyebrow}>
              FAQ
            </Reveal>
            <Reveal>
              <h2 className={styles.title}>Anything we missed?</h2>
            </Reveal>
          </div>
          <Reveal delay={0.08} className={styles.asideWrap}>
            <p className={styles.aside} aria-hidden>
              (A few of the questions that come up most — can&apos;t find
              what you&apos;re after? Drop us a note in the form above)
            </p>
          </Reveal>
        </div>

        <ul className={styles.list}>
          {ITEMS.map((it, i) => {
            const isOpen = open === i;
            return (
              <li key={it.q}>
                <button
                  type="button"
                  className={styles.row}
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span className={styles.question}>{it.q}</span>
                  <span className={`${styles.chev} ${isOpen ? styles.chevOpen : ""}`} aria-hidden>
                    <Chevron />
                  </span>
                </button>
                <motion.div
                  id={`faq-answer-${i}`}
                  initial={false}
                  animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <p className={styles.answer}>{it.a}</p>
                </motion.div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
