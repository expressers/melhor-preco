import { formatDate, formatTime } from "@/lib/format";
import type { AuditEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<AuditEvent["role"], string> = {
  cliente: "Cliente",
  agente: "Agente",
  operador: "Operador",
  admin: "Admin",
  sistema: "Sistema",
};

export interface TimelineProps {
  events: AuditEvent[];
  /** Newest first (default false: reads top to bottom in the order things happened). */
  newestFirst?: boolean;
  className?: string;
}

/**
 * Audit trail (BRIEF §5 rule 8): every event with date, time and who did it.
 * A thin ink rail with small square ticks; the latest event gets a tag-yellow tick.
 */
export function Timeline({ events, newestFirst = false, className }: TimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-ink-2">Ainda sem registos.</p>;
  }
  const latest = events.length - 1;
  const items = events.map((e, i) => ({ e, i }));
  if (newestFirst) items.reverse();

  return (
    <ol className={cn("relative flex flex-col", className)} aria-label="Histórico do pedido">
      {items.map(({ e, i }, k) => {
        const isLatest = i === latest;
        const isLast = k === items.length - 1;
        return (
          <li key={`${e.at}-${i}`} className="relative grid grid-cols-[1rem_1fr] gap-x-3 pb-5 last:pb-0">
            {/* rail */}
            {!isLast && (
              <span aria-hidden className="absolute top-3 bottom-0 left-[calc(0.5rem-0.5px)] w-px bg-ink/25" />
            )}
            {/* tick */}
            <span
              aria-hidden
              className={cn(
                "relative mt-[0.3rem] size-2.5 justify-self-center border border-ink",
                isLatest ? "bg-tag" : "bg-surface",
              )}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm leading-snug font-medium text-ink">{e.action}</p>
              {e.note && <p className="text-sm leading-snug text-ink-2 break-words">{e.note}</p>}
              <p className="font-mono text-xs text-ink-2 tabular">
                <time dateTime={e.at}>
                  {formatDate(e.at)}, {formatTime(e.at)}
                </time>
                <span aria-hidden> · </span>
                <span className="font-sans">
                  {e.actor}
                  {e.role !== "sistema" && e.actor !== ROLE_LABEL[e.role] && (
                    <span className="text-ink-2/80"> ({ROLE_LABEL[e.role].toLowerCase()})</span>
                  )}
                </span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
