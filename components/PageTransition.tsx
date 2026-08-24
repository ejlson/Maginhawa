"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { getImageProps } from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import styles from "./PageTransition.module.css";
import { lenisRef } from "@/lib/SmoothScroll";

const IMAGES = [
  "/images/bintang.jpg",
  "/images/belly.jpg",
  "/images/cafemama.jpg",
  "/images/guanabana.jpg",
  "/images/ramo.jpg",
  "/images/hoowood.jpg",
];

// mirrors .frame's clamp(170px, 24vw, 320px) — 24vw is worth 170px at a 708px
// viewport and 320px at 1333px, so those are the breakpoints. The curtain
// photo is never drawn wider than 320 CSS px.
const FRAME_SIZES = "(max-width: 708px) 170px, (max-width: 1333px) 24vw, 320px";

// These six are the 1.8–3.7MB venue originals and the curtain lives in the
// shared shell, so served raw they cost ~17MB on a cold load of EVERY route —
// for a frame that is at most 320x427. Run them through the optimizer once,
// here, so the markup below and the cache warm both ask for the same
// correctly-sized candidate (640px on a 2x screen) instead of the master.
const CURTAIN = IMAGES.map((src) => {
  const { props } = getImageProps({
    src,
    alt: "",
    width: 320,
    height: 427, // 3 / 4, matching .frame's aspect-ratio
    sizes: FRAME_SIZES,
  });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
});

// each new image wipes in from a different edge (left, right, top, bottom)
const WIPES = [
  "inset(0 100% 0 0)",
  "inset(0 0 0 100%)",
  "inset(100% 0 0 0)",
  "inset(0 0 100% 0)",
];

/* choreography: cover 640ms → (route change) → 250ms hold while the new
   page paints and is scrolled to top → reveal 720ms. Happy path ≤ ~1.8s.

   ── 640/720, UP FROM 560/600, in the pass that slowed the site ──
   and only that far. The curtain is the one piece of motion on the site a
   reader is WAITING BEHIND rather than watching: every millisecond added
   here is a millisecond before they see the page they asked for. So it
   takes the smallest share of the slowdown of anything in this pass — about
   a sixth, against the ~40% the reading surfaces took — and the reveal takes
   more of it than the cover, because by then the new page is already
   underneath and the time is spent showing it rather than withholding it. */
const COVER_MS = 640;
const HOLD_MS = 250;
const REVEAL_MS = 720;
// hard fallback for the push if the cover animation stalls entirely
const PUSH_FALLBACK_MS = 820;
// centre-image cycle cadence while the curtain is up
const IMG_CYCLE_MS = 680;

