"use client";

import { CaretRightIcon, CheckIcon, LockSimpleIcon, UserSwitchIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { PriceTag } from "@/components/price-tag";
import { AgentStatusBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format";
import { CATEGORY_LABEL } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { dueAt, requestTitle } from "@/lib/rules";
import { useStore } from "@/lib/store";
import type { Agent, ServiceRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./agente.module.scss";

/** id -> surface name lookup (includes inactive surfaces, so history still reads). */
export function useSurfaceNames(): (id: string) => string {
  const surfaces = useStore((s) => s.surfaces);
  return useMemo(() => {
    const map = new Map(surfaces.map((s) => [s.id, s.name]));
    return (id: string) => map.get(id) ?? "Superfície";
  }, [surfaces]);
}

/** Fixed thumb-reach action bar (above the mobile tab bar). Renders its own spacer. */
export function ActionBar({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <>
      <div aria-hidden className={styles.actionSpacer} />
      <div className={styles.actionBar}>
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3 sm:px-5">
          {note && <p className="text-center text-xs text-ink-2">{note}</p>}
          <div className="flex gap-2 [&>*]:h-12 [&>*]:flex-1 [&>*]:text-[0.9375rem]">{children}</div>
        </div>
      </div>
    </>
  );
}

/** Big one-tap toggle tile (multi or single select). */
export function ChoiceTile({
  checked,
  onToggle,
  role = "checkbox",
  children,
  hint,
  className,
}: {
  checked: boolean;
  onToggle: () => void;
  role?: "checkbox" | "radio";
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={checked}
      onClick={onToggle}
      className={cn(styles.choice, className)}
    >
      <span className={styles.choiceMark} aria-hidden>
        <CheckIcon weight="bold" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{children}</span>
        {hint && <span className="text-xs font-normal text-ink-2">{hint}</span>}
      </span>
    </button>
  );
}

/** Section heading inside agent pages: small, ink, with an optional count. */
export function SectionTitle({ children, count, id }: { children: ReactNode; count?: number; id?: string }) {
  return (
    <h2 id={id} className="flex items-baseline gap-2 text-base font-semibold text-ink">
      {children}
      {count !== undefined && <span className="font-mono text-sm font-normal text-ink-2 tabular">{count}</span>}
    </h2>
  );
}

/**
 * A task in a list: whole row is the link (≥ 64px), the agent's share as a
 * price tag on the right, state + surfaces + time underneath.
 */
export function TaskRow({ request, now }: { request: ServiceRequest; now: number }) {
  const surfaceName = useSurfaceNames();
  const due = dueAt(request);
  const late = ["agente_atribuido", "em_consulta"].includes(request.status) && now > due;
  return (
    <Link
      href={routes.agente.tarefa(request.id)}
      className="press group flex items-center gap-3 rounded-lg border border-line bg-surface p-4 outline-none focus-visible:border-ink focus-visible:ring-3 focus-visible:ring-ink/10 hover-fine:border-ink/40"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={request.status} short />
          {request.priority === "urgente" && <span className="text-xs font-semibold text-warning">Urgente</span>}
          {late && <span className="text-xs font-semibold text-error">Atrasado</span>}
        </div>
        <p className="line-clamp-2 text-[0.9375rem] leading-snug font-medium text-ink">{requestTitle(request)}</p>
        <p className="truncate text-[0.8125rem] text-ink-2">
          {[request.surfaceId].map(surfaceName).join(", ")}
        </p>
        <p className="font-mono text-xs text-ink-2 tabular">
          {request.id} <span aria-hidden>·</span> {CATEGORY_LABEL[request.items[0].category]}{" "}
          <span aria-hidden>·</span> {formatRelative(request.updatedAt, now)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <PriceTag amount={request.split.agent} size="sm" label="A sua parte" />
        <CaretRightIcon aria-hidden className="size-4 text-ink-2" />
      </div>
    </Link>
  );
}

/** Shown when there is no acting agent (e.g. "Ver como" cleared it). */
export function NoAgent() {
  return (
    <EmptyState
      icon={<UserSwitchIcon />}
      title="Nenhum agente seleccionado"
      description="Escolha um agente em “Ver como”, no topo, ou faça a sua candidatura para ser agente."
      action={
        <Button asChild variant="tag">
          <Link href={routes.agente.candidatura}>Ser agente</Link>
        </Button>
      }
    />
  );
}

const GATE_COPY: Record<Exclude<Agent["status"], "activo">, { title: string; body: string }> = {
  pendente: {
    title: "A sua candidatura está em análise",
    body: "A equipa Melhor Preço vai rever os seus dados e contactá-lo por telefone. Depois da aprovação e activação passa a receber pedidos aqui.",
  },
  aprovado: {
    title: "Conta aprovada, falta a activação",
    body: "Já foi aprovado. Assim que a administração activar a sua conta e confirmar a sua superfície, os pedidos aparecem aqui.",
  },
  suspenso: {
    title: "A sua conta está suspensa",
    body: "Enquanto a conta estiver suspensa não recebe pedidos. Fale com a administração para resolver a situação.",
  },
};

/** Rule 1: only approved AND active agents receive requests. Clear state for everyone else. */
export function InactiveAgentState({ agent }: { agent: Agent }) {
  if (agent.status === "activo") return null;
  const copy = GATE_COPY[agent.status];
  return (
    <section
      aria-labelledby="estado-conta"
      className="flex flex-col gap-4 rounded-lg border border-dashed border-ink/25 bg-surface p-5"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-paper-2 text-ink">
          <LockSimpleIcon className="size-5" />
        </span>
        <AgentStatusBadge status={agent.status} />
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 id="estado-conta" className="text-lg font-semibold text-ink">
          {copy.title}
        </h2>
        <p className="measure text-[0.9375rem] text-ink-2">{copy.body}</p>
        {agent.status === "suspenso" && agent.note && (
          <p className="text-sm text-ink-2">
            Motivo indicado: <span className="text-ink">{agent.note}</span>
          </p>
        )}
      </div>
      <p className="text-sm text-ink-2">
        Só agentes aprovados e activos recebem pedidos.
      </p>
      <div>
        <Button asChild variant="outline">
          <Link href={routes.agente.perfil}>Ver o meu perfil</Link>
        </Button>
      </div>
    </section>
  );
}
