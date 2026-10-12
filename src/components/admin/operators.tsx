"use client";

// Operadores (CHANGES-v2 §3): platform staff at each surface's info desk.
// One active operator per surface (enforced by the store), base salary paid
// monthly and kept apart from the variable commission (5% / 10% of net).

import { PencilSimpleIcon, PlusIcon, UserCircleGearIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/price-tag";
import { Receipt, ReceiptNote, ReceiptRow, ReceiptRule } from "@/components/receipt";
import { ObjectiveStatusBadge, OperatorStatusBadge, ToneBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatNumber, formatPhone } from "@/lib/format";
import { objectiveStatus } from "@/lib/objectives";
import { activeOperatorFor } from "@/lib/rules";
import {
  useCurrentObjective,
  useObjectiveEvaluation,
  useOperatorCommissions,
  useStore,
  type OperatorInput,
} from "@/lib/store";
import type { Operator, OperatorStatus } from "@/lib/types";
import { AuditTrail, Code, ConfirmDialog, Panel, SearchField, Section, formatPercent, matches, parseIntField, report, useLookups, useNow } from "./kit";

export function AdminOperators() {
  const operators = useStore((s) => s.operators);
  const surfaces = useStore((s) => s.surfaces);
  const objectives = useStore((s) => s.objectives);
  const { surface } = useLookups();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const commissionTotal = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of objectives)
      if (o.result?.operatorId) m.set(o.result.operatorId, (m.get(o.result.operatorId) ?? 0) + o.result.commission);
    return m;
  }, [objectives]);

  const uncovered = surfaces.filter((s) => s.active && !activeOperatorFor(s.id, operators));
  const rows = operators
    .filter((o) => matches(query, o.code, o.name, o.phone, formatPhone(o.phone), surface.get(o.surfaceId)?.name))
    .sort((a, b) => Number(b.status === "activo") - Number(a.status === "activo") || a.code.localeCompare(b.code));
  const open = openId ? operators.find((o) => o.id === openId) : undefined;

  return (
    <>
      <PageHeader
        title="Operadores"
        description="Colaboradores da plataforma na banca de cada superfície. Distribuem os pedidos pelos agentes. Um operador activo por superfície."
        actions={<OperatorDialog />}
      />

      {uncovered.length > 0 && (
        <p className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
          <ToneBadge tone="warning">Sem operador</ToneBadge>
          <span>
            {uncovered.map((s) => s.name).join(", ")}: os pedidos destas superfícies ficam à espera de atribuição pelo
            admin.
          </span>
        </p>
      )}

      <div className="mb-4">
        <SearchField label="Pesquisar operadores" value={query} onChange={setQuery} placeholder="Código, nome, telefone ou superfície" />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<UserCircleGearIcon />}
          title={operators.length ? "Nenhum operador encontrado" : "Ainda sem operadores"}
          description={operators.length ? "Procure por outro nome ou superfície." : "Registe o operador da primeira superfície."}
        />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Operador</TableHead>
                <TableHead>Superfície</TableHead>
                <TableHead className="text-right">Salário base</TableHead>
                <TableHead className="text-right">Comissões fechadas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Acções</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="py-3 pl-4">
                    <button
                      type="button"
                      onClick={() => setOpenId(o.id)}
                      className="flex flex-col rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                    >
                      <span className="flex items-center gap-2">
                        <Code className="font-medium">{o.code}</Code>
                        <span className="font-medium underline decoration-ink/25 underline-offset-4 hover-fine:decoration-ink">
                          {o.name}
                        </span>
                      </span>
                      <span className="font-mono text-xs text-ink-2 tabular">{formatPhone(o.phone)}</span>
                    </button>
                  </TableCell>
                  <TableCell>{surface.get(o.surfaceId)?.name ?? o.surfaceId}</TableCell>
                  <TableCell className="text-right">
                    <Money amount={o.baseSalary} />
                    <span className="block text-xs text-ink-2">por mês</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Money amount={commissionTotal.get(o.id) ?? 0} />
                  </TableCell>
                  <TableCell>
                    <OperatorStatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <div className="flex justify-end gap-2">
                      <StatusToggle operator={o} />
                      <Button size="sm" variant="ghost" onClick={() => setOpenId(o.id)}>
                        Abrir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      <Section title="Registo de auditoria" description="Registos, mudanças de superfície, salário e estado." className="mt-10">
        <AuditTrail entity="operator" empty="Ainda sem alterações a operadores." />
      </Section>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
          {open && <OperatorProfile key={open.id} operator={open} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function StatusToggle({ operator: o }: { operator: Operator }) {
  const { surface } = useLookups();
  if (o.status === "inactivo")
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => report(useStore.getState().setOperatorStatus(o.id, "activo"), `${o.code} está activo.`)}
      >
        Activar
      </Button>
    );
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="outline">
          Desactivar
        </Button>
      }
      title={`Desactivar ${o.code}?`}
      description={`Os pedidos do ${surface.get(o.surfaceId)?.name ?? "local"} deixam de ter quem os distribua até activar outro operador. O admin pode atribuir entretanto.`}
      confirmLabel="Desactivar operador"
      onConfirm={() => report(useStore.getState().setOperatorStatus(o.id, "inactivo"), `${o.code} desactivado.`)}
    />
  );
}

