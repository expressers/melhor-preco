"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CameraIcon,
  CheckIcon,
  LightningIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PriceTag } from "@/components/price-tag";
import { ProductPhoto } from "@/components/product-photo";
import { Receipt, ReceiptNote, ReceiptRow, ReceiptRule, ReceiptTotal } from "@/components/receipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatKz } from "@/lib/format";
import { CATEGORIES, CATEGORY_LABEL, PRIORITY } from "@/lib/labels";
import type { PriceQuote } from "@/lib/pricing";
import { routes } from "@/lib/routes";
import { useStore } from "@/lib/store";
import type { Category, Client, PricingConfig, Surface } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ClientGate } from "./client-gate";
import { describedBy, Field } from "./field";

const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [Category, ...Category[]];

const schema = z.object({
  kind: z.enum(["especifico", "generico"]),
  category: z.enum(CATEGORY_VALUES, { error: "Escolha a categoria do produto." }),
  description: z.string().trim().min(3, "Diga-nos que produto procura."),
  brand: z.string().trim(),
  features: z.string().trim(),
  variants: z.string().trim(),
  photo: z.string().optional(),
  surfaceIds: z.array(z.string()).min(1, "Escolha pelo menos uma superfície comercial."),
  priority: z.enum(["normal", "urgente"]),
  deadline: z
    .string()
    .refine((v) => v === "" || new Date(v).getTime() > Date.now(), {
      message: "Escolha uma data e hora no futuro.",
    }),
});

type Values = z.infer<typeof schema>;

const COPY = {
  especifico: {
    description: "Geleira Hisense de 350 litros",
    brandLabel: "Marca ou modelo",
    brand: "Hisense RD-35",
    features: "Duas portas, consumo A+, com garantia",
  },
  generico: {
    description: "Geleira de duas portas",
    brandLabel: "Marcas preferidas",
    brand: "Hisense, LG ou Samsung",
    features: "Entre 300 e 400 litros, até 450 000 Kz",
  },
} as const;

export function NovaConsulta() {
  return <ClientGate>{(client) => <Flow client={client} />}</ClientGate>;
}

