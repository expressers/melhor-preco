"use client";

import { ArrowLeftIcon, CheckIcon, FileXIcon, MapPinIcon, PaperPlaneTiltIcon, WalletIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PriceTag } from "@/components/price-tag";
import { ProductPhoto } from "@/components/product-photo";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { CATEGORY_LABEL, PRIORITY } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { dueAt } from "@/lib/rules";
import { useCurrentAgent, useRequest, useStore } from "@/lib/store";
import type { Agent, ServiceRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AwaitingPayment, ConfirmPaymentDialog, PaymentDone } from "./payment";
import { RejectSheet } from "./reject-sheet";
import { RESULT_FORM_ID, ResultForm } from "./result-form";
import { ActionBar, NoAgent, useSurfaceNames } from "./shared";
import { useNow } from "./use-now";

function BackLink() {
  return (
    <Link
      href={routes.agente.home}
      className="press -ml-2 mb-4 inline-flex h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-ink-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 hover-fine:text-ink"
    >
      <ArrowLeftIcon className="size-4" aria-hidden />
      Tarefas
    </Link>
  );
}

export function TaskDetail() {
  const id = useSearchParams().get("id");
  const request = useRequest(id);
  const agent = useCurrentAgent();
  const rejectedByMe = !!agent && !!request && request.rejections.some((r) => r.agentId === agent.id);

  if (!agent) {
    return (
      <>
        <BackLink />
        <NoAgent />
      </>
    );
  }

  if (!request || (request.agentId !== agent.id && !rejectedByMe)) {
    return (
      <>
        <BackLink />
        <EmptyState
          icon={<FileXIcon />}
          title="Tarefa não encontrada"
          description={
            id
              ? `O pedido ${id} não existe ou não está atribuído a si.`
              : "Abra uma tarefa a partir da sua lista."
          }
          action={
            <Button asChild variant="outline">
              <Link href={routes.agente.home}>Ver as minhas tarefas</Link>
            </Button>
          }
        />
      </>
    );
  }

  return <TaskBody key={request.id} request={request} agent={agent} rejectedByMe={request.agentId !== agent.id} />;
}

