/* PLASTER & CLARET — THE SPECIMEN SHEET.

   Every type system this lab owns, set on ONE ground, with the photography,
   the cards and the heroes stripped out. That removal is the point: on the
   full panels each variation is separated from the next by 1400px of hero and
   card, so comparing two of them means remembering one while scrolling to the
   other. Here they stack, and the only thing that changes between rows is
   which family sets the words.

   The colour tokens come from lab.module.css exactly as the full panels get
   them — same `data-palette` attribute, same five hexes, no second copy to
   drift. If a row here looks different from its panel on /lab/type, the
   difference is real rather than an artefact of the sheet.

   Throwaway. Delete with /lab/type. */

import { fontVars, TYPES, PLASTER_ORDER } from "../fonts";
import lab from "../lab.module.css";
import styles from "./sheet.module.css";

/* the index each row carries on /lab/type, so a choice made here can be
   spoken as a number there. Not derived — the full-panel list is ordered by
   when each was added and this sheet is ordered by construction, so the two
   sequences genuinely differ and mapping them by position would be wrong. */
const PANEL_INDEX: Record<string, string> = {
  bricolage: "04",
  archivo: "07",
  syne: "14",
  garamond: "09",
  petrona: "15",
  newsreader: "12",
  literata: "10",
  young: "11",
  zilla: "13",
};

export default function PlasterSpecimen() {
  return (
    <main className={`${lab.lab} ${styles.sheet} ${fontVars}`} data-palette="plaster">
      <header className={styles.head}>
        <span className={styles.word}>MAGINHAWA</span>
        <div>
          <h1 className={styles.title}>Plaster &amp; Claret</h1>
          <p className={styles.sub}>
            Nine type systems, one ground. <code>#f5e9e0</code> · <code>#4a1421</code> · <code>#2a5c4a</code> —
            ink 12.46:1, soft 7.25:1, accent 6.46:1 on every row. Sans first, then the serifs from gentlest to
            bluntest.
          </p>
        </div>
      </header>

      {PLASTER_ORDER.map((key) => {
        const t = TYPES[key];
        return (
          <section key={key} className={styles.row} data-type={key} data-sheet-row={key}>
            <div className={styles.meta}>
              <span className={styles.idx}>{PANEL_INDEX[key]}</span>
              <h2 className={styles.face}>{t.display}</h2>
              <p className={styles.pair}>with {t.text}</p>
              <p className={styles.note}>{t.note}</p>
            </div>

            <div className={styles.spec}>
              {/* the heading is the whole decision — it is the largest type on
                  the real page and the only place a display face is doing
                  work a reader will consciously notice */}
              <h3 className={styles.heading}>
                Our collection of <em>restaurants</em>
              </h3>
              <p className={styles.standfirst}>
                Explore our family of restaurants and stores, where tradition is served with a modern twist.
              </p>
              <p className={styles.para}>
                Maginhawa began in 1987 with one room, one family and a menu written the night before. The word is
                Tagalog for comfortable, and it is a promise about the room before it is a promise about the food.
              </p>
              <div className={styles.actions}>
                <button className={styles.primary}>Explore our restaurants</button>
                <button className={styles.secondary}>Book a table</button>
              </div>
            </div>
          </section>
        );
      })}
    </main>
  );
}
