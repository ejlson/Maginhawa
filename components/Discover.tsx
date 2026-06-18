"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import styles from "./Discover.module.css";
import Placeholder from "./Placeholder";

const ITEMS = [
  {
    name: "Bintang",
    tag: "Filipino Fusion Restaurant",
    location: "93 Kentish Town Rd, London NW1",
    image: "/images/bintang.jpg",
    paras: [
      "Originally opened by Chef Omar's parents, Bintang is a renowned Filipino fusion restaurant located at 93 Kentish Town Road, London NW1 8NY.",
      "Established in 1987, it has been a staple in the Camden Town dining scene, offering a blend of Malaysian, Indonesian, Japanese, Vietnamese, and Filipino cuisines.",
    ],
  },
  {
    name: "Belly",
    tag: "Modern Filipino Bistro",
    location: "Camden, London",
    image: "/images/belly.jpg",
    paras: [
      "Belly is a modern Filipino bistro pulling from Chef Omars rich background from the Philippines and with cooking techniques from France and Japan.",
      "A perfect blend of cultures all in one place going right to the Belly (.)",
    ],
  },
  {
    name: "Mamasons",
    tag: "London's First Filipino Ice Cream Parlor",
    location: "Camden · Soho · Shoreditch, London",
    image: null,
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
    image: "/images/cafemama.jpg",
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
    image: "/images/guanabana.jpg",
    paras: [
      "A vibrat, halal-certified Caribbean and Latin American restaurant located at 85 Kentish Town Road in Camden, London NW1 8NY.",
      "Established in 2007, it was among the first in the city to blends Latin-Caribbean flavours, Guanabana is renowned for its 'Island Roast', a Caribbean twist on the traditional Sunday roast, featuring oak-smoked jerk chicken or grilled beef, accompanied by sides like sweet plantains, roasted potatoes, and spicy jerk gravy.",
    ],
  },
  {
    name: "Ramo Ramen",
    tag: "Filipino-Japanese Fusion Restaurant",
    location: "Kentish Town · Soho, London",
    image: "/images/ramo.jpg",
    paras: [
      "The world's first Filipino-Japaense ramen joint. First opened in Kentish Town, London, in 2018, offering a unique blend of traditional Japaense ramen with Filipino culinary influences.",
      "In 2021, Ramo Ramen expanded to a second location in Soho, London, further solidifying its presence in the city's vibrant food scene.",
    ],
  },
  {
    name: "Hoodwood",
    tag: "Caribbean Takeaway",
    location: "London",
    image: "/images/hoowood.jpg",
    paras: [
      "Hoodwood is your go-to neighborhood Caribbean takeaway, serving up bold, smoky flavors with a true taste of the islands. We specialize in oak-smoked chicken plates, slow-cooked over an open flame for a deep, rich, and aromatic flavor.",
      "Our menu also features handmade Caribbean patties, packed with flavorful fillings and wrapped in a perfectly golden, flaky crust. Whether you're after a quick bite or a hearty meal, Hoodwood is all about honest, fire-kissed cooking that brings people together.",
    ],
  },
];

export default function Discover() {
  const [active, setActive] = useState(0);
  const [base, setBase] = useState(0); // last fully-revealed image (sits behind)
  const [seq, setSeq] = useState(0); // bumps each switch so the mask re-wipes
  const item = ITEMS[active];

  // the list drifts down with scroll: top-aligned to the image, ending with
  // its bottom level with the image's bottom
  const sectionRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const travel = useRef(0);

  useEffect(() => {
    const measure = () => {
      const ih = imgRef.current?.offsetHeight ?? 0;
      const lh = listRef.current?.offsetHeight ?? 0;
      travel.current = Math.max(0, ih - lh);
    };
    measure();
    const t = setTimeout(measure, 400);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const listY = useTransform(scrollYProgress, (v) => v * travel.current);
  // the photo drifts within its fixed frame as the page scrolls
  const imgY = useTransform(scrollYProgress, [0, 1], [-30, 30]);

  const select = (i: number) => {
    if (i === active) return;
    setActive(i);
    setSeq((s) => s + 1);
  };

  // a full "card" — image + its title/tag/line/buttons — so they reveal
  // together under the sliding mask
  const renderCard = (it: (typeof ITEMS)[number]) => (
    <>
      {it.image ? (
        <motion.img
          className={styles.img}
          src={it.image}
          alt={it.name}
          style={{ y: imgY, scale: 1.16 }}
        />
      ) : (
        <Placeholder ratio="auto" label={it.name} />
      )}
      <div className={styles.overlay}>
        <div className={styles.ovHead}>
          <span className={styles.ovTitle}>{it.name}</span>
          <span className={styles.ovTag}>{it.tag}</span>
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
    </>
  );

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="restaurants"
      data-nav-theme="light"
    >
      <div className={styles.body}>
        <div className={styles.left}>
          <div ref={imgRef} className={styles.bigImage}>
            {/* previous card sits behind while the new one wipes over it */}
            <div className={`${styles.bigImageLayer} ${styles.baseLayer}`}>
              {renderCard(ITEMS[base])}
            </div>
            {/* current card (image + title/tag) revealed by a sliding mask */}
            <motion.div
              key={seq}
              className={`${styles.bigImageLayer} ${styles.topLayer}`}
              initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
              animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
              transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
              onAnimationComplete={() => setBase(active)}
            >
              {renderCard(item)}
            </motion.div>
          </div>

          <motion.div
            key={item.name}
            className={styles.text}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {item.paras.map((para, i) => (
              <p key={i} className={styles.textCol}>
                {para}
              </p>
            ))}
          </motion.div>
        </div>

        <motion.nav
          ref={listRef}
          style={{ y: listY }}
          className={styles.list}
          aria-label="Our restaurants"
        >
          {ITEMS.map((it, i) => (
            <button
              key={it.name}
              type="button"
              className={`${styles.listItem} ${active === i ? styles.listActive : ""}`}
              onMouseEnter={() => select(i)}
              onFocus={() => select(i)}
              onClick={() => select(i)}
              aria-current={active === i}
            >
              <span className={styles.listName}>{it.name}</span>
              <span className={styles.listMark} aria-hidden />
            </button>
          ))}
        </motion.nav>
      </div>
    </section>
  );
}
