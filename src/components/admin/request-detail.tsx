"use client";

import {
  ArrowLeftIcon,
  ArrowUUpLeftIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  UserSwitchIcon,
  WarningIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Money, PriceTag } from "@/components/price-tag";
import { ProductPhoto } from "@/components/product-photo";
import { Receipt, ReceiptRow, ReceiptRule } from "@/components/receipt";
import {
  AvailabilityBadge,
  ComplaintStatusBadge,
  LedgerStatusBadge,
  StatusBadge,
  ToneBadge,
} from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatPhone } from "@/lib/format";
import { CATEGORY_LABEL, PRIORITY, REQUEST_STATUS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { dueAt } from "@/lib/rules";
import { useEligibleAgents, useRequest, useStore } from "@/lib/store";
import type { RequestStatus, ServiceRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Code, ConfirmDialog, FlagBadges, Section, report, useLookups, useNow } from "./kit";

/** States the admin may set by hand. Payment and completion belong to agent and client. */
const MANUAL_STATUSES: RequestStatus[] = [
  "submetido",
  "aguarda_atribuicao",
  "agente_atribuido",
  "em_consulta",
  "resposta_submetida",
];
const ASSIGNABLE: RequestStatus[] = ["submetido", "aguarda_atribuicao", "agente_atribuido", "em_consulta"];
const ADMIN_CANCELLABLE: RequestStatus[] = [...MANUAL_STATUSES];

export function AdminRequestDetail() {
  const id = useSearchParams().get("id");
  const request = useRequest(id);

  if (!request) {
    return (
      <EmptyState
        icon={<MagnifyingGlassIcon />}
        title={id ? `Não encontrámos o pedido ${id}` : "Nenhum pedido indicado"}
        description="Volte à lista de pedidos e abra o pedido a partir dela."
        action={
          <Button asChild variant="outline">
            <Link href={routes.admin.pedidos}>Ver pedidos</Link>
          </Button>
        }
      />
    );
  }
  return <Detail request={request} />;
}

function Detail({ request: r }: { request: ServiceRequest }) {
  const { client, agent, surface } = useLookups();
  const complaints = useStore((s) => s.complaints);
  const ledger = useStore((s) => s.ledger);
  const now = useNow();
  const c = client.get(r.clientId);
  const a = r.agentId ? agent.get(r.agentId) : undefined;
  const reqComplaints = complaints.filter((x) => x.requestId === r.id);
  const agentEntry = ledger.find((l) => l.requestId === r.id && l.kind === "agent_share");
  const commission = ledger.find((l) => l.requestId === r.id && l.kind === "platform_commission");

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 self-start">
        <Link href={routes.admin.pedidos}>
          <ArrowLeftIcon data-icon="inline-start" /> Pedidos
        </Link>
      </Button>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono tracking-[-0.01em] tabular">{r.id}</span>
            <StatusBadge status={r.status} />
            {r.priority === "urgente" && <ToneBadge tone="tag">Urgente</ToneBadge>}
            <FlagBadges request={r} now={now} />
          </span>
        }
        description={r.description}
        actions={
          ADMIN_CANCELLABLE.includes(r.status) ? (
            <ConfirmDialog
              trigger={
                <Button variant="outline" className="text-error">
                  <XCircleIcon data-icon="inline-start" /> Cancelar pedido
                </Button>
              }
              title={`Cancelar ${r.id}?`}
              description="O cliente e o agente são avisados. Um valor ainda não pago ao agente deixa de ser devido. Não é possível reabrir o pedido."
              confirmLabel="Cancelar pedido"
              destructive
              reason={{ label: "Motivo do cancelamento", placeholder: "Ex.: produto fora do âmbito do serviço", required: true }}
              onConfirm={(reason) =>
                report(useStore.getState().cancelRequest(r.id, reason, "admin"), `Pedido ${r.id} cancelado.`)
              }
            />
          ) : null
        }
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-10">
          <Section title="Pedido">
            <dl className="grid gap-x-8 gap-y-4 rounded-lg border border-line bg-surface p-5 sm:grid-cols-2">
              <Field label="Cliente">
                {c ? (
                  <>
                    {c.name}
                    <span className="block font-mono text-ink-2 tabular">{formatPhone(c.phone)}</span>
                    {c.email && <span className="block text-ink-2">{c.email}</span>}
                  </>
                ) : (
                  "-"
                )}
              </Field>
              <Field label="Categoria">{CATEGORY_LABEL[r.category]}</Field>
              {r.brand && <Field label="Marca ou modelo">{r.brand}</Field>}
              {r.features && <Field label="Características">{r.features}</Field>}
              {r.variants && <Field label="Tamanho, cor, variantes">{r.variants}</Field>}
              <Field label="Superfícies">
                <ul>
                  {r.surfaceIds.map((sid) => {
                    const s = surface.get(sid);
                    return (
                      <li key={sid}>
                        {s?.name ?? sid}
                        {s && <span className="text-ink-2"> · {s.area}</span>}
                      </li>
                    );
                  })}
                </ul>
              </Field>
              <Field label="Prioridade">
                {PRIORITY[r.priority].label}
                <span className="block text-ink-2">{PRIORITY[r.priority].hint}</span>
              </Field>
              <Field label="Criado" mono>
                {formatDateTime(r.createdAt)}
              </Field>
              <Field label="Resposta esperada até" mono>
                {formatDateTime(new Date(dueAt(r)).toISOString())}
              </Field>
              {r.cancelReason && <Field label="Motivo do cancelamento">{r.cancelReason}</Field>}
              {r.photo && (
                <Field label="Foto de referência">
                  <ProductPhoto src={r.photo} alt={`Referência: ${r.description}`} className="mt-1 w-40" sizes="160px" />
                </Field>
              )}
            </dl>
          </Section>

          <Answer request={r} />

          {r.rejections.length > 0 && (
            <Section title="Rejeições" description="Agentes que recusaram este pedido e porquê.">
              <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
                {r.rejections.map((x) => (
                  <li key={`${x.agentId}-${x.at}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm">
                    <Code>{agent.get(x.agentId)?.code ?? x.agentId}</Code>
                    <span className="min-w-0 flex-1">{x.reason}</span>
                    <span className="font-mono text-xs text-ink-2 tabular">{formatDateTime(x.at)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Histórico" description="Registo de auditoria: cada passo com data, hora e quem o fez.">
            <div className="rounded-lg border border-line bg-surface p-5">
              <Timeline events={r.timeline} newestFirst />
            </div>
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-8">
          <AssignBlock request={r} />
          <StatusBlock key={r.status} request={r} />

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">Pagamento</h2>
            <Receipt title="Talão do pedido" meta={r.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-2">Valor da consulta</span>
                <PriceTag amount={r.price} label="Valor da consulta" />
              </div>
              <ReceiptRow label="Parte do agente" value={<Money amount={r.agentShare} />} />
              <ReceiptRow label="Comissão da plataforma" value={<Money amount={r.platformShare} />} />
              <ReceiptRule />
              <ReceiptRow
                label="Pagamento ao agente"
                mono={false}
                value={agentEntry ? <LedgerStatusBadge status={agentEntry.status} /> : <span className="text-ink-2">Aguarda resposta</span>}
              />
              <ReceiptRow
                label="Comissão"
                mono={false}
                value={
                  commission ? (
                    <LedgerStatusBadge status={commission.status} />
                  ) : (
                    <span className="text-ink-2">Após confirmação</span>
                  )
                }
              />
              {r.paidAt && <ReceiptRow label="Pago em" value={formatDateTime(r.paidAt)} />}
              {a && (
                <>
                  <ReceiptRule />
                  <ReceiptRow label="Multicaixa Express" value={formatPhone(a.paymentInfo.phone)} />
                  <ReceiptRow label="Titular" value={a.paymentInfo.holder} mono={false} />
                </>
              )}
              <div className="pb-4">
                {commission?.status === "devido" ? (
                  <ConfirmDialog
                    trigger={<Button className="w-full">Registar liquidação da comissão</Button>}
                    title="Registar liquidação?"
                    description={
                      <>
                        Confirme que o agente {a?.code ?? ""} entregou <Money amount={commission.amount} /> de comissão à
                        plataforma. O registo fica no histórico do pedido.
                      </>
                    }
                    confirmLabel="Registar liquidação"
                    onConfirm={() =>
                      report(useStore.getState().settleCommission(commission.id), "Comissão registada como liquidada.")
                    }
                  />
                ) : (
                  <p className="text-xs text-ink-2">
                    O cliente paga directamente ao agente. A plataforma só regista; nunca assume um pagamento sem a
                    confirmação do agente.
                  </p>
                )}
              </div>
            </Receipt>
          </section>

          {reqComplaints.length > 0 && (
            <Section
              title="Reclamações"
              action={
                <Button asChild variant="link" size="sm">
                  <Link href={routes.admin.reclamacoes}>Tratar</Link>
                </Button>
              }
            >
              <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
                {reqComplaints.map((x) => (
                  <li key={x.id} className="flex flex-col gap-1.5 px-4 py-3 text-sm">
                    <span className="flex items-center justify-between gap-2">
                      <ComplaintStatusBadge status={x.status} />
                      <span className="font-mono text-xs text-ink-2 tabular">{formatDateTime(x.createdAt)}</span>
                    </span>
                    <p>{x.reason}</p>
                    {x.resolution && <p className="text-ink-2">Resolução: {x.resolution}</p>}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </aside>
      </div>
    </>
  );
}

function Field({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-sm">
      <dt className="text-ink-2">{label}</dt>
      <dd className={cn("break-words text-ink", mono && "font-mono tabular")}>{children}</dd>
    </div>
  );
}

// --- Agent assignment --------------------------------------------------------

function AssignBlock({ request: r }: { request: ServiceRequest }) {
  const [open, setOpen] = useState(false);
  const { agent, surface } = useLookups();
  const eligible = useEligibleAgents(r.surfaceIds);
  const current = r.agentId ? agent.get(r.agentId) : undefined;
  const canAssign = ASSIGNABLE.includes(r.status);
  const coverage = (ids: string[]) => r.surfaceIds.filter((s) => ids.includes(s)).length;
  const total = r.surfaceIds.length;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Agente</h2>
      <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
        {current ? (
          <div className="flex flex-col gap-1 text-sm">
            <span className="flex items-center gap-2">
              <Code className="font-medium">{current.code}</Code>
              <span className="font-medium">{current.name}</span>
            </span>
            <span className="font-mono text-ink-2 tabular">{formatPhone(current.phone)}</span>
            <span className="text-ink-2">
              Cobre {coverage(current.surfaceIds)} de {total} superfície{total === 1 ? "" : "s"} do pedido
            </span>
          </div>
        ) : (
          <p className="text-sm text-ink-2">Ainda sem agente. Escolha um agente activo que trabalhe nas superfícies do pedido.</p>
        )}

        {canAssign ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant={current ? "outline" : "tag"}>
                <UserSwitchIcon data-icon="inline-start" />
                {current ? "Reatribuir agente" : "Atribuir agente"}
              </Button>
            </DialogTrigger>
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
              <DialogHeader className="border-b border-line p-5">
                <DialogTitle className="text-lg">{current ? "Reatribuir" : "Atribuir"} {r.id}</DialogTitle>
                <DialogDescription className="text-ink-2">
                  Só aparecem agentes aprovados e activos. Os que cobrem mais superfícies do pedido vêm primeiro.
                </DialogDescription>
              </DialogHeader>
              <Command className="rounded-none">
                <CommandInput placeholder="Procurar por código ou nome" />
                <CommandList className="max-h-80">
                  <CommandEmpty>Nenhum agente activo com esse nome ou código.</CommandEmpty>
                  <CommandGroup>
                    {eligible.map((ag) => {
                      const cov = coverage(ag.surfaceIds);
                      const isCurrent = ag.id === r.agentId;
                      return (
                        <CommandItem
                          key={ag.id}
                          value={`${ag.code} ${ag.name}`}
                          disabled={isCurrent}
                          onSelect={() => {
                            const ok = report(
                              useStore.getState().assignAgent(r.id, ag.id),
                              `${r.id} atribuído a ${ag.code}.`,
                            );
                            if (ok) setOpen(false);
                          }}
                          className="flex items-start gap-3 py-2.5"
                        >
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="flex items-center gap-2">
                              <Code className="font-medium">{ag.code}</Code>
                              <span className="truncate font-medium">{ag.name}</span>
                            </span>
                            <span className="truncate text-xs text-ink-2">
                              {ag.surfaceIds.map((s) => surface.get(s)?.name ?? s).join(", ")}
                            </span>
                          </div>
                          {isCurrent ? (
                            <ToneBadge tone="neutral">Actual</ToneBadge>
                          ) : (
                            <ToneBadge tone={cov === total ? "success" : cov > 0 ? "warning" : "neutral"}>
                              {cov} de {total}
                            </ToneBadge>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </DialogContent>
          </Dialog>
        ) : (
          <p className="text-xs text-ink-2">
            Depois da resposta submetida o pedido já não muda de agente.
          </p>
        )}
      </div>
    </section>
  );
}

// --- Manual status change ----------------------------------------------------

function StatusBlock({ request: r }: { request: ServiceRequest }) {
  const editable = MANUAL_STATUSES.includes(r.status);
  const [next, setNext] = useState<RequestStatus>(r.status);
  const [note, setNote] = useState("");

  if (!editable) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Estado</h2>
        <p className="text-sm text-ink-2">
          {r.status === "cancelado"
            ? "Pedido cancelado. O estado já não muda."
            : "O pagamento foi confirmado pelo agente. Daqui em diante só o cliente conclui a consulta."}
        </p>
      </section>
    );
  }

  const submit = () => {
    const ok = report(
      useStore.getState().updateStatus(r.id, next, note.trim() || undefined),
      `Estado actualizado para "${REQUEST_STATUS[next].short}".`,
    );
    if (ok) setNote("");
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Estado</h2>
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="estado-novo">Novo estado</Label>
          <Select value={next} onValueChange={(v) => setNext(v as RequestStatus)}>
            <SelectTrigger id="estado-novo" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MANUAL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {REQUEST_STATUS[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="estado-nota">Nota para o histórico (opcional)</Label>
          <Textarea
            id="estado-nota"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: cliente pediu para aguardar até amanhã"
          />
        </div>
        <Button onClick={submit} disabled={next === r.status && !note.trim()}>
          Actualizar estado
        </Button>
      </div>
    </section>
  );
}

// --- Agent answer and validation --------------------------------------------

function Answer({ request: r }: { request: ServiceRequest }) {
  const { surface } = useLookups();

  const problems = useMemo(() => {
    const list: string[] = [];
    if (r.results.length === 0) return list;
    const covered = new Set(r.results.map((x) => x.surfaceId));
    for (const sid of r.surfaceIds)
      if (!covered.has(sid)) list.push(`Sem resposta para ${surface.get(sid)?.name ?? sid}.`);
    for (const x of r.results) {
      const name = x.productName || "Produto";
      if (x.notFound) list.push(`${name}: não encontrado em ${surface.get(x.surfaceId)?.name ?? x.surfaceId}.`);
      else {
        if (x.price == null) list.push(`${name}: falta o preço.`);
        if (x.photos.length === 0) list.push(`${name}: falta fotografia.`);
      }
    }
    return list;
  }, [r.results, r.surfaceIds, surface]);

  if (r.results.length === 0) {
    return (
      <Section title="Resposta do agente">
        <p className="rounded-lg border border-dashed border-ink/20 px-5 py-6 text-sm text-ink-2">
          {r.status === "cancelado"
            ? "O pedido foi cancelado antes de haver resposta."
            : r.agentId
              ? "O agente ainda não submeteu a resposta."
              : "Atribua um agente para o pedido seguir para o terreno."}
        </p>
      </Section>
    );
  }

  const bySurface = r.surfaceIds
    .map((sid) => ({ sid, items: r.results.filter((x) => x.surfaceId === sid) }))
    .filter((g) => g.items.length > 0);

  return (
    <Section
      title="Resposta do agente"
      description={r.respondedAt ? `Submetida a ${formatDateTime(r.respondedAt)}.` : undefined}
    >
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border p-4 text-sm sm:flex-row sm:items-start sm:justify-between",
          problems.length ? "border-warning/30 bg-warning/5" : "border-success/30 bg-success/5",
        )}
      >
        <div className="flex gap-3">
          {problems.length ? (
            <WarningIcon className="mt-0.5 size-5 shrink-0 text-warning" weight="fill" />
          ) : (
            <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-success" weight="fill" />
          )}
          <div className="flex flex-col gap-1">
            <p className="font-medium">
              {problems.length ? "Resposta incompleta" : "Resposta completa: todas as superfícies com preço e foto."}
            </p>
            {problems.length > 0 && (
              <ul className="list-disc pl-4 text-ink-2">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {r.status === "resposta_submetida" && (
          <ConfirmDialog
            trigger={
              <Button variant="outline" size="sm" className="shrink-0">
                <ArrowUUpLeftIcon data-icon="inline-start" /> Devolver ao agente
              </Button>
            }
            title="Devolver a resposta ao agente?"
            description="O pedido volta a Em consulta e o agente tem de submeter de novo. O cliente é avisado da mudança de estado."
            confirmLabel="Devolver ao agente"
            reason={{ label: "O que falta corrigir", placeholder: "Ex.: falta a foto da etiqueta no Shopping Popular", required: true }}
            onConfirm={(reason) =>
              report(
                useStore.getState().updateStatus(r.id, "em_consulta", `Resposta devolvida ao agente: ${reason}`),
                "Resposta devolvida ao agente.",
              )
            }
          />
        )}
      </div>

      <div className="flex flex-col gap-6">
        {bySurface.map(({ sid, items }) => (
          <div key={sid} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">
              {surface.get(sid)?.name ?? sid}
              <span className="font-normal text-ink-2"> · {surface.get(sid)?.area}</span>
            </h3>
            <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
              {items.map((x) => (
                <li key={x.id} className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="flex min-w-0 flex-col gap-1.5 text-sm">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{x.productName || "Produto"}</span>
                      {x.notFound ? (
                        <ToneBadge tone="error">Não encontrado</ToneBadge>
                      ) : (
                        x.availability && <AvailabilityBadge availability={x.availability} />
                      )}
                    </p>
                    {x.brandModel && <p className="text-ink-2">{x.brandModel}</p>}
                    {(x.store || x.location) && (
                      <p className="text-ink-2">{[x.store, x.location].filter(Boolean).join(", ")}</p>
                    )}
                    {x.variants && <p className="text-ink-2">Variantes: {x.variants}</p>}
                    {x.observations && <p className="text-ink-2">Obs.: {x.observations}</p>}
                    <p className="font-mono text-xs text-ink-2 tabular">{formatDateTime(x.at)}</p>
                    {x.photos.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {x.photos.map((p, i) => (
                          <ProductPhoto
                            key={`${x.id}-${i}`}
                            src={p}
                            alt={`${x.productName}, foto ${i + 1}`}
                            ratio="1/1"
                            sizes="80px"
                            className="w-20"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {!x.notFound && x.price != null && (
                    <div className="sm:text-right">
                      <PriceTag amount={x.price} size="sm" tone="ink" label={`Preço de ${x.productName}`} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
