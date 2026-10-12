"use client";

import { ArrowLeftIcon, CopyIcon, FileMagnifyingGlassIcon, HourglassIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PriceTag } from "@/components/price-tag";
import { ProductPhoto } from "@/components/product-photo";
import { Receipt, ReceiptNote, ReceiptRow, ReceiptRule, ReceiptTotal } from "@/components/receipt";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import { formatReference, isReferenceExpired } from "@/lib/finance";
import { formatDateTime, formatKz } from "@/lib/format";
import { CATEGORY_LABEL, PRIORITY } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { resultsUnlocked, requestTitle, formatVariations } from "@/lib/rules";
import { useRequest, useStore } from "@/lib/store";
import type { Agent, Client, RequestStatus, ServiceRequest, Surface } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ClientGate } from "./client-gate";
import { LockedResults } from "./locked-results";
import { RequestActions } from "./request-actions";
import { surfaceNames, useSurfaceMap } from "./request-row";
import { ResultsBoard } from "./results-board";

export function PedidoDetail() {
  const id = useSearchParams().get("id");
  return <ClientGate>{(client) => <Detail id={id} client={client} />}</ClientGate>;
}

function BackLink() {
  return (
    <Link
      href={routes.cliente.pedidos}
      className="press -ml-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-full px-2 text-sm font-medium text-ink-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 hover-fine:text-ink"
    >
      <ArrowLeftIcon className="size-4" />
      Os meus pedidos
    </Link>
  );
}

function Detail({ id, client }: { id: string | null; client: Client }) {
  const request = useRequest(id);
  const agents = useStore((s) => s.agents);
  const surfaces = useSurfaceMap();

  if (!request || request.clientId !== client.id) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <EmptyState
          icon={<FileMagnifyingGlassIcon />}
          title={id ? `Não encontrámos o pedido ${id}` : "Falta o número do pedido"}
          description="Pode ter sido feito noutra conta ou o endereço está incompleto. Os seus pedidos estão todos na lista."
          action={
            <Button asChild variant="outline">
              <Link href={routes.cliente.pedidos}>Ver os meus pedidos</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const agent = agents.find((a) => a.id === request.agentId);
  const unlocked = resultsUnlocked(request);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <BackLink />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-mono text-sm font-medium text-ink tabular">{request.id}</span>
          <StatusBadge status={request.status} />
        </div>
        <h1 className="measure text-[1.75rem] sm:text-[2.25rem]">{requestTitle(request)}</h1>
        <p className="text-sm text-ink-2">
          {CATEGORY_LABEL[request.items[0].category]}. {surfaceNames([request.surfaceId], surfaces)}. Submetido a{" "}
          <time dateTime={request.createdAt} className="font-mono tabular">
            {formatDateTime(request.createdAt)}
          </time>
          .
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-6">
          <Progress status={request.status} />
          <NextStep request={request} agent={agent} />
          {request.status === "resposta_submetida" && <PayReference request={request} />}
        </div>
        <RequestTalao request={request} surfaces={surfaces} />
      </div>

      <section aria-labelledby="h-resultados" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="h-resultados" className="text-xl">
            Resultados
          </h2>
          {unlocked && (
            <p className="text-sm text-ink-2">Organizados por superfície. Compare preço, loja e disponibilidade.</p>
          )}
        </div>
        <Results request={request} surfaces={surfaces} unlocked={unlocked} />
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="h-historico" className="flex flex-col gap-4">
          <h2 id="h-historico" className="text-xl">
            Histórico
          </h2>
          <div className="rounded-lg border border-line bg-surface p-5">
            <Timeline events={request.timeline} />
          </div>
        </section>
        {request.status !== "cancelado" && request.status !== "concluido" && (
          <section aria-labelledby="h-accoes" className="flex flex-col gap-4">
            <h2 id="h-accoes" className="text-xl">
              Acções
            </h2>
            <RequestActions request={request} />
          </section>
        )}
        {request.status === "concluido" && (
          <section aria-labelledby="h-accoes" className="flex flex-col gap-4">
            <h2 id="h-accoes" className="text-xl">
              Algo correu mal?
            </h2>
            <RequestActions request={request} />
          </section>
        )}
      </div>
    </div>
  );
}