/* ---------- the safety nets ----------

   There used to be ONE net: a 2800ms timer that, whatever the phase, put the
   machine back to `idle` and threw `target.current` away. It was documented
   as "must exceed the longest legitimate phase" and sized against a happy
   path of ~1.6s — but the wait it actually had to cover is not a phase of
   ours at all. It is the route change, and its length belongs to the
   machine, the cache and the network, not to this file. Measured against a
   production build of this repo, /about -> /restaurants lands in 650-1100ms
   on an idle laptop with a warm build, 0.8-4.3s at 6x CPU throttle and
   1.8-10.4s at 20x — an order of magnitude of spread on ONE machine, with
   the same build, over the same route. No constant sits on the right side of
   that, and when this one fired it did the two worst things available at
   once: it dropped the curtain — whose `idle` transition is duration 0, so
   it SNAPS out of existence — and it nulled the target, which then made the
   reveal effect below bail when the route finally did land. The reader was
   left looking at the page they had just asked to leave, with nothing on
   screen to say anything was happening. That is the whole of "the loading
   animation loads but never takes me to the page".

   One property of the curtain is worth stating before the nets, because
   these all extend it: the sheet is z-index 9999 with pointer-events auto,
   so while it is up it is MODAL — the nav under it cannot be clicked. That
   is right for a loading state, and it is also why net 4 exists. Before, a
   wedge released the screen after 2.8s and left the reader somewhere wrong;
   now nothing releases it until the reader is somewhere right, so something
   has to guarantee that "somewhere right" always arrives.

   The nets are now split by what each is actually rescuing.

   1. AN ANIMATION THAT DID NOT REPORT BACK. framer's onAnimationComplete is
      the only thing that advances cover -> push and reveal -> idle, and it
      can be missed (tab suspension, a hydration hiccup, an interrupted
      animation). Those are OUR durations, so a clock is the honest
      instrument here: each phase gets its own declared length plus slack,
      and on expiry it does exactly what the missing callback would have
      done. It advances the machine. It never rewinds it, and it never
      touches `target`.

   2. A ROUTE THAT IS TAKING ITS TIME. No deadline at all, because there is
      no length of ours to compare against. `routing` (React's own
      useTransition flag, below) reports whether React is still working on
      this navigation; while it is true the curtain simply stays up, for
      however long that takes, and the image reel goes on telling the reader
      the site is loading.

   3. A ROUTE THAT IS NEVER COMING. If React stops reporting work on the
      navigation and the pathname still has not moved, the client-side route
      change is dead and no further patience fixes it. The escalation is a
      full document load of the same href: it cannot be starved, dropped or
      interrupted, it lands the reader exactly where they clicked, and the
      curtain stays up until the new document replaces it. Losing the client
      transition costs one reload. Losing the reader costs the visit.

   4. A ROUTE THAT IS NEVER COMING AND SAYS IT IS. Net 2's patience is
      unbounded, and there is one shape that abuses it: an RSC request that
      is answered neither with a response nor with an error. Nothing throws,
      so the router never falls back, and React goes on reporting the
      transition as pending — forever. Measured with the request held open
      (scripts/probe-nav.mjs, G3) the reader sat behind the curtain for the
      full 30s the probe was willing to wait.

      So there is one clock left in this file that is not measuring an
      animation, and it is deliberately not a guess at how long a route
      takes. It is how long a PERSON will look at a loading screen before
      the site has simply failed them, and unlike a route that number does
      not vary with the machine, the cache or the build. It is also the last
      thing consulted, never the first: nets 2 and 3 decide on evidence, and
      this only covers the case where the evidence itself is a lie. */

// how far an animation may overrun its own declared duration before we take
// framer's callback as lost. Generous on purpose: this fires the callback's
// work, so firing it late is free and firing it early is a visible jump.
const ANIM_SLACK_MS = 700;
// grace between "React says it is no longer working on this navigation" and
// the hard reload. Only ever counted from that moment — a navigation still
// in flight never reaches this timer — so it is covering a flag that dipped,
// not a slow route.
const DEAD_ROUTE_MS = 1600;
/* THE SLOW-NAVIGATION THRESHOLD — how long a navigation may take before the
   curtain admits it is waiting.

   IT IS DERIVED FROM THE HAPPY PATH, not chosen. The curtain covers for
   COVER_MS, the route lands, and HOLD_MS later the machine leaves `cover` for
   `reveal`. So on any navigation that behaves, `cover` is over by
   COVER_MS + HOLD_MS = 890ms, and an indicator armed after that can never
   flash on a fast one — it is not a short delay hiding a fast case, it is a
   deadline the fast case has already passed.

   The 90ms on top is slack for the same thing ANIM_SLACK_MS covers: framer's
   completion callback landing a frame or two late on a busy main thread. It
   is small because being late here costs nothing and being early is the whole
   failure mode.

   It is NOT another net. Nothing about this drives the machine — see the
   effect below, which only reads `phase`. */
const SLOW_NAV_MS = COVER_MS + HOLD_MS + 90;

// the reader's patience, counted from the push and never re-armed. Not a
// budget for the route: a route that needs nine seconds gets nine seconds
// (measured: 5.7s with the payload deliberately delayed, and it completes
// client-side). This is only the point past which a curtain has stopped
// being a loading state and started being a dead end.
const PATIENCE_MS = 10000;

