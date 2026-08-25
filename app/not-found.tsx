"use client";

import { useState } from "react";
import Nav from "@/components/layout/Nav";
import Menu from "@/components/layout/Menu";
import PillCta from "@/components/ui/PillCta";
import styles from "./not-found.module.css";

/* ---- THE 404 -------------------------------------------------------------
   The site had none, which under `output: "export"` means every unmatched
   path fell through to whatever the host served — Cloudflare's own plain
   text page, with none of this site's chrome on it and no way back into it.
   Next writes this component out as `404.html` at export time and Cloudflare
   Pages serves that file for any path it cannot match, so one file covers
   every wrong URL: a typo, a stale bookmark, a link printed on something.

   IT IS A CLIENT COMPONENT ONLY BECAUSE OF THE MENU. <Nav> takes the sheet's
   open state, which is state, and every other page on this site holds it the
   same way. Nothing else here is interactive.

   WHAT IT DOES NOT DO IS APOLOGISE AT LENGTH. A reader who lands here wanted
   something specific and did not get it; the useful things are the name of
   what happened, in the page's own voice, and the four or five places they
   might actually have meant. The doors below are the nav, restated as
   destinations rather than as a menu — the same set, because a 404 that
   invents its own information architecture is a second site.

   NOT INDEXED. `robots: noindex` on an error page is what keeps the 404
   itself out of results while the paths that resolve to it stay eligible to
   be dropped on their own terms. Metadata cannot be exported from a "use
   client" module, so it is set on the <head> by the layout's defaults and
   the noindex is carried by the meta tag below.

   ⚠️ NO <Footer />, AND THAT IS THE PRICE OF FITTING ON ONE SCREEN. The
   whole page is meant to be readable without scrolling, and the site footer
   is ~900px on its own — an invitation panel, a photograph, the address
   block, the social row. It cannot share a viewport with anything.
   What the footer would have carried that this page still needs is the way
   out, and there are six of those above the fold: the home CTA and the five
   doors, which are the nav restated. What is lost is the contact block and
   the legal line, and Contact Us is one of the five doors. ---- */

const DOORS = [
  { href: "/restaurants", label: "Restaurants", note: "All eight rooms, with menus" },
  { href: "/about", label: "About Us", note: "Where the group came from" },
  { href: "/blog", label: "Journal", note: "Openings, press and recognitions" },
  { href: "/careers", label: "Careers", note: "Roles across the group" },
  { href: "/contact", label: "Contact Us", note: "Bookings, press and enquiries" },
];

export default function NotFound() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* the only metadata a "use client" page can set for itself */}
      <meta name="robots" content="noindex, follow" />

      <Nav
        started
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main id="main-content" className={styles.page} data-nav-theme="light">
        <section className={styles.hero}>
          <p className={styles.label}>Error 404</p>

          {/* THE NUMERAL IS THE PICTURE. Every other page on this site opens
              on a photograph; this one has nothing true to show, and a stock
              plate under an error would be the site pretending the reader
              arrived somewhere. So the type carries it — the wordmark's face
              at the wordmark's weight, which is the one image this page can
              honestly print. */}
          <p className={styles.numeral} aria-hidden>
            404
          </p>

          <h1 className={styles.title}>This page has left the pass.</h1>

          <p className={styles.lede}>
            The link you followed doesn&rsquo;t lead anywhere on this site any
            more. It may have moved, or it may never have existed. Everything
            the group publishes is one of the doors below.
          </p>

          <div className={styles.cta}>
            <PillCta href="/">Back to the home page</PillCta>
          </div>
        </section>

        <nav className={styles.doors} aria-label="Where to go instead">
          <ul className={styles.doorList}>
            {DOORS.map((d) => (
              <li key={d.href}>
                <a href={d.href} className={styles.door}>
                  {/* THE ARROW RIDES THE LABEL, not the column's right edge.
                      It was `grid-template-columns: 1fr auto` — which in a
                      five-across row put each door's arrow hard against the
                      NEXT door's title, so it read as that one's marker.
                      Beside the word it belongs to, it cannot be misread at
                      any column count. */}
                  <span className={styles.doorHead}>
                    <span className={styles.doorLabel}>{d.label}</span>
                    <span className={styles.doorArrow} aria-hidden>
                      →
                    </span>
                  </span>
                  <span className={styles.doorNote}>{d.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </>
  );
}