const STEPS: { label: string; statuses: RequestStatus[] }[] = [
  { label: "Submetido", statuses: ["submetido", "aguarda_atribuicao"] },
  { label: "Agente", statuses: ["agente_atribuido"] },
  { label: "No terreno", statuses: ["em_consulta"] },
  { label: "Resposta", statuses: ["resposta_submetida"] },
  { label: "Pago", statuses: ["pagamento_confirmado"] },
  { label: "Concluída", statuses: ["concluido"] },
];

/** Where the request is, as a strip of six marks. Hidden for cancelled requests. */
function Progress({ status }: { status: RequestStatus }) {
  if (status === "cancelado") return null;
  const at = STEPS.findIndex((s) => s.statuses.includes(status));
  return (
    <ol className="grid grid-cols-6 gap-1.5" aria-label={`Passo ${at + 1} de ${STEPS.length}`}>
      {STEPS.map((s, i) => (
        <li key={s.label} className="flex min-w-0 flex-col gap-1.5" aria-current={i === at ? "step" : undefined}>
          <span
            aria-hidden
            className={cn("h-1.5 rounded-full", i < at ? "bg-ink" : i === at ? "bg-tag ring-1 ring-ink" : "bg-paper-2")}
          />
          <span
            className={cn(
              "truncate text-[0.6875rem] sm:text-xs",
              i === at ? "font-semibold text-ink" : i < at ? "text-ink" : "text-ink-2",
            )}
          >
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function NextStep({ request, agent }: { request: ServiceRequest; agent?: Agent }) {
  const who = agent ? `O agente ${agent.code}` : "O agente";
  const text: Record<RequestStatus, string> = {
    submetido: "Recebemos o pedido. Vamos atribuí-lo a um agente credenciado da superfície escolhida.",
    aguarda_atribuicao: "À espera de um agente disponível nesta superfície. Recebe um aviso logo que for atribuído.",
    agente_atribuido: `${who} recebeu o pedido e vai aceitá-lo em breve.`,
    em_consulta: `${who} está no terreno a recolher preços, disponibilidade e fotografias.`,
    resposta_submetida: `${who} já respondeu. Pague ${formatKz(request.amounts.gross)} com a referência Multicaixa para desbloquear os resultados.`,
    pagamento_confirmado: "A plataforma confirmou o pagamento. Os resultados estão disponíveis abaixo.",
    concluido: "Consulta concluída. Os resultados ficam guardados aqui.",
    cancelado: `Pedido cancelado.${request.cancelReason ? ` Motivo: ${request.cancelReason}.` : ""}`,
  };
  return <p className="measure text-[0.9375rem] leading-relaxed text-ink">{text[request.status]}</p>;
}

/**
 * TEMPORARY (domain step): Multicaixa reference to pay the platform (CHANGES §5).
 * The cliente worker owns the final talão; the demo button stays.
 */
function PayReference({ request }: { request: ServiceRequest }) {
  const ref = request.reference;
  if (!ref) return null;
  const expired = isReferenceExpired(ref);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref.reference);
      toast.success("Referência copiada");
    } catch {
      toast.error("Não foi possível copiar. Escreva a referência manualmente.");
    }
  };
  const simulate = () => {
    const res = useStore.getState().confirmReferencePayment(request.id, "demo");
    if (!res.ok) toast.error(res.error);
    else toast.success("Pagamento simulado: resultados desbloqueados.");
  };

  return (
    <Receipt title="Pagar por referência Multicaixa" meta={request.id} className="max-w-xl">
      <div className="flex flex-col gap-1 py-1">
        <span className="text-ink-2">Montante</span>
        <PriceTag amount={ref.amount} size="xl" label="Montante a pagar" className="self-start" />
      </div>
      <ReceiptRule />
      <ReceiptRow label="Entidade" value={ref.entity} />
      <div className="flex items-center gap-2">
        <span className="text-ink-2">Referência</span>
        <span aria-hidden className="h-px flex-1 self-end border-b border-dotted border-line" style={{ marginBottom: "0.35em" }} />
        <span className="font-mono text-base font-semibold text-ink tabular">{formatReference(ref.reference)}</span>
        <Button variant="ghost" size="icon-sm" onClick={copy} aria-label="Copiar referência" className="-my-1 -mr-2 size-11">
          <CopyIcon />
        </Button>
      </div>
      <ReceiptRow label="Válida até" value={expired ? "Expirada" : formatDateTime(ref.expiresAt)} />
      <ReceiptRule />
      <ReceiptNote>
        Pague em qualquer ATM ou no Multicaixa Express. Os resultados abrem quando a plataforma confirmar o pagamento.
        Valores de demonstração: esta entidade e referência são fictícias.
      </ReceiptNote>
      <Button variant="outline" onClick={simulate} className="mt-2 self-start">
        Simular pagamento da referência (demonstração)
      </Button>
    </Receipt>
  );
}

function paymentLine(r: ServiceRequest): string {
  switch (r.status) {
    case "resposta_submetida":
      return "Pendente";
    case "pagamento_confirmado":
    case "concluido":
      return r.paidAt ? `Confirmado, ${formatDateTime(r.paidAt)}` : "Confirmado";
    case "cancelado":
      return "Sem pagamento";
    default:
      return "Só depois da resposta";
  }
}

/** The request as a talão: what was asked, where, by when and for how much. */
function RequestTalao({ request, surfaces }: { request: ServiceRequest; surfaces: Map<string, Surface> }) {
  return (
    <aside aria-label="Resumo do pedido">
      <Receipt title="Talão do pedido" meta={request.id}>
        {request.items[0].photo && (
          <ProductPhoto src={request.items[0].photo} alt="Fotografia de referência enviada" ratio="4/3" sizes="352px" />
        )}
        <ReceiptRow label="Categoria" value={CATEGORY_LABEL[request.items[0].category]} mono={false} />
        {request.items[0].brand && <ReceiptRow label="Marca ou modelo" value={request.items[0].brand} mono={false} />}
        {formatVariations(request.items[0].variations) && <ReceiptRow label="Variantes" value={formatVariations(request.items[0].variations)} mono={false} />}
        {request.items[0].characteristics && (
          <div className="flex flex-col gap-0.5">
            <span className="text-ink-2">Características</span>
            <span className="text-ink">{request.items[0].characteristics}</span>
          </div>
        )}
        <ReceiptRule />
        <div className="flex flex-col gap-1">
          <span className="text-ink-2">Superfícies</span>
          <ul className="flex flex-col gap-0.5">
            {[request.surfaceId].map((sid) => (
              <li key={sid} className="text-ink">
                {surfaces.get(sid)?.name ?? sid}
                {surfaces.get(sid) && <span className="text-ink-2"> · {surfaces.get(sid)!.area}</span>}
              </li>
            ))}
          </ul>
        </div>
        <ReceiptRow label="Prioridade" value={PRIORITY[request.priority].label} mono={false} />
        {request.deadline && <ReceiptRow label="Resposta até" value={formatDateTime(request.deadline)} />}
        <ReceiptRow label="Submetido" value={formatDateTime(request.createdAt)} />
        {request.respondedAt && <ReceiptRow label="Respondido" value={formatDateTime(request.respondedAt)} />}
        <ReceiptRule />
        <ReceiptRow label="Pagamento" value={paymentLine(request)} mono={false} />
        <ReceiptTotal label="Valor da consulta" amount={request.amounts.gross} />
      </Receipt>
    </aside>
  );
}

function Results({
  request,
  surfaces,
  unlocked,
}: {
  request: ServiceRequest;
  surfaces: Map<string, Surface>;
  unlocked: boolean;
}) {
  if (unlocked) return <ResultsBoard request={request} surfaces={surfaces} />;
  if (request.status === "resposta_submetida") return <LockedResults request={request} />;
  if (request.status === "cancelado")
    return <p className="text-sm text-ink-2">Este pedido foi cancelado antes de haver resultados.</p>;
  return (
    <EmptyState
      icon={<HourglassIcon />}
      title="Ainda sem resultados"
      description="Quando o agente submeter a resposta, vê aqui quantos produtos encontrou em cada superfície e os dados para lhe pagar."
    />
  );
}
