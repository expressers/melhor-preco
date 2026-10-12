"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { HydrationGate } from "@/components/hydration-gate";
import { TagMark } from "@/components/price-tag";
import { AgentStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidIban } from "@/lib/finance";
import { formatPhone } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useStore } from "@/lib/store";
import type { Agent } from "@/lib/types";
import styles from "./agente.module.scss";
import { PhotoInput } from "./photo-input";
import { ChoiceTile } from "./shared";

const nineDigits = (v: string) => v.replace(/\D/g, "").replace(/^244/, "").length === 9;

const schema = z
  .object({
    name: z.string().trim().min(3, "Escreva o seu nome completo."),
    phone: z.string().trim().refine(nineDigits, "O telefone deve ter 9 dígitos, ex.: 923 456 789."),
    email: z.union([z.literal(""), z.email("Este e-mail não parece válido.")]),
    photo: z.array(z.string()).max(1),
    surfaceIds: z.array(z.string()).min(1, "Escolha pelo menos uma superfície."),
    iban: z.string().trim(),
    holder: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (v.iban && !isValidIban(v.iban))
      ctx.addIssue({ code: "custom", path: ["iban"], message: "IBAN inválido: AO06 seguido de 21 dígitos." });
  });

type Values = z.infer<typeof schema>;

/** Public frame: brand + way back, no area nav (the person is not an agent yet). */
export function ApplicationPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-5">
          <Link
            href={routes.home}
            className="press flex items-center gap-2 rounded-full py-1 pr-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <TagMark className="text-[1.05rem]" />
            <span className="text-[0.95rem] font-semibold tracking-[-0.02em] text-ink">Melhor Preço</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href={routes.home}>
              <ArrowLeftIcon />
              Início
            </Link>
          </Button>
        </div>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-16 sm:px-5 sm:pt-10">
        <HydrationGate>
          <Application />
        </HydrationGate>
      </main>
    </div>
  );
}

function Application() {
  const [done, setDone] = useState<Agent | null>(null);
  if (done) return <Submitted agent={done} />;
  return <ApplicationForm onDone={setDone} />;
}

