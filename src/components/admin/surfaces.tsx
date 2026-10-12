"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilSimpleIcon, PlusIcon, StorefrontIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { AgentStatusBadge, ToneBadge } from "@/components/status-badge";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/format";
import { OPEN_STATUSES } from "@/lib/labels";
import { useStore } from "@/lib/store";
import type { Surface } from "@/lib/types";
import { Code, ConfirmDialog, Panel, report } from "./kit";

export function AdminSurfaces() {
  const surfaces = useStore((s) => s.surfaces);
  const agents = useStore((s) => s.agents);
  const requests = useStore((s) => s.requests);

  const usage = useMemo(() => {
    const m = new Map<string, { total: number; open: number }>();
    for (const r of requests)
      for (const sid of [r.surfaceId]) {
        const u = m.get(sid) ?? { total: 0, open: 0 };
        u.total++;
        if (OPEN_STATUSES.includes(r.status)) u.open++;
        m.set(sid, u);
      }
    return m;
  }, [requests]);

  const sorted = [...surfaces].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "pt"));

  return (
    <>
      <PageHeader
        title="Superfícies comerciais"
        description="Os locais onde os agentes fazem consultas. Só as superfícies activas aparecem aos clientes no formulário de pedido."
        actions={<SurfaceDialog />}
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={<StorefrontIcon />}
          title="Ainda sem superfícies"
          description="Crie a primeira superfície para os clientes a poderem escolher."
          action={<SurfaceDialog />}
        />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Superfície</TableHead>
                <TableHead>Endereço e localização</TableHead>
                <TableHead>Agentes</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Acções</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((s) => {
                const linked = agents.filter((a) => a.surfaceIds.includes(s.id));
                const active = linked.filter((a) => a.status === "activo").length;
                const u = usage.get(s.id) ?? { total: 0, open: 0 };
                return (
                  <TableRow key={s.id} className="align-top">
                    <TableCell className="py-3 pl-4">
                      <span className="block font-medium">{s.name}</span>
                      <span className="text-ink-2">{s.area}</span>
                    </TableCell>
                    <TableCell className="max-w-[20rem] py-3 whitespace-normal text-ink-2">
                      <span className="block text-ink">{s.address}</span>
                      {s.location}
                    </TableCell>
                    <TableCell className="py-3">
                      {linked.length === 0 ? (
                        <span className="text-ink-2">Nenhum</span>
                      ) : (
                        <div className="flex max-w-[16rem] flex-col gap-1">
                          <span className="text-xs text-ink-2">
                            {active} activo{active === 1 ? "" : "s"} de {linked.length}
                          </span>
                          <span className="flex flex-wrap gap-1">
                            {linked.map((a) => (
                              <Tooltip key={a.id}>
                                <TooltipTrigger asChild>
                                  <span
                                    tabIndex={0}
                                    className="rounded-full border border-line bg-paper px-2 py-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                                  >
                                    <Code className={a.status === "activo" ? "text-xs" : "text-xs text-ink-2 line-through"}>
                                      {a.code}
                                    </Code>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="flex items-center gap-2">
                                  {a.name} <AgentStatusBadge status={a.status} />
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono whitespace-nowrap tabular">
                      {formatNumber(u.total)}
                      {u.open > 0 && <span className="block text-xs text-ink-2">{formatNumber(u.open)} em aberto</span>}
                    </TableCell>
                    <TableCell className="py-3">
                      <ToneBadge tone={s.active ? "success" : "neutral"}>{s.active ? "Activa" : "Inactiva"}</ToneBadge>
                    </TableCell>
                    <TableCell className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-2">
                        <SurfaceDialog surface={s} />
                        {s.active ? (
                          <ConfirmDialog
                            trigger={
                              <Button size="sm" variant="outline">
                                Desactivar
                              </Button>
                            }
                            title={`Desactivar ${s.name}?`}
                            description={
                              u.open > 0
                                ? `Os clientes deixam de a poder escolher. Os ${u.open} pedidos em aberto continuam.`
                                : "Os clientes deixam de a poder escolher em novos pedidos. Pode activá-la de novo a qualquer momento."
                            }
                            confirmLabel="Desactivar"
                            onConfirm={() =>
                              report(useStore.getState().setSurfaceActive(s.id, false), `${s.name} desactivada.`)
                            }
                          />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => report(useStore.getState().setSurfaceActive(s.id, true), `${s.name} activa.`)}
                          >
                            Activar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
      )}
    </>
  );
}

const schema = z.object({
  name: z.string().trim().min(3, "Indique o nome da superfície."),
  area: z.string().trim().min(2, "Indique o bairro ou município."),
  address: z.string().trim().min(3, "Indique o endereço."),
  location: z.string().trim(),
  active: z.boolean(),
});
type Values = z.infer<typeof schema>;

function SurfaceDialog({ surface }: { surface?: Surface }) {
  const [open, setOpen] = useState(false);
  const editing = !!surface;
  const defaults: Values = {
    name: surface?.name ?? "",
    area: surface?.area ?? "",
    address: surface?.address ?? "",
    location: surface?.location ?? "",
    active: surface?.active ?? true,
  };
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  const { errors } = form.formState;
  const formId = `surface-${surface?.id ?? "new"}`;

  const submit = form.handleSubmit((v) => {
    const ok = report(
      useStore.getState().upsertSurface({ ...v, id: surface?.id }),
      editing ? `${v.name} actualizada.` : `${v.name} criada.`,
    );
    if (ok) setOpen(false);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) form.reset(defaults);
      }}
    >
      <DialogTrigger asChild>
        {editing ? (
          <Button size="sm" variant="ghost">
            <PencilSimpleIcon data-icon="inline-start" /> Editar
          </Button>
        ) : (
          <Button variant="tag">
            <PlusIcon data-icon="inline-start" /> Nova superfície
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{editing ? `Editar ${surface.name}` : "Nova superfície"}</DialogTitle>
          <DialogDescription className="text-ink-2">
            Nome e localização como os agentes e clientes os conhecem.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${formId}-name`} label="Nome" error={errors.name?.message}>
              <Input id={`${formId}-name`} placeholder="Ex.: Mercado do Kikolo" aria-invalid={!!errors.name} {...form.register("name")} />
            </Field>
            <Field id={`${formId}-area`} label="Área" error={errors.area?.message}>
              <Input id={`${formId}-area`} placeholder="Ex.: Cacuaco" aria-invalid={!!errors.area} {...form.register("area")} />
            </Field>
          </div>
          <Field id={`${formId}-address`} label="Endereço" error={errors.address?.message}>
            <Input id={`${formId}-address`} aria-invalid={!!errors.address} {...form.register("address")} />
          </Field>
          <Field id={`${formId}-location`} label="Localização (referências para chegar)" error={errors.location?.message}>
            <Textarea id={`${formId}-location`} rows={2} placeholder="Ex.: junto à paragem dos táxis, entrada pelo portão 2" {...form.register("location")} />
          </Field>
          <Controller
            control={form.control}
            name="active"
            render={({ field }) => (
              <label htmlFor={`${formId}-active`} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-line px-3 text-sm">
                <span>
                  Activa
                  <span className="block text-xs text-ink-2">Visível para os clientes ao fazer um pedido.</span>
                </span>
                <Switch id={`${formId}-active`} checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
        </form>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline">Voltar</Button>
          </DialogClose>
          <Button type="submit" form={formId}>
            {editing ? "Guardar alterações" : "Criar superfície"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
