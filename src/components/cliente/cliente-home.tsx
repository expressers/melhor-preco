"use client";

import { ArrowRightIcon, MagnifyingGlassIcon, PlusIcon, SignOutIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PriceTag } from "@/components/price-tag";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { useRequests, useStore } from "@/lib/store";
import type { Client, RequestStatus, ServiceRequest } from "@/lib/types";
import { ClientGate } from "./client-gate";
import { RequestList, surfaceNames, useSurfaceMap } from "./request-row";

const IN_PROGRESS: RequestStatus[] = ["submetido", "aguarda_atribuicao", "agente_atribuido", "em_consulta"];
const READY: RequestStatus[] = ["pagamento_confirmado"];

export function ClienteHome() {
  return <ClientGate>{(client) => <Home client={client} />}</ClientGate>;
}

function Home({ client }: { client: Client }) {
  const router = useRouter();
  const requests = useRequests({ clientId: client.id });
  const toPay = requests.filter((r) => r.status === "resposta_submetida");
  const ready = requests.filter((r) => READY.includes(r.status));
  const inProgress = requests.filter((r) => IN_PROGRESS.includes(r.status));
  const recent = requests.filter((r) => r.status === "concluido").slice(0, 3);
  const first = client.name.split(" ")[0];

  const logout = () => {
    useStore.getState().logout();
    router.push(routes.cliente.entrar);
  };

  const summary =
    toPay.length > 0
      ? `Tem ${toPay.length === 1 ? "uma resposta" : `${toPay.length} respostas`} à espera de pagamento ao agente.`
      : inProgress.length > 0
        ? `${inProgress.length === 1 ? "Um pedido está" : `${inProgress.length} pedidos estão`} a ser tratado${inProgress.length === 1 ? "" : "s"} pelos agentes.`
        : "Diga-nos o que procura e um agente vai ao local por si.";

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.75rem] sm:text-[2.25rem]">Olá, {first}.</h1>
          <p className="measure text-[0.9375rem] text-ink-2">{summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="tag" size="lg">
            <Link href={routes.cliente.nova}>
              <PlusIcon data-icon="inline-start" weight="bold" />
              Nova consulta
            </Link>
          </Button>
          <Button variant="ghost" size="lg" onClick={logout}>
            <SignOutIcon data-icon="inline-start" />
            Sair
          </Button>
        </div>
      </header>

      {toPay.length > 0 && (
        <section aria-labelledby="h-pagar" className="flex flex-col gap-3">
          <h2 id="h-pagar" className="text-lg">
            Precisa da sua atenção
          </h2>
          <ul className="flex flex-col gap-3">
            {toPay.map((r) => (
              <li key={r.id}>
                <PayCard request={r} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {ready.length > 0 && (
        <Section id="h-prontos" title="Resultados disponíveis" requests={ready} />
      )}

      {inProgress.length > 0 && <Section id="h-curso" title="Em curso" requests={inProgress} />}

      {requests.length === 0 ? (
        <EmptyState
          icon={<MagnifyingGlassIcon />}
          title="Ainda não fez nenhuma consulta"
          description="Escolha o produto e as superfícies comerciais. Vê o preço da consulta antes de confirmar, a partir de 600 Kz."
          action={
            <Button asChild variant="outline">
              <Link href={routes.cliente.nova}>Fazer a primeira consulta</Link>
            </Button>
          }
        />
      ) : (
        recent.length > 0 && <Section id="h-recentes" title="Concluídas recentemente" requests={recent} />
      )}

      {requests.length > 0 && (
        <Link
          href={routes.cliente.pedidos}
          className="press inline-flex min-h-11 items-center gap-2 self-start rounded-full text-sm font-medium text-ink underline decoration-ink/30 underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 hover-fine:decoration-ink"
        >
          Ver todos os pedidos ({requests.length})
          <ArrowRightIcon className="size-4" />
        </Link>
      )}
    </div>
  );
}

function Section({ id, title, requests }: { id: string; title: string; requests: ServiceRequest[] }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-lg">
        {title}
      </h2>
      <RequestList requests={requests} />
    </section>
  );
}

/** Answer waiting for payment: the one thing the client must act on. */
function PayCard({ request }: { request: ServiceRequest }) {
  const map = useSurfaceMap();
  return (
    <Link
      href={routes.cliente.pedido(request.id)}
      className="press group flex flex-col gap-4 rounded-lg border border-ink bg-surface p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-[0.8125rem] font-medium text-ink tabular">{request.id}</span>
        <p className="text-base leading-snug font-semibold text-ink">{request.description}</p>
        <p className="text-sm text-ink-2">
          {surfaceNames(request.surfaceIds, map)}. O agente já respondeu: pague-lhe por Multicaixa Express para
          desbloquear os resultados.
        </p>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
        <PriceTag amount={request.price} size="lg" label="Valor a pagar" />
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
          Ver dados de pagamento
          <ArrowRightIcon className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
