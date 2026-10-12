"use client";

import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  FileMagnifyingGlassIcon,
  HourglassIcon,
  PlayIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useNow } from "@/components/agente/use-now";
import { EmptyState } from "@/components/empty-state";
import { PriceTag } from "@/components/price-tag";
import { ProductPhoto } from "@/components/product-photo";
import { Receipt, ReceiptNote, ReceiptRow, ReceiptRule, ReceiptTotal } from "@/components/receipt";
import {
  ClientKindBadge,
  ReferenceStatusBadge,
  RequestKindBadge,
  StatusBadge,
  ToneBadge,
} from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import { formatReference, referenceDisplayStatus } from "@/lib/finance";
import { formatDateTime, formatKz } from "@/lib/format";
import { CATEGORY_LABEL, PRIORITY } from "@/lib/labels";
import { requestKindLabel } from "@/lib/pricing";
import { routes } from "@/lib/routes";
import { clientDisplayName, formatVariations, requestTitle, resultsUnlocked } from "@/lib/rules";
import { useRequest, useStore } from "@/lib/store";
import type { Agent, Client, MulticaixaReference, RequestStatus, ServiceRequest, Surface } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ClientGate } from "./client-gate";
import { LockedResults } from "./locked-results";
import { RequestActions } from "./request-actions";
import { useSurfaceMap } from "./request-row";
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
  const surface = surfaces.get(request.surfaceId);
  const unlocked = resultsUnlocked(request);
  const n = request.items.length;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <BackLink />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-mono text-sm font-medium text-ink tabular">{request.id}</span>
          <StatusBadge status={request.status} />
          <RequestKindBadge kind={request.kind} />
        </div>
        <h1 className="measure text-[1.75rem] sm:text-[2.25rem]">{requestTitle(request)}</h1>
        <p className="text-sm text-ink-2">
          {requestKindLabel(n)}, {n} {n === 1 ? "item" : "itens"}. {surface?.name ?? request.surfaceId}
          {surface && `, ${surface.area}`}. Submetido a{" "}
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
          {request.status === "resposta_submetida" && request.reference && (
            <PayReference request={request} reference={request.reference} />
          )}
        </div>
        <RequestTalao request={request} client={client} surface={surface} />
      </div>

      <section aria-labelledby="h-resultados" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="h-resultados" className="text-xl">
            Resultados
          </h2>
          {unlocked && (
            <p className="text-sm text-ink-2">Organizados por item. Compare preço, loja e disponibilidade.</p>
          )}
        </div>
        <Results request={request} surface={surface} unlocked={unlocked} />
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
        {request.status !== "cancelado" && (
          <section aria-labelledby="h-accoes" className="flex flex-col gap-4">
            <h2 id="h-accoes" className="text-xl">
              {request.status === "concluido" ? "Algo correu mal?" : "Acções"}
            </h2>
            <RequestActions request={request} />
          </section>
        )}
      </div>
    </div>
  );
}

const STEPS: { label: string; status: RequestStatus }[] = [
  { label: "Submetido", status: "submetido" },
  { label: "Em fila", status: "aguarda_atribuicao" },
  { label: "Agente", status: "agente_atribuido" },
  { label: "No terreno", status: "em_consulta" },
  { label: "A pagar", status: "resposta_submetida" },
  { label: "Pago", status: "pagamento_confirmado" },
  { label: "Concluída", status: "concluido" },
];

