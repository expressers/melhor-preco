"use client";

// TEMPORARY (domain step): bare v2 pricing form (CHANGES §9). The admin
// worker rebuilds this screen with live examples and per-field validation.

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TAX_RATE_NOTE, validatePricing } from "@/lib/pricing";
import { useStore } from "@/lib/store";
import type { PricingConfig, SplitConfig } from "@/lib/types";

const SPLIT_FIELDS: { key: keyof SplitConfig; label: string }[] = [
  { key: "agent", label: "Agente (%)" },
  { key: "platformBelow", label: "Plataforma abaixo dos objectivos (%)" },
  { key: "operatorBelow", label: "Operador abaixo dos objectivos (%)" },
  { key: "platformMet", label: "Plataforma com objectivos cumpridos (%)" },
  { key: "operatorMet", label: "Operador com objectivos cumpridos (%)" },
];

export function AdminPricing() {
  const pricing = useStore((s) => s.pricing);
  const [draft, setDraft] = useState<PricingConfig>(pricing);
  const errors = validatePricing(draft);
  const num = (v: string) => (v === "" ? NaN : Number(v));

  function save() {
    const res = useStore.getState().updatePricing(draft);
    if (!res.ok) return toast.error(res.error);
    toast.success("Preços actualizados");
  }

  return (
    <>
      <PageHeader title="Preços" description={TAX_RATE_NOTE} />
      <div className="grid max-w-xl gap-4">
        <div className="grid gap-2">
          <Label htmlFor="p-simple">Consulta simples (Kz, bruto)</Label>
          <Input id="p-simple" inputMode="numeric" value={draft.simplePrice} onChange={(e) => setDraft({ ...draft, simplePrice: num(e.target.value) })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="p-multi">Preço por item no pedido múltiplo (Kz, bruto)</Label>
          <Input id="p-multi" inputMode="numeric" value={draft.multiItemPrice} onChange={(e) => setDraft({ ...draft, multiItemPrice: num(e.target.value) })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="p-tax">Impostos e taxas (%)</Label>
          <Input
            id="p-tax"
            inputMode="decimal"
            value={Math.round(draft.taxRate * 1000) / 10}
            onChange={(e) => setDraft({ ...draft, taxRate: num(e.target.value) / 100 })}
          />
        </div>
        {SPLIT_FIELDS.map((f) => (
          <div key={f.key} className="grid gap-2">
            <Label htmlFor={`p-${f.key}`}>{f.label}</Label>
            <Input
              id={`p-${f.key}`}
              inputMode="numeric"
              value={draft.split[f.key]}
              onChange={(e) => setDraft({ ...draft, split: { ...draft.split, [f.key]: num(e.target.value) } })}
            />
          </div>
        ))}
        {errors.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-error">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <Button variant="tag" onClick={save} disabled={errors.length > 0} className="justify-self-start">
          Guardar preços
        </Button>
      </div>
    </>
  );
}
