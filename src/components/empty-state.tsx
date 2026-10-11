import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** A Phosphor icon element, e.g. <TrayIcon />. Rendered inside a blank tag outline. */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Usually one <Button asChild><Link/></Button> that tells how to fill this space. */
  action?: ReactNode;
  className?: string;
}

/** Empty list / nothing-yet state: says what is missing and how to get it. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-dashed border-ink/20 px-5 py-8 sm:items-center sm:px-8 sm:text-center",
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden
          className="grid size-11 place-items-center rounded-full bg-paper-2 text-ink [&_svg]:size-5"
        >
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-ink">{title}</p>
        {description && <div className="measure text-sm text-ink-2">{description}</div>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
