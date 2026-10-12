"use client";

import { requestTitle } from "@/lib/rules";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClockIcon, MagnifyingGlassMinusIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PriceTag } from "@/components/price-tag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { AVAILABILITY } from "@/lib/labels";
import { useStore, type ResultInput } from "@/lib/store";
import type { Availability, ServiceRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./agente.module.scss";
import { PhotoInput } from "./photo-input";
import { ChoiceTile } from "./shared";
import { useNow } from "./use-now";

export const RESULT_FORM_ID = "resposta-agente";

const AVAILABILITY_KEYS = Object.keys(AVAILABILITY) as Availability[];

const itemSchema = z
  .object({
    itemId: z.string().min(1, "Escolha o item."),
    notFound: z.boolean(),
    productName: z.string().trim(),
    brandModel: z.string().trim(),
    price: z.string(),
    store: z.string().trim(),
    location: z.string().trim(),
    availability: z.enum(AVAILABILITY_KEYS as [Availability, ...Availability[]]),
    variants: z.string().trim(),
    photos: z.array(z.string()),
    observations: z.string().trim(),
  })
  .superRefine((it, ctx) => {
    if (it.notFound) return;
    if (it.productName.length < 2)
      ctx.addIssue({ code: "custom", path: ["productName"], message: "Escreva o nome do produto." });
    const n = Number(it.price.replace(/\D/g, ""));
    if (!n || n <= 0) ctx.addIssue({ code: "custom", path: ["price"], message: "Indique o preço em Kz." });
    if (it.store.length < 2) ctx.addIssue({ code: "custom", path: ["store"], message: "Indique a loja." });
  });

const schema = z.object({ items: z.array(itemSchema).min(1, "Adicione pelo menos um produto.") });

type FormValues = z.infer<typeof schema>;
type Item = FormValues["items"][number];

function blankItem(request: ServiceRequest, itemId?: string, notFound = false): Item {
  return {
    itemId: itemId ?? request.items.map((i) => i.id)[0] ?? "",
    notFound,
    productName: notFound ? requestTitle(request) : "",
    brandModel: "",
    price: "",
    store: "",
    location: "",
    availability: "disponivel",
    variants: "",
    photos: [],
    observations: "",
  };
}

const onlyDigits = (s: string) => s.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9);

