"use client";

import { TrayIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { getFlags } from "@/lib/rules";
import { useRequests, useStore } from "@/lib/store";
import type { ServiceRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ObjectivePanel } from "./objective-panel";
import styles from "./operador.module.scss";
import {
  ACTIVE_STATUSES,
  NoOperator,
  QUEUE_STATUSES,
  RequestRow,
  SectionHead,
  useAgentMap,
  useNow,
  useOperatorDesk,
} from "./shared";

const inList = (list: readonly string[]) => (r: ServiceRequest) => list.includes(r.status);

/** Operator home: queue to assign, requests in progress (late first) and the period objective. */
export function OperadorHome() {
  const { operator, surface, canAct } = useOperatorDesk();
  const now = useNow();
  const requests = useRequests({ surfaceId: operator?.surfaceId ?? null });
  const agents = useAgentMap();
  const clients = useStore((s) => s.clients);
  const clientKind = useMemo(() => new Map(clients.map((c) => [c.id, c.kind])), [clients]);

  const { queue, active, late } = useMemo(() => {
    const lateFirst = (a: ServiceRequest, b: ServiceRequest) =>
      Number(getFlags(b, now).late) - Number(getFlags(a, now).late) ||
      Number(b.priority === "urgente") - Number(a.priority === "urgente") ||
      a.createdAt.localeCompare(b.createdAt); // oldest first: first come, first served
    const queue = requests.filter(inList(QUEUE_STATUSES)).sort(lateFirst);
    const active = requests.filter(inList(ACTIVE_STATUSES)).sort(lateFirst);
    const late = [...queue, ...active].filter((r) => getFlags(r, now).late).length;
    return { queue, active, late };
  }, [requests, now]);

  if (!operator || !canAct) {
    return (
      <>
        <PageHeader title="Pedidos da superfície" />
        <NoOperator operator={operator} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={surface?.name ?? "Pedidos da superfície"}
        description={`${operator.name}, operador da superfície. Distribua os pedidos pelos agentes disponíveis.`}
      />

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_19rem] md:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <nav aria-label="Resumo" className="grid grid-cols-3 gap-2">
            <Stat href="#por-atribuir" value={queue.length} label="Por atribuir" />
            <Stat href="#em-curso" value={active.length} label="Em curso" />
            <Stat
              href={queue.some((r) => getFlags(r, now).late) ? "#por-atribuir" : "#em-curso"}
              value={late}
              label={late === 1 ? "Atrasado" : "Atrasados"} alert={late > 0} />
          </nav>

          <section aria-labelledby="por-atribuir" className="flex flex-col gap-3">
            <SectionHead
              id="por-atribuir"
              title="Por atribuir"
              count={queue.length}
              hint="Os mais antigos e os atrasados primeiro."
            />
            {queue.length === 0 ? (
              <EmptyState
                icon={<TrayIcon />}
                title="Fila vazia"
                description="Não há pedidos à espera de agente. Quando um cliente pedir uma consulta nesta superfície, o pedido aparece aqui."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {queue.map((r) => (
                  <RequestRow key={r.id} request={r} now={now} canAct={canAct} clientKind={clientKind.get(r.clientId)} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="em-curso" className="flex flex-col gap-3">
            <SectionHead
              id="em-curso"
              title="Em curso"
              count={active.length}
              hint="Com agente atribuído ou em consulta. Reatribua se um agente não avançar."
            />
            {active.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ink/20 px-4 py-5 text-sm text-ink-2">
                Nenhum pedido em curso nesta superfície.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {active.map((r) => (
                  <RequestRow
                    key={r.id}
                    request={r}
                    now={now}
                    canAct={canAct}
                    agent={r.agentId ? agents.get(r.agentId) : undefined}
                    clientKind={clientKind.get(r.clientId)}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="md:sticky md:top-24">
          <ObjectivePanel operator={operator} now={now} />
        </aside>
      </div>
    </>
  );
}

function Stat({ href, value, label, alert }: { href: string; value: number; label: string; alert?: boolean }) {
  return (
    <a href={href} className={cn(styles.stat, alert && styles.statAlert)}>
      <span className={cn("font-mono text-2xl font-semibold tabular", alert ? "text-error" : "text-ink")}>{value}</span>
      <span className="text-xs text-ink-2">{label}</span>
    </a>
  );
}
