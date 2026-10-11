import { LockSimpleIcon } from "@phosphor-icons/react";
import type { ServiceRequest, Surface } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./locked-results.module.scss";

/**
 * Results exist but stay locked until the agent confirms the payment
 * (BRIEF §5 rule 6). Shows how many entries came back per surface, never
 * their content: the print behind the seal is decoration only.
 */
export function LockedResults({ request, surfaces }: { request: ServiceRequest; surfaces: Map<string, Surface> }) {
  return (
    <div className="grid gap-4 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]" style={{ "--cols": Math.min(request.surfaceIds.length, 3) } as React.CSSProperties}>
      {request.surfaceIds.map((sid) => {
        const n = request.results.filter((r) => r.surfaceId === sid).length;
        return (
          <div key={sid} className={cn(styles.wrap, styles.enter)}>
            <div className={styles.slip}>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="text-base">{surfaces.get(sid)?.name ?? sid}</h3>
                <span className="font-mono text-xs text-ink-2 tabular">
                  {n} {n === 1 ? "registo" : "registos"}
                </span>
              </div>
              <div aria-hidden className={styles.print}>
                {Array.from({ length: Math.max(1, Math.min(n, 2)) }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <div className={styles.photo} />
                      <div className="flex flex-1 flex-col gap-2 pt-1">
                        <div className={styles.line} style={{ width: "80%" }} />
                        <div className={styles.line} style={{ width: "55%" }} />
                        <div className={styles.price} />
                      </div>
                    </div>
                    <div className={styles.line} style={{ width: "92%" }} />
                    <div className={styles.line} style={{ width: "68%" }} />
                    <div className={styles.rule} />
                  </div>
                ))}
              </div>
              <div className={styles.seal}>
                <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-[0.8125rem] font-medium text-surface shadow-soft">
                  <LockSimpleIcon weight="fill" className="size-4 text-tag" />
                  Bloqueado até o agente confirmar o pagamento
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
