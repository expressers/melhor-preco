"use client";

// Building blocks of the operator area (/operador): session lookup, clock,
// action toasts, the request row and the one-tap agent picker.

import { CaretRightIcon, CheckIcon, UserSwitchIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { ClientKindBadge, StatusBadge, ToneBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatRelative } from "@/lib/format";
import { AGENT_AVAILABILITY } from "@/lib/labels";
import { requestKindLabel } from "@/lib/pricing";
import { routes } from "@/lib/routes";
import { getFlags, requestTitle } from "@/lib/rules";
import { useCurrentOperator, useStore, useSurfaceAgents, type ActionResult } from "@/lib/store";
import type { Agent, Operator, ServiceRequest, Surface } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./operador.module.scss";

/** Statuses the operator can still (re)assign. Mirrors the store rule. */
export const ASSIGNABLE = ["submetido", "aguarda_atribuicao", "agente_atribuido", "em_consulta"] as const;
export const QUEUE_STATUSES = ["submetido", "aguarda_atribuicao"] as const;
export const ACTIVE_STATUSES = ["agente_atribuido", "em_consulta"] as const;

export function isAssignable(r: Pick<ServiceRequest, "status">): boolean {
  return (ASSIGNABLE as readonly string[]).includes(r.status);
}

// --- Clock -----------------------------------------------------------------

let nowCache = 0;
function subscribeNow(cb: () => void) {
  const t = window.setInterval(() => {
    nowCache = Date.now();
    cb();
  }, 60_000);
  return () => window.clearInterval(t);
}
function snapshotNow() {
  if (!nowCache) nowCache = Date.now();
  return nowCache;
}

/** Current time, refreshed every minute (0 on the server; pages are hydration-gated). */
export function useNow(): number {
  return useSyncExternalStore(subscribeNow, snapshotNow, () => 0);
}

/** Toast the outcome of a store action. Returns true when it succeeded. */
export function report(result: ActionResult, success: string): boolean {
  if (result.ok) toast.success(success);
  else toast.error(result.error);
  return result.ok;
}

// --- Session -----------------------------------------------------------------

/** Acting operator, their surface and whether they may act (active). */
export function useOperatorDesk(): { operator?: Operator; surface?: Surface; canAct: boolean } {
  const operator = useCurrentOperator();
  const surfaces = useStore((s) => s.surfaces);
  const surface = useMemo(
    () => (operator ? surfaces.find((s) => s.id === operator.surfaceId) : undefined),
    [operator, surfaces],
  );
  return { operator, surface, canAct: operator?.status === "activo" };
}

/** Shown when "Ver como" has no operator or the operator is inactive. */
export function NoOperator({ operator }: { operator?: Operator }) {
  return (
    <EmptyState
      icon={<UserSwitchIcon />}
      title={operator ? `${operator.name} está inactivo` : "Nenhum operador seleccionado"}
      description={
        operator
          ? "Um operador inactivo não distribui pedidos. Escolha o operador activo da superfície em “Ver como”, no topo, ou peça à administração para o reactivar."
          : "Escolha em “Ver como”, no topo, o operador da superfície que quer acompanhar. Cada superfície tem um operador activo."
      }
    />
  );
}

/** id -> agent lookup. */
export function useAgentMap(): Map<string, Agent> {
  const agents = useStore((s) => s.agents);
  return useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
}

// --- Request row ---------------------------------------------------------------

/**
 * One request of the surface. The text block links to the detail; the
 * assign / reassign button sits on the right, within thumb reach.
 */
export function RequestRow({
  request: r,
  now,
  canAct,
  agent,
  clientKind,
}: {
  request: ServiceRequest;
  now: number;
  canAct: boolean;
  agent?: Agent;
  clientKind?: "particular" | "empresa";
}) {
  const late = getFlags(r, now).late;
  return (
    <li className={cn(styles.row, late && styles.rowLate)}>
      <Link href={routes.operador.pedido(r.id)} className={styles.rowLink}>
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={r.status} short />
          {late && <ToneBadge tone="error">Atrasado</ToneBadge>}
          {r.priority === "urgente" && <ToneBadge tone="tag">Urgente</ToneBadge>}
        </span>
        <span className="line-clamp-2 text-[0.9375rem] leading-snug font-medium text-ink">{requestTitle(r)}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-ink-2">
          <span>
            {requestKindLabel(r.items)}
            {r.items.length > 1 && <span className="font-mono tabular">, {r.items.length} itens</span>}
          </span>
          {clientKind && <ClientKindBadge kind={clientKind} />}
        </span>
        <span className="font-mono text-xs text-ink-2 tabular">
          {r.id} <span aria-hidden>·</span> {agent ? `${agent.code} ` : ""}
          {formatRelative(r.createdAt, now)}
        </span>
      </Link>
      <div className="flex shrink-0 flex-col items-end justify-center gap-2">
        {canAct && isAssignable(r) ? (
          <AssignSheet request={r}>
            <Button size="sm" variant={r.agentId ? "outline" : "default"}>
              {r.agentId ? "Reatribuir" : "Atribuir"}
            </Button>
          </AssignSheet>
        ) : (
          <CaretRightIcon aria-hidden className="size-4 text-ink-2" />
        )}
      </div>
    </li>
  );
}

/** Section heading with a count. */
export function SectionHead({ id, title, count, hint }: { id?: string; title: string; count: number; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 id={id} className="flex items-baseline gap-2 text-base font-semibold text-ink">
        {title}
        <span className="font-mono text-sm font-normal text-ink-2 tabular">{count}</span>
      </h2>
      {hint && <p className="text-sm text-ink-2">{hint}</p>}
    </div>
  );
}

// --- Agent picker --------------------------------------------------------------

/**
 * Bottom sheet with the surface agents: available ones first, each with the
 * number of requests they hold. One tap assigns (or reassigns).
 */
export function AssignSheet({ request: r, children }: { request: ServiceRequest; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const agents = useSurfaceAgents(r.surfaceId);
  const requests = useStore((s) => s.requests);
  const assign = useStore((s) => s.assignAgent);

  const rows = useMemo(() => {
    const load = (id: string) =>
      requests.filter((x) => x.agentId === id && (ACTIVE_STATUSES as readonly string[]).includes(x.status)).length;
    return agents
      .map((a) => ({ ...a, load: load(a.agent.id) }))
      .sort(
        (a, b) =>
          Number(a.availability !== "disponivel") - Number(b.availability !== "disponivel") ||
          a.load - b.load ||
          a.agent.code.localeCompare(b.agent.code),
      );
  }, [agents, requests]);

  const pick = (agent: Agent) => {
    const ok = report(
      assign(r.id, agent.id, "operador"),
      r.agentId ? `${r.id} reatribuído a ${agent.code}.` : `${r.id} atribuído a ${agent.code}.`,
    );
    if (ok) setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-xl rounded-t-lg">
        <SheetHeader>
          <SheetTitle>{r.agentId ? "Reatribuir pedido" : "Atribuir pedido"}</SheetTitle>
          <SheetDescription>
            <span className="font-mono tabular">{r.id}</span> · {requestTitle(r)}.{" "}
            {r.agentId
              ? "O agente actual e o novo agente são avisados."
              : "O agente recebe o pedido para aceitar."}
          </SheetDescription>
        </SheetHeader>
        {rows.length === 0 ? (
          <p className="px-4 pb-6 text-sm text-ink-2">
            Ainda não há agentes activos nesta superfície. Fale com a administração para activar agentes.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 overflow-y-auto px-4 pb-6" aria-label="Agentes da superfície">
            {rows.map(({ agent, availability, load }) => {
              const current = agent.id === r.agentId;
              const av = AGENT_AVAILABILITY[availability];
              return (
                <li key={agent.id}>
                  <button
                    type="button"
                    disabled={current}
                    onClick={() => pick(agent)}
                    className={styles.pick}
                    aria-label={`${current ? "Agente actual" : "Atribuir a"} ${agent.name}, ${agent.code}, ${av.label}`}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium text-ink">{agent.name}</span>
                      <span className="font-mono text-xs text-ink-2 tabular">
                        {agent.code} <span aria-hidden>·</span>{" "}
                        {load === 0 ? "sem pedidos em curso" : `${load} ${load === 1 ? "pedido" : "pedidos"} em curso`}
                      </span>
                    </span>
                    {current ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-ink-2">
                        <CheckIcon aria-hidden weight="bold" /> Actual
                      </span>
                    ) : (
                      <ToneBadge tone={av.tone}>{av.label}</ToneBadge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
