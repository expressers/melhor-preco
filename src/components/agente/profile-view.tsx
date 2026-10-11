"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CertificateIcon, MapPinIcon, PencilSimpleIcon, PhoneIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/app-shell";
import { AgentStatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatPhone } from "@/lib/format";
import { useCurrentAgent, useStore } from "@/lib/store";
import type { Agent } from "@/lib/types";
import { InactiveAgentState, NoAgent, SectionTitle, useSurfaceNames } from "./shared";

const ACCEPT_EVENT = "Pedido aceite pelo agente";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

function formatDuration(ms: number) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function useIndicators(agent: Agent | undefined) {
  const requests = useStore((s) => s.requests);
  return useMemo(() => {
    if (!agent) return null;
    const assigned = requests.filter((r) => r.agentId === agent.id);
    const rejected = requests.filter((r) => r.rejections.some((x) => x.agentId === agent.id)).length;
    const done = assigned.filter((r) => r.status === "pagamento_confirmado" || r.status === "concluido").length;
    const answered = assigned.filter((r) => r.respondedAt);
    const durations = answered.map((r) => {
      const accepted = r.timeline.find((e) => e.action === ACCEPT_EVENT)?.at ?? r.createdAt;
      return new Date(r.respondedAt!).getTime() - new Date(accepted).getTime();
    });
    const total = assigned.length + rejected;
    return {
      done,
      rejectionRate: total ? Math.round((rejected / total) * 100) : 0,
      avg: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
      answered: answered.length,
    };
  }, [agent, requests]);
}

