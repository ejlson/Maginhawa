"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import styles from "./Discover.module.css";
import Placeholder from "./Placeholder";

const ITEMS = [
  {
    name: "Bintang",
    tag: "Filipino Fusion Restaurant",
    location: "93 Kentish Town Rd, London NW1",
    paras: [
      "Originally opened by Chef Omar's parents, Bintang is a renowned Filipino fusion restaurant located at 93 Kentish Town Road, London NW1 8NY.",
      "Established in 1987, it has been a staple in the Camden Town dining scene, offering a blend of Malaysian, Indonesian, Japanese, Vietnamese, and Filipino cuisines.",
    ],
  },
  {
    name: "Belly",
    tag: "Modern Filipino Bistro",
    location: "Camden, London",
    paras: [
      "Belly is a modern Filipino bistro pulling from Chef Omars rich background from the Philippines and with cooking techniques from France and Japan.",
      "A perfect blend of cultures all in one place going right to the Belly (.)",
    ],
  },
  {
    name: "Mamasons",
    tag: "London's First Filipino Ice Cream Parlor",
    location: "Camden · Soho · Shoreditch, London",
    paras: [
      "Mamasons Dirty Ice Cream, London's first Filipino ice cream parlour, was founded in 2017.",
      "Inspired by the traditional 'dirty ice cream' sold by street vendors in Manila, the founders aimed to introduce authentic Filipino flavours to London.",
      "Mamasons has become known for bringing Filipino desserts to a wider audience, earning a special place in the hearts of both the Filipino community and dessert enthusiasts across London.",
    ],
  },
  {
    name: "Café Mama & Sons",
    tag: "Filipino x Japanese Café",
    location: "London",
    paras: [
      "Cafe Mama&sons aims to be apart of your daily life offering you a daily exciting alternative to the boring croissant or pre packaged sandwich.",
      "We offer hand crafted Sandos all with different and exciting fillings from your classic egg salad to the decadent hearty corned beef croquette you wont be dissapointed.",
      "We also server the breakfast crowd with our award winning Longanisa Breakfast Burger (its a must try)!",
    ],
  },
  {
    name: "Guanabana",
    tag: "Caribbean Cuisine",
    location: "85 Kentish Town Rd, London NW1",
    paras: [
      "A vibrat, halal-certified Caribbean and Latin American restaurant located at 85 Kentish Town Road in Camden, London NW1 8NY.", 
      "Established in 2007, it was among the first in the city to blends Latin-Caribbean flavours, Guanabana is renowned for its 'Island Roast', a Caribbean twist on the traditional Sunday roast, featuring oak-smoked jerk chicken or grilled beef, accompanied by sides like sweet plantains, roasted potatoes, and spicy jerk gravy."
    ],
  },
  {
    name: "Ramo Ramen",
    tag: "Filipino-Japanese Fusion Restaurant",
    location: "Kentish Town · Soho, London",
    paras: [
      "The world's first Filipino-Japaense ramen joint. First opened in Kentish Town, London, in 2018, offering a unique blend of traditional Japaense ramen with Filipino culinary influences.",
      "In 2021, Ramo Ramen expanded to a second location in Soho, London, further solidifying its presence in the city's vibrant food scene."
    ],
  },
  {
    name: "Hoodwood",
    tag: "Caribbean Takeaway",
    location: "London",
    paras: [
      "Hoodwood is your go-to neighborhood Caribbean takeaway, serving up bold, smoky flavors with a true taste of the islands. We specialize in oak-smoked chicken plates, slow-cooked over an open flame for a deep, rich, and aromatic flavor.",
      "Our menu also features handmade Caribbean patties, packed with flavorful fillings and wrapped in a perfectly golden, flaky crust. Whether you're after a quick bite or a hearty meal, Hoodwood is all about honest, fire-kissed cooking that brings people together."
    ]
  },
];

// render the list a few times so it can loop seamlessly in both directions
const REPEAT = 3;

