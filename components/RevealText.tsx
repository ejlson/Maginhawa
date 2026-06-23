"use client";

/**
 * Renders the text as-is. The per-word entry animation has been removed —
 * editorial copy now lands fully formed (the container's Reveal wrapper still
 * handles the blur-in for the block as a whole, when present).
 */
export default function RevealText({
  text,
  className,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  return (
    <span className={className} aria-label={text}>
      {text}
    </span>
  );
}