/** Where the request is, as a strip of seven marks. Hidden for cancelled requests. */
function Progress({ status }: { status: RequestStatus }) {
  if (status === "cancelado") return null;
  const at = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label={`Passo ${at + 1} de ${STEPS.length}`}>
      {STEPS.map((s, i) => (
        <li key={s.label} className="flex min-w-0 flex-col gap-1.5" aria-current={i === at ? "step" : undefined}>
          <span
            aria-hidden
            className={cn("h-1.5 rounded-full", i < at ? "bg-ink" : i === at ? "bg-tag ring-1 ring-ink" : "bg-paper-2")}
          />
          <span
            className={cn(
              "truncate text-[0.625rem] sm:text-xs",
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
    submetido: "Recebemos o pedido. Vai para a fila da superfície escolhida.",
    aguarda_atribuicao:
      "O operador da superfície vai atribuir o pedido a um agente credenciado. Recebe um aviso logo que for atribuído.",
    agente_atribuido: `${who} recebeu o pedido e vai aceitá-lo em breve.`,
    em_consulta: `${who} está no terreno a recolher preços, disponibilidade e fotografias.`,
    resposta_submetida: `${who} já respondeu. Pague ${formatKz(request.amounts.gross)} à plataforma com a referência Multicaixa abaixo. Os resultados abrem quando o pagamento for confirmado.`,
    pagamento_confirmado: "A plataforma confirmou o pagamento. Os resultados estão disponíveis abaixo.",
    concluido: "Consulta concluída. Os resultados ficam guardados aqui.",
    cancelado: `Pedido cancelado.${request.cancelReason ? ` Motivo: ${request.cancelReason}.` : ""}`,
  };
  return <p className="measure text-[0.9375rem] leading-relaxed text-ink">{text[request.status]}</p>;
}

/** Copy-to-clipboard icon button that confirms with a check for a moment. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      toast.success(`${label} copiad${label === "Entidade" || label === "Referência" ? "a" : "o"}`);
      window.setTimeout(() => setDone(false), 1600);
    } catch {
      toast.error("Não foi possível copiar. Escreva o valor manualmente.");
    }
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={copy}
      aria-label={`Copiar ${label.toLowerCase()}`}
      className="-my-2 -mr-3 shrink-0 text-ink-2"
    >
      {done ? <CheckIcon weight="bold" className="text-success" /> : <CopyIcon />}
    </Button>
  );
}

function RefLine({ label, value, copy, big }: { label: string; value: string; copy: string; big?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-ink-2">{label}</span>
      <span className={cn("min-w-0 flex-1 font-mono text-ink tabular", big ? "text-xl font-semibold" : "text-base")}>
        {value}
      </span>
      <CopyButton value={copy} label={label} />
    </div>
  );
}

/** Multicaixa reference to pay the platform (CHANGES-v2 §5). Demo values. */
function PayReference({ request, reference: ref }: { request: ServiceRequest; reference: MulticaixaReference }) {
  const now = useNow(60_000);
  const status = referenceDisplayStatus(ref, now);
  const expired = status === "expirada";

  const simulate = () => {
    const res = useStore.getState().confirmReferencePayment(request.id, "demo");
    if (!res.ok) toast.error(res.error);
    else toast.success("Pagamento confirmado (simulação). Resultados desbloqueados.");
  };
  const regenerate = () => {
    const res = useStore.getState().regenerateReference(request.id);
    if (!res.ok) toast.error(res.error);
    else toast.success("Nova referência gerada.");
  };

  return (
    <section aria-labelledby="h-pagar" className="flex max-w-xl flex-col gap-3">
      <h2 id="h-pagar" className="sr-only">
        Pagar por referência Multicaixa
      </h2>
      <Receipt
        title="Pagamento por referência"
        meta={
          <span className="inline-flex items-center gap-2">
            <ReferenceStatusBadge status={status} />
            {ref.demo && <ToneBadge tone="neutral">Demonstração</ToneBadge>}
          </span>
        }
      >
        <p className="text-ink">
          Pague em qualquer ATM ou no Multicaixa Express: <span className="font-medium">Pagamentos</span>, depois{" "}
          <span className="font-medium">Pagamento por referência</span>.
        </p>
        <ReceiptRule />
        <div className={cn("flex flex-col gap-3", expired && "opacity-50")}>
          <RefLine label="Entidade" value={ref.entity} copy={ref.entity} />
          <RefLine label="Referência" value={formatReference(ref.reference)} copy={ref.reference} big />
          <div className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-ink-2">Montante</span>
            <PriceTag amount={ref.amount} size="lg" label="Montante a pagar" className="flex-1 self-start" />
            <CopyButton value={String(ref.amount)} label="Montante" />
          </div>
        </div>
        <ReceiptRule />
        <ReceiptRow
          label={expired ? "Expirou a" : "Válida até"}
          value={formatDateTime(ref.expiresAt)}
          className={expired ? "text-error" : undefined}
        />
        <ReceiptRow label="Pedido" value={request.id} />
        <ReceiptRule />
        <ReceiptNote>
          O pagamento é feito à plataforma Melhor Preço, nunca ao agente. Os resultados abrem quando a plataforma
          confirmar o pagamento. Entidade e referência fictícias, só para demonstração.
        </ReceiptNote>
      </Receipt>
      <div className="flex flex-wrap gap-2">
        {expired && (
          <Button variant="default" onClick={regenerate}>
            <ArrowClockwiseIcon data-icon="inline-start" />
            Gerar nova referência
          </Button>
        )}
        {ref.demo && !expired && (
          <Button variant="outline" onClick={simulate}>
            <PlayIcon data-icon="inline-start" />
            Simular pagamento da referência
          </Button>
        )}
      </div>
      {ref.demo && !expired && (
        <p className="text-[0.8125rem] text-ink-2">
          Só existe nesta demonstração: faz de conta que o banco confirmou o pagamento.
        </p>
      )}
    </section>
  );
}

function paymentLine(r: ServiceRequest): string {
  switch (r.status) {
    case "resposta_submetida":
      return "Referência por pagar";
    case "pagamento_confirmado":
    case "concluido":
      return r.paidAt ? `Pago, ${formatDateTime(r.paidAt)}` : "Pago";
    case "cancelado":
      return "Sem pagamento";
    default:
      return "Só depois da resposta";
  }
}

/** The request as a talão: who, what, where, by when and for how much. */
function RequestTalao({ request, client, surface }: { request: ServiceRequest; client: Client; surface?: Surface }) {
  const a = request.amounts;
  return (
    <aside aria-label="Talão do pedido">
      <Receipt title="Talão do pedido" meta={request.id}>
        <div className="flex flex-col gap-1.5">
          <ReceiptRow
            label="Cliente"
            value={<ClientKindBadge kind={client.kind} />}
            mono={false}
          />
          <p className="font-medium text-ink">{clientDisplayName(client)}</p>
          {client.kind === "empresa" && client.company && (
            <>
              <ReceiptRow label="NIF" value={client.company.nif} />
              <ReceiptRow label="Responsável" value={client.name} mono={false} />
            </>
          )}
        </div>
        <ReceiptRule />
        <ol className="flex flex-col gap-3">
          {request.items.map((it, i) => {
            const variations = formatVariations(it.variations);
            return (
              <li key={it.id} className="flex gap-3">
                <span className="w-5 shrink-0 font-mono text-ink-2 tabular">{i + 1}.</span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium text-ink">{it.name}</span>
                  <span className="text-xs text-ink-2">
                    {CATEGORY_LABEL[it.category]}
                    {it.brand && `, ${it.brand}`}
                  </span>
                  {it.characteristics && <span className="text-xs text-ink-2">{it.characteristics}</span>}
                  {variations && <span className="text-xs text-ink-2">{variations}</span>}
                </div>
                {it.photo && (
                  <ProductPhoto
                    src={it.photo}
                    alt={`Fotografia de referência: ${it.name}`}
                    ratio="1/1"
                    sizes="48px"
                    className="w-12 shrink-0"
                  />
                )}
              </li>
            );
          })}
        </ol>
        <ReceiptRule />
        <ReceiptRow label="Superfície" value={surface?.name ?? request.surfaceId} mono={false} />
        <ReceiptRow label="Prioridade" value={PRIORITY[request.priority].label} mono={false} />
        {request.deadline && <ReceiptRow label="Resposta até" value={formatDateTime(request.deadline)} />}
        <ReceiptRow label="Submetido" value={formatDateTime(request.createdAt)} />
        {request.respondedAt && <ReceiptRow label="Respondido" value={formatDateTime(request.respondedAt)} />}
        <ReceiptRule />
        <ReceiptRow label={requestKindLabel(a.itemCount)} value={`${a.itemCount} × ${formatKz(a.unitPrice)}`} />
        <ReceiptRow label="Pagamento" value={paymentLine(request)} mono={false} />
        <ReceiptTotal label="Valor da consulta" amount={a.gross} />
        <ReceiptNote>Impostos e taxas incluídos ({formatKz(a.taxes)}).</ReceiptNote>
      </Receipt>
    </aside>
  );
}

function Results({
  request,
  surface,
  unlocked,
}: {
  request: ServiceRequest;
  surface?: Surface;
  unlocked: boolean;
}) {
  if (unlocked) return <ResultsBoard request={request} surface={surface} />;
  if (request.status === "resposta_submetida") return <LockedResults request={request} />;
  if (request.status === "cancelado")
    return <p className="text-sm text-ink-2">Este pedido foi cancelado antes de haver resultados.</p>;
  return (
    <EmptyState
      icon={<HourglassIcon />}
      title="Ainda sem resultados"
      description="Quando o agente submeter a resposta, vê aqui quantas ofertas encontrou por item e a referência Multicaixa para pagar."
    />
  );
}
