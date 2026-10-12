"use client";

import { CameraIcon, CaretDownIcon, PlusIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { compressImage } from "@/components/agente/photo-input";
import { PageHeader } from "@/components/app-shell";
import { PriceTag } from "@/components/price-tag";
import { ProductPhoto } from "@/components/product-photo";
import { Receipt, ReceiptNote, ReceiptRow, ReceiptRule } from "@/components/receipt";
import { ClientKindBadge, RequestKindBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatKz } from "@/lib/format";
import { CATEGORIES, PRIORITY } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { clientDisplayName } from "@/lib/rules";
import { useStore, type NewItemInput } from "@/lib/store";
import type { Category, Client, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ClientGate } from "./client-gate";
import { describedBy, Field } from "./field";
import styles from "./nova-consulta.module.scss";

type Draft = NewItemInput & { key: number; open: boolean };

const blank = (key: number): Draft => ({
  key,
  open: false,
  category: "electrodomesticos",
  name: "",
  variations: {},
});

const PLACEHOLDERS = [
  "Ex.: geleira Hisense de 350 litros",
  "Ex.: saco de cimento 50 kg",
  "Ex.: fogão a gás de 4 bocas",
  "Ex.: telemóvel Samsung Galaxy A15",
];

export function NovaConsulta() {
  return <ClientGate>{(client) => <Form client={client} />}</ClientGate>;
}

function Form({ client }: { client: Client }) {
  const router = useRouter();
  const allSurfaces = useStore((s) => s.surfaces);
  const surfaces = allSurfaces.filter((s) => s.active);
  const quote = useStore((s) => s.quote);
  const pricing = useStore((s) => s.pricing); // also re-renders when the admin changes prices

  const nextKey = useRef(1);
  const [items, setItems] = useState<Draft[]>(() => [blank(0)]);
  const [surfaceId, setSurfaceId] = useState(surfaces[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>("normal");
  const [tried, setTried] = useState(false);
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const uid = useId();

  const q = quote(items.length);
  const surface = surfaces.find((s) => s.id === surfaceId);
  const invalid = items.map((it) => it.name.trim().length < 3);

  useEffect(() => {
    if (focusKey == null) return;
    document.getElementById(`${uid}-name-${focusKey}`)?.focus();
  }, [focusKey, uid]);

  const patch = (key: number, p: Partial<Draft>) =>
    setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const add = () => {
    const key = nextKey.current++;
    setItems((xs) => [...xs, blank(key)]);
    setFocusKey(key);
  };

  const remove = (key: number) => {
    const at = items.findIndex((x) => x.key === key);
    const rest = items.filter((x) => x.key !== key);
    setItems(rest);
    setFocusKey(rest[Math.max(0, at - 1)]?.key ?? null);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    const bad = items.findIndex((_, i) => invalid[i]);
    if (bad >= 0) {
      document.getElementById(`${uid}-name-${items[bad].key}`)?.focus();
      return;
    }
    if (!surfaceId) return toast.error("Escolha a superfície comercial.");
    const res = useStore.getState().createRequest({
      items: items.map(({ category, name, brand, characteristics, variations, photo }) => ({
        category,
        name,
        brand,
        characteristics,
        variations,
        photo,
      })),
      surfaceId,
      priority,
    });
    if (!res.ok) return toast.error(res.error);
    toast.success(`Pedido ${res.request.id} submetido`, {
      description: "O operador da superfície vai atribuí-lo a um agente.",
    });
    router.push(routes.cliente.pedido(res.request.id));
  }

  return (
    <>
      <PageHeader
        title="Nova consulta"
        description="Diga o que procura e onde. Pode pedir vários produtos de uma vez na mesma superfície."
      />
      <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby={`${uid}-h-items`} className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`${uid}-h-items`} className="text-lg">
                O que procura
              </h2>
              <span className="font-mono text-xs text-ink-2 tabular" aria-hidden>
                {items.length} {items.length === 1 ? "item" : "itens"}
              </span>
            </div>
            <ol className="flex flex-col gap-4">
              {items.map((it, i) => (
                <li key={it.key} className={cn(it.key > 0 && styles.itemEnter)}>
                  <ItemFields
                    uid={uid}
                    index={i}
                    item={it}
                    canRemove={items.length > 1}
                    nameError={tried && invalid[i] ? "Descreva o produto (pelo menos 3 letras)." : undefined}
                    onChange={(p) => patch(it.key, p)}
                    onRemove={() => remove(it.key)}
                  />
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={add}
              className="press flex min-h-14 items-center justify-center gap-2 rounded-lg border border-dashed border-ink/30 bg-transparent px-4 text-[0.9375rem] font-medium text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/40 hover-fine:border-ink hover-fine:bg-surface"
            >
              <PlusIcon weight="bold" className="size-4" />
              Adicionar outro item
            </button>
            <p className="text-[0.8125rem] leading-snug text-ink-2">
              Com dois ou mais itens o pedido passa a múltiplo e cada item custa {formatKz(pricing.multiItemPrice)}. Cores, tamanhos ou modelos do mesmo produto não contam como itens extra.
            </p>
          </section>

          <section aria-labelledby={`${uid}-h-surface`} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 id={`${uid}-h-surface`} className="text-lg">
                Em que superfície
              </h2>
              <p id={`${uid}-surface-hint`} className="measure text-[0.8125rem] leading-snug text-ink-2">
                Cada pedido é para uma só superfície. Para comparar noutra superfície, faça outro pedido.
              </p>
            </div>
            <RadioGroup
              value={surfaceId}
              onValueChange={setSurfaceId}
              aria-labelledby={`${uid}-h-surface`}
              aria-describedby={`${uid}-surface-hint`}
              className="gap-2"
            >
              {surfaces.map((s) => (
                <label
                  key={s.id}
                  htmlFor={`${uid}-sf-${s.id}`}
                  className={cn(
                    "press flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border bg-surface px-4 py-3.5",
                    surfaceId === s.id ? "border-ink" : "border-line hover-fine:border-ink/40",
                  )}
                >
                  <RadioGroupItem id={`${uid}-sf-${s.id}`} value={s.id} className="mt-1" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium text-ink">
                      {s.name} <span className="font-normal text-ink-2">· {s.area}</span>
                    </span>
                    <span className="text-[0.8125rem] leading-snug text-ink-2">{s.location}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </section>

          <section aria-labelledby={`${uid}-h-prio`} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 id={`${uid}-h-prio`} className="text-lg">
                Para quando
              </h2>
              <p className="text-[0.8125rem] leading-snug text-ink-2">A prioridade não muda o valor da consulta.</p>
            </div>
            <RadioGroup
              value={priority}
              onValueChange={(v) => setPriority(v as Priority)}
              aria-labelledby={`${uid}-h-prio`}
              className="grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {(Object.keys(PRIORITY) as Priority[]).map((p) => (
                <label
                  key={p}
                  htmlFor={`${uid}-p-${p}`}
                  className={cn(
                    "press flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border bg-surface px-4 py-3.5",
                    priority === p ? "border-ink" : "border-line hover-fine:border-ink/40",
                  )}
                >
                  <RadioGroupItem id={`${uid}-p-${p}`} value={p} className="mt-1" />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium text-ink">{PRIORITY[p].label}</span>
                    <span className="text-[0.8125rem] leading-snug text-ink-2">{PRIORITY[p].hint}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </section>
        </div>

        <aside aria-label="Talão da consulta" className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-col gap-4">
            <Receipt title="Talão da consulta" meta={<RequestKindBadge kind={q.kind} />}>
              <div aria-live="polite" className="flex flex-col gap-3">
                <div key={`${q.kind}-${q.itemCount}`} className={cn("flex flex-col gap-1", styles.reprint)}>
                  <span className="text-base font-semibold text-ink">{q.label}</span>
                  <span className="font-mono text-ink-2 tabular">
                    {q.breakdown} = {formatKz(q.gross)}
                  </span>
                </div>
              </div>
              <ol className="flex flex-col gap-1">
                {items.map((it, i) => (
                  <li key={it.key} className="flex gap-2 text-ink">
                    <span className="w-5 shrink-0 font-mono text-ink-2 tabular">{i + 1}.</span>
                    <span className={cn("min-w-0 truncate", !it.name.trim() && "text-ink-2 italic")}>
                      {it.name.trim() || "Por descrever"}
                    </span>
                  </li>
                ))}
              </ol>
              <ReceiptRule />
              <ReceiptRow label="Superfície" value={surface?.name ?? "Por escolher"} mono={false} />
              <ReceiptRow label="Prioridade" value={PRIORITY[priority].label} mono={false} />
              <ReceiptRow
                label="Em nome de"
                value={
                  <span className="inline-flex items-center gap-2">
                    <span className="max-w-[10rem] truncate">{clientDisplayName(client)}</span>
                    <ClientKindBadge kind={client.kind} />
                  </span>
                }
                mono={false}
              />
              {client.kind === "empresa" && client.company && (
                <ReceiptRow label="NIF" value={client.company.nif} />
              )}
              <ReceiptRule />
              <div className="flex items-end justify-between gap-3">
                <span className="font-semibold text-ink">Total a pagar</span>
                <PriceTag key={q.gross} amount={q.gross} size="lg" label="Valor da consulta" className={styles.reprint} />
              </div>
              <ReceiptNote>
                Valor com impostos e taxas incluídos. Só paga depois da resposta do agente, por referência Multicaixa
                à plataforma.
              </ReceiptNote>
            </Receipt>
            <Button type="submit" variant="tag" size="lg" className="w-full">
              Confirmar pedido de {formatKz(q.gross)}
            </Button>
          </div>
        </aside>
      </form>
    </>
  );
}

function ItemFields({
  uid,
  index,
  item,
  canRemove,
  nameError,
  onChange,
  onRemove,
}: {
  uid: string;
  index: number;
  item: Draft;
  canRemove: boolean;
  nameError?: string;
  onChange: (p: Partial<Draft>) => void;
  onRemove: () => void;
}) {
  const id = (k: string) => `${uid}-${k}-${item.key}`;
  const v = item.variations ?? {};
  const setVar = (p: Partial<NonNullable<NewItemInput["variations"]>>) => onChange({ variations: { ...v, ...p } });
  const extras = [item.characteristics, v.models, v.colours, v.sizes, item.photo].filter(Boolean).length;

  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 sm:p-5">
      <legend className="sr-only">Item {index + 1}</legend>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <span aria-hidden className="font-mono text-[0.9375rem] font-semibold text-ink tabular">
          Item {index + 1}
        </span>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="-mr-2 text-ink-2">
            <TrashIcon data-icon="inline-start" />
            Remover
            <span className="sr-only"> item {index + 1}</span>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[13rem_minmax(0,1fr)]">
        <Field id={id("cat")} label="Categoria">
          <Select value={item.category} onValueChange={(c) => onChange({ category: c as Category })}>
            <SelectTrigger id={id("cat")} className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id={id("name")} label="Produto" error={nameError}>
          <Input
            id={id("name")}
            value={item.name}
            placeholder={PLACEHOLDERS[index % PLACEHOLDERS.length]}
            aria-invalid={!!nameError || undefined}
            aria-describedby={describedBy(id("name"), nameError, false)}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </Field>
      </div>

      <Field id={id("brand")} label="Marca ou modelo" optional>
        <Input
          id={id("brand")}
          value={item.brand ?? ""}
          placeholder="Ex.: Hisense, Cimangola"
          onChange={(e) => onChange({ brand: e.target.value })}
        />
      </Field>

      <button
        type="button"
        aria-expanded={item.open}
        aria-controls={id("more")}
        onClick={() => onChange({ open: !item.open })}
        className="press -mx-1 inline-flex min-h-11 items-center gap-2 self-start rounded-full px-1 text-sm font-medium text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <CaretDownIcon
          aria-hidden
          className={cn("size-4 transition-transform duration-200 ease-out", item.open && "rotate-180")}
        />
        Características, variações e fotografia
        {extras > 0 && !item.open && (
          <span className="rounded-full bg-paper-2 px-2 font-mono text-xs text-ink-2 tabular">{extras}</span>
        )}
      </button>

      {item.open && (
        <div id={id("more")} className="flex flex-col gap-4 border-t border-dashed border-line pt-4">
          <Field id={id("char")} label="Características pretendidas" optional>
            <Textarea
              id={id("char")}
              rows={2}
              value={item.characteristics ?? ""}
              placeholder="Ex.: duas portas, classe A+, com garantia"
              onChange={(e) => onChange({ characteristics: e.target.value })}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink">
              Variações pretendidas <span className="text-xs font-normal text-ink-2">opcional</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input aria-label="Modelos" placeholder="Modelos" value={v.models ?? ""} onChange={(e) => setVar({ models: e.target.value })} />
              <Input aria-label="Cores" placeholder="Cores" value={v.colours ?? ""} onChange={(e) => setVar({ colours: e.target.value })} />
              <Input aria-label="Tamanhos" placeholder="Tamanhos" value={v.sizes ?? ""} onChange={(e) => setVar({ sizes: e.target.value })} />
            </div>
            <p className="text-[0.8125rem] leading-snug text-ink-2">Não contam como itens extra.</p>
          </div>
          <ReferencePhoto
            id={id("photo")}
            value={item.photo}
            alt={item.name || `Item ${index + 1}`}
            onChange={(photo) => onChange({ photo })}
          />
        </div>
      )}
    </fieldset>
  );
}

function ReferencePhoto({
  id,
  value,
  alt,
  onChange,
}: {
  id: string;
  value?: string;
  alt: string;
  onChange: (photo?: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await compressImage(file, 800, 0.6));
    } catch {
      toast.error("Não foi possível ler esta imagem. Experimente outra fotografia.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        Fotografia de referência <span className="text-xs font-normal text-ink-2">opcional</span>
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {value ? (
        <div className="flex items-center gap-3">
          <ProductPhoto src={value} alt={`Referência: ${alt}`} ratio="1/1" sizes="72px" className="w-18 shrink-0" />
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            <XIcon data-icon="inline-start" />
            Retirar fotografia
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <CameraIcon data-icon="inline-start" />
          {busy ? "A preparar…" : "Juntar fotografia"}
        </Button>
      )}
      <p className="text-[0.8125rem] leading-snug text-ink-2">Ajuda o agente a reconhecer o produto na loja.</p>
    </div>
  );
}
