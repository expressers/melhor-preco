"use client";

import { ClipboardTextIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/price-tag";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { useCurrentAgent, useRequests } from "@/lib/store";
import type { RequestStatus, ServiceRequest } from "@/lib/types";
import { InactiveAgentState, NoAgent, SectionTitle, TaskRow } from "./shared";
import { useNow } from "./use-now";

const GROUPS: { status: RequestStatus; title: string; hint: string }[] = [
  { status: "agente_atribuido", title: "Para aceitar", hint: "Aceite ou rejeite cada pedido." },
  { status: "em_consulta", title: "Em consulta", hint: "Vá à superfície e submeta os preços." },
  {
    status: "resposta_submetida",
    title: "A aguardar pagamento",
    hint: "Confirme quando o valor entrar no seu Multicaixa Express.",
  },
];

export function TasksView() {
  const agent = useCurrentAgent();
  const requests = useRequests({ agentId: agent?.id ?? null });
  const now = useNow();

  if (!agent) {
    return (
      <>
        <PageHeader title="Tarefas" />
        <NoAgent />
      </>
    );
  }

  const firstName = agent.name.split(" ")[0];

  if (agent.status !== "activo") {
    return (
      <>
        <PageHeader title={`Olá, ${firstName}`} description="Aqui aparecem os pedidos que lhe forem atribuídos." />
        <InactiveAgentState agent={agent} />
      </>
    );
  }

  const byStatus = (s: RequestStatus) => requests.filter((r) => r.status === s);
  const open = GROUPS.flatMap((g) => byStatus(g.status));
  const pendingMoney = byStatus("resposta_submetida").reduce((t, r) => t + r.split.agent, 0);

  return (
    <>
      <PageHeader
        title={`Olá, ${firstName}`}
        description={
          open.length === 0
            ? "Não tem tarefas abertas neste momento."
            : `${open.length} ${open.length === 1 ? "tarefa aberta" : "tarefas abertas"}. Toque numa para ver o detalhe.`
        }
      />

      {pendingMoney > 0 && (
        <p className="mb-6 rounded-lg bg-paper-2 px-4 py-3 text-sm text-ink-2">
          Por confirmar: <Money amount={pendingMoney} className="font-semibold text-ink" /> que lhe cabem em pedidos
          já respondidos.
        </p>
      )}

      {open.length === 0 ? (
        <EmptyState
          icon={<ClipboardTextIcon />}
          title="Sem tarefas por agora"
          description="Quando a administração lhe atribuir um pedido, ele aparece aqui e recebe uma notificação. Cada consulta rende-lhe pelo menos 400 Kz."
          action={
            <Button asChild variant="outline">
              <Link href={routes.agente.historico}>Ver histórico</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {GROUPS.map((g) => {
            const items = byStatus(g.status);
            if (items.length === 0) return null;
            return <TaskGroup key={g.status} title={g.title} hint={g.hint} items={items} now={now} />;
          })}
        </div>
      )}
    </>
  );
}

function TaskGroup({
  title,
  hint,
  items,
  now,
}: {
  title: string;
  hint: string;
  items: ServiceRequest[];
  now: number;
}) {
  const id = `grupo-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <SectionTitle id={id} count={items.length}>
          {title}
        </SectionTitle>
        <p className="text-sm text-ink-2">{hint}</p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {items.map((r) => (
          <li key={r.id}>
            <TaskRow request={r} now={now} />
          </li>
        ))}
      </ul>
    </section>
  );
}
