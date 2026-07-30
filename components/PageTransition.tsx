"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
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

// each new image wipes in from a different edge (left, right, top, bottom)
const WIPES = [
  "inset(0 100% 0 0)",
  "inset(0 0 0 100%)",
  "inset(100% 0 0 0)",
  "inset(0 0 100% 0)",
];

// choreography: cover 560ms → (route change) → 250ms hold while the new
// page paints and is scrolled to top → reveal 600ms. Happy path ≤ ~1.6s.
const COVER_MS = 560;
const HOLD_MS = 250;
const REVEAL_MS = 600;
// hard fallback for the push if the cover animation stalls entirely
const PUSH_FALLBACK_MS = 820;
// stuck-phase safety net — must exceed the longest legitimate phase
const STUCK_MS = 2800;
// centre-image cycle cadence while the curtain is up
const IMG_CYCLE_MS = 680;

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
  const target = useRef<string | null>(null);
  // exactly-one-push guard — both the timed fallback and the cover
  // animation's completion want to push; whichever fires first wins
  const pushed = useRef(false);

  // warm the browser cache once so the first curtain never shows a
  // half-loaded image
  useEffect(() => {
    IMAGES.forEach((src) => {
      const i = new window.Image();
      i.src = src;
    });
  }, []);

  const push = useCallback(
    (href: string) => {
      if (pushed.current) return;
      pushed.current = true;
      router.push(href);
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

  // Safety net: if the phase gets stuck (framer's onAnimationComplete
  // didn't fire), force it back to idle after a max duration. Without
  // this, once the transition state machine wedges, every future nav
  // click is dropped silently.
  useEffect(() => {
    if (phase === "idle") return;
    const id = window.setTimeout(() => {
      setPhase("idle");
      target.current = null;
    }, STUCK_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  // cycle the centre images while the curtain is up
  useEffect(() => {
    if (phase === "idle" || reduce) return;
    const id = window.setInterval(() => {
      setImg((i) => (i + 1) % IMAGES.length);
    }, IMG_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [phase, reduce]);

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
            <img src={IMAGES[prevImg]} alt="" className={styles.img} />
            <motion.img
              key={img}
              src={IMAGES[img]}
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
      </motion.div>
    </TransitionCtx.Provider>
  );
}
