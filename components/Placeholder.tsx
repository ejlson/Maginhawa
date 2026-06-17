import styles from "./Placeholder.module.css";

/**
 * Placeholder image box — mirrors the grey "cross" boxes in the design mock.
 * Swap for <Image> / real photography later; the `label` shows what goes here.
 */
export default function Placeholder({
  ratio = "4 / 3",
  label,
  className,
  rounded = false,
}: {
  ratio?: string;
  label?: string;
  className?: string;
  rounded?: boolean;
}) {
  return (
    <div
      className={`${styles.ph} ${rounded ? styles.rounded : ""} ${className ?? ""}`}
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={label ?? "placeholder image"}
    >
      <svg
        className={styles.cross}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <line x1="0" y1="0" x2="100" y2="100" />
        <line x1="100" y1="0" x2="0" y2="100" />
      </svg>
      {label ? <span className={styles.label}>{label}</span> : null}
    </div>
  );
}
