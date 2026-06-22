"use client";

import { useEffect, useState } from "react";
import Nav from "./Nav";
import Menu from "./Menu";
import Reveal from "./Reveal";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import { useRouteTransition } from "./PageTransition";
import styles from "./RestaurantDetail.module.css";
import type { Restaurant } from "@/lib/restaurants";
import { pressForRestaurant } from "@/lib/press";

export default function RestaurantDetail({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useRouteTransition();
  const press = pressForRestaurant(restaurant.slug);

  // page is light cream — release the dark backdrop the showcase set
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
      <Nav started menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((o) => !o)} />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className={styles.page} data-nav-theme="light">
        <div className="container">
          <a
            className={styles.back}
            href="/restaurants"
            onClick={(e) => {
              e.preventDefault();
              navigate("/restaurants");
            }}
          >
            ← All restaurants
          </a>

          <section className={styles.hero}>
            <div className={styles.copy}>
              <Reveal as="span" className={styles.eyebrow}>
                ({restaurant.cuisine})
              </Reveal>
              <Reveal>
                <h1 className={styles.name}>{restaurant.name}</h1>
              </Reveal>
              <Reveal delay={0.05}>
                <p className={styles.tagline}>{restaurant.tagline}</p>
              </Reveal>
              <Reveal delay={0.1}>
                <p className={styles.lede}>{restaurant.description}</p>
              </Reveal>

              <Reveal delay={0.15} className={styles.facts}>
                <span className={styles.fact}>
                  <strong>Location</strong>
                  {restaurant.location}
                </span>
                <span className={styles.fact}>
                  <strong>Cuisine</strong>
                  {restaurant.cuisine}
                </span>
                {restaurant.priceRange && (
                  <span className={styles.fact}>
                    <strong>Price</strong>
                    {restaurant.priceRange}
                  </span>
                )}
                <span className={styles.fact}>
                  <strong>Bookings</strong>
                  {restaurant.bookable ? "Reservations welcome" : "Walk-in / takeaway"}
                </span>
              </Reveal>

              <Reveal delay={0.2} className={styles.actions}>
                {restaurant.bookable && (
                  <button type="button" className={`${styles.btn} ${styles.btnSolid}`}>
                    Book a Table
                  </button>
                )}
                <button type="button" className={styles.btn}>
                  View Menu
                </button>
              </Reveal>
            </div>

            <Reveal className={styles.heroImage} delay={0.1}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={restaurant.image} alt={restaurant.name} />
            </Reveal>
          </section>

          {press.length > 0 && (
            <section className={styles.pressSection} aria-label={`Editorial coverage of ${restaurant.name}`}>
              {(() => {
                const lead = press.find((p) => p.quote);
                if (!lead) return null;
                return (
                  <Reveal className={styles.pressLead}>
                    <span className={styles.pressMark} aria-hidden>
                      &ldquo;
                    </span>
                    <blockquote className={styles.pressLeadText}>
                      {lead.quote}
                    </blockquote>
                    <span className={styles.pressLeadSource}>— {lead.outlet}</span>
                  </Reveal>
                );
              })()}

              <Reveal>
                <ul className={styles.pressList}>
                  {press.map((p) => (
                    <li key={`${p.outlet}-${p.url}`}>
                      <a
                        className={styles.pressItem}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className={styles.pressOutlet}>{p.outlet}</span>
                        <span className={styles.pressFeature}>{p.feature}</span>
                        <span className={styles.pressArrow} aria-hidden>
                          ↗
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </section>
          )}
        </div>

        <DarkZone>
          <Footer />
        </DarkZone>
      </main>
    </>
  );
}