function ApplicationForm({ onDone }: { onDone: (a: Agent) => void }) {
  const allSurfaces = useStore((s) => s.surfaces);
  const surfaces = allSurfaces.filter((s) => s.active);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      photo: [],
      surfaceIds: [],
      iban: "",
      holder: "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  function submit(v: Values) {
    const phone = formatPhone(v.phone);
    const res = useStore.getState().registerAgent({
      name: v.name,
      phone,
      email: v.email || undefined,
      photo: v.photo[0],
      surfaceIds: v.surfaceIds,
      bank: v.iban ? { iban: v.iban, holder: v.holder || v.name } : undefined,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Candidatura enviada");
    window.scrollTo({ top: 0 });
    onDone(res.agent);
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-[1.75rem] leading-tight sm:text-3xl">Ser agente Melhor Preço</h1>
        <p className="measure text-[0.9375rem] text-ink-2">
          Já conhece as lojas do seu centro comercial? Ganhe pelo menos 400 Kz por cada consulta de preços que fizer
          para os nossos clientes. Preencha os dados e a equipa entra em contacto.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-8">
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-4 text-base font-semibold text-ink">Os seus dados</legend>
          <Field id="c-name" label="Nome completo" error={errors.name?.message}>
            <Input id="c-name" autoComplete="name" className="h-12" aria-invalid={!!errors.name} {...form.register("name")} />
          </Field>
          <Field id="c-phone" label="Telefone" hint="É o contacto principal. Ex.: 923 456 789" error={errors.phone?.message}>
            <Input
              id="c-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="h-12 font-mono tabular"
              aria-invalid={!!errors.phone}
              {...form.register("phone")}
            />
          </Field>
          <Field id="c-email" label="E-mail (opcional)" error={errors.email?.message}>
            <Input
              id="c-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              className="h-12"
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
          </Field>
          <Controller
            control={form.control}
            name="photo"
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-ink">Fotografia (opcional)</span>
                <div className="max-w-40">
                  <PhotoInput
                    value={field.value}
                    onChange={field.onChange}
                    max={1}
                    capture="user"
                    maxSide={360}
                    label="Tirar selfie"
                  />
                </div>
              </div>
            )}
          />
        </fieldset>

        <Controller
          control={form.control}
          name="surfaceIds"
          render={({ field }) => (
            <fieldset className="flex flex-col gap-3" aria-describedby={errors.surfaceIds ? "c-sf-err" : undefined}>
              <legend className="mb-1 text-base font-semibold text-ink">Onde costuma trabalhar?</legend>
              <p className="text-sm text-ink-2">Escolha uma ou mais superfícies comerciais.</p>
              <div className="flex flex-col gap-2">
                {surfaces.map((s) => {
                  const on = field.value.includes(s.id);
                  return (
                    <ChoiceTile
                      key={s.id}
                      checked={on}
                      hint={s.area}
                      onToggle={() =>
                        field.onChange(on ? field.value.filter((x) => x !== s.id) : [...field.value, s.id])
                      }
                    >
                      {s.name}
                    </ChoiceTile>
                  );
                })}
              </div>
              {errors.surfaceIds && (
                <p id="c-sf-err" className="text-sm text-error">
                  {errors.surfaceIds.message}
                </p>
              )}
            </fieldset>
          )}
        />

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-base font-semibold text-ink">Como quer receber</legend>
          <p className="-mt-2 text-sm text-ink-2">
            Os seus ganhos ficam na carteira e pode pedir o levantamento por transferência para o seu IBAN.
          </p>
          <Field id="c-iban" label="IBAN (opcional)" hint="Pode registar mais tarde no perfil. Ex.: AO06 0040 0000 …" error={errors.iban?.message}>
            <Input
              id="c-iban"
              autoCapitalize="characters"
              className="h-12 font-mono tabular"
              aria-invalid={!!errors.iban}
              {...form.register("iban")}
            />
          </Field>
          <Field id="c-holder" label="Titular da conta (opcional)" hint="Se ficar vazio, usamos o seu nome.">
            <Input id="c-holder" autoComplete="name" className="h-12" {...form.register("holder")} />
          </Field>
        </fieldset>

        <div className="flex flex-col gap-3">
          <Button type="submit" variant="tag" size="lg" className="h-12 w-full" disabled={isSubmitting}>
            <PaperPlaneTiltIcon weight="bold" />
            Enviar candidatura
          </Button>
          <p className="text-center text-xs text-ink-2">
            Os seus dados só são vistos pela equipa Melhor Preço.
          </p>
        </div>
      </form>
    </>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-error">{error}</p>
      ) : (
        hint && <p className="text-xs text-ink-2">{hint}</p>
      )}
    </div>
  );
}

const STEPS = [
  { title: "Análise", body: "Revemos os seus dados e ligamos-lhe para uma conversa curta." },
  { title: "Aprovação e formação", body: "Explicamos como fotografar etiquetas e preencher respostas." },
  { title: "Activação", body: "A sua conta fica activa e começa a receber pedidos no telemóvel." },
];

function Submitted({ agent }: { agent: Agent }) {
  const router = useRouter();

  function seeAccount() {
    const s = useStore.getState();
    s.setCurrentAgent(agent.id);
    s.setViewAs("agente");
    router.push(routes.agente.home);
  }

  return (
    <section aria-labelledby="enviada" className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-3">
        <span className={`${styles.stamp} ${styles.stampPending}`}>
          Recebida
        </span>
        <h1 id="enviada" className="text-[1.75rem] leading-tight">
          Obrigado, {agent.name.split(" ")[0]}
        </h1>
        <p className="measure text-[0.9375rem] text-ink-2">
          A sua candidatura ficou registada com o código abaixo. Guarde-o: é o seu identificador de agente.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg bg-surface p-4 ring-1 ring-line">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-ink-2">Código de agente</span>
          <span className="font-mono text-2xl font-semibold tracking-[0.04em] text-ink tabular">{agent.code}</span>
        </div>
        <AgentStatusBadge status={agent.status} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-ink">O que acontece agora</h2>
        <ol className="flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-paper-2 font-mono text-sm font-semibold text-ink tabular">
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5 pt-1">
                <p className="font-medium text-ink">{s.title}</p>
                <p className="text-sm text-ink-2">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm text-ink-2">
          Só agentes aprovados e activos recebem pedidos. Até lá, pode acompanhar o estado da conta na sua área.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row [&>*]:h-12 sm:[&>*]:flex-1">
        <Button variant="tag" onClick={seeAccount}>
          Ver o estado da minha conta
        </Button>
        <Button asChild variant="outline">
          <Link href={routes.home}>Voltar ao início</Link>
        </Button>
      </div>
    </section>
  );
}