/** em_consulta: one card per product found (or not found), per surface. */
export function ResultForm({ request, onSubmitted }: { request: ServiceRequest; onSubmitted: () => void }) {
  const surfaceName = (id: string) => request.items.find((i) => i.id === id)?.name ?? id;
  const now = useNow(15_000);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [blankItem(request)] },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = useWatch({ control: form.control, name: "items" });
  const multiSurface = request.items.map((i) => i.id).length > 1;

  // A second tap is harmless: after the first submit the request leaves
  // em_consulta and the store refuses another answer.
  function onValid(values: FormValues) {
    const payload: ResultInput[] = values.items.map((it) =>
      it.notFound
        ? {
            itemId: it.itemId,
            notFound: true,
            productName: it.productName || requestTitle(request),
            observations: it.observations || undefined,
            photos: it.photos,
          }
        : {
            itemId: it.itemId,
            notFound: false,
            productName: it.productName,
            brandModel: it.brandModel || undefined,
            price: Number(onlyDigits(it.price)),
            store: it.store,
            location: it.location || undefined,
            availability: it.availability,
            variants: it.variants || undefined,
            photos: it.photos,
            observations: it.observations || undefined,
          },
    );
    const res = useStore.getState().submitResults(request.id, payload);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Resposta submetida", {
      description: "O cliente foi avisado do valor a pagar. Confirme quando receber.",
    });
    onSubmitted();
  }

  function onInvalid() {
    toast.error("Faltam dados obrigatórios", { description: "Veja os campos assinalados a vermelho." });
    const first = document.querySelector<HTMLElement>(`#${RESULT_FORM_ID} [aria-invalid="true"]`);
    first?.focus();
  }

  const missingSurfaces = request.items.map((i) => i.id).filter((s) => !items?.some((it) => it.itemId === s));

  return (
    <form
      id={RESULT_FORM_ID}
      noValidate
      onSubmit={form.handleSubmit(onValid, onInvalid)}
      className="flex flex-col gap-5"
      aria-labelledby="resposta-titulo"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id="resposta-titulo" className="text-lg font-semibold text-ink">
          Resposta
        </h2>
        <p className="measure text-[0.9375rem] text-ink-2">
          Um cartão por produto encontrado. Se não encontrar nada numa superfície, marque “Produto não encontrado”.
        </p>
        <p className="flex items-center gap-1.5 font-mono text-xs text-ink-2 tabular">
          <ClockIcon aria-hidden className="size-3.5" />
          Data e hora registadas ao submeter: {formatDateTime(new Date(now).toISOString())}
        </p>
      </div>

      {/* Coverage: each requested surface needs at least one entry. */}
      {multiSurface && (
        <ul className="flex flex-col gap-1.5 rounded-lg bg-paper-2 p-3 text-sm" aria-label="Cobertura por superfície">
          {request.items.map((i) => i.id).map((s) => {
            const entries = items?.filter((it) => it.itemId === s) ?? [];
            const found = entries.filter((it) => !it.notFound).length;
            const nf = entries.length - found;
            return (
              <li key={s} className="flex items-center justify-between gap-3">
                <span className="truncate text-ink">{surfaceName(s)}</span>
                <span className={cn("shrink-0 text-xs", entries.length ? "text-ink-2" : "font-semibold text-warning")}>
                  {entries.length === 0
                    ? "Sem resposta"
                    : [found && `${found} encontrado${found > 1 ? "s" : ""}`, nf && "não encontrado"]
                        .filter(Boolean)
                        .join(", ")}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <ol className="flex flex-col gap-4">
        {fields.map((field, index) => (
          <li key={field.id} className={styles.entry}>
            <ItemCard
              index={index}
              control={form.control}
              request={request}
              surfaceName={surfaceName}
              canRemove={fields.length > 1}
              onRemove={() => remove(index)}
            />
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => append(blankItem(request, missingSurfaces[0] ?? items?.at(-1)?.itemId))}
        >
          <PlusIcon weight="bold" />
          Adicionar outro produto
        </Button>
        {missingSurfaces.map((s) => (
          <Button
            key={s}
            type="button"
            variant="ghost"
            className="w-full whitespace-normal"
            onClick={() => append(blankItem(request, s, true))}
          >
            <MagnifyingGlassMinusIcon />
            Não encontrei nada em {surfaceName(s)}
          </Button>
        ))}
      </div>

      {form.formState.errors.items?.root?.message && (
        <p className="text-sm text-error">{form.formState.errors.items.root.message}</p>
      )}
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-error">
      {message}
    </p>
  );
}

function ItemCard({
  index,
  control,
  request,
  surfaceName,
  canRemove,
  onRemove,
}: {
  index: number;
  control: Control<FormValues>;
  request: ServiceRequest;
  surfaceName: (id: string) => string;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const notFound = useWatch({ control, name: `items.${index}.notFound` });
  const price = useWatch({ control, name: `items.${index}.price` });
  const priceValue = Number(onlyDigits(price ?? ""));
  const p = `item-${index}`;

  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
      <legend className="sr-only">Produto {index + 1}</legend>
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs tracking-[0.08em] text-ink-2 uppercase">Produto {index + 1}</p>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="-mr-2 text-ink-2">
            <TrashIcon />
            Remover
          </Button>
        )}
      </div>

      {request.items.map((i) => i.id).length > 1 && (
        <Controller
          control={control}
          name={`items.${index}.itemId`}
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink" id={`${p}-sf`}>
                Superfície
              </span>
              <div role="radiogroup" aria-labelledby={`${p}-sf`} className="grid gap-2 sm:grid-cols-2">
                {request.items.map((i) => i.id).map((s) => (
                  <ChoiceTile key={s} role="radio" checked={field.value === s} onToggle={() => field.onChange(s)}>
                    {surfaceName(s)}
                  </ChoiceTile>
                ))}
              </div>
            </div>
          )}
        />
      )}
      {request.items.map((i) => i.id).length === 1 && (
        <p className="text-sm text-ink-2">
          Item: <span className="font-medium text-ink">{surfaceName(request.items.map((i) => i.id)[0])}</span>
        </p>
      )}

      <Controller
        control={control}
        name={`items.${index}.notFound`}
        render={({ field }) => (
          <label
            htmlFor={`${p}-nf`}
            className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg bg-paper-2 px-3.5"
          >
            <span className="text-[0.9375rem] font-medium text-ink">Produto não encontrado</span>
            <Switch id={`${p}-nf`} checked={field.value} onCheckedChange={field.onChange} />
          </label>
        )}
      />

      {notFound ? (
        <TextField
          control={control}
          name={`items.${index}.observations`}
          id={`${p}-obs`}
          label="O que viu? (opcional)"
          placeholder="Ex.: só havia modelos de 250 litros"
          multiline
        />
      ) : (
        <>
          <Controller
            control={control}
            name={`items.${index}.price`}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${p}-price`}>Preço na etiqueta</Label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input
                      id={`${p}-price`}
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(e) => field.onChange(onlyDigits(e.target.value))}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      enterKeyHint="next"
                      placeholder="0"
                      className="h-14 pr-12 font-mono text-xl tabular md:text-xl"
                      aria-invalid={!!fieldState.error}
                      aria-describedby={fieldState.error ? `${p}-price-err` : `${p}-price-hint`}
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-mono text-ink-2"
                    >
                      Kz
                    </span>
                  </div>
                  {priceValue > 0 && <PriceTag amount={priceValue} size="sm" label="Preço" />}
                </div>
                {fieldState.error ? (
                  <FieldError id={`${p}-price-err`} message={fieldState.error.message} />
                ) : (
                  <p id={`${p}-price-hint`} className="text-xs text-ink-2">
                    Só números, sem pontos nem espaços.
                  </p>
                )}
              </div>
            )}
          />

          <TextField
            control={control}
            name={`items.${index}.productName`}
            id={`${p}-name`}
            label="Produto"
            placeholder={requestTitle(request)}
          />
          <TextField
            control={control}
            name={`items.${index}.brandModel`}
            id={`${p}-brand`}
            label="Marca e modelo (opcional)"
            placeholder="Ex.: Hisense RD-35"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={control}
              name={`items.${index}.store`}
              id={`${p}-store`}
              label="Loja"
              placeholder="Ex.: Casa Kanzala"
            />
            <TextField
              control={control}
              name={`items.${index}.location`}
              id={`${p}-loc`}
              label="Onde fica (opcional)"
              placeholder="Ex.: Pavilhão B, loja 14"
            />
          </div>

          <Controller
            control={control}
            name={`items.${index}.availability`}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-ink" id={`${p}-av`}>
                  Disponibilidade
                </span>
                <div role="radiogroup" aria-labelledby={`${p}-av`} className="grid grid-cols-2 gap-2">
                  {AVAILABILITY_KEYS.map((a) => (
                    <ChoiceTile
                      key={a}
                      role="radio"
                      checked={field.value === a}
                      onToggle={() => field.onChange(a)}
                      className="text-sm"
                    >
                      {AVAILABILITY[a].label}
                    </ChoiceTile>
                  ))}
                </div>
              </div>
            )}
          />

          <TextField
            control={control}
            name={`items.${index}.variants`}
            id={`${p}-var`}
            label="Cores e tamanhos (opcional)"
            placeholder="Ex.: cinzento e branco; 350 L"
          />

          <Controller
            control={control}
            name={`items.${index}.photos`}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-ink">Fotos do produto e da etiqueta</span>
                <PhotoInput value={field.value} onChange={field.onChange} max={3} label="Fotografar" />
                <p className="text-xs text-ink-2">Uma foto da etiqueta com o preço legível ajuda o cliente a confiar.</p>
              </div>
            )}
          />

          <TextField
            control={control}
            name={`items.${index}.observations`}
            id={`${p}-obs`}
            label="Observações (opcional)"
            placeholder="Ex.: preço com desconto até sábado"
            multiline
          />
        </>
      )}
    </fieldset>
  );
}

type TextName =
  | `items.${number}.productName`
  | `items.${number}.brandModel`
  | `items.${number}.store`
  | `items.${number}.location`
  | `items.${number}.variants`
  | `items.${number}.observations`;

function TextField({
  control,
  name,
  id,
  label,
  placeholder,
  multiline,
}: {
  control: Control<FormValues>;
  name: TextName;
  id: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const props = {
          id,
          name: field.name,
          value: field.value,
          onChange: field.onChange,
          onBlur: field.onBlur,
          placeholder,
          "aria-invalid": !!fieldState.error,
          "aria-describedby": fieldState.error ? `${id}-err` : undefined,
        };
        return (
          <div className="flex flex-col gap-2">
            <Label htmlFor={id}>{label}</Label>
            {multiline ? (
              <Textarea ref={field.ref} {...props} className="min-h-20" />
            ) : (
              <Input ref={field.ref} {...props} enterKeyHint="next" className="h-12" />
            )}
            <FieldError id={`${id}-err`} message={fieldState.error?.message} />
          </div>
        );
      }}
    />
  );
}