type Navigate = (href: string) => void;
const TransitionCtx = createContext<Navigate>(() => {});
export const useRouteTransition = () => useContext(TransitionCtx);

type Phase = "idle" | "cover" | "reveal";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [img, setImg] = useState(0);
  // React's own report on the navigation: true from the moment the push is
  // scheduled until React has finished rendering the new route. It is the
  // difference between a route that is SLOW and a route that is DEAD, and
  // it is the only such signal that does not involve guessing a duration.
  const [routing, startRouting] = useTransition();
  const target = useRef<string | null>(null);
  // exactly-one-push guard — both the timed fallback and the cover
  // animation's completion want to push; whichever fires first wins
  const pushed = useRef(false);
  // The same fact as `pushed`, held where an effect can see it change. The
  // ref has to stay: it is read and written synchronously inside one tick,
  // which is the only way a guard can actually guarantee once. But a ref
  // does not re-run effects, and net 3 below must arm at the moment the
  // push goes out — hence the pair. `pushed` decides, `pushedHref` schedules.
  const [pushedHref, setPushedHref] = useState<string | null>(null);
  /* THE SLOW-NAVIGATION INDICATOR, and it is a READER of this machine rather
     than a part of it. It has no effect on `phase`, `routing`, `target` or
     `pushedHref`, it is not one of the four nets, and removing it would change
     nothing about where the reader ends up. That separation is deliberate:
     the state machine above took a long time to get right and a progress
     indicator is exactly the kind of addition that quietly becomes load-
     bearing. This one cannot. */
  const [slow, setSlow] = useState(false);

  // warm the browser cache once so the first curtain never shows a
  // half-loaded image
  useEffect(() => {
    CURTAIN.forEach(({ src, srcSet, sizes }) => {
      const i = new window.Image();
      // the curtain is only needed on the NEXT navigation, so it must not
      // contend with this page's own photography for bandwidth
      i.fetchPriority = "low";
      // sizes before srcset — the candidate is picked the moment srcset is
      // set, so this has to warm the same URL the markup will request
      if (sizes) i.sizes = sizes;
      if (srcSet) i.srcset = srcSet;
      i.src = src;
    });
  }, []);

  const push = useCallback(
    (href: string) => {
      if (pushed.current) return;
      pushed.current = true;
      setPushedHref(href);
      // Inside a transition so `routing` above tracks this navigation for
      // its whole life. router.push is synchronous, which is what
      // startTransition requires of its callback.
      startRouting(() => router.push(href));
    },
    [router]
  );

  const navigate = useCallback<Navigate>(
    (href) => {
      if (!href || href === pathname) return;
      // NB: we intentionally do NOT gate on `phase === "idle"`. If the
      // framer animation ever fails to fire `onAnimationComplete` (reduced
      // motion, tab suspension, hydration hiccup) the phase gets stuck and
      // every subsequent click is silently ignored. Instead we accept the
      // click and force the whole state machine forward from wherever it
      // was, guaranteeing navigation actually happens.
      target.current = href;
      pushed.current = false;
      setPushedHref(null);
      setImg(0);
      setPhase("cover");
      // hard fallback: always push the route after the curtain's animation
      // duration, so nav works even if the animation stalls entirely (the
      // pushed ref keeps this from double-firing with onAnimationComplete)
      window.setTimeout(() => {
        if (target.current === href) push(href);
      }, PUSH_FALLBACK_MS);
    },
    [pathname, push]
  );

  // NET 1 + 2 — the animation nets. See the block above the constants.
  // Each phase is allowed its own declared length plus slack, and on expiry
  // does what the missing onAnimationComplete would have done: push, or go
  // idle. Note what is NOT here — no branch clears `target`, and no branch
  // takes the curtain down while a route is still on its way.
  useEffect(() => {
    if (phase === "idle") return;
    const id = window.setTimeout(
      () => {
        if (phase === "reveal") {
          // the page is already uncovered by now; this only resets the
          // curtain below the fold so the NEXT cover travels upward again
          setPhase("idle");
        } else if (target.current) {
          // the cover overran its own duration — get the push out. `pushed`
          // keeps this from double-firing with navigate()'s timer or with
          // onAnimationComplete, whichever got there first.
          push(target.current);
        }
      },
      (phase === "cover" ? COVER_MS : REVEAL_MS) + ANIM_SLACK_MS
    );
    return () => window.clearTimeout(id);
  }, [phase, push]);

  // The escalation both route nets end in. A full document load COMPLETES
  // the navigation instead of abandoning it: the curtain stays exactly where
  // it is until the new document replaces it, so the last thing the reader
  // sees before the page they asked for is still the transition into it.
  const hardNavigate = useCallback((href: string) => {
    // last look before something this heavy — the target may have moved
    // under us (a second click) or landed in the meantime
    if (target.current !== href) return;
    if (window.location.pathname === href) return;
    window.location.assign(href);
  }, []);

  // NET 3 — the route is never coming. Armed only once the push is out AND
  // React has stopped reporting work on it: a live navigation, however slow,
  // re-runs this effect with `routing` true and never reaches the timer.
  useEffect(() => {
    if (phase !== "cover" || routing || !pushedHref) return;
    if (pathname === pushedHref) return;
    const id = window.setTimeout(() => hardNavigate(pushedHref), DEAD_ROUTE_MS);
    return () => window.clearTimeout(id);
  }, [phase, pathname, routing, pushedHref, hardNavigate]);

  // NET 4 — the route is never coming and is still claiming to be pending.
  // Deliberately does NOT depend on `routing`: this clock is counted from
  // the push and must not be re-armed by a flag that may never change again.
  // It is the only wall-clock left that is not measuring one of our own
  // animations, and it is the last one consulted rather than the first.
  useEffect(() => {
    if (phase !== "cover" || !pushedHref || pathname === pushedHref) return;
    const id = window.setTimeout(() => hardNavigate(pushedHref), PATIENCE_MS);
    return () => window.clearTimeout(id);
  }, [phase, pathname, pushedHref, hardNavigate]);

  /* Armed on entering `cover`, disarmed by leaving it. `phase` is the only
     dependency, so a navigation that lands normally clears the timer on the
     same render that moves the machine to `reveal` and the indicator never
     mounts — which is the difference between "appears for slow navigations"
     and "appears late on every navigation". */
  useEffect(() => {
    if (phase !== "cover") {
      setSlow(false);
      return;
    }
    const id = window.setTimeout(() => setSlow(true), SLOW_NAV_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  // cycle the centre images while the curtain is COVERING. Not during the
  // reveal: the curtain is sliding off and the new route is taking its first
  // paint, which is the most expensive frame of the whole sequence — and a
  // swap that lands there is one the reader has already stopped watching.
  useEffect(() => {
    if (phase !== "cover" || reduce) return;
    const id = window.setInterval(() => {
      setImg((i) => (i + 1) % IMAGES.length);
    }, IMG_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [phase, reduce]);

  // read-only snapshot for the probe harness, same shape of hook as
  // `window.__lenis` in lib/SmoothScroll.tsx. scripts/probe-nav.mjs asserts
  // against it — in particular that `routing` really does go true for the
  // whole of a route change, which is the load-bearing assumption in net 3.
  useEffect(() => {
    (window as unknown as { __pageTransition?: unknown }).__pageTransition = {
      phase,
      routing,
      target: target.current,
      pushedHref,
      slow,
    };
  }, [phase, routing, pushedHref, slow]);

  // once the route has actually changed, snap the new page to the top
  // while it's still hidden, hold a beat (so it paints behind the
  // curtain), then reveal it
  useEffect(() => {
    if (phase !== "cover" || !target.current || pathname !== target.current)
      return;
    target.current = null;
    // reset both scroll owners behind the curtain — Lenis for the smooth
    // scroller, window for the native position — so the reveal never opens
    // onto a page stuck at the previous route's scroll offset
    lenisRef.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    const id = window.setTimeout(() => setPhase("reveal"), HOLD_MS);
    return () => window.clearTimeout(id);
  }, [pathname, phase]);

  // reduced motion: a plain full-screen fade — opacity in, push, opacity
  // out. No curtain travel, no image reel.
  const curtainAnimate = reduce
    ? {
        transform: "translateY(0%)",
        opacity: phase === "cover" ? 1 : 0,
      }
    : {
        // full transform strings (not framer's y shorthand) so the curtain
        // animates hardware-accelerated, off the main thread — the main
        // thread is busy loading the next route while this runs
        transform:
          phase === "cover"
            ? "translateY(0%)"
            : phase === "reveal"
              ? "translateY(-100%)"
              : "translateY(100%)",
        opacity: 1,
      };

  const curtainTransition = reduce
    ? { duration: phase === "cover" ? 0.2 : 0.25, ease: "easeOut" as const }
    : phase === "idle"
      ? { duration: 0 } // snap back below the fold after a reveal
      : {
          duration: (phase === "cover" ? COVER_MS : REVEAL_MS) / 1000,
          ease: [0.77, 0, 0.175, 1] as const,
        };

  // the previous image sits fully visible beneath the current one, so the
  // keyed swap can never flash the maroon ground mid-wipe
  const prevImg = (img - 1 + IMAGES.length) % IMAGES.length;

  return (
    <TransitionCtx.Provider value={navigate}>
      {children}

      <motion.div
        className={styles.curtain}
        initial={false}
        animate={curtainAnimate}
        transition={curtainTransition}
        style={{ pointerEvents: phase === "idle" ? "none" : "auto" }}
        onAnimationComplete={() => {
          if (phase === "cover" && target.current) {
            push(target.current);
          } else if (phase === "reveal") {
            setPhase("idle");
          }
        }}
        aria-hidden
      >
        {!reduce && (
          <div className={styles.frame}>
            {/* previous + current stacked: the current image wipes in over
                the previous one (keyed, no AnimatePresence — its exit-node
                removal crashes on React 19). A whisper of blur over the
                wipe's first portion masks the crossover. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img {...CURTAIN[prevImg]} alt="" className={styles.img} />
            <motion.img
              key={img}
              {...CURTAIN[img]}
              alt=""
              className={styles.img}
              initial={{
                clipPath: WIPES[img % WIPES.length],
                filter: "blur(2px)",
              }}
              animate={{ clipPath: "inset(0 0 0 0)", filter: "blur(0px)" }}
              transition={{
                clipPath: { duration: 0.5, ease: [0.76, 0, 0.24, 1] },
                filter: { duration: 0.25, ease: "easeOut" },
              }}
            />
          </div>
        )}

        {/* BOTTOM RIGHT, and small. The curtain's own content is a 320px
            photograph dead centre; anything competing with it there would
            read as a second subject. The corner is the site's own place for
            chrome that reports rather than speaks.

            NO PROGRESS, DELIBERATELY. There is no honest fraction available —
            the wait is a route change whose length belongs to the machine,
            the cache and the network (measured 650ms to 10.4s on one laptop,
            see the nets above), so a bar would be inventing one. A ring that
            simply turns says the only true thing: still working.

            IT DOES NOT MOVE THE CURTAIN. Mounted inside it, so it travels
            with the sheet and leaves with it; `pointer-events: none` so it
            cannot take a click the modal sheet is already absorbing. */}
        {slow && (
          <motion.div
            className={styles.loader}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            /* a plain fade, and a slow one: this arrives while the reader is
               already waiting, so it should appear rather than announce */
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <span className={styles.loaderRing} aria-hidden />
            <span>Loading</span>
          </motion.div>
        )}
      </motion.div>
    </TransitionCtx.Provider>
  );
}