function Flow({ client }: { client: Client }) {
  const router = useRouter();
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const [step, setStep] = useState<"form" | "confirm">("form");
  const surfaces = useStore((s) => s.surfaces);
  const active = surfaces.filter((s) => s.active);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: "especifico",
      category: undefined,
      description: "",
      brand: "",
      features: "",
      variants: "",
      photo: undefined,
      surfaceIds: [],
      priority: "normal",
      deadline: "",
    },
  });
  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = form;

  const kind = useWatch({ control, name: "kind" });
  const copy = COPY[kind];

  const toConfirm = () => {
    setStep("confirm");
    window.scrollTo({ top: 0 });
  };

  const submit = () => {
    const v = getValues();
    const generic = v.kind === "generico" ? "Pedido genérico: comparar opções." : "";
    const res = useStore.getState().createRequest({
      category: v.category,
      description: v.description,
      brand: v.brand || undefined,
      features: [generic, v.features].filter(Boolean).join(" ") || undefined,
      variants: v.variants || undefined,
      photo: v.photo,
      surfaceIds: v.surfaceIds,
      priority: v.priority,
      deadline: v.deadline ? new Date(v.deadline).toISOString() : undefined,
      clientId: client.id,
    });
    if (!res.ok) {
      toast.error(res.error);
      setStep("form");
      return;
    }
    toast.success(`Pedido ${res.request.id} submetido`, {
      description: "Vamos atribuí-lo a um agente credenciado. Recebe um aviso a cada passo.",
    });
    router.push(routes.cliente.pedido(res.request.id));
  };

  if (step === "confirm") {
    return (
      <Confirm
        values={getValues()}
        surfaces={surfaces}
        onBack={() => {
          setStep("form");
          window.scrollTo({ top: 0 });
        }}
        onConfirm={submit}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit(toConfirm)}
      noValidate
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10"
    >
      <div className="flex min-w-0 flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-[1.75rem] sm:text-[2.25rem]">Nova consulta</h1>
          <p className="measure text-[0.9375rem] text-ink-2">
            Diga-nos o que procura e onde. Um agente credenciado vai ao local, confirma preço, stock e localização, e
            envia fotografias.
          </p>
        </header>

        {/* 1. O produto */}
        <fieldset className="flex flex-col gap-5">
          <legend className="mb-4 text-lg font-semibold tracking-[-0.025em] text-ink">O produto</legend>

          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Tipo de pedido" className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["especifico", "Sei o que quero", "Uma marca ou modelo concreto."],
                    ["generico", "Quero comparar opções", "O agente mostra o que houver."],
                  ] as const
                ).map(([value, title, hint]) => (
                  <ChoiceCard
                    key={value}
                    role="radio"
                    checked={field.value === value}
                    onClick={() => field.onChange(value)}
                    title={title}
                    hint={hint}
                  />
                ))}
              </div>
            )}
          />

          <Field id={id("category")} label="Categoria" error={errors.category?.message}>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger
                    id={id("category")}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-invalid={!!errors.category || undefined}
                    aria-describedby={describedBy(id("category"), errors.category?.message, false)}
                    className="w-full sm:w-80"
                  >
                    <SelectValue placeholder="Escolha uma categoria" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="min-h-11 py-2 pl-3">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field
            id={id("description")}
            label="Produto"
            hint="Exemplo: geleira Hisense de 350 litros, cinzenta, no Shopping Popular e na Cidade da China."
            error={errors.description?.message}
          >
            <Input
              id={id("description")}
              placeholder={copy.description}
              aria-invalid={!!errors.description || undefined}
              aria-describedby={describedBy(id("description"), errors.description?.message)}
              {...register("description")}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={id("brand")} label={copy.brandLabel} optional>
              <Input id={id("brand")} placeholder={copy.brand} {...register("brand")} />
            </Field>
            <Field id={id("variants")} label="Tamanho, cor ou variantes" optional>
              <Input id={id("variants")} placeholder="Cinzenta ou inox" {...register("variants")} />
            </Field>
          </div>

          <Field
            id={id("features")}
            label="Características pretendidas"
            optional
            hint="Capacidade, potência, material, orçamento máximo: tudo o que ajude o agente a escolher bem."
          >
            <Textarea
              id={id("features")}
              placeholder={copy.features}
              aria-describedby={`${id("features")}-hint`}
              rows={3}
              {...register("features")}
            />
          </Field>

          <PhotoField control={control} onChange={(v) => form.setValue("photo", v)} />
        </fieldset>

        {/* 2. Onde procurar */}
        <fieldset className="flex flex-col gap-3" aria-describedby={describedBy(id("surfaces"), errors.surfaceIds?.message)}>
          <legend className="mb-1 text-lg font-semibold tracking-[-0.025em] text-ink">Onde procurar</legend>
          <p id={`${id("surfaces")}-hint`} className="text-[0.8125rem] text-ink-2">
            Pode escolher várias. Cada superfície a mais acrescenta ao valor da consulta, que vê ao lado antes de
            confirmar.
          </p>
          <Controller
            control={control}
            name="surfaceIds"
            render={({ field }) => (
              <div className="grid gap-2 sm:grid-cols-2">
                {active.map((s) => {
                  const checked = field.value.includes(s.id);
                  return (
                    <ChoiceCard
                      key={s.id}
                      role="checkbox"
                      checked={checked}
                      onClick={() =>
                        field.onChange(checked ? field.value.filter((x) => x !== s.id) : [...field.value, s.id])
                      }
                      title={s.name}
                      hint={`${s.area}. ${s.location}`}
                    />
                  );
                })}
              </div>
            )}
          />
          {errors.surfaceIds?.message && (
            <p id={`${id("surfaces")}-error`} role="alert" className="text-[0.8125rem] font-medium text-error">
              {errors.surfaceIds.message}
            </p>
          )}
        </fieldset>

        {/* 3. Prazo */}
        <fieldset className="flex flex-col gap-5">
          <legend className="mb-4 text-lg font-semibold tracking-[-0.025em] text-ink">Prazo</legend>
          <PriorityField control={control} />
          <Field
            id={id("deadline")}
            label="Preciso da resposta até"
            optional
            hint="Sem data, o agente responde dentro do prazo da prioridade escolhida."
            error={errors.deadline?.message}
          >
            <Input
              id={id("deadline")}
              type="datetime-local"
              className="w-full sm:w-72"
              aria-invalid={!!errors.deadline || undefined}
              aria-describedby={describedBy(id("deadline"), errors.deadline?.message)}
              {...register("deadline")}
            />
          </Field>
        </fieldset>

        <QuoteBar control={control} disabled={isSubmitting} />
      </div>

      <QuoteAside control={control} disabled={isSubmitting} />
    </form>
  );
}

