"use client";

import { TrayIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/price-tag";
import { StatusBadge, ToneBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatNumber, formatTime } from "@/lib/format";
import { OPEN_STATUSES, REQUEST_STATUS, REQUEST_STATUS_ORDER } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { getFlags } from "@/lib/rules";
import { useRequests } from "@/lib/store";
import type { RequestStatus, ServiceRequest } from "@/lib/types";
import { Code, FlagBadges, Panel, SearchField, matches, useLookups, useNow } from "./kit";

type Filter = "todos" | "abertos" | "sinalizados" | RequestStatus;

const GROUPS: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos os pedidos" },
  { value: "abertos", label: "Em aberto" },
  { value: "sinalizados", label: "Sinalizados" },
];

function isFilter(v: string | null): v is Filter {
  return !!v && (GROUPS.some((g) => g.value === v) || (REQUEST_STATUS_ORDER as string[]).includes(v));
}

function flagged(r: ServiceRequest, now: number) {
  if (!now) return false;
  const f = getFlags(r, now);
  return f.late || f.noAnswer || (f.incomplete && r.results.length > 0 && r.status !== "cancelado");
}

export function AdminRequests() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("estado");
  const filter: Filter = isFilter(raw) ? raw : "todos";
  const [query, setQuery] = useState("");
  const requests = useRequests();
  const { client, agent, surface } = useLookups();
  const now = useNow();

  const setFilter = (v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v === "todos") next.delete("estado");
    else next.set("estado", v);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const rows = useMemo(
    () =>
      requests.filter((r) => {
        if (filter === "abertos" && !OPEN_STATUSES.includes(r.status)) return false;
        if (filter === "sinalizados" && !flagged(r, now)) return false;
        if (filter !== "todos" && filter !== "abertos" && filter !== "sinalizados" && r.status !== filter)
          return false;
        const c = client.get(r.clientId);
        const a = r.agentId ? agent.get(r.agentId) : undefined;
        return matches(query, r.id, r.description, r.brand, c?.name, c?.phone, a?.code, a?.name);
      }),
    [requests, filter, query, client, agent, now],
  );

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Todos os pedidos da plataforma. Abra um pedido para atribuir agente, mudar o estado, validar a resposta ou cancelar."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField
          label="Pesquisar pedidos"
          value={query}
          onChange={setQuery}
          placeholder="Número, produto, cliente ou agente"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger aria-label="Filtrar por estado" className="h-11 w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUPS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Por estado</SelectLabel>
              {REQUEST_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {REQUEST_STATUS[s].label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="font-mono text-sm text-ink-2 tabular sm:ml-auto" aria-live="polite">
          {formatNumber(rows.length)} de {formatNumber(requests.length)}
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<TrayIcon />}
          title="Nenhum pedido encontrado"
          description="Mude o filtro de estado ou procure por outro número, produto, cliente ou agente."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setFilter("todos");
              }}
            >
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Superfícies</TableHead>
                <TableHead>Agente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="pr-4 text-right">Criado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const a = r.agentId ? agent.get(r.agentId) : undefined;
                return (
                  <TableRow key={r.id} className="align-top">
                    <TableCell className="max-w-[20rem] py-3 pl-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-2">
                          <Link
                            href={routes.admin.pedido(r.id)}
                            className="rounded-sm font-mono text-[0.8125rem] font-medium text-ink tabular underline decoration-ink/25 underline-offset-4 outline-none hover-fine:decoration-ink focus-visible:ring-3 focus-visible:ring-ring/40"
                          >
                            {r.id}
                          </Link>
                          {r.priority === "urgente" && <ToneBadge tone="tag">Urgente</ToneBadge>}
                        </span>
                        <span className="truncate text-ink-2">{r.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 whitespace-nowrap">{client.get(r.clientId)?.name ?? "-"}</TableCell>
                    <TableCell className="max-w-[14rem] py-3 text-ink-2">
                      <span className="line-clamp-2 whitespace-normal">
                        {r.surfaceIds.map((id) => surface.get(id)?.name ?? id).join(", ")}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      {a ? <Code>{a.code}</Code> : <span className="text-ink-2">Por atribuir</span>}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={r.status} short />
                        <FlagBadges request={r} now={now} />
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Money amount={r.price} />
                    </TableCell>
                    <TableCell className="py-3 pr-4 text-right font-mono text-xs whitespace-nowrap text-ink-2 tabular">
                      {formatDate(r.createdAt)}
                      <br />
                      {formatTime(r.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
      )}
    </>
  );
}
