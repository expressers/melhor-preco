"use client";

import { ArrowLeftIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/price-tag";
import { ProductPhoto } from "@/components/product-photo";
import { ClientKindBadge, StatusBadge, ToneBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { AGENT_AVAILABILITY, CATEGORY_LABEL, PRIORITY } from "@/lib/labels";
import { requestKindLabel } from "@/lib/pricing";
import { routes } from "@/lib/routes";
import { agentAvailability, clientDisplayName, dueAt, formatVariations, getFlags, requestTitle } from "@/lib/rules";
import { useRequest, useStore } from "@/lib/store";
import type { ServiceRequest } from "@/lib/types";
import { AssignSheet, NoOperator, isAssignable, useAgentMap, useNow, useOperatorDesk } from "./shared";

function Back() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 self-start">
      <Link href={routes.operador.home}>
        <ArrowLeftIcon data-icon="inline-start" /> Pedidos
      </Link>
    </Button>
  );
}

/** /operador/pedido?id= (inside <Suspense>: reads the query string). */
export function OperadorRequestDetail() {
  const id = useSearchParams().get("id");
  const request = useRequest(id);
  const { operator, canAct } = useOperatorDesk();

  if (!operator || !canAct) {
    return (
      <>
        <Back />
        <NoOperator operator={operator} />
      </>
    );
  }
  if (!request || request.surfaceId !== operator.surfaceId) {
    return (
      <>
        <Back />
        <EmptyState
          icon={<MagnifyingGlassIcon />}
          title={
            !id
              ? "Nenhum pedido indicado"
              : request
                ? `O pedido ${id} é de outra superfície`
                : `Não encontrámos o pedido ${id}`
          }
          description="Só vê aqui os pedidos da sua superfície. Abra o pedido a partir da fila."
          action={
            <Button asChild variant="outline">
              <Link href={routes.operador.home}>Ver a fila</Link>
            </Button>
          }
        />
      </>
    );
  }
  return <Detail request={request} />;
}

function Detail({ request: r }: { request: ServiceRequest }) {
  const now = useNow();
  const agents = useAgentMap();
  const requests = useStore((s) => s.requests);
  const client = useStore((s) => s.clients.find((c) => c.id === r.clientId));
  const agent = r.agentId ? agents.get(r.agentId) : undefined;
  const late = getFlags(r, now).late;
  const availability = agent ? AGENT_AVAILABILITY[agentAvailability(agent.id, requests)] : undefined;

  return (
    <>
      <Back />
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono tracking-[-0.01em] tabular">{r.id}</span>
            <StatusBadge status={r.status} />
            {late && <ToneBadge tone="error">Atrasado</ToneBadge>}
            {r.priority === "urgente" && <ToneBadge tone="tag">Urgente</ToneBadge>}
          </span>
        }
        description={requestTitle(r)}
      />

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_19rem] md:items-start">
        <aside className="flex flex-col gap-4 md:order-2">
          <section aria-labelledby="agente" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
            <h2 id="agente" className="text-base font-semibold">
              Agente
            </h2>
            {agent ? (
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-ink">{agent.name}</span>
                  <span className="font-mono text-xs text-ink-2 tabular">{agent.code}</span>
                </div>
                {availability && <ToneBadge tone={availability.tone}>{availability.label}</ToneBadge>}
              </div>
            ) : (
              <p className="text-sm text-ink-2">Ainda sem agente. O pedido está na fila da superfície.</p>
            )}
            {isAssignable(r) ? (
              <AssignSheet request={r}>
                <Button variant={agent ? "outline" : "default"} size="lg" className="w-full">
                  {agent ? "Reatribuir a outro agente" : "Atribuir a um agente"}
                </Button>
              </AssignSheet>
            ) : (
              <p className="text-sm text-ink-2">
                O agente já submeteu a resposta ou o pedido terminou. Não é possível reatribuir.
              </p>
            )}
          </section>

          <dl className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 text-sm">
            <Row label="Cliente">
              <span className="flex flex-wrap items-center gap-1.5">
                {client && <ClientKindBadge kind={client.kind} />}
                <span>{client ? clientDisplayName(client) : "-"}</span>
              </span>
            </Row>
            <Row label="Tipo de pedido">{requestKindLabel(r.items)}</Row>
            <Row label="Valor">
              <Money amount={r.amounts.gross} />
              <span className="block text-xs text-ink-2">
                Líquido <Money amount={r.amounts.net} /> (conta para o objectivo após o pagamento)
              </span>
            </Row>
            <Row label="Prioridade">
              {PRIORITY[r.priority].label}
              <span className="block text-xs text-ink-2">Só informativa, não altera o preço.</span>
            </Row>
            <Row label="Pedido em" mono>
              {formatDateTime(r.createdAt)}
            </Row>
            <Row label="Resposta esperada até" mono>
              {formatDateTime(new Date(dueAt(r)).toISOString())}
            </Row>
            {r.cancelReason && <Row label="Motivo do cancelamento">{r.cancelReason}</Row>}
          </dl>
        </aside>

        <div className="flex min-w-0 flex-col gap-8 md:order-1">
          <section aria-labelledby="itens" className="flex flex-col gap-3">
            <h2 id="itens" className="flex items-baseline gap-2 text-base font-semibold">
              Itens <span className="font-mono text-sm font-normal text-ink-2 tabular">{r.items.length}</span>
            </h2>
            <ol className="flex flex-col gap-2">
              {r.items.map((item, i) => {
                const variations = formatVariations(item.variations);
                return (
                  <li key={item.id} className="flex gap-3 rounded-lg border border-line bg-surface p-4">
                    <span className="font-mono text-sm text-ink-2 tabular">{i + 1}.</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-medium text-ink">{item.name}</span>
                      <span className="text-sm text-ink-2">
                        {CATEGORY_LABEL[item.category]}
                        {item.brand && `, ${item.brand}`}
                      </span>
                      {item.characteristics && <span className="text-sm text-ink-2">{item.characteristics}</span>}
                      {variations && <span className="text-sm text-ink-2">{variations}</span>}
                    </div>
                    {item.photo && (
                      <ProductPhoto src={item.photo} alt={`Referência: ${item.name}`} ratio="1/1" className="w-16 shrink-0" sizes="64px" />
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          {r.rejections.length > 0 && (
            <section aria-labelledby="rejeicoes" className="flex flex-col gap-3">
              <h2 id="rejeicoes" className="text-base font-semibold">
                Rejeições
              </h2>
              <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
                {r.rejections.map((x) => (
                  <li key={`${x.agentId}-${x.at}`} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
                    <span className="font-mono text-xs text-ink-2 tabular">
                      {agents.get(x.agentId)?.code ?? x.agentId} <span aria-hidden>·</span> {formatDateTime(x.at)}
                    </span>
                    <span>{x.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="historico" className="flex flex-col gap-3">
            <h2 id="historico" className="text-base font-semibold">
              Histórico
            </h2>
            <Timeline events={r.timeline} newestFirst />
          </section>
        </div>
      </div>
    </>
  );
}

function Row({ label, mono, children }: { label: string; mono?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-ink-2">{label}</dt>
      <dd className={mono ? "font-mono tabular" : undefined}>{children}</dd>
    </div>
  );
}
