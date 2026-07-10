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
import { motion } from "framer-motion";
import styles from "./PageTransition.module.css";

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
  const [phase, setPhase] = useState<Phase>("idle");
  const [img, setImg] = useState(0);
  const target = useRef<string | null>(null);

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
      setImg(0);
      setPhase("cover");
      // hard fallback: always push the route after the curtain's animation
      // duration, so nav works even if the animation stalls entirely
      window.setTimeout(() => {
        if (target.current === href) {
          router.push(href);
        }
      }, 820);
    },
    [pathname, router]
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
    }, 3500);
    return () => window.clearTimeout(id);
  }, [phase]);

  // cycle the centre images while the curtain is up
  useEffect(() => {
    if (phase === "idle") return;
    const id = window.setInterval(() => {
      setImg((i) => (i + 1) % IMAGES.length);
    }, 520);
    return () => window.clearInterval(id);
  }, [phase]);

  // once the route has actually changed, hold a beat (so the new page paints
  // behind the curtain), then reveal it
  useEffect(() => {
    if (phase !== "cover" || !target.current || pathname !== target.current)
      return;
    target.current = null;
    const id = window.setTimeout(() => setPhase("reveal"), 650);
    return () => window.clearTimeout(id);
  }, [pathname, phase]);

  return (
    <TransitionCtx.Provider value={navigate}>
      {children}

      <motion.div
        className={styles.curtain}
        initial={false}
        animate={{ y: phase === "cover" ? "0%" : phase === "reveal" ? "-100%" : "100%" }}
        transition={
          phase === "idle"
            ? { duration: 0 } // snap back below the fold after a reveal
            : { duration: 0.72, ease: [0.76, 0, 0.24, 1] }
        }
        style={{ pointerEvents: phase === "idle" ? "none" : "auto" }}
        onAnimationComplete={() => {
          if (phase === "cover" && target.current) {
            router.push(target.current);
          } else if (phase === "reveal") {
            setPhase("idle");
          }
        }}
        aria-hidden
      >
        <div className={styles.frame}>
          {/* a single keyed image wipes in from a new edge each tick — no
              AnimatePresence (its exit-node removal crashes on React 19) */}
          <motion.img
            key={img}
            src={IMAGES[img]}
            alt=""
            className={styles.img}
            initial={{ clipPath: WIPES[img % WIPES.length] }}
            animate={{ clipPath: "inset(0 0 0 0)" }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
          />
        </div>
      </motion.div>
    </TransitionCtx.Provider>
  );
}
