"use client";

import { DownloadSimpleIcon, WalletIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/price-tag";
import { ReceiptRow } from "@/components/receipt";
import { LedgerStatusBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCsv } from "@/lib/csv";
import { formatDate, formatNumber } from "@/lib/format";
import { LEDGER_STATUS, REQUEST_STATUS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { useFinanceSummary, useStore } from "@/lib/store";
import type { LedgerEntry, ServiceRequest } from "@/lib/types";
import { ConfirmDialog, Panel, report, useLookups, useNow } from "./kit";

type Filter = "todos" | "agente_pendente" | "comissao_devida" | "liquidados";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "agente_pendente", label: "Pagamento pendente" },
  { value: "comissao_devida", label: "Comissão por liquidar" },
  { value: "liquidados", label: "Liquidados" },
];

interface Row {
  request: ServiceRequest;
  agentEntry?: LedgerEntry;
  commission?: LedgerEntry;
}

function keep(row: Row, f: Filter) {
  if (f === "agente_pendente") return row.agentEntry?.status === "devido";
  if (f === "comissao_devida") return row.commission?.status === "devido";
  if (f === "liquidados") return row.commission?.status === "liquidado";
  return true;
}

export function AdminFinance() {
  const requests = useStore((s) => s.requests);
  const ledger = useStore((s) => s.ledger);
  const summary = useFinanceSummary();
  const { agent, client } = useLookups();
  const now = useNow();
  const [filter, setFilter] = useState<Filter>("todos");

  const all = useMemo<Row[]>(() => {
    const byReq = new Map<string, LedgerEntry[]>();
    for (const l of ledger) byReq.set(l.requestId, [...(byReq.get(l.requestId) ?? []), l]);
    return [...requests]
      .filter((r) => r.status !== "cancelado" || byReq.has(r.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => {
        const ls = byReq.get(r.id) ?? [];
        return {
          request: r,
          agentEntry: ls.find((l) => l.kind === "agent_share"),
          commission: ls.find((l) => l.kind === "platform_commission"),
        };
      });
  }, [requests, ledger]);

  const rows = all.filter((r) => keep(r, filter));
  const paidVolume = all.filter((r) => r.request.paidAt).reduce((t, r) => t + r.request.price, 0);
  const totals = rows.reduce(
    (t, r) => ({
      price: t.price + r.request.price,
      agent: t.agent + r.request.agentShare,
      platform: t.platform + r.request.platformShare,
    }),
    { price: 0, agent: 0, platform: 0 },
  );

  const exportCsv = () => {
    const stamp = now ? new Date(now).toISOString().slice(0, 10) : "export";
    downloadCsv(
      `melhor-preco-financeiro-${stamp}.csv`,
      [
        "Pedido",
        "Data",
        "Cliente",
        "Agente",
        "Estado do pedido",
        "Valor da consulta (Kz)",
        "Devido ao agente (Kz)",
        "Comissão da plataforma (Kz)",
        "Pagamento ao agente",
        "Comissão",
        "Comissão liquidada em",
      ],
      rows.map(({ request: r, agentEntry, commission }) => [
        r.id,
        formatDate(r.createdAt),
        client.get(r.clientId)?.name ?? "",
        r.agentId ? (agent.get(r.agentId)?.code ?? r.agentId) : "",
        REQUEST_STATUS[r.status].label,
        r.price,
        r.agentShare,
        r.platformShare,
        agentEntry ? LEDGER_STATUS[agentEntry.status].label : "Sem resposta",
        commission ? LEDGER_STATUS[commission.status].label : "Ainda não devida",
        commission?.settledAt ? formatDate(commission.settledAt) : "",
      ]),
    );
    toast.success(`CSV exportado com ${rows.length} ${rows.length === 1 ? "linha" : "linhas"}.`);
  };

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="O cliente paga directamente ao agente. A plataforma regista o que cada agente tem a receber e a comissão de cada consulta, devida até ser liquidada."
        actions={
          <Button variant="tag" onClick={exportCsv} disabled={rows.length === 0}>
            <DownloadSimpleIcon data-icon="inline-start" /> Exportar CSV
          </Button>
        }
      />

      <Panel className="mb-8">
        <div className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          <Balance title="Pagamentos aos agentes">
            <ReceiptRow label="Por pagar pelos clientes" value={<Money amount={summary.agentDue} />} />
            <ReceiptRow label="Confirmado pelos agentes" value={<Money amount={summary.agentConfirmed} />} />
          </Balance>
          <Balance title="Comissão da plataforma" highlight>
            <ReceiptRow label="Devida" value={<Money amount={summary.commissionDue} />} strong />
            <ReceiptRow label="Liquidada" value={<Money amount={summary.commissionSettled} />} />
          </Balance>
          <Balance title="Volume">
            <ReceiptRow label="Consultas pagas" value={formatNumber(all.filter((r) => r.request.paidAt).length)} />
            <ReceiptRow label="Valor pago aos agentes" value={<Money amount={paidVolume} />} />
          </Balance>
        </div>
      </Panel>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4 max-w-full overflow-x-auto">
        <TabsList className="group-data-horizontal/tabs:h-11">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
              <span className="font-mono text-xs text-ink-2 tabular">{all.filter((r) => keep(r, f.value)).length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {rows.length === 0 ? (
        <EmptyState
          icon={<WalletIcon />}
          title="Nada nesta lista"
          description="Os valores aparecem quando o agente submete a resposta; a comissão quando o agente confirma o pagamento."
        />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Pedido</TableHead>
                <TableHead>Agente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Agente</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Acções</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ request: r, agentEntry, commission }) => {
                const a = r.agentId ? agent.get(r.agentId) : undefined;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="py-3 pl-4">
                      <Link
                        href={routes.admin.pedido(r.id)}
                        className="font-mono text-[0.8125rem] font-medium tabular underline decoration-ink/25 underline-offset-4 hover-fine:decoration-ink"
                      >
                        {r.id}
                      </Link>
                      <span className="flex items-center gap-2 pt-1">
                        <StatusBadge status={r.status} short />
                        <span className="font-mono text-xs text-ink-2 tabular">{formatDate(r.createdAt)}</span>
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      {a ? (
                        <>
                          <span className="font-mono text-[0.8125rem] tabular">{a.code}</span>
                          <span className="block text-xs text-ink-2">{a.name}</span>
                        </>
                      ) : (
                        <span className="text-ink-2">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Money amount={r.price} />
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Money amount={r.agentShare} className="text-ink-2" />
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Money amount={r.platformShare} className="text-ink-2" />
                    </TableCell>
                    <TableCell className="py-3">
                      {agentEntry ? (
                        <LedgerStatusBadge status={agentEntry.status} />
                      ) : (
                        <span className="text-xs text-ink-2">Sem resposta</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      {commission ? (
                        <LedgerStatusBadge status={commission.status} />
                      ) : (
                        <span className="text-xs text-ink-2">Ainda não devida</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 pr-4 text-right">
                      {commission?.status === "devido" && (
                        <ConfirmDialog
                          trigger={<Button size="sm">Liquidar</Button>}
                          title={`Liquidar comissão de ${r.id}?`}
                          description={
                            <>
                              Confirme que {a ? `${a.code} (${a.name})` : "o agente"} entregou{" "}
                              <Money amount={commission.amount} /> à plataforma. Fica registado no histórico do pedido.
                            </>
                          }
                          confirmLabel="Registar liquidação"
                          onConfirm={() =>
                            report(useStore.getState().settleCommission(commission.id), `Comissão de ${r.id} liquidada.`)
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell className="pl-4 font-medium">
                  Total <span className="font-mono text-xs font-normal text-ink-2 tabular">({rows.length})</span>
                </TableCell>
                <TableCell />
                <TableCell className="text-right">
                  <Money amount={totals.price} className="font-semibold" />
                </TableCell>
                <TableCell className="text-right">
                  <Money amount={totals.agent} />
                </TableCell>
                <TableCell className="text-right">
                  <Money amount={totals.platform} />
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableFooter>
          </Table>
        </Panel>
      )}
      <p className="mt-3 text-xs text-ink-2">
        O CSV usa ponto e vírgula como separador e valores inteiros em Kz. Exporta as linhas do filtro activo.
      </p>
    </>
  );
}

function Balance({ title, children, highlight }: { title: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5 p-4 text-sm sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        {highlight && <span aria-hidden className="h-3.5 w-1 bg-tag" />}
        {title}
      </h2>
      {children}
    </div>
  );
}