/** Large toggle card used for radio and checkbox choices (≥ 56px, whole card tappable). */
function ChoiceCard({
  role,
  checked,
  onClick,
  title,
  hint,
  aside,
}: {
  role: "radio" | "checkbox";
  checked: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
  aside?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "press flex min-h-14 w-full items-start gap-3 rounded-lg border bg-surface p-3.5 text-left outline-none transition-[transform,border-color,box-shadow] focus-visible:ring-3 focus-visible:ring-ring/30",
        checked ? "border-ink shadow-[inset_0_0_0_1px_var(--ink)]" : "border-line hover-fine:border-ink/40",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center border transition-colors duration-150",
          role === "radio" ? "rounded-full" : "rounded-[5px]",
          checked ? "border-ink bg-ink text-surface" : "border-[var(--field)] bg-surface",
        )}
      >
        {checked &&
          (role === "radio" ? <span className="size-2 rounded-full bg-tag" /> : <CheckIcon weight="bold" className="size-3.5" />)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[0.9375rem] leading-snug font-medium text-ink">{title}</span>
        {hint && <span className="text-[0.8125rem] leading-snug text-ink-2">{hint}</span>}
      </span>
      {aside}
    </button>
  );
}

function PriorityField({ control }: { control: Control<Values> }) {
  const pricing = useStore((s) => s.pricing);
  return (
    <Controller
      control={control}
      name="priority"
      render={({ field }) => (
        <div role="radiogroup" aria-label="Prioridade" className="grid gap-2 sm:grid-cols-2">
          {(["normal", "urgente"] as const).map((p) => (
            <ChoiceCard
              key={p}
              role="radio"
              checked={field.value === p}
              onClick={() => field.onChange(p)}
              title={PRIORITY[p].label}
              hint={PRIORITY[p].hint}
              aside={
                p === "urgente" ? (
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[0.8125rem] text-ink tabular">
                    <LightningIcon className="size-4" />+{formatKz(pricing.urgentIncrement)}
                  </span>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    />
  );
}

const MAX_SIDE = 960;

/** Downscale a picked image to a small JPEG data URL so it fits in localStorage. */
function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(reader.result as string);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function PhotoField({ control, onChange }: { control: Control<Values>; onChange: (v: string | undefined) => void }) {
  const photo = useWatch({ control, name: "photo" });
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const uid = useId();

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Escolha uma imagem (JPG, PNG ou semelhante).");
    if (file.size > 12 * 1024 * 1024) return toast.error("Essa imagem é muito grande. Escolha uma até 12 MB.");
    setBusy(true);
    try {
      onChange(await shrinkImage(file));
    } catch {
      toast.error("Não foi possível ler essa imagem. Tente outra.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span id={`${uid}-label`} className="flex items-baseline gap-2 text-sm font-medium text-ink">
        Fotografia de referência
        <span className="text-xs font-normal text-ink-2">opcional</span>
      </span>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-labelledby={`${uid}-label`}
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {photo ? (
        <div className="flex items-end gap-3">
          <ProductPhoto src={photo} alt="Fotografia de referência escolhida" ratio="1/1" className="w-28 border border-line" />
          <div className="flex flex-col gap-1">
            <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
              Trocar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
              <TrashIcon data-icon="inline-start" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-describedby={`${uid}-hint`}
          className="press flex min-h-14 items-center gap-3 self-start rounded-lg border border-dashed border-ink/30 bg-surface px-4 py-3 text-left text-sm font-medium text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/30 hover-fine:border-ink/60 disabled:opacity-60"
        >
          <CameraIcon className="size-5" />
          {busy ? "A preparar a imagem…" : "Adicionar fotografia"}
        </button>
      )}
      <p id={`${uid}-hint`} className="text-[0.8125rem] text-ink-2">
        Uma foto do produto ou de um anúncio ajuda o agente a reconhecê-lo. Fica só neste aparelho.
      </p>
    </div>
  );
}

function useQuote(control: Control<Values>) {
  const [surfaceIds, priority] = useWatch({ control, name: ["surfaceIds", "priority"] });
  // subscribe to pricing so the quote follows admin changes
  const pricing = useStore((s) => s.pricing);
  const quote = useStore((s) => s.quote);
  return { q: quote(surfaceIds.length, priority), surfaceCount: surfaceIds.length, priority, pricing };
}

function breakdown(q: PriceQuote, pricing: PricingConfig, urgent: boolean) {
  const extra = q.extraSurfaces * pricing.extraSurfaceIncrement;
  const urgency = urgent ? pricing.urgentIncrement : 0;
  return { base: q.price - extra - urgency, extra, urgency };
}

function quoteLabel(surfaceCount: number, priority: Values["priority"]) {
  const s = surfaceCount <= 1 ? "1 superfície" : `${surfaceCount} superfícies`;
  return `${s}, prioridade ${PRIORITY[priority].label.toLowerCase()}`;
}

/** From lg: the live price as a talão beside the form. */
function QuoteAside({ control, disabled }: { control: Control<Values>; disabled: boolean }) {
  const { q, surfaceCount, priority, pricing } = useQuote(control);
  const b = breakdown(q, pricing, priority === "urgente");
  const label = quoteLabel(surfaceCount, priority);

  return (
      <aside className="hidden lg:block">
        <div className="sticky top-24 flex flex-col gap-4">
          <Receipt title="Valor da consulta" meta={label}>
            <ReceiptRow label="Consulta base" value={formatKz(b.base)} />
            {q.extraSurfaces > 0 && (
              <ReceiptRow label={`Superfícies extra (${q.extraSurfaces})`} value={`+${formatKz(b.extra)}`} />
            )}
            {b.urgency > 0 && <ReceiptRow label="Urgência" value={`+${formatKz(b.urgency)}`} />}
            <ReceiptRule />
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm font-semibold text-ink">Total</span>
              <PriceTag amount={q.price} size="lg" label="Valor da consulta" />
            </div>
            <ReceiptNote>
              Não paga nada agora. Paga ao agente por Multicaixa Express só depois de ele responder.
            </ReceiptNote>
          </Receipt>
          <Button type="submit" variant="tag" size="lg" disabled={disabled} className="w-full">
            Rever e confirmar
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </aside>
  );
}

/** Below lg: the live price sticks above the tab bar while the form scrolls. */
function QuoteBar({ control, disabled }: { control: Control<Values>; disabled: boolean }) {
  const { q, surfaceCount, priority } = useQuote(control);
  return (
    <div className="sticky bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-20 -mx-4 border-y border-line bg-surface px-4 py-3 sm:-mx-5 sm:px-5 md:bottom-4 md:mx-0 md:rounded-lg md:border md:shadow-soft lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <PriceTag amount={q.price} size="md" label="Valor da consulta" className="self-start" />
          <span className="truncate text-xs text-ink-2">{quoteLabel(surfaceCount, priority)}</span>
        </div>
        <Button type="submit" variant="tag" disabled={disabled}>
          Rever
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function Confirm({
  values,
  surfaces,
  onBack,
  onConfirm,
}: {
  values: Values;
  surfaces: Surface[];
  onBack: () => void;
  onConfirm: () => void;
}) {
  const pricing = useStore((s) => s.pricing);
  const q = useStore((s) => s.quote)(values.surfaceIds.length, values.priority);
  const b = breakdown(q, pricing, values.priority === "urgente");
  const [sending, setSending] = useState(false);
  const chosen = values.surfaceIds.map((sid) => surfaces.find((s) => s.id === sid)).filter(Boolean) as Surface[];

  return (
    <div className="mx-auto flex w-full max-w-xl animate-in flex-col gap-6 duration-200 ease-out fade-in-0 slide-in-from-bottom-2">
      <header className="flex flex-col gap-2">
        <h1 className="text-[1.75rem] sm:text-[2.25rem]">Confirmar consulta</h1>
        <p className="measure text-[0.9375rem] text-ink-2">
          Reveja o pedido. O valor fica fixo a partir daqui e só o paga depois de receber a resposta do agente.
        </p>
      </header>

      <Receipt title="Talão da consulta" meta="Por submeter">
        <div className="flex gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs text-ink-2">{CATEGORY_LABEL[values.category]}</span>
            <p className="text-base leading-snug font-semibold text-ink">{values.description}</p>
            {values.kind === "generico" && <span className="text-[0.8125rem] text-ink-2">Pedido genérico: comparar opções</span>}
          </div>
          {values.photo && (
            <ProductPhoto src={values.photo} alt="Fotografia de referência" ratio="1/1" className="w-16 shrink-0" />
          )}
        </div>
        {(values.brand || values.variants || values.features) && <ReceiptRule />}
        {values.brand && (
          <ReceiptRow label={values.kind === "generico" ? "Marcas" : "Marca ou modelo"} value={values.brand} mono={false} />
        )}
        {values.variants && <ReceiptRow label="Variantes" value={values.variants} mono={false} />}
        {values.features && (
          <div className="flex flex-col gap-0.5">
            <span className="text-ink-2">Características</span>
            <span className="text-ink">{values.features}</span>
          </div>
        )}
        <ReceiptRule />
        <div className="flex flex-col gap-1">
          <span className="text-ink-2">Superfícies</span>
          <ul className="flex flex-col gap-0.5">
            {chosen.map((s) => (
              <li key={s.id} className="text-ink">
                {s.name} <span className="text-ink-2">· {s.area}</span>
              </li>
            ))}
          </ul>
        </div>
        <ReceiptRow label="Prioridade" value={PRIORITY[values.priority].label} mono={false} />
        <ReceiptRow
          label="Resposta até"
          value={values.deadline ? formatDateTime(new Date(values.deadline).toISOString()) : PRIORITY[values.priority].hint.replace("Resposta ", "")}
          mono={!!values.deadline}
        />
        <ReceiptRule />
        <ReceiptRow label="Consulta base" value={formatKz(b.base)} />
        {q.extraSurfaces > 0 && (
          <ReceiptRow label={`Superfícies extra (${q.extraSurfaces})`} value={`+${formatKz(b.extra)}`} />
        )}
        {b.urgency > 0 && <ReceiptRow label="Urgência" value={`+${formatKz(b.urgency)}`} />}
        <ReceiptTotal amount={q.price} />
      </Receipt>

      <div className="flex items-center justify-between gap-4 rounded-lg bg-paper-2 px-4 py-4">
        <p className="text-[0.8125rem] leading-relaxed text-ink-2">
          Paga directamente ao agente por Multicaixa Express, depois da resposta. Mínimo de 600 Kz por consulta.
        </p>
        <PriceTag amount={q.price} size="lg" label="Valor da consulta" className="shrink-0" />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" size="lg" onClick={onBack} disabled={sending}>
          <ArrowLeftIcon data-icon="inline-start" />
          Voltar e editar
        </Button>
        <Button
          type="button"
          variant="tag"
          size="lg"
          disabled={sending}
          onClick={() => {
            setSending(true);
            onConfirm();
          }}
        >
          <CheckIcon data-icon="inline-start" weight="bold" />
          Confirmar consulta
        </Button>
      </div>
    </div>
  );
}
