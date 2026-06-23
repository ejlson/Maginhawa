"use client";

import { createElement } from "react";

type RevealProps = {
  children: React.ReactNode;
  /** kept for API compatibility — no longer used */
  delay?: number;
  /** kept for API compatibility — no longer used */
  y?: number;
  className?: string;
  as?: "div" | "span" | "li" | "p" | "h2" | "section";
  /** kept for API compatibility — no longer used */
  once?: boolean;
};

/**
 * Pass-through wrapper. The scroll-triggered blur/fade reveal has been
 * removed — children render in place. The component is kept so existing
 * call sites stay valid without sweeping refactors.
 */
export default function Reveal({
  children,
  className,
  as = "div",
}: RevealProps) {
  return createElement(as, { className }, children);
}
