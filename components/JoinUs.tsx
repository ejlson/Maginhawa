"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  animate,
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import Nav from "./Nav";
import Menu from "./Menu";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import Reveal from "./Reveal";
import SplitWords from "./SplitWords";
import styles from "./JoinUs.module.css";
import { JOBS } from "@/lib/jobs";

const PILLARS = [
  {
    mark: "01",
    title: "A family kitchen.",
    body: "Belly, Bintang, Mamasons, Ramo, Guanabana, Café Mama & Sons, Hoodwood — seven kitchens that train together, eat together, and lean on each other when service gets tight.",
  },
  {
    mark: "02",
    title: "Real growth.",
    body: "Chefs at Maginhawa rotate through stations, then through restaurants. Several of our heads of kitchen started as commis here. The path is intentional, and the door is open.",
  },
  {
    mark: "03",
    title: "Hospitality, fairly.",
    body: "Pooled service charge, paid trial shifts, real breaks. London restaurant pay isn't perfect, but we try to make this a place worth staying in.",
  },
];

/* ---- THE CAREERS HERO ----------------------------------------------------
   Two lines of type that a photograph prises apart.

   THE HEADLINE IS A FACT, NOT A CLAIM. Two previous lines were cut and both
   failed the same way: "A place worth staying in." and "Every job here has a
   next one." are aphorisms — sentences whose shape is the point, that could
   sit on any restaurant group's careers page, and that a cook reads past.
   The material in this repo is more interesting than any construction: the
   group pools service charge and pays for trial shifts (PILLARS 03); several
   of its heads of kitchen started as commis here (PILLARS 02); seven
   kitchens sit inside a few square miles of north London; the first one
   opened in 1987 (About.tsx). A number or a checkable fact beats an
   adjective, and beats a couplet twice over.

   FOUR WERE WRITTEN, all specific, none of them a claim:

     A. "Every trial shift here is paid."
        Straight out of PILLARS 03. It is the one sentence on this page a
        working London cook can immediately test against their own last six
        months, and for most of them the answer is "that is not normal" —
        which is what "slightly surprising" means. It is a plain declarative,
        not an aphorism; it covers kitchen, floor and bar alike, because
        everyone trials; and it splits with a real caesura, the long setup
        above the photograph and the two-word payoff below it.
     B. "We have been hiring since 1987."
        The number. Bintang opened on Kentish Town Road in 1987 and the
        group grew out of it, so this is true and it is startling in an
        industry where three years is a long life. Rejected as second best
        only because it is a fact about the COMPANY's past rather than about
        the reader's next month — but it is the cleanest drop-in if "every"
        in A cannot be signed off.
     C. "Several of our head chefs started here as commis."
        The progression fact, hedged exactly as PILLARS 02 hedges it.
        Rejected twice: "several" is a limp word at 100px, and the sentence
        is kitchen-only — a Front of House Manager reading it learns nothing
        about their own ladder.
     D. "Right to work in the UK is the only thing we can't teach."
        Built on the one requirement that appears in all six specs in
        lib/jobs.ts. The most interesting of the four and the most
        dangerous: it promises training the group has not agreed to, it is
        fourteen words, and a Sous Chef reads "we can teach anything" as a
        remark about how much their experience is worth.

   THIS COPY IS UNAPPROVED AND BUILT TO BE SWAPPED. It lives in HERO_LINES
   and nothing below depends on it — the clock is derived from the word
   count, and the split geometry is measured off the rendered boxes, so a
   longer or shorter headline re-times AND re-measures itself. "Family" is
   deliberately absent; in hospitality recruitment the word has been worn
   down into a request for unpaid overtime. (It survives in reason 01's
   title further down, which is copy nobody has asked to change — flagged.)

   SHIPPED, AND IT IS THE USER'S OWN LINE: "Where craft finds its place."
   The four above are kept because they are the material this page has, and
   because the next person to be asked for a headline should not have to
   rediscover it. B is still the cleanest factual drop-in.

   THE LINE BREAK IS LOAD-BEARING, AND IT IS NOT A WRAP. The photograph opens
   between the two lines, so the break is a caesura the reader waits through.
   It is HAND-SET here rather than left to the browser, which is what makes
   the choreography safe at every width: the two lines are two elements, so
   the split always has exactly two things to separate and can never find
   itself opening a seam inside a single line that happened to fit. The
   failure mode that remains is the opposite one — a line WRAPPING to two
   rendered line boxes — and probe-join-head.mjs asserts against it at all
   four viewports.

   "Where craft" / "finds its place." is the break: the shorter half above,
   the resolution under the picture. */
const HERO_LINES = ["Where craft", "finds its place."];

/* THE STANDFIRST. 178 characters, where the line inside the photograph used
   to be 41 — see `.heroStand` in the stylesheet for the measurement that
   moved it out of the picture. */
const HERO_STAND =
  "Every Maginhawa restaurant is shaped by the people behind it. Join a team where craft, creativity and care come together to create thoughtful hospitality.";