function TaskBody({
  request,
  agent,
  rejectedByMe,
}: {
  request: ServiceRequest;
  agent: Agent;
  rejectedByMe: boolean;
}) {
  const router = useRouter();
  const surfaceName = useSurfaceNames();
  const surfaces = useStore((s) => s.surfaces);
  const now = useNow();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const due = dueAt(request);
  const status = request.status;
  const late = ["agente_atribuido", "em_consulta"].includes(status) && now > due;

  function accept() {
    const res = useStore.getState().acceptRequest(request.id);
    if (!res.ok) return toast.error(res.error);
    toast.success("Pedido aceite", { description: "Boa consulta. Submeta a resposta quando tiver os preços." });
    window.scrollTo({ top: 0 });
  }

  const showForm = !rejectedByMe && status === "em_consulta";

  return (
    <>
      <BackLink />

      {/* Head: what, where, how much */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {request.priority === "urgente" && (
            <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">Urgente</span>
          )}
        </div>
        <h1 className="text-2xl leading-tight sm:text-[1.75rem]">{request.description}</h1>
        <p className="font-mono text-sm text-ink-2 tabular">
          {request.id} <span aria-hidden>·</span> <span className="font-sans">{CATEGORY_LABEL[request.category]}</span>
        </p>
      </header>

      {rejectedByMe && (
        <p className="mt-5 rounded-lg bg-paper-2 px-4 py-3 text-sm text-ink-2">
          Rejeitou este pedido. Já não está atribuído a si.
        </p>
      )}

      <div className="mt-6 flex items-end justify-between gap-4 border-y border-line py-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-ink-2">Fica para si</span>
          <PriceTag amount={request.agentShare} size="lg" label="A sua parte" />
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className="text-sm text-ink-2">{PRIORITY[request.priority].label}, até</span>
          <span className={cn("font-mono text-sm tabular", late ? "font-semibold text-error" : "text-ink")}>
            {formatDateTime(new Date(due).toISOString())}
          </span>
          {late && <span className="text-xs font-semibold text-error">Prazo ultrapassado</span>}
        </div>
      </div>

      {/* Brief from the client */}
      <section aria-labelledby="pedido" className="mt-6 flex flex-col gap-5">
          <h2 id="pedido" className="sr-only">
            Pedido do cliente
          </h2>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-ink-2">Onde procurar</h3>
            <ul className="flex flex-col gap-2">
              {request.surfaceIds.map((sid) => {
                const s = surfaces.find((x) => x.id === sid);
                return (
                  <li key={sid} className="flex items-start gap-3 rounded-lg bg-surface p-3.5 ring-1 ring-line">
                    <MapPinIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-ink" weight="fill" />
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{surfaceName(sid)}</p>
                      {s && (
                        <p className="text-sm text-ink-2">
                          {s.area}
                          {s.location ? `, ${s.location}` : ""}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            {request.brand && <Spec term="Marca ou modelo" value={request.brand} />}
            {request.features && <Spec term="Características pretendidas" value={request.features} />}
            {request.variants && <Spec term="Cores, tamanhos, variantes" value={request.variants} />}
            <Spec term="Pedido feito em" value={formatDateTime(request.createdAt)} mono />
          </dl>

          {request.photo && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-ink-2">Foto de referência do cliente</h3>
              <ProductPhoto
                src={request.photo}
                alt={`Referência: ${request.description}`}
                ratio="4/3"
                className="max-w-sm"
              />
            </div>
          )}
      </section>

      {/* State-specific block */}
      {!rejectedByMe && (
        <div className="mt-8">
          {status === "agente_atribuido" && (
            <p className="rounded-lg bg-paper-2 px-4 py-3 text-[0.9375rem] text-ink">
              Leia o pedido e aceite se consegue ir {request.surfaceIds.length > 1 ? "às superfícies" : "à superfície"}{" "}
              dentro do prazo. Se não conseguir, rejeite para que outro agente o faça.
            </p>
          )}
          {showForm && (
            <div className="flex flex-col gap-6">
              <ResultForm request={request} onSubmitted={() => window.scrollTo({ top: 0 })} />
              <Button
                type="button"
                variant="link"
                className="self-start text-ink-2"
                onClick={() => setRejectOpen(true)}
              >
                Não consigo fazer esta consulta
              </Button>
            </div>
          )}
          {status === "resposta_submetida" && <AwaitingPayment request={request} agent={agent} />}
          {(status === "pagamento_confirmado" || status === "concluido") && <PaymentDone request={request} />}
          {status === "cancelado" && (
            <p className="rounded-lg bg-error/10 px-4 py-3 text-[0.9375rem] text-error">
              Pedido cancelado{request.cancelReason ? `: ${request.cancelReason}` : "."}
            </p>
          )}
        </div>
      )}

      <section aria-labelledby="historico" className="mt-10 flex flex-col gap-4">
        <h2 id="historico" className="text-base font-semibold text-ink">
          Histórico do pedido
        </h2>
        <Timeline events={request.timeline} newestFirst />
      </section>

      {/* Thumb-reach actions */}
      {!rejectedByMe && status === "agente_atribuido" && (
        <ActionBar>
          <Button variant="outline" onClick={() => setRejectOpen(true)}>
            Rejeitar
          </Button>
          <Button variant="tag" onClick={accept}>
            <CheckIcon weight="bold" />
            Aceitar tarefa
          </Button>
        </ActionBar>
      )}
      {showForm && (
        <ActionBar>
          <Button type="submit" form={RESULT_FORM_ID} variant="tag">
            <PaperPlaneTiltIcon weight="bold" />
            Submeter resposta
          </Button>
        </ActionBar>
      )}
      {!rejectedByMe && status === "resposta_submetida" && (
        <ActionBar note="Só quando o valor já estiver na sua conta.">
          <Button variant="tag" onClick={() => setPayOpen(true)}>
            <WalletIcon weight="bold" />
            Confirmar recepção do pagamento
          </Button>
        </ActionBar>
      )}

      {!rejectedByMe && (
        <RejectSheet
          requestId={request.id}
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          onDone={() => router.push(routes.agente.home)}
        />
      )}
      {status === "resposta_submetida" && (
        <ConfirmPaymentDialog request={request} open={payOpen} onOpenChange={setPayOpen} />
      )}
    </>
  );
}

function Spec({ term, value, mono }: { term: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-ink-2">{term}</dt>
      <dd className={cn("text-[0.9375rem] text-ink", mono && "font-mono tabular")}>{value}</dd>
    </div>
  );
}
