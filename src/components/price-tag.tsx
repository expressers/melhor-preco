import { formatNumber, formatKz } from "@/lib/format";
import { cn } from "@/lib/utils";
import styles from "./price-tag.module.scss";

export interface PriceTagProps {
  amount: number;
  size?: "sm" | "md" | "lg" | "xl";
  /** "tag" (yellow, default) for the money that matters; "ink" / "muted" for secondary figures. */
  tone?: "tag" | "ink" | "muted";
  /** Accessible context, e.g. "Valor da consulta". Read before the amount. */
  label?: string;
  className?: string;
}

/** Price-tag shaped amount in Geist Mono, tabular figures, "1 200 Kz". */
export function PriceTag({ amount, size = "md", tone = "tag", label, className }: PriceTagProps) {
  return (
    <span
      className={cn(styles.tag, styles[size], tone !== "tag" && styles[tone], className)}
      aria-label={label ? `${label}: ${formatKz(amount)}` : formatKz(amount)}
      role="img"
    >
      <span aria-hidden>{formatNumber(amount)}</span>
      <span aria-hidden className={styles.currency}>
        Kz
      </span>
    </span>
  );
}

/** Inline money in running text or tables: mono, tabular, no tag shape. */
export function Money({ amount, className }: { amount: number; className?: string }) {
  return <span className={cn("font-mono tabular whitespace-nowrap", className)}>{formatKz(amount)}</span>;
}

/** Brand mark: a tiny tilted price tag. */
export function TagMark({ className }: { className?: string }) {
  return <span aria-hidden className={cn(styles.mark, className)} />;
}