/* ---- THE THREE BEATS, ON ONE CLOCK ---------------------------------------

   1. The two lines build word by word on the manifesto's mask, sitting
      TOGETHER in the middle of the composition — the photograph between
      them is scaled to nothing, so what the reader sees is a centred
      couplet with a seam through it.
   2. The photograph grows out of that seam and pushes the lines apart to
      their resting seats.
   3. The remaining text arrives — the corner labels and the standfirst
      under the payoff line, the standfirst on the same word mask as the
      headline so the sequence closes in the voice it opened in.

   Beat 2 IS beat 1's geometry running backwards, which is the whole reason
   it reads as a split rather than as two things that happen to overlap:
   both lines' y and the photograph's scale are pure functions of ONE
   normalised progress (`split`), so they cannot drift by a frame however
   the spring is retuned. This is the lesson from the home page's "Our
   Restaurants" beat, and see SPLIT_AIR below for the harder half of it.

   The numbers are derived from HERO_LINES so the beats stay in order if the
   copy changes. */
const WORD_STAGGER = 0.06;
const WORD_DURATION = 0.75;
const HEAD_DELAY = 0.12;
const HERO_WORDS = HERO_LINES.join(" ").split(/\s+/).length;
// the last word starts at HEAD_DELAY + (n-1) * stagger and takes
// WORD_DURATION; the split begins a beat BEFORE it has fully settled, so the
// two motions overlap rather than queue — a strict hand-off reads as a pause
const SPLIT_AT = HEAD_DELAY + (HERO_WORDS - 1) * WORD_STAGGER + WORD_DURATION * 0.55;
/* Critically damped, and slow. Apple's guidance is `bounce: 0` for anything
   that is not carrying a gesture's momentum: nothing here was thrown, so
   overshoot on a 230px push would read as the photograph bouncing off the
   type. 1.5s is the "slow, smooth, controlled" the brief asked for — long
   enough that the eye follows the parting rather than being shown a result. */
const SPLIT_SPRING = { type: "spring" as const, duration: 1.5, bounce: 0 };
const SPLIT_MS = 1500;
const CAPTION_AT = SPLIT_AT + (SPLIT_MS / 1000) * 0.72;

/* ---- THE PULL ------------------------------------------------------------
   The photograph's size IS the split's progress, so the lines read as
   prising it open rather than as clearing out of its way.

   AND IT HAS TO STAY IN THE HOLE. Those are two separate facts and only the
   first is about size. A ratio invariant — "the picture is never more than
   70% of the gap" — cannot see POSITION at all, and position is where this
   goes wrong: the seam between two lines is only at the photograph's resting
   centre if the two lines are the same height and the two margins are the
   same, and neither is guaranteed by anything. So the picture rides the
   GAP'S OWN CENTRE (`pullFrom`, measured) and its scale is clamped by a hard
   CEILING equal to the clearance the lines have actually opened. Overlap is
   then impossible by construction rather than by tuning.

   SPLIT_SEED  the size it is born at. Almost irrelevant in practice: the
               ceiling is tighter than the curve for the first third of the
               beat, which is exactly the stretch where the picture should be
               filling the seam rather than growing on its own clock.
   SPLIT_BIAS  the exponent the progress is raised to before it becomes size.
               A hair over 1, so the picture tracks the gap closely through
               the spring's fast opening and then eases into its resting size
               inside the space the lines have finished making. A monotonic
               reparametrisation of the SAME progress — both still land on
               the same frame.
   SPLIT_DAWN
   SPLIT_LIT   the slice of progress the picture fades up over.
   SPLIT_AIR   the air the ceiling keeps above and below. Measured against
               the WORD MASKS, not the line boxes: SplitWords pads its clip
               window out by 0.14em top and bottom precisely because these
               display line-heights are below 1 and the glyphs overflow the
               line box — so the line box is 28px optimistic at 100px type
               and the mask box is the real ink boundary. */
const SPLIT_SEED = 0.06;
const SPLIT_BIAS = 1.15;
const SPLIT_DAWN = 0.04;
const SPLIT_LIT = 0.28;
const SPLIT_AIR = 4;

function HeroLabel({ children }: { children: React.ReactNode }) {
  return <span className={styles.heroLabel}>{children}</span>;
}

/* ---- THE COUNTRY CODE ----------------------------------------------------
   A shortlist, not a world list. These are the UK, Ireland, the countries
   the group's own kitchens draw from, and the largest sources of hospitality
   workers in London — enough that almost nobody has to reach for "other",
   and short enough to stay a native <select>, which is the whole point: a
   native select is keyboard-operable, typeahead-searchable and screen-reader
   correct for free, where a searchable combobox is a dependency, a listbox
   role, a focus trap and about 200 lines of ARIA for one optional field.

   The option text leads with the DIAL CODE because that is the string a
   person types into a select to jump to it, and a native select's closed
   state can only show the option's own text — so "+44 (GB)" gives a compact
   control and working typeahead, where "United Kingdom (+44)" would give a
   wide control and typeahead that only matches on country name. If this list
   ever needs to be the full 240, it belongs in lib/ and it needs a combobox. */
const DIAL_CODES = [
  ["+44", "GB"], ["+353", "IE"], ["+63", "PH"], ["+34", "ES"],
  ["+39", "IT"], ["+33", "FR"], ["+49", "DE"], ["+351", "PT"],
  ["+48", "PL"], ["+40", "RO"], ["+30", "GR"], ["+31", "NL"],
  ["+32", "BE"], ["+36", "HU"], ["+359", "BG"], ["+370", "LT"],
  ["+371", "LV"], ["+420", "CZ"], ["+421", "SK"], ["+385", "HR"],
  ["+90", "TR"], ["+55", "BR"], ["+91", "IN"], ["+92", "PK"],
  ["+880", "BD"], ["+234", "NG"], ["+27", "ZA"], ["+61", "AU"],
  ["+64", "NZ"], ["+1", "US/CA"], ["+852", "HK"], ["+81", "JP"],
  ["+60", "MY"], ["+62", "ID"], ["+66", "TH"], ["+84", "VN"],
] as const;