export function ProfileView() {
  const agent = useCurrentAgent();
  const surfaceName = useSurfaceNames();
  const ind = useIndicators(agent);

  if (!agent || !ind) {
    return (
      <>
        <PageHeader title="Perfil" />
        <NoAgent />
      </>
    );
  }

  return (
    <>
      <h1 className="sr-only">Perfil</h1>

      {/* Identity card: reads like an accreditation badge */}
      <section aria-label="Identificação" className="flex items-center gap-4">
        <Avatar className="size-20 rounded-lg">
          {agent.photo && <AvatarImage src={agent.photo} alt="" className="object-cover" />}
          <AvatarFallback className="rounded-lg bg-tag text-xl font-semibold text-ink">
            {initials(agent.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="font-mono text-sm font-semibold tracking-[0.04em] text-ink tabular">{agent.code}</p>
          <p className="text-xl leading-tight font-semibold text-ink">{agent.name}</p>
          <AgentStatusBadge status={agent.status} />
        </div>
      </section>

      <dl className="mt-6 flex flex-col divide-y divide-line border-y border-line">
        <InfoRow icon={<PhoneIcon />} term="Telefone" value={<span className="font-mono tabular">{formatPhone(agent.phone)}</span>} />
        {agent.email && <InfoRow term="E-mail" value={agent.email} />}
        <InfoRow
          icon={<MapPinIcon />}
          term={agent.surfaceIds.length > 1 ? "Superfícies de afectação" : "Superfície de afectação"}
          value={agent.surfaceIds.length ? agent.surfaceIds.map(surfaceName).join(", ") : "Por definir"}
        />
        <InfoRow term="Agente desde" value={formatDate(agent.joinedAt)} />
      </dl>

      {agent.status !== "activo" && (
        <div className="mt-6">
          <InactiveAgentState agent={agent} />
        </div>
      )}

      <section aria-labelledby="indicadores" className="mt-8 flex flex-col gap-3">
        <SectionTitle id="indicadores">Indicadores</SectionTitle>
        <dl className="grid grid-cols-3 divide-x divide-line rounded-lg bg-surface ring-1 ring-line">
          <Metric term="Concluídas" value={String(ind.done)} />
          <Metric term="Taxa de rejeição" value={`${ind.rejectionRate}%`} />
          <Metric term="Tempo médio de resposta" value={ind.avg == null ? "Sem dados" : formatDuration(ind.avg)} />
        </dl>
      </section>

      <PaymentInfoSection agent={agent} />

      <section aria-labelledby="formacoes" className="mt-8 flex flex-col gap-3">
        <SectionTitle id="formacoes" count={agent.trainings.length}>
          Formações
        </SectionTitle>
        {agent.trainings.length === 0 ? (
          <p className="text-sm text-ink-2">Ainda sem formações registadas. A administração marca-as aqui.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {agent.trainings.map((t) => (
              <li key={`${t.title}-${t.at}`} className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3 ring-1 ring-line">
                <CertificateIcon aria-hidden className="size-5 shrink-0 text-ink" />
                <span className="min-w-0 flex-1 text-[0.9375rem] text-ink">{t.title}</span>
                <span className="shrink-0 font-mono text-xs text-ink-2 tabular">{formatDate(t.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function InfoRow({ icon, term, value }: { icon?: React.ReactNode; term: string; value: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 py-2.5">
      <span aria-hidden className="grid size-5 shrink-0 place-items-center text-ink-2 [&_svg]:size-5">
        {icon}
      </span>
      <dt className="w-28 shrink-0 text-sm text-ink-2">{term}</dt>
      <dd className="min-w-0 flex-1 text-[0.9375rem] break-words text-ink">{value}</dd>
    </div>
  );
}

function Metric({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex flex-col-reverse justify-end gap-1 p-3">
      <dt className="text-xs leading-snug text-ink-2">{term}</dt>
      <dd className="font-mono text-lg font-semibold text-ink tabular">{value}</dd>
    </div>
  );
}

const paySchema = z.object({
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").replace(/^244/, "").length === 9, "O número deve ter 9 dígitos."),
  holder: z.string().trim().min(3, "Indique o nome do titular."),
});
type PayValues = z.infer<typeof paySchema>;

function PaymentInfoSection({ agent }: { agent: Agent }) {
  const [editing, setEditing] = useState(false);
  const form = useForm<PayValues>({
    resolver: zodResolver(paySchema),
    values: { phone: agent.paymentInfo.phone, holder: agent.paymentInfo.holder },
  });
  const { errors } = form.formState;

  function save(v: PayValues) {
    const res = useStore.getState().updateAgentPaymentInfo(agent.id, {
      method: "multicaixa-express",
      phone: formatPhone(v.phone),
      holder: v.holder,
    });
    if (!res.ok) return toast.error(res.error);
    toast.success("Dados de pagamento actualizados");
    setEditing(false);
  }

  return (
    <section aria-labelledby="pagamento" className="mt-8 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle id="pagamento">Multicaixa Express</SectionTitle>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="-mr-2">
            <PencilSimpleIcon />
            Alterar
          </Button>
        )}
      </div>
      <p className="text-sm text-ink-2">É para aqui que os clientes pagam as suas consultas.</p>

      {editing ? (
        <form
          onSubmit={form.handleSubmit(save)}
          noValidate
          className="flex flex-col gap-4 rounded-lg bg-surface p-4 ring-1 ring-line"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="mcx-phone">Número Multicaixa Express</Label>
            <Input
              id="mcx-phone"
              inputMode="tel"
              autoComplete="tel"
              className="h-12 font-mono tabular"
              aria-invalid={!!errors.phone}
              {...form.register("phone")}
            />
            {errors.phone && <p className="text-sm text-error">{errors.phone.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mcx-holder">Titular da conta</Label>
            <Input id="mcx-holder" autoComplete="name" className="h-12" aria-invalid={!!errors.holder} {...form.register("holder")} />
            {errors.holder && <p className="text-sm text-error">{errors.holder.message}</p>}
          </div>
          <div className="flex gap-2 [&>*]:h-12 [&>*]:flex-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                setEditing(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg bg-surface p-4 text-[0.9375rem] ring-1 ring-line">
          <dt className="text-ink-2">Número</dt>
          <dd className="font-mono text-ink tabular">{agent.paymentInfo.phone}</dd>
          <dt className="text-ink-2">Titular</dt>
          <dd className="text-ink">{agent.paymentInfo.holder}</dd>
        </dl>
      )}
    </section>
  );
}