export default function Discover() {
  const [active, setActive] = useState(0);
  const [activeRendered, setActiveRendered] = useState(ITEMS.length); // middle copy
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // infinite loop + active detection
  useEffect(() => {
    const c = scrollerRef.current;
    if (!c) return;
    const setHeight = () => c.scrollHeight / REPEAT;

    // start centred on the middle copy's first item
    const init = () => {
      const card = cardRefs.current[ITEMS.length];
      if (!card) return;
      const cr = c.getBoundingClientRect();
      const kr = card.getBoundingClientRect();
      c.scrollTop += kr.top - cr.top - (c.clientHeight - kr.height) / 2;
    };
    const r0 = requestAnimationFrame(init);

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // keep the scroll within the middle copy → seamless wrap
        const sh = setHeight();
        if (sh > 0) {
          if (c.scrollTop < sh * 0.5) c.scrollTop += sh;
          else if (c.scrollTop > sh * 2.5) c.scrollTop -= sh;
        }
        const box = c.getBoundingClientRect();
        const mid = box.top + box.height / 2;
        let best = 0;
        let bestDist = Infinity;
        cardRefs.current.forEach((el, i) => {
          if (!el) return;
          const r = el.getBoundingClientRect();
          const d = Math.abs(r.top + r.height / 2 - mid);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        setActiveRendered(best);
        setActive(best % ITEMS.length);
      });
    };
    c.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(r0);
      cancelAnimationFrame(raf);
      c.removeEventListener("scroll", onScroll);
    };
  }, []);

  const select = (ri: number) => {
    setActiveRendered(ri);
    setActive(ri % ITEMS.length);
    cardRefs.current[ri]?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const item = ITEMS[active];

  return (
    <section className={styles.section} id="restaurants" data-nav-theme="light">
      <div className={styles.body}>
        <div className={styles.left}>
          <div className={styles.titleRow}>
            <AnimatePresence mode="wait">
              <motion.h2
                key={item.name}
                className={styles.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {item.name}
              </motion.h2>
            </AnimatePresence>
            <span className={styles.tag}>{item.tag}</span>
          </div>

          <div className={styles.bigImage}>
            <AnimatePresence mode="wait">
              <motion.div
                key={item.name}
                className={styles.bigImageLayer}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Placeholder ratio="auto" label={item.name} />
              </motion.div>
            </AnimatePresence>

            <div className={styles.overlay}>
              <div className={styles.ovHead}>
                <span className={styles.ovName}>{item.name}</span>
                <span className={styles.ovLoc}>{item.location}</span>
              </div>
              <span className={styles.ovLine} />
              <div className={styles.ovRow}>
                <button type="button" className={styles.ovMenu}>
                  Menu
                </button>
                <div className={styles.ovActions}>
                  <a href="#contact-us" className={styles.btnGhost}>
                    Book a Table
                  </a>
                  <a href="#about-us" className={styles.btnSolid}>
                    Learn More
                  </a>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={item.name}
              className={styles.text}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {item.paras.map((para, i) => (
                <p key={i} className={styles.textCol}>
                  {para}
                </p>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={styles.scroller} ref={scrollerRef} data-lenis-prevent>
          <div className={styles.scrollerInner}>
            {Array.from({ length: REPEAT }).flatMap((_, copy) =>
              ITEMS.map((it, i) => {
                const ri = copy * ITEMS.length + i;
                return (
                  <button
                    key={ri}
                    ref={(el) => {
                      cardRefs.current[ri] = el;
                    }}
                    className={`${styles.card} ${activeRendered === ri ? styles.cardActive : ""}`}
                    onClick={() => select(ri)}
                  >
                    <Placeholder ratio="4 / 3" label={it.name} />
                    <div className={styles.cardMeta}>
                      <span className={styles.cardName}>{it.name}</span>
                      <span className={styles.cardTag}>{it.tag}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