/* ---- THE COUNTER --------------------------------------------------------
   The loading screen's split-flap board, one cell wide. Same mechanism as
   Loader.tsx's FlipLetter — a fixed-width cell that cycles its whole
   character set on a jittered ~46ms timer and stops the next time it reaches
   its target, and a rotateX(-78deg) → 0 flap on each change with the same
   0.16s [0.2, 0.7, 0.3, 1] curve. The board is over DIGITS here rather than
   the alphabet, and it is started by the heading entering view rather than by
   assets finishing.

   Copied rather than imported because FlipLetter is private to Loader.tsx and
   this file does not own that module.

   The timer is NOT a per-frame path: it fires ~20×/s for under a second and
   then never again. Driving it from rAF instead would cost a state write on
   every frame of the page's life for a character that changes twenty times. */
const DIGITS = "0123456789".split("");
const FLIP_TICK = 46; // Loader's base ms per step
const SCRAMBLE_MS = 900; // ~two passes of the board before it may lock

function FlipDigit({
  final,
  settle,
  startDelay = 0,
  reduce = false,
}: {
  final: string;
  settle: boolean;
  startDelay?: number;
  reduce?: boolean;
}) {
  const targetIdx = Math.max(0, DIGITS.indexOf(final));
  const [idx, setIdx] = useState(reduce ? targetIdx : 0);
  const settleRef = useRef(settle);
  settleRef.current = settle;

  useEffect(() => {
    if (reduce) {
      setIdx(targetIdx);
      return;
    }
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    // each flap runs at its own pace so a two-digit count desyncs and lands
    // one cell at a time, like a real split-flap board
    const baseTick = FLIP_TICK * (0.78 + Math.random() * 0.7);
    const begin = startDelay + Math.random() * 120;

    const step = () => {
      i = (i + 1) % 10;
      if (settleRef.current && i === targetIdx) {
        setIdx(targetIdx); // reached its digit -> stop
        return;
      }
      setIdx(i);
      timer = setTimeout(step, baseTick * (0.82 + Math.random() * 0.4));
    };

    const start = setTimeout(step, begin);
    return () => {
      clearTimeout(start);
      clearTimeout(timer);
    };
  }, [reduce, targetIdx, startDelay]);

  const ch = DIGITS[idx];
  return (
    <span className={styles.flip}>
      <motion.span
        key={ch}
        className={styles.flipInner}
        initial={{
          transform: reduce ? "rotateX(0deg)" : "rotateX(-78deg)",
          opacity: reduce ? 1 : 0.4,
        }}
        animate={{ transform: "rotateX(0deg)", opacity: 1 }}
        transition={{ duration: 0.16, ease: [0.2, 0.7, 0.3, 1] }}
      >
        {ch}
      </motion.span>
    </span>
  );
}

/**
 * The numeral in "N positions across the group." — and only the numeral. The
 * heading around it is plain text on the page's ordinary Reveal, because a
 * whole line of flapping serif reads as a gimmick where one flapping digit
 * reads as a departures board counting the openings.
 *
 * Derived from `value` end to end, so it is correct at any JOBS.length: 12
 * mounts two cells and each locks on its own digit.
 */
