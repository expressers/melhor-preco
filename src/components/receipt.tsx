import type { ReactNode } from "react";
import { formatKz } from "@/lib/format";
import { cn } from "@/lib/utils";
import styles from "./receipt.module.scss";

export interface ReceiptProps {
  /** Mono uppercase header, e.g. "Talão da consulta". */
  title?: string;
  /** Right side of the header, e.g. the request id or a date. */
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Talão: white slip with dashed rules and a perforated bottom edge. */
export function Receipt({ title, meta, children, className }: ReceiptProps) {
  return (
    <div className={cn(styles.wrap, className)}>
      <div className={cn(styles.receipt, "flex flex-col gap-3 px-5 pt-5 text-sm sm:px-6")}>
        {(title || meta) && (
          <>
            <div className="flex items-baseline justify-between gap-3 font-mono text-[0.6875rem] tracking-[0.08em] text-ink-2 uppercase">
              {title && <span>{title}</span>}
              {meta && <span className="tabular normal-case tracking-normal">{meta}</span>}
            </div>
            <ReceiptRule />
          </>
        )}
        {children}
      </div>
    </div>
  );
}

/** Dashed horizontal rule. */
export function ReceiptRule({ className }: { className?: string }) {
  return <div role="separator" className={cn(styles.rule, className)} />;
}

/** "Label ........ value" line. Values are mono + tabular by default. */
export function ReceiptRow({
  label,
  value,
  mono = true,
  strong = false,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-2", strong && "font-semibold", className)}>
      <span className={cn("min-w-0 shrink", strong ? "text-ink" : "text-ink-2")}>{label}</span>
      <span aria-hidden className={styles.leader} />
      <span className={cn("shrink-0 text-right text-ink", mono && "font-mono tabular")}>{value}</span>
    </div>
  );
}

/**
 * Small print at the foot of a talão. Defaults to the mandatory reminder
 * (BRIEF §3.1, rule 12) that prices are those at the moment of the consulta.
 */
export function ReceiptNote({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-ink-2", className)}>
      {children ??
        "Preços e disponibilidade correspondem ao momento da consulta e podem mudar. O Melhor Preço não vende nem garante preços."}
    </p>
  );
}

/** Bold total line with the amount in Kz. */
export function ReceiptTotal({ label = "Total", amount }: { label?: string; amount: number }) {
  return <ReceiptRow label={label} value={formatKz(amount)} strong className="text-base" />;
}
