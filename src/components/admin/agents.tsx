"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IdentificationCardIcon, PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/price-tag";
import { Receipt, ReceiptRow, ReceiptRule } from "@/components/receipt";
import { AgentStatusBadge, LedgerStatusBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatNumber, formatPhone } from "@/lib/format";
import { AGENT_STATUS, LEDGER_KIND } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { computeIncomplete } from "@/lib/rules";
import { useStore } from "@/lib/store";
import type { Agent, AgentStatus, LedgerEntry, ServiceRequest, Surface } from "@/lib/types";
import { Code, ConfirmDialog, Panel, SearchField, formatDuration, formatPercent, matches, report, useLookups } from "./kit";

type StatusFilter = "todos" | AgentStatus;
const FILTERS: StatusFilter[] = ["todos", "pendente", "aprovado", "activo", "suspenso"];
const FILTER_LABEL: Record<StatusFilter, string> = {
  todos: "Todos",
  pendente: "Pendentes",
  aprovado: "Aprovados",
  activo: "Activos",
  suspenso: "Suspensos",
};

interface Performance {
  tasks: ServiceRequest[];
  answered: number;
  completed: number;
  rejected: number;
  incomplete: number;
  avgResponse: number;
}

function usePerformance() {
  const requests = useStore((s) => s.requests);
  return useMemo(() => {
    const map = new Map<string, Performance>();
    const get = (id: string) => {
      let p = map.get(id);
      if (!p) {
        p = { tasks: [], answered: 0, completed: 0, rejected: 0, incomplete: 0, avgResponse: NaN };
        map.set(id, p);
      }
      return p;
    };
    const durations = new Map<string, number[]>();
    for (const r of [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
      for (const x of r.rejections) get(x.agentId).rejected++;
      if (!r.agentId) continue;
      const p = get(r.agentId);
      p.tasks.push(r);
      if (r.results.length > 0) {
        p.answered++;
        if (computeIncomplete(r.results, r.surfaceIds)) p.incomplete++;
      }
      if (r.status === "pagamento_confirmado" || r.status === "concluido") p.completed++;
      if (r.respondedAt)
        durations.set(r.agentId, [
          ...(durations.get(r.agentId) ?? []),
          new Date(r.respondedAt).getTime() - new Date(r.createdAt).getTime(),
        ]);
    }
    for (const [id, d] of durations) get(id).avgResponse = d.reduce((t, x) => t + x, 0) / d.length;
    return map;
  }, [requests]);
}

const EMPTY_PERF: Performance = { tasks: [], answered: 0, completed: 0, rejected: 0, incomplete: 0, avgResponse: NaN };

export function AdminAgents() {
  const agents = useStore((s) => s.agents);
  const { surface } = useLookups();
  const perf = usePerformance();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = agents
    .filter((a) => status === "todos" || a.status === status)
    .filter((a) => matches(query, a.code, a.name, a.phone, formatPhone(a.phone)))
    .sort((a, b) => a.code.localeCompare(b.code));
  const count = (s: StatusFilter) => (s === "todos" ? agents.length : agents.filter((a) => a.status === s).length);
  const open = openId ? agents.find((a) => a.id === openId) : undefined;

  return (
    <>
      <PageHeader
        title="Agentes"
        description="Aprove candidaturas, active e suspenda agentes, associe-os a superfícies e acompanhe o desempenho. Só agentes activos recebem pedidos."
        actions={<RegisterAgent onCreated={setOpenId} />}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField label="Pesquisar agentes" value={query} onChange={setQuery} placeholder="Código, nome ou telefone" />
        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)} className="max-w-full overflow-x-auto">
          <TabsList className="group-data-horizontal/tabs:h-11">
            {FILTERS.map((s) => (
              <TabsTrigger key={s} value={s}>
                {FILTER_LABEL[s]}
                <span className="font-mono text-xs text-ink-2 tabular">{count(s)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<IdentificationCardIcon />}
          title="Nenhum agente encontrado"
          description="Mude o filtro ou registe um novo agente."
        />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Agente</TableHead>
                <TableHead>Superfícies</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Tarefas</TableHead>
                <TableHead className="text-right">Concluídas</TableHead>
                <TableHead className="text-right">Rejeições</TableHead>
                <TableHead className="text-right">Resposta média</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Acções</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => {
                const p = perf.get(a.id) ?? EMPTY_PERF;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="py-3 pl-4">
                      <button
                        type="button"
                        onClick={() => setOpenId(a.id)}
                        className="flex flex-col rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                      >
                        <span className="flex items-center gap-2">
                          <Code className="font-medium">{a.code}</Code>
                          <span className="font-medium underline decoration-ink/25 underline-offset-4 hover-fine:decoration-ink">
                            {a.name}
                          </span>
                        </span>
                        <span className="font-mono text-xs text-ink-2 tabular">{formatPhone(a.phone)}</span>
                      </button>
                    </TableCell>
                    <TableCell className="max-w-[16rem] text-ink-2">
                      <span className="line-clamp-2 whitespace-normal">
                        {a.surfaceIds.length ? a.surfaceIds.map((s) => surface.get(s)?.name ?? s).join(", ") : "Nenhuma"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AgentStatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular">{formatNumber(p.tasks.length)}</TableCell>
                    <TableCell className="text-right font-mono tabular">{formatNumber(p.completed)}</TableCell>
                    <TableCell className="text-right font-mono tabular">{formatNumber(p.rejected)}</TableCell>
                    <TableCell className="text-right font-mono whitespace-nowrap tabular">
                      {Number.isNaN(p.avgResponse) ? "-" : formatDuration(p.avgResponse)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <div className="flex justify-end gap-2">
                        <QuickAction agent={a} />
                        <Button size="sm" variant="ghost" onClick={() => setOpenId(a.id)}>
                          Abrir
                        </Button>
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
        <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-2xl">
          {open && <AgentProfile key={open.id} agent={open} perf={perf.get(open.id) ?? EMPTY_PERF} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

/** The next step in the agent's lifecycle, right in the row. */
function QuickAction({ agent: a }: { agent: Agent }) {
  if (a.status === "pendente")
    return (
      <Button size="sm" onClick={() => report(useStore.getState().approveAgent(a.id), `Candidatura de ${a.code} aprovada.`)}>
        Aprovar
      </Button>
    );
  if (a.status === "aprovado")
    return (
      <Button size="sm" onClick={() => report(useStore.getState().activateAgent(a.id), `${a.code} está activo.`)}>
        Activar
      </Button>
    );
  return null;
}

// --- Register ----------------------------------------------------------------

const registerSchema = z.object({
  name: z.string().trim().min(3, "Indique o nome completo."),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").replace(/^244/, "").length === 9, "O telefone deve ter 9 dígitos."),
  email: z.union([z.literal(""), z.email("E-mail inválido.")]),
  surfaceIds: z.array(z.string()).min(1, "Escolha pelo menos uma superfície."),
});
type RegisterValues = z.infer<typeof registerSchema>;

function RegisterAgent({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const surfaces = useStore((s) => s.surfaces);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", phone: "", email: "", surfaceIds: [] },
  });
  const { errors } = form.formState;

  const submit = form.handleSubmit((v) => {
    const digits = v.phone.replace(/\D/g, "").replace(/^244/, "");
    const res = useStore.getState().registerAgent({
      name: v.name,
      phone: formatPhone(digits),
      email: v.email || undefined,
      surfaceIds: v.surfaceIds,
    });
    if (report(res, "Agente registado. Fica pendente até aprovar.") && res.ok) {
      form.reset();
      setOpen(false);
      onCreated(res.agent.id);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="tag">
          <PlusIcon data-icon="inline-start" /> Registar agente
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Registar agente</DialogTitle>
          <DialogDescription className="text-ink-2">
            O agente fica pendente de aprovação. O número Multicaixa Express começa igual ao telefone e pode ser
            alterado depois.
          </DialogDescription>
        </DialogHeader>
        <form id="register-agent" onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <FormField id="ag-name" label="Nome completo" error={errors.name?.message}>
            <Input id="ag-name" autoComplete="name" aria-invalid={!!errors.name} {...form.register("name")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="ag-phone" label="Telefone" error={errors.phone?.message}>
              <Input
                id="ag-phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="923 456 789"
                className="font-mono tabular"
                aria-invalid={!!errors.phone}
                {...form.register("phone")}
              />
            </FormField>
            <FormField id="ag-email" label="E-mail (opcional)" error={errors.email?.message}>
              <Input id="ag-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register("email")} />
            </FormField>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Superfícies onde trabalha</legend>
            <Controller
              control={form.control}
              name="surfaceIds"
              render={({ field }) => (
                <SurfaceChecklist
                  surfaces={surfaces.filter((s) => s.active)}
                  value={field.value}
                  onChange={field.onChange}
                  idPrefix="reg"
                />
              )}
            />
            {errors.surfaceIds && <p className="text-sm text-error">{errors.surfaceIds.message}</p>}
          </fieldset>
        </form>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline">Voltar</Button>
          </DialogClose>
          <Button type="submit" form="register-agent">
            Registar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}

function SurfaceChecklist({
  surfaces,
  value,
  onChange,
  idPrefix,
}: {
  surfaces: Surface[];
  value: string[];
  onChange: (v: string[]) => void;
  idPrefix: string;
}) {
  return (
    <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
      {surfaces.map((s) => {
        const id = `${idPrefix}-${s.id}`;
        const checked = value.includes(s.id);
        return (
          <li key={s.id}>
            <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm">
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(c) => onChange(c ? [...value, s.id] : value.filter((x) => x !== s.id))}
              />
              <span className="flex-1">
                {s.name}
                <span className="text-ink-2"> · {s.area}</span>
              </span>
              {!s.active && <span className="text-xs text-ink-2">Inactiva</span>}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

// --- Profile sheet -------------------------------------------------------------

function AgentProfile({ agent: a, perf }: { agent: Agent; perf: Performance }) {
  const surfaces = useStore((s) => s.surfaces);
  const ledger = useStore((s) => s.ledger);
  const [surfaceIds, setSurfaceIds] = useState<string[]>(a.surfaceIds);
  const [training, setTraining] = useState("");
  const entries: LedgerEntry[] = ledger
    .filter((l) => l.agentId === a.id)
    .sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  const sum = (f: (l: LedgerEntry) => boolean) => entries.filter(f).reduce((t, l) => t + l.amount, 0);
  const surfaceChoices = surfaces.filter((s) => s.active || a.surfaceIds.includes(s.id));
  const dirty = [...surfaceIds].sort().join() !== [...a.surfaceIds].sort().join();

  return (
    <div className="flex flex-col gap-8 p-5 sm:p-6">
      <SheetHeader className="p-0 pr-10">
        <SheetTitle className="flex flex-wrap items-center gap-3 text-xl">
          <span className="font-mono tabular">{a.code}</span>
          <span>{a.name}</span>
        </SheetTitle>
        <SheetDescription asChild>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
            <AgentStatusBadge status={a.status} />
            <span className="font-mono tabular">{formatPhone(a.phone)}</span>
            {a.email && <span>{a.email}</span>}
            <span>Desde {formatDate(a.joinedAt)}</span>
          </div>
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-wrap gap-2">
        {a.status === "pendente" && (
          <Button onClick={() => report(useStore.getState().approveAgent(a.id), `Candidatura de ${a.code} aprovada.`)}>
            Aprovar candidatura
          </Button>
        )}
        {(a.status === "aprovado" || a.status === "suspenso") && (
          <Button onClick={() => report(useStore.getState().activateAgent(a.id), `${a.code} está activo.`)}>
            {a.status === "suspenso" ? "Reactivar" : "Activar"}
          </Button>
        )}
        {a.status !== "suspenso" && (
          <ConfirmDialog
            trigger={
              <Button variant="outline" className="text-error">
                Suspender
              </Button>
            }
            title={`Suspender ${a.code}?`}
            description="Um agente suspenso deixa de receber pedidos. Os pedidos que já tem continuam atribuídos até os reatribuir."
            confirmLabel="Suspender agente"
            destructive
            reason={{ label: "Motivo (fica na ficha do agente)", placeholder: "Ex.: respostas sem fotografias", required: true }}
            onConfirm={(reason) => report(useStore.getState().suspendAgent(a.id, reason), `${a.code} suspenso.`)}
          />
        )}
      </div>
      {a.note && (
        <p className="-mt-4 rounded-lg bg-paper-2 px-4 py-3 text-sm">
          <span className="text-ink-2">Nota: </span>
          {a.note}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">Superfícies associadas</h3>
        <SurfaceChecklist surfaces={surfaceChoices} value={surfaceIds} onChange={setSurfaceIds} idPrefix={`p-${a.id}`} />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={!dirty}
            onClick={() => report(useStore.getState().setAgentSurfaces(a.id, surfaceIds), "Superfícies do agente actualizadas.")}
          >
            Guardar superfícies
          </Button>
          {surfaceIds.length === 0 && <p className="text-sm text-ink-2">Sem superfícies o agente não pode ser activado.</p>}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">Desempenho e pagamentos</h3>
        <Receipt title="Ficha do agente" meta={a.code}>
          <ReceiptRow label="Tarefas atribuídas" value={formatNumber(perf.tasks.length)} />
          <ReceiptRow label="Respondidas" value={formatNumber(perf.answered)} />
          <ReceiptRow label="Pagas e concluídas" value={formatNumber(perf.completed)} />
          <ReceiptRow label="Rejeições" value={formatNumber(perf.rejected)} />
          <ReceiptRow
            label="Respostas incompletas"
            value={perf.answered ? formatPercent(perf.incomplete / perf.answered) : "sem dados"}
          />
          <ReceiptRow
            label="Tempo médio de resposta"
            value={Number.isNaN(perf.avgResponse) ? "sem dados" : formatDuration(perf.avgResponse)}
          />
          <ReceiptRule />
          <ReceiptRow label="A receber dos clientes" value={<Money amount={sum((l) => l.kind === "agent_share" && l.status === "devido")} />} />
          <ReceiptRow label="Recebido (confirmado)" value={<Money amount={sum((l) => l.kind === "agent_share" && l.status === "confirmado")} />} />
          <ReceiptRow label="Comissão devida" value={<Money amount={sum((l) => l.kind === "platform_commission" && l.status === "devido")} />} />
          <ReceiptRow label="Comissão liquidada" value={<Money amount={sum((l) => l.kind === "platform_commission" && l.status === "liquidado")} />} />
          <ReceiptRule />
          <ReceiptRow label="Multicaixa Express" value={formatPhone(a.paymentInfo.phone)} />
          <ReceiptRow label="Titular" value={a.paymentInfo.holder} mono={false} className="pb-4" />
        </Receipt>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">Histórico de pagamentos</h3>
        {entries.length === 0 ? (
          <p className="text-sm text-ink-2">Sem movimentos. Os valores aparecem quando o agente responde a um pedido.</p>
        ) : (
          <Panel>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Pedido</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="pr-4">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="pl-4">
                      <Link href={routes.admin.pedido(l.requestId)} className="font-mono text-[0.8125rem] tabular underline decoration-ink/25 underline-offset-4 hover-fine:decoration-ink">
                        {l.requestId}
                      </Link>
                    </TableCell>
                    <TableCell className="text-ink-2">{LEDGER_KIND[l.kind]}</TableCell>
                    <TableCell className="text-right">
                      <Money amount={l.amount} />
                    </TableCell>
                    <TableCell className="pr-4">
                      <LedgerStatusBadge status={l.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">Histórico de tarefas</h3>
        {perf.tasks.length === 0 ? (
          <p className="text-sm text-ink-2">
            {a.status === "activo" ? "Ainda sem tarefas atribuídas." : `Estado: ${AGENT_STATUS[a.status].label}. Só agentes activos recebem tarefas.`}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
            {perf.tasks.map((r) => (
              <li key={r.id}>
                <Link
                  href={routes.admin.pedido(r.id)}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm outline-none transition-colors hover-fine:bg-paper focus-visible:bg-paper"
                >
                  <Code className="font-medium">{r.id}</Code>
                  <span className="min-w-0 flex-1 truncate">{r.description}</span>
                  <StatusBadge status={r.status} short />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">Formação</h3>
        {a.trainings.length === 0 ? (
          <p className="text-sm text-ink-2">Nenhuma acção de formação registada.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {a.trainings.map((t) => (
              <li key={`${t.title}-${t.at}`} className="flex items-baseline justify-between gap-3">
                <span>{t.title}</span>
                <span className="font-mono text-xs text-ink-2 tabular">{formatDate(t.at)}</span>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (report(useStore.getState().addAgentTraining(a.id, training), "Formação registada.")) setTraining("");
          }}
        >
          <Label htmlFor={`training-${a.id}`} className="sr-only">
            Nova acção de formação
          </Label>
          <Input
            id={`training-${a.id}`}
            value={training}
            onChange={(e) => setTraining(e.target.value)}
            placeholder="Ex.: Fotografar etiquetas de preço"
            className="h-11"
          />
          <Button type="submit" variant="outline" className="shrink-0">
            Registar formação
          </Button>
        </form>
      </section>
    </div>
  );
}