function PositionCount({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion() ?? false;
  // the heading is below the fold on every viewport, so the board should be
  // waiting when the reader arrives rather than have already finished
  const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const [settle, setSettle] = useState(false);

  useEffect(() => {
    if (!inView || reduce) return;
    const t = setTimeout(() => setSettle(true), SCRAMBLE_MS);
    return () => clearTimeout(t);
  }, [inView, reduce]);

  const digits = String(value).split("");
  return (
    /* `role="img"` + `aria-label`, NOT a visually-hidden number beside an
       aria-hidden board. That pairing was the first attempt and it puts the
       count in the DOM twice: assistive tech reads it once (the board is
       hidden from the tree) but selecting the heading copies "6 6 positions
       across the group.". One text node, named as a whole, is correct for
       both — AT announces the label, and a selection picks up the digits
       that are actually on screen. */
    <span
      ref={ref}
      className={styles.count}
      role="img"
      aria-label={String(value)}
    >
      {digits.map((d, i) => (
        <FlipDigit
          key={i}
          final={d}
          settle={settle}
          startDelay={i * 55}
          reduce={reduce || !inView}
        />
      ))}
    </span>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6l5 5 5-5" />
    </svg>
  );
}

function SubmitArrow() {
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

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** The union of a line's word-mask boxes — the real ink boundary. See
 *  SPLIT_AIR: SplitWords pads its clip window past the line box, so the line
 *  box is the wrong rectangle to keep a photograph out of. */
function inkBox(el: HTMLElement | null) {
  if (!el) return null;
  const masks = el.querySelectorAll<HTMLElement>('[class*="mask"]');
  if (!masks.length) {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  }
  let top = Infinity;
  let bottom = -Infinity;
  masks.forEach((m) => {
    const r = m.getBoundingClientRect();
    if (r.top < top) top = r.top;
    if (r.bottom > bottom) bottom = r.bottom;
  });
  return { top, bottom };
}

export default function JoinUs() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [position, setPosition] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  // name of the CV the applicant picked — referenced in the email body
  const [cvName, setCvName] = useState<string>("");
  const formRef = useRef<HTMLDivElement>(null);
  /* THE BAND IS THE FRAME'S UNTRANSFORMED SHADOW. It holds the aspect ratio
     and the space in the flow; the frame inside it is what scales. Two
     elements rather than one because `useScroll` measures a box, and
     measuring a box that is scaling from nothing to full size during the
     entrance would map the parallax against a rectangle that does not exist
     yet. The band never moves, so the scroll mapping is the one the settled
     hero has. */
  const bandRef = useRef<HTMLDivElement>(null);
  const lineTopRef = useRef<HTMLSpanElement>(null);
  const lineBotRef = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion() ?? false;

  /* THE PARALLAX INSIDE THE FRAME. The photograph is 112% of its window and
     drifts ±4.6% of that as the frame crosses the screen, so the picture has
     a little depth behind its own edges rather than being a flat plate that
     scrolls with the page. Deliberately SMALL: this is a header, and a hero
     image that visibly slides is the kind of motion that makes a page feel
     busy on the second visit.

     One scroll subscription writing one transform, on the compositor. The
     band is not pinned, adds no document height, and nothing calls
     `lenis.stop()`. */
  const { scrollYProgress } = useScroll({
    target: bandRef,
    offset: ["start end", "end start"],
  });
  /* Reduced motion gets a MotionValue that never moves, rather than a branch
     at every read site — and it is parked at 0.5, the MIDDLE of the drift,
     not at 0. At 0 the photograph sits at one end of its travel, which is a
     different crop of the picture from the one a moving hero ever rests at:
     quieting the motion would have silently re-framed the image by 27px.
     0.5 is the neutral framing the parallax swings either side of. Caught by
     probe-join-reduced.mjs, which compares the two compositions rather than
     trusting that "no animation" means "same picture". */
  const still = useMotionValue(0.5);
  const panY = useTransform(
    reduce ? still : scrollYProgress,
    [0, 1],
    ["-4.6%", "4.6%"],
  );

  /* ---- THE SPLIT ---------------------------------------------------------
     ONE progress, and everything in the beat is a pure function of it: the
     top line's y, the bottom line's y, the photograph's y, its scale and its
     fade. Not five animations that were timed to agree — five readings of
     the same number, so they cannot come apart on any frame or at any
     refresh rate.

     Reduced motion gets a MotionValue parked at 1 — the settled composition —
     rather than a branch at every read site, and no timer is ever armed. */
  const split = useMotionValue(reduce ? 1 : 0);
  const [beat3, setBeat3] = useState(reduce);
  /* THE LAYERS ARE GIVEN BACK. The two lines and the frame carry
     `will-change: transform` for the length of the split — three promoted
     layers, two of them the full width of the page — and `will-change` is a
     promise about the NEXT few hundred milliseconds, not a property. Left
     on, they are three compositor textures held for the whole life of the
     page for a beat that lasts 1.5 seconds. Same reasoning as SplitWords'
     own `.wordRested`. */
  const [settled, setSettled] = useState(reduce);

  /* The measured geometry of the resting composition. Null until it has
     genuinely been measured, which is how the ceiling knows not to clamp a
     photograph it has no geometry for.

       d1/d2     how far each line sits from the seam at p = 0 — i.e. how far
                 it travels. Measured per line rather than assumed equal:
                 the two lines have different word counts and either can wrap.
       gapRest   the clearance between the two ink boxes when settled.
       frameH    the photograph's resting height.
       pullFrom  the offset between the seam's centre at p = 0 and the
                 photograph's resting centre. Zero when the composition is
                 symmetric, which it is by construction — and measured
                 anyway, because "by construction" is a property of today's
                 stylesheet and this is the exact assumption whose failure
                 put a plate through a letterform on the home page. */
  const [geom, setGeom] = useState<{
    d1: number;
    d2: number;
    gapRest: number;
    frameH: number;
    pullFrom: number;
  } | null>(null);

  // kept in a ref so the resize handler below can read the last measurement
  // without re-subscribing every time it takes a new one
  const geomRef = useRef(geom);
  geomRef.current = geom;
  // …and the measure function itself, so the clock can take a fresh reading
  // on the frame the beat starts rather than trusting one from mount
  const measureRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const measure = () => {
      const band = bandRef.current;
      const a = inkBox(lineTopRef.current);
      const b = inkBox(lineBotRef.current);
      if (!band || !a || !b) return;
      const f = band.getBoundingClientRect();
      /* THE LINES MAY ALREADY BE DISPLACED when this runs (a resize
         mid-beat), so their applied y is subtracted back out and the
         measurement is of the RESTING composition either way. The band is
         never transformed, so it needs no such correction — which is the
         other half of why it exists. */
      const p = clamp01(split.get());
      const g = geomRef.current;
      const aBottom = a.bottom - (g ? g.d1 * (1 - p) : 0);
      const bTop = b.top + (g ? g.d2 * (1 - p) : 0);
      const fc = (f.top + f.bottom) / 2;
      const d1 = fc - aBottom;
      const d2 = bTop - fc;
      setGeom({
        d1,
        d2,
        gapRest: bTop - aBottom,
        frameH: f.height,
        // the seam's centre at p = 0, relative to the photograph's own centre
        pullFrom: (aBottom + bTop) / 2 - fc + (d1 - d2) / 2,
      });
    };
    measureRef.current = measure;
    measure();
    // the ink boxes are font metrics; measure again once the faces are real
    document.fonts?.ready.then(measure).catch(() => {});

    /* AND AGAIN WHENEVER ANY OF THE THREE BOXES ACTUALLY CHANGES. This is
       not belt-and-braces — it is the fix for a measured failure. The first
       version measured on mount, on fonts.ready and on `resize`, and
       probe-join-split.mjs reported a +212px intrusion at 1440, +289 at 1920
       and +116 at 390: at the worst frame the photograph was at FULL size
       while the two ink boxes overlapped by up to 14px. That is the exact
       signature of stale geometry — `d1 + d2` is the resting gap by
       construction, so the seam can only close past zero if the layout the
       d's were measured against is not the layout on screen. Something
       between mount and the beat (the loader clearing, the labels' row
       settling, a late reflow) moved the boxes, and `resize` never fires for
       any of it.

       A ResizeObserver on the three boxes fires for all of them, and the
       measurement corrects for whatever displacement is already applied, so
       re-measuring mid-beat is safe. */
    const ro = new ResizeObserver(() => measure());
    [bandRef.current, lineTopRef.current, lineBotRef.current].forEach(
      (el) => el && ro.observe(el),
    );
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* THE CLOCK. One timer for the split, one for the furniture, and both are
     cleared on unmount so a route change mid-beat cannot leave a spring
     running against a value nothing is watching. Nothing is armed under
     reduced motion. */
  useEffect(() => {
    if (reduce) return;
    let anim: { stop: () => void } | null = null;
    const t1 = setTimeout(() => {
      // one last reading on the frame the beat starts: whatever the page did
      // between mount and here, the geometry the split runs on is the
      // geometry that is on screen
      measureRef.current?.();
      anim = animate(split, 1, SPLIT_SPRING);
    }, SPLIT_AT * 1000);
    const t2 = setTimeout(() => setBeat3(true), CAPTION_AT * 1000);
    // a beat past the spring's own settle, so the class flip never lands on
    // a frame the compositor is still using the layer for
    const t3 = setTimeout(
      () => setSettled(true),
      SPLIT_AT * 1000 + SPLIT_MS + 400,
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      anim?.stop();
    };
  }, [reduce, split]);

  /* The two lines. `d * (1 - p)`: at p = 0 they sit against the seam, at
     p = 1 they are exactly where the stylesheet put them — so the resting
     layout is the layout, and the entrance is a displacement of it rather
     than a second set of positions to keep in sync. */
  const yTop = useTransform(split, (p) => (geom ? geom.d1 * (1 - clamp01(p)) : 0));
  const yBot = useTransform(split, (p) => (geom ? -geom.d2 * (1 - clamp01(p)) : 0));

  /* The photograph. Two transforms off the same progress:

     y      it rides the SEAM'S OWN CENTRE and eases onto its resting centre
            as the split completes. Both ends are exact — `pullFrom` is the
            measured offset at p = 0 and the term is zero at p = 1 — and the
            seam's centre is linear in p by construction, so the two agree at
            every frame in between rather than approximately.
     scale  the growth curve, under a hard CEILING of the clearance the lines
            have actually opened, less its air. Centred on that same
            clearance, a photograph at or under this ceiling literally cannot
            reach either line. The guarantee is geometric, not a tuning —
            which is the point, because a contact sheet cannot catch a
            one-frame intrusion and this is measured per frame in
            scripts/probe-join-split.mjs. */
  const frameY = useTransform(split, (p) =>
    geom ? geom.pullFrom * (1 - clamp01(p)) : 0,
  );
  const frameScale = useTransform(split, (p) => {
    const q = clamp01(p);
    const want = SPLIT_SEED + (1 - SPLIT_SEED) * Math.pow(q, SPLIT_BIAS);
    if (!geom || !geom.frameH) return want;
    const room =
      (geom.gapRest - (geom.d1 + geom.d2) * (1 - q) - SPLIT_AIR * 2) /
      geom.frameH;
    return Math.min(want, Math.max(0, room));
  });
  const frameFade = useTransform(split, (p) =>
    clamp01((clamp01(p) - SPLIT_DAWN) / (SPLIT_LIT - SPLIT_DAWN)),
  );

  // release any dark backdrop another route may have set
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

  // click "Apply" on a role → pre-fill the position field + scroll to form
  const applyFor = (jobTitle: string, restaurant: string) => {
    const label = `${jobTitle} — ${restaurant}`;
    setPosition(label);
    setSubmitted(false);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = [data.get("first"), data.get("last")]
      .map((v) => (v || "").toString().trim())
      .filter(Boolean)
      .join(" ");
    const email = (data.get("email") || "").toString().trim();
    const phone = (data.get("phone") || "").toString().trim();
    // the dial code only means anything alongside a number
    const dial = (data.get("phoneCountry") || "").toString().trim();
    // "Other" matches the dropdown's own catch-all option, so the subject
    // line reads the same whether the reader picked it or left the field alone
    const pos = (data.get("position") || position || "Other").toString().trim();
    const msg = (data.get("message") || "").toString().trim();

    const subject = `Application — ${pos} — ${name}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${dial ? `${dial} ` : ""}${phone}` : "",
      `Position: ${pos}`,
      // mailto drafts can't carry attachments, so the selected CV is
      // named in the body and the user attaches it before sending
      cvName ? `CV: ${cvName} (attached)` : "",
      "",
      "Message:",
      msg,
    ]
      .filter(Boolean)
      .join("\n");

    const mailto = `mailto:hr@mgnhw.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    // open user's email client with a pre-filled message
    window.location.href = mailto;
    setSubmitted(true);
  };

  return (
    <>
      <Nav
        started
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className={styles.page} data-nav-theme="light">

        {/* ---- careers hero — a sentence with a photograph inside it ----
             THE COMPOSITION IS A FLEX COLUMN AND THE <h1> IS `display:
             contents`, so its two lines become siblings of the photograph's
             band and `order` can put the band between them. The alternative
             — nesting the band inside the <h1> — is invalid (a heading takes
             phrasing content) and, worse, folds the photograph's alt text and
             the caption into the heading's accessible name. This way the
             heading is read as one sentence, "Every trial shift here is
             paid.", in DOM order, and the picture is a separate object; only
             the PAINT order is rearranged, which is exactly what `order` is
             for. ---- */}
        <section className={styles.section} data-nav-theme="light">
          <header className={styles.hero}>
            {/* THE CORNER LABELS carry the page's furniture in the site's
                caps voice (the nav, Blog's counter, PressWall's signpost).
                "Careers" is one of them: it is a nav item, and a nav item at
                7rem is a label pretending to be a headline. The right label
                is DERIVED — a count that could go stale is worse than no
                count. They arrive with the caption, in beat 3: at the top of
                the sequence the composition is two lines of type in the
                middle of an empty frame and nothing else. */}
            <motion.div
              className={styles.heroLabels}
              initial={{ opacity: reduce ? 1 : 0 }}
              animate={{ opacity: beat3 ? 1 : 0 }}
              transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
            >
              <HeroLabel>Careers</HeroLabel>
              <HeroLabel>
                {JOBS.length} open roles — London
              </HeroLabel>
            </motion.div>

            <div className={styles.heroSplit}>
              {/* one SplitWords per line rather than one for the whole
                  headline: the component splits on spaces and has no notion
                  of a line break, and a <br/> inside it would land in the
                  middle of a word mask. Line two's delay is line one's word
                  count, so the stagger runs unbroken across the two — and it
                  has to, because at this point in the beat the two lines are
                  sitting against each other as a single block of type. */}
              <h1 className={styles.heroTitle}>
                <motion.span
                  className={`${styles.heroLineTop} ${settled ? styles.heroRested : ""}`}
                  ref={lineTopRef}
                  style={{ y: yTop }}
                >
                  <SplitWords
                    as="span"
                    text={HERO_LINES[0]}
                    delay={HEAD_DELAY}
                    stagger={WORD_STAGGER}
                    duration={WORD_DURATION}
                    amount={0.2}
                  />
                </motion.span>
                <motion.span
                  className={`${styles.heroLineBot} ${settled ? styles.heroRested : ""}`}
                  ref={lineBotRef}
                  style={{ y: yBot }}
                >
                  <SplitWords
                    as="span"
                    text={HERO_LINES[1]}
                    delay={
                      HEAD_DELAY +
                      HERO_LINES[0].split(/\s+/).filter(Boolean).length *
                        WORD_STAGGER
                    }
                    stagger={WORD_STAGGER}
                    duration={WORD_DURATION}
                    amount={0.2}
                  />
                </motion.span>
              </h1>

              <div className={styles.heroBand} ref={bandRef}>
                <motion.div
                  className={`${styles.heroFrame} ${settled ? styles.heroRested : ""}`}
                  style={{ y: frameY, scale: frameScale, opacity: frameFade }}
                >
                  <motion.div className={styles.heroPan} style={{ y: panY }}>
                    <Image
                      className={styles.heroImg}
                      src="/images/careers-hero.jpg"
                      alt="A chef plating clams and seafood at the pass in a Maginhawa kitchen"
                      width={1920}
                      height={1080}
                      /* The band is the container's full width, i.e.
                         100vw minus twice --grid-margin, and --grid-margin is
                         clamp(16px, 2.8vw, 40px) — so the breakpoints here
                         are the clamp's own corners (570px and 1428px), not
                         invented ones. Plain "100vw" over-asks by up to 5.6%
                         at every width, which on a single 1920-wide hero is
                         the difference between candidates. The frame's
                         entrance scale never exceeds 1, so the rendered
                         width never exceeds the band's and `sizes` still
                         describes the largest box the image is drawn at. */
                      sizes="(max-width: 570px) calc(100vw - 32px), (max-width: 1428px) 94.4vw, calc(100vw - 80px)"
                      priority
                    />
                  </motion.div>
                  {/* the caption's ground */}
                  <div className={styles.heroScrim} aria-hidden />

                </motion.div>
              </div>

              {/* BEAT 3, on the same word mask as the headline —
                  clock-driven rather than whileInView, because it belongs to
                  a sequence rather than to a scroll position. It sits UNDER
                  the payoff line rather than inside the photograph; the
                  measurement that moved it is in `.heroStand`. */}
              <SplitWords
                as="p"
                className={styles.heroStand}
                text={HERO_STAND}
                on={beat3}
                delay={0}
                stagger={0.012}
                duration={0.6}
              />
            </div>
          </header>
        </section>

        <div className="container">
          {/* ---- Open roles ---- */}
          <section className={styles.roles} id="open-roles">
            <div className={styles.rolesHead}>
              <div>
                <Reveal>
                  <h2 className={styles.sectionTitle}>
                    <PositionCount value={JOBS.length} /> positions across the
                    group.
                  </h2>
                </Reveal>
              </div>
              {/* Sentence case, left-aligned, no brackets, one line — the
                  same rewrite /contact's equivalent got after it measured
                  3.44:1 against the 4.5:1 body minimum. Bracketed
                  right-aligned caps at 40% opacity is the least readable
                  type a page can carry, and this one is an INSTRUCTION: it
                  is the only thing telling the reader the rows open. */}
              <Reveal delay={0.1}>
                <p className={styles.rolesAside}>
                  Click any role to read the details
                </p>
              </Reveal>
            </div>

            <ul className={styles.roleList}>
              {JOBS.map((job, i) => {
                const isOpen = openIdx === i;
                return (
                  /* `i * 0.045`, not `(i % 4) * 0.05`: the modulo restarted
                     the stagger at row 4, so rows 0/4 and 1/5 began on the
                     SAME frame — and now that the rows are table-tight,
                     four of the six cross the viewport threshold together
                     rather than spread down the screen. */
                  <Reveal key={job.id} as="li" delay={i * 0.045}>
                    <div className={styles.roleItem}>
                      <button
                        type="button"
                        className={styles.roleRow}
                        onClick={() => setOpenIdx(isOpen ? null : i)}
                        aria-expanded={isOpen}
                        aria-controls={`role-detail-${i}`}
                      >
                        <span className={styles.roleTitle}>{job.title}</span>
                        <span className={styles.roleMeta}>
                          {job.restaurantName} · {job.location}
                        </span>
                        <span className={styles.roleType}>
                          {job.type} · {job.area}
                        </span>
                        <span
                          className={`${styles.roleChev} ${isOpen ? styles.roleChevOpen : ""}`}
                          aria-hidden
                        >
                          <Chevron />
                        </span>
                      </button>

                      <motion.div
                        id={`role-detail-${i}`}
                        initial={false}
                        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className={styles.roleDetail}>
                          <p className={styles.roleDetailLead}>{job.summary}</p>
                          <div>
                            <p className={styles.roleDetailHead}>You&apos;ll</p>
                            <ul className={styles.roleDetailList}>
                              {job.responsibilities.map((r) => (
                                <li key={r} className={styles.roleDetailItem}>
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className={styles.roleDetailHead}>We hope</p>
                            <ul className={styles.roleDetailList}>
                              {job.requirements.map((r) => (
                                <li key={r} className={styles.roleDetailItem}>
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className={styles.roleApply}>
                            <button
                              type="button"
                              className={styles.roleApplyBtn}
                              onClick={() => applyFor(job.title, job.restaurantName)}
                            >
                              Apply for this role <span aria-hidden>↓</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </Reveal>
                );
              })}
            </ul>
          </section>

          {/* ---- Application ----
               THE ARGUMENT, THEN THE DOOR, THEN THE ASK. The reasoning for
               this shape is in JoinUs.module.css above `.reasons`; in short,
               the three reasons finish the roles index instead of sitting
               beside the form, a single rule is the threshold, and the form
               itself is one narrow centred column with nothing next to it.
               ---- */}
          <section className={styles.form} ref={formRef} id="apply">
            {/* PILLARS, at full measure, as the LEAD-OUT of the roles index.
                It used to be a stacked rail beside the fields — a hundred
                words of argument aimed at someone who has already decided to
                apply. Three columns of ~30 words is also the shape this copy
                was written in. */}
            <ul className={styles.reasons}>
              {PILLARS.map((pl, i) => (
                <Reveal as="li" key={pl.mark} className={styles.reason} delay={i * 0.07}>
                  <span className={styles.reasonMark}>{pl.mark}</span>
                  <h3 className={styles.reasonTitle}>{pl.title}</h3>
                  <p className={styles.reasonBody}>{pl.body}</p>
                </Reveal>
              ))}
            </ul>

            {/* the threshold. One hairline across the full measure, and the
                page narrows to under half of it on the other side. */}
            <hr className={styles.threshold} />

            <div className={styles.formShell}>
              <Reveal className={styles.formHead}>
                <h2 className={`${styles.sectionTitle} ${styles.formTitle}`}>
                  Send us your application.
                </h2>
                <p className={styles.formAside}>
                  Pick a role, or apply generally.
                </p>
              </Reveal>

              <Reveal className={styles.formBody} delay={0.08}>
                {/* SINGLE COLUMN, and deliberately. A two-column form makes
                    the eye choose a path at every row; one column has one
                    path and measures faster to complete. It is also the only
                    layout that survives the narrow measure this section is
                    built on. */}
                <form className={styles.formInner} onSubmit={onSubmit}>
                  <div className={styles.field}>
                    <label htmlFor="apply-first">First name</label>
                    <input
                      id="apply-first"
                      name="first"
                      type="text"
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="apply-last">Last name</label>
                    <input
                      id="apply-last"
                      name="last"
                      type="text"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="apply-email">Email</label>
                    <input
                      id="apply-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="apply-phone">Phone (optional)</label>
                    {/* TWO CONTROLS, ONE FIELD. The hint that used to sit
                        here ("Include the area code.") was guidance standing
                        in for a control: it asked the applicant to encode a
                        country in a string and then hoped they did. A dial
                        code picker states the question instead of describing
                        it, and it is the one place on this form where the
                        answer is genuinely ambiguous — half of London
                        hospitality has a number that does not start 07.

                        They read as one field because they SHARE ONE
                        UNDERLINE: the rule lives on the row, both controls
                        drop their own border, and `:focus-within` lights the
                        row whichever of the two has focus. Tab order is code
                        then number, which is reading order. The visible
                        <label> names the number input (the thing being
                        typed); the select carries its own accessible name,
                        because "Phone (optional)" is not what it sets. */}
                    <div className={styles.phoneRow}>
                      <select
                        id="apply-phone-cc"
                        name="phoneCountry"
                        aria-label="Country dialling code"
                        defaultValue="+44"
                      >
                        {DIAL_CODES.map(([dial, iso]) => (
                          <option key={iso} value={dial}>
                            {dial} ({iso})
                          </option>
                        ))}
                      </select>
                      <input
                        id="apply-phone"
                        name="phone"
                        type="tel"
                        /* `tel-national`, not `tel`: the country is the
                           select's job now, so the browser should fill the
                           national part here rather than a full +44… string
                           that would double the code up */
                        autoComplete="tel-national"
                        inputMode="tel"
                      />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="apply-position">Position</label>
                    <select
                      id="apply-position"
                      name="position"
                      required
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    >
                      {/* a select's empty state is not a placeholder — it is
                          a real option, it survives focus, and `:invalid`
                          keeps it in the quiet tone until a role is picked
                          (see `.field select:invalid`) */}
                      <option value="" disabled>
                        Select a role…
                      </option>
                      {JOBS.map((j) => {
                        const label = `${j.title} — ${j.restaurantName}`;
                        return (
                          <option key={j.id} value={label}>
                            {label}
                          </option>
                        );
                      })}
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="apply-cv">Upload your CV</label>
                    {/* No hint line. It read "PDF or Word. You attach it to
                        the email." and both halves are said elsewhere: the
                        accepted types by `accept` below, which is what filters
                        the picker the reader actually uses, and the
                        attachment fact by the success card at the press — the
                        moment the draft opens and the instruction can still be
                        acted on. `aria-describedby` goes with it rather than
                        being left pointing at an id that no longer exists. */}
                    <input
                      id="apply-cv"
                      name="cv"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className={styles.fileInput}
                      onChange={(e) =>
                        setCvName(e.currentTarget.files?.[0]?.name ?? "")
                      }
                    />
                    {/* styled proxy for the hidden native input — both
                        labels point at #apply-cv, so either opens the picker */}
                    <label htmlFor="apply-cv" className={styles.fileTrigger}>
                      <span
                        className={cvName ? styles.fileName : styles.fileEmpty}
                      >
                        {cvName || "No file chosen"}
                      </span>
                      <span className={styles.fileBrowse}>Browse</span>
                    </label>
                  </div>

                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label htmlFor="apply-message">Why you&apos;d be a good fit</label>
                    {/* A LENGTH INSTRUCTION IS NOT GUIDANCE. "Three or four
                        lines is plenty." told the applicant how much to
                        write and nothing about what — which is the hard
                        part, and the part that decides whether the message
                        is worth reading. This names the two things the
                        person opening the email actually wants, in the order
                        they want them, and it is written to include someone
                        who is between jobs. */}
                    <p className={styles.hint} id="apply-message-hint">
                      Where you&apos;ve worked, and what you want next.
                    </p>
                    <textarea
                      id="apply-message"
                      name="message"
                      required
                      aria-describedby="apply-message-hint"
                    />
                  </div>

                  {/* ---- THE WARNING, MOVED TO WHERE IT CANNOT BE MISSED ----
                      The thirty-word paragraph that stood here is gone, and
                      it could not simply be deleted: this form does not post
                      anywhere. There is no API route in app/, no env config
                      and no form service anywhere in this project, so the
                      submit builds a `mailto:` and hands the reader a draft
                      — and a mailto draft CANNOT CARRY AN ATTACHMENT, so the
                      CV they just chose is named in the body and they have
                      to attach it themselves. Delete the paragraph with
                      nothing in its place and a real applicant believes they
                      have applied when they have sent nothing.

                      So the same two facts are said in six words each, in the
                      two places a reader cannot skip:
                        · ON THE CONTROL, before the press — the button is
                          labelled with what it actually does.
                        · AT THE PRESS — the card below leads with the one
                          instruction that decides whether the application is
                          usable.
                      A third copy sits on the CV field's own hint, because
                      that is the moment the file is chosen. ---- */}
                  <div className={styles.submitRow}>
                    {/* Not MagneticButton: that pill widens its padding by
                        ~0.55em on hover and scales 0.97 on press, so the
                        control GROWS under the cursor. Footer's `.inviteCta`
                        is the house answer — the pill never changes size, the
                        recess just deepens — and this is that recipe on the
                        cream page. Local markup because MagneticButton is
                        shared with six other callers. */}
                    <button type="submit" className={styles.submitCta}>
                      <span className={styles.submitCtaLabel}>
                        Send application
                      </span>
                      <span className={styles.submitCtaArrow} aria-hidden>
                        <SubmitArrow />
                      </span>
                    </button>
                  </div>

                  <AnimatePresence>
                    {submitted && (
                      <motion.div
                        className={styles.successCard}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <strong>Attach your CV, then send.</strong>
                        Your email client is opening with the application
                        filled in. The file you chose is named in it but is
                        not attached — add it before you press send. If no
                        draft opened, write to hr@mgnhw.com and we&apos;ll get
                        it either way. We reply within five working days.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </Reveal>
            </div>
          </section>
        </div>

        <DarkZone>
          <Footer />
        </DarkZone>
      </main>
    </>
  );
}
