"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/price-tag";
import { Receipt, ReceiptRow, ReceiptRule, ReceiptTotal } from "@/components/receipt";
import { LedgerStatusBadge, StatusBadge, ToneBadge } from "@/components/status-badge";
import { formatDate, formatKz } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useCurrentAgent, useStore } from "@/lib/store";
import type { LedgerEntry, ServiceRequest } from "@/lib/types";
import { NoAgent, SectionTitle, useSurfaceNames } from "./shared";

const DONE = ["resposta_submetida", "pagamento_confirmado", "concluido", "cancelado"];

type Row =
  | { kind: "task"; request: ServiceRequest; share?: LedgerEntry; at: string }
  | { kind: "rejected"; request: ServiceRequest; reason: string; at: string };

export function HistoryView() {
  const agent = useCurrentAgent();
  const requests = useStore((s) => s.requests);
  const ledger = useStore((s) => s.ledger);
  const surfaceName = useSurfaceNames();

  const data = useMemo(() => {
    if (!agent) return null;
    const mine = ledger.filter((l) => l.agentId === agent.id);
    const shareOf = new Map(mine.filter((l) => l.kind === "agent_share").map((l) => [l.requestId, l]));
    const rows: Row[] = [];
    for (const r of requests) {
      if (r.agentId === agent.id && DONE.includes(r.status)) {
        rows.push({ kind: "task", request: r, share: shareOf.get(r.id), at: r.paidAt ?? r.respondedAt ?? r.updatedAt });
      }
      for (const rej of r.rejections) {
        if (rej.agentId === agent.id) rows.push({ kind: "rejected", request: r, reason: rej.reason, at: rej.at });
      }
    }
    rows.sort((a, b) => b.at.localeCompare(a.at));
    const sum = (f: (l: LedgerEntry) => boolean) => mine.filter(f).reduce((t, l) => t + l.amount, 0);
    return {
      rows,
      received: sum((l) => l.kind === "agent_share" && l.status === "confirmado"),
      waiting: sum((l) => l.kind === "agent_share" && l.status === "devido"),
      commissionDue: sum((l) => l.kind === "platform_commission" && l.status === "devido"),
      commissionSettled: sum((l) => l.kind === "platform_commission" && l.status === "liquidado"),
      paidCount: mine.filter((l) => l.kind === "agent_share" && l.status === "confirmado").length,
    };
  }, [agent, requests, ledger]);

  if (!agent || !data) {
    return (
      <>
        <PageHeader title="Histórico" />
        <NoAgent />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Histórico" description="Tarefas respondidas, valores e estado de cada pagamento." />

      <Receipt title="Os seus ganhos" meta={agent.code} className="mb-8">
        <ReceiptRow label="Tarefas pagas" value={data.paidCount} />
        <ReceiptRow label="A aguardar pagamento do cliente" value={formatKz(data.waiting)} />
        <ReceiptRule />
        <ReceiptRow label="Comissão devida à plataforma" value={formatKz(data.commissionDue)} />
        <ReceiptRow label="Comissão já liquidada" value={formatKz(data.commissionSettled)} />
        <ReceiptRule />
        <ReceiptTotal label="Ganho confirmado" amount={data.received} />
        <div className="pb-5" />
      </Receipt>

      <section aria-labelledby="lista-historico" className="flex flex-col gap-3">
        <SectionTitle id="lista-historico" count={data.rows.length}>
          Tarefas
        </SectionTitle>
        {data.rows.length === 0 ? (
          <EmptyState
            icon={<ClockCounterClockwiseIcon />}
            title="Ainda sem histórico"
            description="As tarefas que responder aparecem aqui, com o valor e o estado do pagamento."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
            {data.rows.map((row) => (
              <li key={`${row.kind}-${row.request.id}-${row.at}`}>
                <Link
                  href={routes.agente.tarefa(row.request.id)}
                  className="flex items-start gap-3 px-4 py-3.5 outline-none focus-visible:bg-paper hover-fine:bg-paper"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="line-clamp-1 text-[0.9375rem] font-medium text-ink">{row.request.description}</p>
                    <p className="truncate text-[0.8125rem] text-ink-2">
                      {row.request.surfaceIds.map(surfaceName).join(", ")}
                    </p>
                    <p className="font-mono text-xs text-ink-2 tabular">
                      {row.request.id} <span aria-hidden>·</span> {formatDate(row.at)}
                    </p>
                    {row.kind === "rejected" && (
                      <p className="line-clamp-2 text-[0.8125rem] text-ink-2">Motivo: {row.reason}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {row.kind === "rejected" ? (
                      <ToneBadge tone="neutral">Rejeitada</ToneBadge>
                    ) : row.request.status === "cancelado" ? (
                      <StatusBadge status="cancelado" short />
                    ) : (
                      <>
                        <Money amount={row.request.agentShare} className="text-[0.9375rem] font-semibold text-ink" />
                        {row.share ? (
                          <LedgerStatusBadge status={row.share.status} />
                        ) : (
                          <StatusBadge status={row.request.status} short />
                        )}
                      </>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
