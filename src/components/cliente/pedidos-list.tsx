"use client";

import { ListMagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { useRequests } from "@/lib/store";
import type { Client, RequestStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ClientGate } from "./client-gate";
import { RequestList } from "./request-row";

type Group = "todos" | "curso" | "pagar" | "concluidos" | "cancelados";

const GROUPS: { value: Group; label: string; statuses?: RequestStatus[]; empty: string }[] = [
  { value: "todos", label: "Todos", empty: "Ainda não tem pedidos." },
  {
    value: "pagar",
    label: "A pagar",
    statuses: ["resposta_submetida"],
    empty: "Nenhuma resposta à espera de pagamento.",
  },
  {
    value: "curso",
    label: "Em curso",
    statuses: ["submetido", "aguarda_atribuicao", "agente_atribuido", "em_consulta"],
    empty: "Nenhum pedido em curso neste momento.",
  },
  {
    value: "concluidos",
    label: "Com resultados",
    statuses: ["pagamento_confirmado", "concluido"],
    empty: "Ainda não tem resultados desbloqueados.",
  },
  { value: "cancelados", label: "Cancelados", statuses: ["cancelado"], empty: "Nenhum pedido cancelado." },
];

export function PedidosList() {
  return <ClientGate>{(client) => <List client={client} />}</ClientGate>;
}

function List({ client }: { client: Client }) {
  const all = useRequests({ clientId: client.id });
  const [group, setGroup] = useState<Group>("todos");
  const current = GROUPS.find((g) => g.value === group)!;
  const count = (g: (typeof GROUPS)[number]) =>
    g.statuses ? all.filter((r) => g.statuses!.includes(r.status)).length : all.length;
  const shown = current.statuses ? all.filter((r) => current.statuses!.includes(r.status)) : all;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Os meus pedidos"
        description="Cada pedido tem um número único. Toque num pedido para ver o estado, o pagamento e o histórico."
        actions={
          <Button asChild variant="tag">
            <Link href={routes.cliente.nova}>
              <PlusIcon data-icon="inline-start" weight="bold" />
              Nova consulta
            </Link>
          </Button>
        }
        className="mb-0 sm:mb-0"
      />

      {all.length > 0 && (
        <div
          role="group"
          aria-label="Filtrar por estado"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {GROUPS.map((g) => {
            const n = count(g);
            const on = g.value === group;
            return (
              <button
                key={g.value}
                type="button"
                aria-pressed={on}
                onClick={() => setGroup(g.value)}
                className={cn(
                  "press inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                  on
                    ? "border-ink bg-ink text-surface"
                    : "border-line bg-surface text-ink hover-fine:border-ink/40",
                )}
              >
                {g.label}
                <span
                  className={cn(
                    "font-mono text-xs tabular",
                    on ? "text-surface/75" : "text-ink-2",
                    g.value === "pagar" && n > 0 && !on && "rounded-full bg-tag px-1.5 text-ink",
                  )}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {shown.length > 0 ? (
        <RequestList requests={shown} />
      ) : (
        <EmptyState
          icon={<ListMagnifyingGlassIcon />}
          title={current.empty}
          description={
            all.length === 0
              ? "Faça uma consulta: escolha o produto e as superfícies, e vê o valor antes de confirmar."
              : "Experimente outro filtro acima."
          }
          action={
            all.length === 0 ? (
              <Button asChild variant="outline">
                <Link href={routes.cliente.nova}>Fazer uma consulta</Link>
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
