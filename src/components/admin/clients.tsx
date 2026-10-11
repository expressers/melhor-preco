"use client";

import { UsersIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/price-tag";
import { Receipt, ReceiptRow } from "@/components/receipt";
import { ClientStatusBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatNumber, formatPhone } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useStore } from "@/lib/store";
import type { Client, ServiceRequest } from "@/lib/types";
import { Code, ConfirmDialog, Panel, SearchField, matches, report } from "./kit";

type StatusFilter = "todos" | "activo" | "suspenso";

export function AdminClients() {
  const clients = useStore((s) => s.clients);
  const requests = useStore((s) => s.requests);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [openId, setOpenId] = useState<string | null>(null);

  const byClient = useMemo(() => {
    const m = new Map<string, ServiceRequest[]>();
    for (const r of [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      m.set(r.clientId, [...(m.get(r.clientId) ?? []), r]);
    return m;
  }, [requests]);

  const rows = clients
    .filter((c) => status === "todos" || c.status === status)
    .filter((c) => matches(query, c.name, c.phone, c.email, formatPhone(c.phone)))
    .sort((a, b) => a.name.localeCompare(b.name, "pt"));

  const open = openId ? clients.find((c) => c.id === openId) : undefined;
  const count = (s: StatusFilter) => (s === "todos" ? clients.length : clients.filter((c) => c.status === s).length);

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Pesquise clientes, veja o histórico de pedidos e suspenda contas quando for preciso."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField label="Pesquisar clientes" value={query} onChange={setQuery} placeholder="Nome, telefone ou e-mail" />
        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <TabsList className="group-data-horizontal/tabs:h-11">
            {(["todos", "activo", "suspenso"] as const).map((s) => (
              <TabsTrigger key={s} value={s}>
                {s === "todos" ? "Todos" : s === "activo" ? "Activos" : "Suspensos"}
                <span className="font-mono text-xs text-ink-2 tabular">{count(s)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title="Nenhum cliente encontrado"
          description="Procure por outro nome ou número de telefone."
        />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Total consultas</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Acções</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const list = byClient.get(c.id) ?? [];
                const spent = list.filter((r) => r.paidAt).reduce((t, r) => t + r.price, 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="py-3 pl-4">
                      <button
                        type="button"
                        onClick={() => setOpenId(c.id)}
                        className="rounded-sm text-left font-medium underline decoration-ink/25 underline-offset-4 outline-none hover-fine:decoration-ink focus-visible:ring-3 focus-visible:ring-ring/40"
                      >
                        {c.name}
                      </button>
                      {c.email && <span className="block text-xs text-ink-2">{c.email}</span>}
                    </TableCell>
                    <TableCell className="font-mono whitespace-nowrap tabular">{formatPhone(c.phone)}</TableCell>
                    <TableCell>
                      <ClientStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular">{formatNumber(list.length)}</TableCell>
                    <TableCell className="text-right">
                      <Money amount={spent} />
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap text-ink-2 tabular">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setOpenId(c.id)}>
                          Histórico
                        </Button>
                        <StatusAction client={c} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
      )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
          {open && <ClientHistory client={open} requests={byClient.get(open.id) ?? []} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function StatusAction({ client: c }: { client: Client }) {
  if (c.status === "suspenso")
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => report(useStore.getState().reactivateClient(c.id), `Conta de ${c.name} reactivada.`)}
      >
        Reactivar
      </Button>
    );
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="outline" className="text-error">
          Suspender
        </Button>
      }
      title={`Suspender ${c.name}?`}
      description="A conta deixa de poder fazer novos pedidos até ser reactivada. Os pedidos em curso continuam."
      confirmLabel="Suspender conta"
      destructive
      reason={{ label: "Motivo (o cliente vê esta mensagem)", placeholder: "Ex.: pagamentos recusados repetidamente" }}
      onConfirm={(reason) =>
        report(useStore.getState().suspendClient(c.id, reason || undefined), `Conta de ${c.name} suspensa.`)
      }
    />
  );
}

function ClientHistory({ client: c, requests }: { client: Client; requests: ServiceRequest[] }) {
  const paid = requests.filter((r) => r.paidAt);
  const cancelled = requests.filter((r) => r.status === "cancelado").length;
  return (
    <div className="flex flex-col gap-6 p-5">
      <SheetHeader className="p-0">
        <SheetTitle className="text-xl">{c.name}</SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-2 text-ink-2">
          <span className="font-mono tabular">{formatPhone(c.phone)}</span>
          {c.email && <span>{c.email}</span>}
          <ClientStatusBadge status={c.status} />
        </SheetDescription>
      </SheetHeader>

      <Receipt title="Resumo do cliente" meta={`desde ${formatDate(c.createdAt)}`}>
        <ReceiptRow label="Pedidos" value={formatNumber(requests.length)} />
        <ReceiptRow label="Pagos ao agente" value={formatNumber(paid.length)} />
        <ReceiptRow label="Cancelados" value={formatNumber(cancelled)} />
        <ReceiptRow label="Total em consultas" value={<Money amount={paid.reduce((t, r) => t + r.price, 0)} />} strong className="pb-4" />
      </Receipt>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">Histórico de pedidos</h3>
        {requests.length === 0 ? (
          <p className="text-sm text-ink-2">Este cliente ainda não fez pedidos.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
            {requests.map((r) => (
              <li key={r.id}>
                <Link
                  href={routes.admin.pedido(r.id)}
                  className="flex flex-col gap-1 px-4 py-3 text-sm outline-none transition-colors hover-fine:bg-paper focus-visible:bg-paper"
                >
                  <span className="flex items-center justify-between gap-3">
                    <Code className="font-medium">{r.id}</Code>
                    <Money amount={r.price} className="text-ink-2" />
                  </span>
                  <span className="truncate">{r.description}</span>
                  <span className="flex items-center justify-between gap-3">
                    <StatusBadge status={r.status} short />
                    <span className="font-mono text-xs text-ink-2 tabular">{formatDate(r.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