// --- Register / edit ---------------------------------------------------------

interface Draft {
  name: string;
  phone: string;
  email: string;
  surfaceId: string;
  baseSalary: string;
  status: OperatorStatus;
  note: string;
}

function toDraft(o?: Operator): Draft {
  return {
    name: o?.name ?? "",
    phone: o ? formatPhone(o.phone) : "",
    email: o?.email ?? "",
    surfaceId: o?.surfaceId ?? "",
    baseSalary: o ? String(o.baseSalary) : "",
    status: o?.status ?? "activo",
    note: o?.note ?? "",
  };
}

function OperatorDialog({ operator }: { operator?: Operator }) {
  const surfaces = useStore((s) => s.surfaces);
  const operators = useStore((s) => s.operators);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(operator));
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setError(null);
  };

  const holder = draft.surfaceId
    ? operators.find((o) => o.status === "activo" && o.surfaceId === draft.surfaceId && o.id !== operator?.id)
    : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = draft.phone.replace(/\D/g, "").replace(/^244/, "");
    const input: OperatorInput = {
      id: operator?.id,
      name: draft.name,
      phone: formatPhone(digits),
      email: draft.email,
      surfaceId: draft.surfaceId,
      baseSalary: parseIntField(draft.baseSalary),
      status: draft.status,
      note: draft.note,
    };
    const res = useStore.getState().upsertOperator(input);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    report(res, operator ? `${res.operator.code} actualizado.` : `${res.operator.code} registado.`);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setDraft(toDraft(operator));
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        {operator ? (
          <Button variant="outline">
            <PencilSimpleIcon data-icon="inline-start" /> Editar dados
          </Button>
        ) : (
          <Button variant="tag">
            <PlusIcon data-icon="inline-start" /> Registar operador
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{operator ? `Editar ${operator.code}` : "Registar operador"}</DialogTitle>
          <DialogDescription className="text-ink-2">
            O salário base é fixo e mensal. A comissão (5% ou 10% do líquido da superfície) é calculada no fecho de
            cada período, em Objectivos.
          </DialogDescription>
        </DialogHeader>
        <form id="operator-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="op-name">Nome completo</Label>
            <Input id="op-name" className="h-11" autoComplete="name" value={draft.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="op-phone">Telefone</Label>
              <Input
                id="op-phone"
                className="h-11 font-mono tabular"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+244 9XX XXX XXX"
                value={draft.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="op-email">E-mail (opcional)</Label>
              <Input id="op-email" className="h-11" type="email" autoComplete="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="op-surface">Superfície</Label>
            <Select value={draft.surfaceId} onValueChange={(v) => set("surfaceId", v)}>
              <SelectTrigger id="op-surface" className="h-11 w-full">
                <SelectValue placeholder="Escolha a superfície" />
              </SelectTrigger>
              <SelectContent>
                {surfaces.map((s) => {
                  const taken = operators.find((o) => o.status === "activo" && o.surfaceId === s.id && o.id !== operator?.id);
                  return (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {taken ? ` (activo: ${taken.code})` : !s.active ? " (inactiva)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {holder && draft.status === "activo" && (
              <p className="text-sm text-warning">
                {holder.code} {holder.name} já é o operador activo desta superfície. Desactive-o primeiro ou registe este
                operador como inactivo.
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="op-salary">Salário base mensal (Kz)</Label>
              <Input
                id="op-salary"
                className="h-11 font-mono tabular"
                inputMode="numeric"
                placeholder="120000"
                value={draft.baseSalary}
                onChange={(e) => set("baseSalary", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="op-status">Estado</Label>
              <Select value={draft.status} onValueChange={(v) => set("status", v as OperatorStatus)}>
                <SelectTrigger id="op-status" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="op-note">Nota interna (opcional)</Label>
            <Textarea id="op-note" rows={2} value={draft.note} onChange={(e) => set("note", e.target.value)} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
        </form>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline">Voltar</Button>
          </DialogClose>
          <Button type="submit" form="operator-form">
            {operator ? "Guardar alterações" : "Registar operador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Profile with commission history -------------------------------------------

function OperatorProfile({ operator: o }: { operator: Operator }) {
  const { surface } = useLookups();
  const now = useNow();
  const history = useOperatorCommissions(o.id);
  const current = useCurrentObjective(o.surfaceId, now);
  const evaluation = useObjectiveEvaluation(current);
  const split = useStore((st) => st.pricing.split);
  const total = history.reduce((t, x) => t + (x.result?.commission ?? 0), 0);
  const s = surface.get(o.surfaceId);

  return (
    <div className="flex flex-col gap-8 p-5 sm:p-6">
      <SheetHeader className="p-0 pr-10">
        <SheetTitle className="flex flex-wrap items-center gap-3 text-xl">
          <span className="font-mono tabular">{o.code}</span>
          <span>{o.name}</span>
        </SheetTitle>
        <SheetDescription asChild>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
            <OperatorStatusBadge status={o.status} />
            <span>{s?.name ?? o.surfaceId}</span>
            <span className="font-mono tabular">{formatPhone(o.phone)}</span>
            {o.email && <span>{o.email}</span>}
            <span>Desde {formatDate(o.joinedAt)}</span>
          </div>
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-wrap gap-2">
        <OperatorDialog operator={o} />
        <StatusToggle operator={o} />
      </div>
      {o.note && (
        <p className="-mt-4 rounded-lg bg-paper-2 px-4 py-3 text-sm">
          <span className="text-ink-2">Nota: </span>
          {o.note}
        </p>
      )}

      <Receipt title="Remuneração" meta={o.code}>
        <ReceiptRow label="Salário base (mensal)" value={<Money amount={o.baseSalary} />} />
        <ReceiptRow label="Comissões de períodos fechados" value={<Money amount={total} />} />
        {current && evaluation && o.status === "activo" && (
          <>
            <ReceiptRule />
            <ReceiptRow
              label={`${current.period.label}, estimativa (${evaluation.operatorPct}%)`}
              value={<Money amount={evaluation.commission} />}
            />
            <ReceiptRow
              label="Progresso da meta"
              value={`${formatPercent(evaluation.revenueRatio)} de ${formatNumber(current.revenueTarget)} Kz`}
            />
          </>
        )}
        <ReceiptNote className="pb-4">
          O salário base é pago à parte. A comissão é única por período: {split.operatorBelow}% do líquido abaixo dos
          objectivos, {split.operatorMet}% com objectivos cumpridos.
        </ReceiptNote>
      </Receipt>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">Histórico de comissões</h3>
        {history.length === 0 ? (
          <p className="text-sm text-ink-2">Ainda sem períodos fechados para este operador.</p>
        ) : (
          <Panel>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Período</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="text-right">Facturação</TableHead>
                  <TableHead className="pr-4 text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell className="py-3 pl-4">
                      {x.period.label}
                      <span className="block text-xs text-ink-2">{surface.get(x.surfaceId)?.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        <ToneBadge tone={x.result!.met ? "success" : "neutral"}>
                          {x.result!.met ? "Cumpriu" : "Abaixo"} ({x.result!.operatorPct}%)
                        </ToneBadge>
                        {x.corrections.length > 0 && <ToneBadge tone="warning">Corrigido</ToneBadge>}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amount={x.result!.revenue} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Money amount={x.result!.commission} className="font-semibold" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        )}
        {current && now > 0 && (
          <p className="flex items-center gap-2 text-sm text-ink-2">
            <ObjectiveStatusBadge status={objectiveStatus(current, now)} />
            {current.period.label} fecha a {formatDate(new Date(new Date(current.period.endsAt).getTime() - 1).toISOString())}.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">Alterações</h3>
        <AuditTrail entity="operator" entityId={o.id} empty="Sem alterações registadas." />
      </section>
    </div>
  );
}
