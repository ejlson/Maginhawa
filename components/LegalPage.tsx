"use client";

import { useEffect, useState } from "react";
import Nav from "./Nav";
import Menu from "./Menu";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import styles from "./LegalPage.module.css";
import { LEGAL_UPDATED, LEGAL_UPDATED_LABEL } from "@/lib/legal";

/* THE SHELL BOTH LEGAL ROUTES SIT IN — /privacy and /terms, one layout.
 *
 * ── WHY A SHELL AND NOT TWO PAGES ──
 * These are the only two routes on the site whose job is READING rather than
 * looking: no photography, no scroll choreography, no reveal. Everything
 * they need is a measure, a scale of headings and a date. Two copies of that
 * would drift, and the drift would show up as two legal pages that look like
 * they came from different companies — which is precisely the impression a
 * legal page exists to avoid.
 *
 * ── IT DELIBERATELY DOES NOT ANIMATE ──
 * Every other route on this site opens with something: the loader, a curtain,
 * a reveal wave, a pinned chapter. None of that is here, and its absence is a
 * decision rather than an omission. A reader who has navigated to a privacy
 * notice is looking for a specific clause, usually in a hurry, sometimes
 * because something has gone wrong. Motion between them and the sentence is
 * cost with no benefit. The page transition still runs (PageTransition owns
 * that at the root and this route is not special to it) — what is missing is
 * anything this component would have added on top.
 *
 * ── THE CONTENT COMES IN AS CHILDREN, FROM A SERVER COMPONENT ──
 * The prose lives in app/privacy/page.tsx and app/terms/page.tsx, which are
 * server components, and crosses into this client component as `children`.
 * That is the shape that keeps the WORDS out of the client bundle's
 * JavaScript and in the pre-rendered HTML, which for a document whose whole
 * value is being readable and indexable is the only shape worth having.
 */
export default function LegalPage({
  title,
  standfirst,
  children,
}: {
  title: string;
  standfirst: string;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  /* Release any dark backdrop / loader state another route may have set —
     the same hand-off ContactPage does, and for the same reason: arriving
     here from the home page means arriving with `is-loading` still on the
     body and the html background painted dark by the loader. Without this
     the page renders correct content on a black sheet. */
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    html.style.backgroundColor = "";
    document.body.style.backgroundColor = "";
    document.body.classList.remove("is-loading");
    return () => {
      html.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, []);

  return (
    <>
      <Nav
        started
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className={styles.page}>
        <article className={styles.doc}>
          <header className={styles.head}>
            {/* THE PAGE'S <h1>, AND THERE IS EXACTLY ONE. Both legal routes
                get theirs from here rather than from their own copy, which
                is the cheapest possible guarantee that neither ships without
                one — the defect this whole shell was written alongside
                fixing on /restaurants and /contact. */}
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.standfirst}>{standfirst}</p>

            {/* A REAL <time>, NOT A STRING. `dateTime` carries the ISO value
                for machines and the label carries the readable one for
                people — the split lib/legal.ts keeps at source, for the
                hydration reason documented there. */}
            <p className={styles.updated}>
              Last updated{" "}
              <time dateTime={LEGAL_UPDATED}>{LEGAL_UPDATED_LABEL}</time>
            </p>
          </header>

          <div className={styles.prose}>{children}</div>
        </article>
      </main>

      <DarkZone>
        <Footer />
      </DarkZone>
    </>
  );
}

/* A FACT THE BUSINESS STILL HAS TO SUPPLY, RENDERED AS A VISIBLE HOLE.
 *
 * Used wherever lib/legal.ts hands back `null`. It is styled to look like an
 * unfilled field rather than like prose, because the failure mode this
 * guards against is a policy that READS complete while naming no controller
 * — see the banner on lib/legal.ts for why that is worse than an obvious
 * gap. `role="mark"` is not a thing; this is a plain <span> with a class,
 * and the accessible text says what is missing in words rather than relying
 * on the styling to communicate it. */
export function Pending({ what }: { what: string }) {
  return (
    <span className={styles.pending}>
      [to be supplied: {what}]
    </span>
  );
}
