"use client";

// TEMPORARY (domain step): bare v2 form so the flow works end to end. The
// cliente worker rebuilds this screen (CHANGES §1, §2): items, live talão,
// "Adicionar outro item", single surface, reference photos.

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { PriceTag } from "@/components/price-tag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { useStore, type NewItemInput } from "@/lib/store";
import type { Category } from "@/lib/types";
import { ClientGate } from "./client-gate";

const blank = (): NewItemInput => ({ category: "electrodomesticos", name: "" });

export function NovaConsulta() {
  return (
    <ClientGate>
      {() => <Form />}
    </ClientGate>
  );
}

function Form() {
  const router = useRouter();
  const surfaces = useStore((s) => s.surfaces).filter((s) => s.active);
  const pricing = useStore((s) => s.pricing);
  const quote = useStore((s) => s.quote);
  const [items, setItems] = useState<NewItemInput[]>([blank()]);
  const [surfaceId, setSurfaceId] = useState(surfaces[0]?.id ?? "");
  const q = quote(items.length);
  void pricing; // re-render when the admin changes prices

  const patch = (i: number, p: Partial<NewItemInput>) => setItems((xs) => xs.map((x, k) => (k === i ? { ...x, ...p } : x)));

  function submit() {
    const res = useStore.getState().createRequest({ items, surfaceId, priority: "normal" });
    if (!res.ok) return toast.error(res.error);
    toast.success("Pedido submetido");
    router.push(routes.cliente.pedido(res.request.id));
  }

  return (
    <>
      <PageHeader title="Nova consulta" description="Uma superfície por pedido. Se quiser outra superfície, faça outro pedido." />
      <div className="flex flex-col gap-6">
        {items.map((it, i) => (
          <fieldset key={i} className="flex flex-col gap-3 rounded-lg bg-surface p-4 ring-1 ring-line">
            <legend className="text-sm font-semibold">Item {i + 1}</legend>
            <select
              aria-label="Categoria"
              className="h-11 rounded-lg border border-line bg-surface px-3"
              value={it.category}
              onChange={(e) => patch(i, { category: e.target.value as Category })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <Input aria-label="Produto" placeholder="Ex.: geleira Hisense de 350 litros" value={it.name} onChange={(e) => patch(i, { name: e.target.value })} />
            <Input aria-label="Marca ou modelo (opcional)" placeholder="Marca ou modelo (opcional)" value={it.brand ?? ""} onChange={(e) => patch(i, { brand: e.target.value })} />
            {items.length > 1 && (
              <Button variant="ghost" size="sm" className="self-start" onClick={() => setItems((xs) => xs.filter((_, k) => k !== i))}>
                <TrashIcon />
                Remover item
              </Button>
            )}
          </fieldset>
        ))}
        <Button variant="outline" className="self-start" onClick={() => setItems((xs) => [...xs, blank()])}>
          <PlusIcon />
          Adicionar outro item
        </Button>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Superfície comercial</legend>
          {surfaces.map((s) => (
            <label key={s.id} className="flex min-h-11 items-center gap-3">
              <input type="radio" name="surface" checked={surfaceId === s.id} onChange={() => setSurfaceId(s.id)} />
              {s.name} <span className="text-ink-2">({s.area})</span>
            </label>
          ))}
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">{q.label}</span>
            <span className="font-mono text-sm text-ink-2 tabular">{q.breakdown}</span>
          </div>
          <PriceTag amount={q.gross} size="lg" label="Valor da consulta" />
        </div>
        <Button variant="tag" size="lg" onClick={submit}>
          Confirmar pedido
        </Button>
      </div>
    </>
  );
}
