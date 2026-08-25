"use client";

import { useEffect, useState } from "react";
import Nav from "./Nav";
import Menu from "./Menu";
import styles from "./MenuPage.module.css";
import { asset } from "@/lib/media";
import { MENU_DISCLAIMER, MENU_DISCLAIMER_LABEL } from "@/lib/menu";
import type { Restaurant } from "@/lib/restaurants";

/* THE MENU AS A PAGE — /menus/<slug>, one route per venue that has one.
 *
 * ── WHY IT IS A PAGE AND NOT THE OVERLAY IT REPLACED ──
 * The menu was a modal that four surfaces mounted. Everything it did, it
 * did well; what it could not do was exist. A modal is a STATE inside
 * another page, so the menu had no URL to send anyone, nothing for a
 * crawler to index, and no answer to the back button beyond "close". For
 * the one page on a restaurant's site people actually go looking for —
 * 83% of them on a phone — that is the wrong shape.
 *
 * ── IT IS THE MENU AND NOTHING ELSE, AT THE USER'S INSTRUCTION ──
 * This started as a venue page: tagline, neighbourhood, the date the menu
 * was supplied, a Book pill and a way back to the list. All of it is gone.
 * What a reader arriving here wants is the menu, and every additional
 * element was furniture around the thing they came for.
 *
 * THREE THINGS SURVIVED, and each is load-bearing rather than decorative:
 *   · THE NAME, as the page's one <h1>. Without it the document has no
 *     heading, which costs exactly the search visibility this route was
 *     built to buy — "hoodwood menu" has to match something. It is also
 *     what makes the browser tab readable among twenty others.
 *   · THE NOTE. It is the group's own wording and the one sentence that
 *     limits what a printed price commits them to. Not ours to drop.
 *   · THE NAV, because a page with no way off it is a trap. It is the
 *     site's standing chrome, not this route's furniture.
 * The site FOOTER is deliberately absent — that is furniture, and it is
 * the largest piece of it.
 */
export default function MenuPage({
  restaurant,
  pages,
}: {
  restaurant: Restaurant;
  /** already narrowed by the route — this component never renders empty */
  pages: string[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  /* Release any dark backdrop the loader left behind. Identical to
     LegalPage and ContactPage; see the note there — arriving from the home
     page means arriving with `is-loading` still set, and without this the
     page renders correct content on a black sheet. */
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

      <main id="main-content" className={styles.page}>
        <article className={styles.doc}>
          <h1 className={styles.title}>
            {restaurant.name}
            {/* THE WORD "MENU" IS HERE AND IT IS NOT VISIBLE, which is the
                point. On screen the name is enough — the reader pressed a
                Menu control to arrive and the pages are directly beneath.
                A crawler and a screen reader both need the heading to say
                what the document IS, and neither reads the pictures. */}
            <span className={styles.srOnly}> menu</span>
          </h1>

          <p className={styles.note}>
            <span className={styles.noteLabel}>{MENU_DISCLAIMER_LABEL}</span>{" "}
            {MENU_DISCLAIMER}
          </p>

          <div className={styles.pages}>
            {pages.map((src, i) => (
              <figure key={src} className={styles.sheet}>
                {/* ⚠️ RAW TAG, NOT next/image, AND THE REASON IS THE SET.
                    These are 2481x1754 landscape, 4961x7016 A4 and 1080x1920
                    phone screens across seven venues, and no intrinsic size
                    is on file for any of them. `fill` would need an aspect
                    per page; declared width/height would need 19 files
                    measured. `asset()` puts them through the same Cloudinary
                    transform next/image would, which is the part that
                    actually matters.

                    ⚠️ THE FIRST PAGE IS EAGER, THE REST LAZY. React 19
                    hoists a raw tag into an SSR preload — right for page
                    one, wrong for five 7MB sheets. `loading="lazy"` opts
                    the others out of both. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  /* 2400 caps delivery: `c_limit` only ever SHRINKS
                     (lib/media.ts), so the phone screens pass through
                     untouched while the A4 sheets stop arriving at six
                     times the width anything can show. */
                  src={asset(src, { width: 2400 })}
                  alt={`${restaurant.name} menu — page ${i + 1} of ${pages.length}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  decoding="async"
                  draggable={false}
                />
              </figure>
            ))}
          </div>
        </article>
      </main>
    </>
  );
}
