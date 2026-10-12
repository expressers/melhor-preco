"use client";

import { requestTitle } from "@/lib/rules";
import { ChatCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { ComplaintStatusBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime, formatPhone } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useStore } from "@/lib/store";
import type { ComplaintStatus } from "@/lib/types";
import { ConfirmDialog, report, useLookups } from "./kit";

type Filter = "por_tratar" | ComplaintStatus | "todas";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "por_tratar", label: "Por tratar" },
  { value: "aberta", label: "Abertas" },
  { value: "em_analise", label: "Em análise" },
  { value: "resolvida", label: "Resolvidas" },
  { value: "todas", label: "Todas" },
];

export function AdminComplaints() {
  const complaints = useStore((s) => s.complaints);
  const requests = useStore((s) => s.requests);
  const { client, agent } = useLookups();
  const [filter, setFilter] = useState<Filter>("por_tratar");

  const keep = (s: ComplaintStatus, f: Filter) =>
    f === "todas" || (f === "por_tratar" ? s !== "resolvida" : s === f);
  const rows = complaints
    .filter((c) => keep(c.status, filter))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) * (filter === "resolvida" ? -1 : 1));

  return (
    <>
      <PageHeader
        title="Reclamações"
        description="Reclamações abertas pelos clientes sobre um pedido. Ponha em análise, fale com o agente e registe a resolução: o cliente é avisado."
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4 max-w-full overflow-x-auto">
        <TabsList className="group-data-horizontal/tabs:h-11">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
              <span className="font-mono text-xs text-ink-2 tabular">
                {complaints.filter((c) => keep(c.status, f.value)).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ChatCircleIcon />}
          title={filter === "por_tratar" ? "Nenhuma reclamação por tratar" : "Nenhuma reclamação neste estado"}
          description="Quando um cliente abre uma reclamação num pedido, ela aparece aqui e no centro de notificações."
        />
      ) : (
        <ol className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
          {rows.map((c) => {
            const r = requests.find((x) => x.id === c.requestId);
            const cl = client.get(c.clientId);
            const ag = r?.agentId ? agent.get(r.agentId) : undefined;
            return (
              <li key={c.id} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex min-w-0 flex-col gap-2 text-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <ComplaintStatusBadge status={c.status} />
                    <Link
                      href={routes.admin.pedido(c.requestId)}
                      className="font-mono text-[0.8125rem] font-medium tabular underline decoration-ink/25 underline-offset-4 hover-fine:decoration-ink"
                    >
                      {c.requestId}
                    </Link>
                    {r && <StatusBadge status={r.status} short />}
                    <span className="font-mono text-xs text-ink-2 tabular">{formatDateTime(c.createdAt)}</span>
                  </div>
                  <p className="measure text-[0.9375rem] text-ink">{c.reason}</p>
                  <p className="text-ink-2">
                    {cl ? (
                      <>
                        {cl.name} · <span className="font-mono tabular">{formatPhone(cl.phone)}</span>
                      </>
                    ) : (
                      "Cliente desconhecido"
                    )}
                    {ag && (
                      <>
                        {" "}
                        · Agente <span className="font-mono tabular">{ag.code}</span> ({ag.name})
                      </>
                    )}
                  </p>
                  {r && <p className="truncate text-ink-2">Pedido: {requestTitle(r)}</p>}
                  {c.resolution && (
                    <p className="measure rounded-lg bg-paper-2 px-3 py-2">
                      <span className="text-ink-2">Resolução{c.resolvedAt ? ` (${formatDateTime(c.resolvedAt)})` : ""}: </span>
                      {c.resolution}
                    </p>
                  )}
                </div>
                {c.status !== "resolvida" && (
                  <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                    {c.status === "aberta" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          report(useStore.getState().setComplaintStatus(c.id, "em_analise"), "Reclamação em análise.")
                        }
                      >
                        Pôr em análise
                      </Button>
                    )}
                    <ConfirmDialog
                      trigger={<Button size="sm">Resolver</Button>}
                      title={`Resolver a reclamação de ${c.requestId}`}
                      description="Escreva o que foi feito. O cliente recebe esta resolução numa notificação e ela fica no histórico do pedido."
                      confirmLabel="Registar resolução"
                      reason={{
                        label: "Resolução",
                        placeholder: "Ex.: o agente voltou à loja e enviou a foto da etiqueta em falta",
                        required: true,
                      }}
                      onConfirm={(resolution) =>
                        report(
                          useStore.getState().setComplaintStatus(c.id, "resolvida", resolution),
                          "Reclamação resolvida. O cliente foi avisado.",
                        )
                      }
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
