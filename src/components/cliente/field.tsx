import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Label above, control, then hint and error below (error replaces nothing: both can show). */
export function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-medium text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-ink-2">opcional</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-[0.8125rem] leading-snug text-ink-2">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[0.8125rem] leading-snug font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** aria-describedby value that matches what <Field> renders. */
export function describedBy(id: string, error?: string, hasHint = true) {
  if (error) return `${id}-error`;
  return hasHint ? `${id}-hint` : undefined;
}
