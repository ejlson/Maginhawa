"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/layout/Nav";
import Menu from "@/components/layout/Menu";
import Contact from "./Contact";
import FAQ from "./FAQ";
import ReviewUs from "./ReviewUs";
import Footer from "@/components/layout/Footer";
import DarkZone from "@/components/ui/DarkZone";
import styles from "./ContactPage.module.css";
import { RESTAURANTS } from "@/lib/restaurants";

// The four restaurants that publish a street address — `addresses` is
// populated only for the venues that take bookings (see lib/restaurants.ts),
// so this is the group's real, unpadded list. Flattened at module scope: the
// data is static, and an address is the one thing on a contact page that must
// never be invented.
const VISITABLE = RESTAURANTS.flatMap((r) =>
  (r.addresses ?? []).map((a) => ({ r, a })),
);

// Same deep-link recipe ReviewUs already uses for its Google fallback: a Maps
// search by name and address rather than a Place ID we do not have.
const mapUrl = (name: string, a: { street: string; locality: string; postcode: string }) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${name}, ${a.street}, ${a.locality} ${a.postcode}`,
  )}`;

// The dedicated /contact route: enquiry form, FAQ accordion, Google review
// CTA, Footer. Contact, FAQ and ReviewUs render ONLY here — every other route
// puts just the Footer in its DarkZone — so those three stylesheets can be
// changed without checking the rest of the site. (This note used to say the
// home page closed with the same set; it hasn't since the Contact and FAQ
// blocks were pulled off it, and the claim sent at least one reader hunting
// for a lockstep that no longer exists.)
// All four blocks hang off the shared rail declared on .zone in
// DarkZone.module.css, which is what keeps their column edges in agreement.
export default function ContactPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  // release any dark backdrop / loader state another route may have set
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

      <main id="main-content">
        <DarkZone>
          <Contact standalone />
          <FAQ />
          <ReviewUs />

          {/* The footer's "Got any questions? Contact us." invitation points
              at this page. It is suppressed here and its slot refilled with
              the one thing /contact could not otherwise give a reader: a
              street address and a way to walk to it. See
              ContactPage.module.css for how both halves are done from the
              outside — Footer.tsx is untouched, and every other route keeps
              the invitation. */}
          <div className={styles.footerZone}>
            <div className={styles.visitLayer}>
              {/* The `come-and-see-us` id is a STABLE HOOK, not the copy: it
                  is what `aria-labelledby` points at and what four probe
                  scripts select on (probe-contact-audit, -routes, -kbd).
                  The visible words changed; renaming the id along with them
                  would buy nothing a reader can see and break all four. */}
              <aside className={styles.visit} aria-labelledby="come-and-see-us">
                <h2 className={styles.visitTitle} id="come-and-see-us">
                  Come and visit us.
                </h2>
                <ul className={styles.visitList}>
                  {VISITABLE.map(({ r, a }) => (
                    <li key={r.slug}>
                      {/* No `aria-label`. One would have replaced the
                          accessible name wholesale, and any wording that read
                          well ("Bintang, 93 Kentish Town Rd, London NW1 8NY —
                          open in Google Maps") no longer CONTAINED the
                          visible string, which is what voice control matches
                          on (WCAG 2.5.3, Label in Name). The visible text
                          stays the name and a hidden tail adds the purpose,
                          so the accessible name is the label plus more. */}
                      <a
                        className={styles.visitItem}
                        href={mapUrl(r.name, a)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className={styles.visitName}>{r.name}</span>
                        <span className={styles.visitAddr}>
                          {a.street}, {a.postcode}
                        </span>
                        <span className="sr-only">- open in Google Maps</span>
                      </a>
                    </li>
                  ))}
                  <li>
                    <Link className={styles.visitAll} href="/restaurants">
                      View all our restaurants
                      <span className={styles.visitArrow} aria-hidden>
                        →
                      </span>
                    </Link>
                  </li>
                </ul>
              </aside>
            </div>

            <Footer />
          </div>
        </DarkZone>
      </main>
    </>
  );
}
