"use client";

import { ArrowRightIcon, CheckCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/price-tag";
import { Receipt, ReceiptNote, ReceiptRow, ReceiptRule } from "@/components/receipt";
import { ToneBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatNumber, formatRelative } from "@/lib/format";
import { REQUEST_STATUS, REQUEST_STATUS_ORDER, type Tone } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { computeIncomplete, getFlags } from "@/lib/rules";
import { useFinanceSummary, useStore } from "@/lib/store";
import type { ServiceRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Code, Panel, Section, formatDuration, formatPercent, useLookups, useNow } from "./kit";

interface Reason {
  label: string;
  tone: Tone;
}

interface QueueItem {
  request: ServiceRequest;
  reasons: Reason[];
  needsAgent: boolean;
}

export function AdminOverview() {
  const requests = useStore((s) => s.requests);
  const complaints = useStore((s) => s.complaints);
  const finance = useFinanceSummary();
  const { client } = useLookups();
  const now = useNow();

  const stats = useMemo(() => {
    const received = requests.length;
    const done = requests.filter((r) => r.status === "concluido").length;
    const answered = requests.filter((r) => r.respondedAt);
    const avgResponse =
      answered.length > 0
        ? answered.reduce(
            (t, r) => t + (new Date(r.respondedAt!).getTime() - new Date(r.createdAt).getTime()),
            0,
          ) / answered.length
        : NaN;
    // Requests that reached an agent at least once (assigned now or rejected before).
    const routed = requests.filter((r) => r.agentId || r.rejections.length > 0);
    const rejected = routed.filter((r) => r.rejections.length > 0).length;
    const withAnswer = requests.filter((r) => r.results.length > 0);
    const incomplete = withAnswer.filter((r) => computeIncomplete(r.results, r.surfaceIds)).length;
    const openComplaints = complaints.filter((c) => c.status !== "resolvida").length;
    const byStatus = Object.fromEntries(
      REQUEST_STATUS_ORDER.map((s) => [s, requests.filter((r) => r.status === s).length]),
    ) as Record<ServiceRequest["status"], number>;
    return {
      received,
      done,
      answered: answered.length,
      avgResponse,
      routed: routed.length,
      rejected,
      withAnswer: withAnswer.length,
      incomplete,
      openComplaints,
      byStatus,
    };
  }, [requests, complaints]);

  const queue = useMemo<QueueItem[]>(() => {
    if (!now) return [];
    const complaintOpen = new Set(complaints.filter((c) => c.status !== "resolvida").map((c) => c.requestId));
    const items: QueueItem[] = [];
    for (const r of requests) {
      if (r.status === "cancelado" || r.status === "concluido") {
        if (!complaintOpen.has(r.id)) continue;
      }
      const f = getFlags(r, now);
      const reasons: Reason[] = [];
      const needsAgent = r.status === "submetido" || r.status === "aguarda_atribuicao";
      if (needsAgent) reasons.push({ label: r.rejections.length ? "Rejeitado, sem agente" : "Sem agente", tone: "neutral" });
      if (f.late) reasons.push({ label: "Atrasado", tone: "error" });
      if (f.noAnswer) reasons.push({ label: "Sem resposta", tone: "warning" });
      if (r.status === "resposta_submetida" && f.incomplete) reasons.push({ label: "Resposta incompleta", tone: "warning" });
      if (complaintOpen.has(r.id)) reasons.push({ label: "Reclamação aberta", tone: "error" });
      if (reasons.length) items.push({ request: r, reasons, needsAgent });
    }
    // Urgent first, then the oldest waiting.
    return items.sort(
      (a, b) =>
        Number(b.request.priority === "urgente") - Number(a.request.priority === "urgente") ||
        a.request.createdAt.localeCompare(b.request.createdAt),
    );
  }, [requests, complaints, now]);

  const waiting = queue.filter((q) => q.needsAgent).length;
  const late = queue.filter((q) => q.reasons.some((r) => r.label === "Atrasado")).length;

  return (
    <>
      <PageHeader
        title="Visão geral"
        description={now ? `Estado da operação a ${formatDate(new Date(now).toISOString())}.` : "Estado da operação."}
        actions={
          <Button asChild variant="outline">
            <Link href={routes.admin.pedidos}>
              Todos os pedidos <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <Section
            title="Precisa de atenção"
            description={
              queue.length === 0
                ? "Nada pendente neste momento."
                : `${plural(waiting, "pedido à espera de agente", "pedidos à espera de agente")}, ${plural(late, "atrasado", "atrasados")}, ${plural(stats.openComplaints, "reclamação aberta", "reclamações abertas")}.`
            }
          >
            {queue.length === 0 ? (
              <EmptyState
                icon={<CheckCircleIcon />}
                title="Fila limpa"
                description="Todos os pedidos têm agente e estão dentro do prazo. Os novos pedidos aparecem aqui."
              />
            ) : (
              <Panel>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Pedido</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Há</TableHead>
                      <TableHead className="pr-4 text-right">
                        <span className="sr-only">Acção</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue.map(({ request: r, reasons, needsAgent }) => (
                      <TableRow key={r.id}>
                        <TableCell className="max-w-[22rem] py-3 pl-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-2">
                              <Code>{r.id}</Code>
                              {r.priority === "urgente" && <ToneBadge tone="tag">Urgente</ToneBadge>}
                            </span>
                            <span className="truncate text-ink-2">{r.description}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="flex flex-wrap gap-1">
                            {reasons.map((x) => (
                              <ToneBadge key={x.label} tone={x.tone}>
                                {x.label}
                              </ToneBadge>
                            ))}
                          </span>
                        </TableCell>
                        <TableCell className="text-ink-2">{client.get(r.clientId)?.name ?? "-"}</TableCell>
                        <TableCell className="text-right font-mono text-xs whitespace-nowrap text-ink-2 tabular">
                          {formatRelative(r.createdAt, now)}
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <Button asChild size="sm" variant={needsAgent ? "default" : "outline"}>
                            <Link href={routes.admin.pedido(r.id)}>{needsAgent ? "Atribuir" : "Abrir"}</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Panel>
            )}
          </Section>

          <Section title="Pedidos por estado" description="Abra um estado para ver a lista filtrada.">
            <Panel>
              <ul className="grid grid-cols-2 sm:grid-cols-4">
                {REQUEST_STATUS_ORDER.map((s, i) => (
                  <li
                    key={s}
                    className={cn(
                      "border-line",
                      i % 2 === 1 && "border-l",
                      i >= 2 && "border-t",
                      "sm:border-t-0 sm:border-l-0",
                      i % 4 !== 0 && "sm:border-l",
                      i >= 4 && "sm:border-t",
                    )}
                  >
                    <Link
                      href={`${routes.admin.pedidos}?estado=${s}`}
                      className="flex h-full flex-col gap-1 px-4 py-3.5 outline-none transition-colors hover-fine:bg-paper focus-visible:bg-paper"
                    >
                      <span className="font-mono text-xl font-semibold text-ink tabular">
                        {formatNumber(stats.byStatus[s])}
                      </span>
                      <span className="text-sm text-ink-2">{REQUEST_STATUS[s].short}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-3">
          <h2 className="sr-only">Indicadores</h2>
          <Receipt title="Indicadores" meta={`${formatNumber(stats.received)} pedidos`}>
            <ReceiptRow label="Tarefas recebidas" value={formatNumber(stats.received)} />
            <ReceiptRow label="Tarefas concluídas" value={formatNumber(stats.done)} />
            <ReceiptRow label="Respondidas" value={formatNumber(stats.answered)} />
            <ReceiptRule />
            <ReceiptRow
              label="Tempo médio de resposta"
              value={Number.isNaN(stats.avgResponse) ? "sem dados" : formatDuration(stats.avgResponse)}
            />
            <ReceiptRow
              label={`Rejeitados por agentes (${stats.rejected} de ${stats.routed})`}
              value={stats.routed ? formatPercent(stats.rejected / stats.routed) : "sem dados"}
            />
            <ReceiptRow
              label={`Respostas incompletas (${stats.incomplete} de ${stats.withAnswer})`}
              value={stats.withAnswer ? formatPercent(stats.incomplete / stats.withAnswer) : "sem dados"}
            />
            <ReceiptRule />
            <ReceiptRow
              label={<Link href={routes.admin.reclamacoes} className="underline decoration-ink/25 underline-offset-4 hover-fine:decoration-ink">Reclamações abertas</Link>}
              value={formatNumber(stats.openComplaints)}
            />
            <ReceiptRow label="Avaliação dos clientes" value="sem dados" mono={false} />
            <ReceiptRule />
            <ReceiptRow label="Comissão devida" value={<Money amount={finance.commissionDue} />} />
            <ReceiptRow label="Comissão liquidada" value={<Money amount={finance.commissionSettled} />} />
            <ReceiptRow label="Por pagar aos agentes" value={<Money amount={finance.agentDue} />} />
            <ReceiptNote className="pb-1">
              O tempo de resposta conta do pedido até à resposta do agente. A plataforma ainda não recolhe
              avaliações dos clientes, por isso não há nota a mostrar.
            </ReceiptNote>
          </Receipt>
          <Button asChild variant="ghost" className="self-start">
            <Link href={routes.admin.financeiro}>
              Ver financeiro <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </aside>
      </div>
    </>
  );
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
