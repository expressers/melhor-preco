"use client";

import { UsersIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, ToneBadge } from "@/components/status-badge";
import { formatPhone, formatRelative } from "@/lib/format";
import { AGENT_AVAILABILITY } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { getFlags, requestTitle } from "@/lib/rules";
import { useStore, useSurfaceAgents } from "@/lib/store";
import { ACTIVE_STATUSES, NoOperator, useNow, useOperatorDesk } from "./shared";

/** Agents of the operator's surface: availability and the requests they hold. */
export function OperadorAgents() {
  const { operator, surface, canAct } = useOperatorDesk();
  const now = useNow();
  const agents = useSurfaceAgents(operator?.surfaceId);
  const requests = useStore((s) => s.requests);

  const rows = useMemo(
    () =>
      agents
        .map(({ agent, availability }) => ({
          agent,
          availability,
          tasks: requests
            .filter((r) => r.agentId === agent.id && (ACTIVE_STATUSES as readonly string[]).includes(r.status))
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        }))
        .sort(
          (a, b) =>
            Number(a.availability !== "disponivel") - Number(b.availability !== "disponivel") ||
            a.agent.code.localeCompare(b.agent.code),
        ),
    [agents, requests],
  );

  if (!operator || !canAct) {
    return (
      <>
        <PageHeader title="Agentes da superfície" />
        <NoOperator operator={operator} />
      </>
    );
  }

  const free = rows.filter((r) => r.availability === "disponivel").length;

  return (
    <>
      <PageHeader
        title="Agentes da superfície"
        description={
          rows.length > 0
            ? `${surface?.name ?? "Superfície"}: ${free} de ${rows.length} ${rows.length === 1 ? "agente disponível" : "agentes disponíveis"}.`
            : surface?.name
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title="Ainda sem agentes activos"
          description="Só agentes aprovados e activos nesta superfície recebem pedidos. Peça à administração para activar ou associar agentes."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ agent, availability, tasks }) => {
            const av = AGENT_AVAILABILITY[availability];
            return (
              <li key={agent.id} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-ink">{agent.name}</span>
                    <span className="font-mono text-xs text-ink-2 tabular">
                      {agent.code} <span aria-hidden>·</span>{" "}
                      <a href={`tel:${agent.phone.replace(/\s/g, "")}`} className="underline decoration-ink/30 underline-offset-2">
                        {formatPhone(agent.phone)}
                      </a>
                    </span>
                  </div>
                  <ToneBadge tone={av.tone}>{av.label}</ToneBadge>
                </div>
                {tasks.length === 0 ? (
                  <p className="text-sm text-ink-2">Sem pedidos em curso. Pode receber um pedido já.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-line border-t border-line">
                    {tasks.map((r) => {
                      const own = r.surfaceId === operator.surfaceId;
                      const late = getFlags(r, now).late;
                      return (
                        <li key={r.id} className="flex flex-col gap-1 py-2.5 last:pb-0">
                          {own ? (
                            <Link
                              href={routes.operador.pedido(r.id)}
                              className="truncate text-sm font-medium text-ink underline-offset-2 hover-fine:underline"
                            >
                              {requestTitle(r)}
                            </Link>
                          ) : (
                            <span className="truncate text-sm text-ink-2">Pedido noutra superfície</span>
                          )}
                          <span className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-ink-2 tabular">
                            <StatusBadge status={r.status} short />
                            {late && <ToneBadge tone="error">Atrasado</ToneBadge>}
                            {r.id} <span aria-hidden>·</span> {formatRelative(r.updatedAt, now)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
