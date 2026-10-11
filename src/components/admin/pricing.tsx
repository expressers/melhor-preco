"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/app-shell";
import { Money, PriceTag } from "@/components/price-tag";
import { Receipt, ReceiptNote, ReceiptRow, ReceiptRule } from "@/components/receipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatKz } from "@/lib/format";
import { DEFAULT_PRICING, PRICE_FLOOR, computePrice, sanitizePricing } from "@/lib/pricing";
import { useStore } from "@/lib/store";
import type { PricingConfig } from "@/lib/types";
import { report } from "./kit";

const kz = (msg = "Indique um valor em Kz.") =>
  z.number({ error: msg }).int("Use valores inteiros em Kz.").min(0, "O valor não pode ser negativo.");

const schema = z
  .object({
    minimum: kz().min(PRICE_FLOOR, `O preço mínimo não pode ser inferior a ${formatKz(PRICE_FLOOR)}.`),
    agentShare: kz(),
    platformShare: kz(),
    extraSurfaceIncrement: kz(),
    extraSurfaceAgentShare: kz(),
    urgentIncrement: kz(),
  })
  .refine((v) => v.agentShare + v.platformShare >= v.minimum, {
    path: ["platformShare"],
    message: "Agente e plataforma têm de somar pelo menos o preço mínimo.",
  })
  .refine((v) => v.extraSurfaceAgentShare <= v.extraSurfaceIncrement, {
    path: ["extraSurfaceAgentShare"],
    message: "A parte do agente não pode ser maior do que o acréscimo.",
  });

type Values = z.infer<typeof schema>;

export function AdminPricing() {
  const pricing = useStore((s) => s.pricing);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: pricing, mode: "onChange" });
  const { errors, isDirty } = form.formState;
  const draft = useWatch({ control: form.control }) as Partial<PricingConfig>;

  // Preview never shows a price below the floor, even while the form is invalid.
  const preview = sanitizePricing({ ...pricing, ...numeric(draft) });
  const base = computePrice(preview, 1);
  const invalid = Object.keys(errors).length > 0;

  const submit = form.handleSubmit((v) => {
    const res = useStore.getState().updatePricing(v);
    if (report(res, "Configuração de preços guardada. Aplica-se aos novos pedidos.") && res.ok) form.reset(res.pricing);
  });

  const f = (name: keyof Values) => form.register(name, { valueAsNumber: true });

  return (
    <>
      <PageHeader
        title="Configuração de preços"
        description={`O preço de uma consulta nunca fica abaixo de ${formatKz(PRICE_FLOOR)}. As alterações valem para pedidos novos; os pedidos já feitos mantêm o preço com que foram confirmados.`}
      />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <form onSubmit={submit} noValidate className="flex min-w-0 flex-col gap-8">
          <Group title="Consulta base" hint="Uma superfície, prioridade normal.">
            <MoneyField id="minimum" label="Preço mínimo" field={f("minimum")} error={errors.minimum?.message} />
            <MoneyField id="agentShare" label="Parte do agente" field={f("agentShare")} error={errors.agentShare?.message} />
            <MoneyField
              id="platformShare"
              label="Comissão da plataforma"
              field={f("platformShare")}
              error={errors.platformShare?.message}
            />
          </Group>

          <Group title="Superfícies extra" hint="Por cada superfície além da primeira.">
            <MoneyField
              id="extraSurfaceIncrement"
              label="Acréscimo por superfície"
              field={f("extraSurfaceIncrement")}
              error={errors.extraSurfaceIncrement?.message}
            />
            <MoneyField
              id="extraSurfaceAgentShare"
              label="Desse acréscimo, para o agente"
              field={f("extraSurfaceAgentShare")}
              error={errors.extraSurfaceAgentShare?.message}
            />
          </Group>

          <Group title="Urgência" hint="Somado quando o cliente pede resposta no próprio dia. Vai todo para o agente.">
            <MoneyField id="urgentIncrement" label="Acréscimo urgente" field={f("urgentIncrement")} error={errors.urgentIncrement?.message} />
          </Group>

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-6">
            <Button type="submit" variant="tag" disabled={!isDirty || invalid}>
              Guardar preços
            </Button>
            <Button type="button" variant="outline" disabled={!isDirty} onClick={() => form.reset(pricing)}>
              Descartar alterações
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => form.reset(DEFAULT_PRICING, { keepDefaultValues: true })}
            >
              Repor 600 / 400 / 200
            </Button>
          </div>
        </form>

        <aside className="flex min-w-0 flex-col gap-3">
          <h2 className="text-base font-semibold">Pré-visualização</h2>
          <Receipt title="O que o cliente vê" meta={isDirty ? "por guardar" : "em vigor"}>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-ink-2">Consulta numa superfície</span>
              <PriceTag amount={base.price} size="lg" label="Preço base" />
            </div>
            <ReceiptRow label="Para o agente" value={<Money amount={base.agentShare} />} />
            <ReceiptRow label="Comissão da plataforma" value={<Money amount={base.platformShare} />} />
            <ReceiptRule />
            <div className="-mx-1">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-1">Superfícies</TableHead>
                    <TableHead className="px-1 text-right">Normal</TableHead>
                    <TableHead className="px-1 text-right">Urgente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4].map((n) => {
                    const normal = computePrice(preview, n);
                    const urgent = computePrice(preview, n, "urgente");
                    return (
                      <TableRow key={n} className="hover:bg-transparent">
                        <TableCell className="px-1 font-mono tabular">{n}</TableCell>
                        <TableCell className="px-1 text-right">
                          <Money amount={normal.price} />
                          <span className="block font-mono text-xs text-ink-2 tabular">
                            {normal.agentShare} + {normal.platformShare}
                          </span>
                        </TableCell>
                        <TableCell className="px-1 text-right">
                          <Money amount={urgent.price} />
                          <span className="block font-mono text-xs text-ink-2 tabular">
                            {urgent.agentShare} + {urgent.platformShare}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <ReceiptNote className="pb-4">
              Abaixo de cada preço: parte do agente + comissão da plataforma, em Kz.
              {invalid && " Há valores por corrigir; a pré-visualização usa o mínimo permitido."}
            </ReceiptNote>
          </Receipt>
        </aside>
      </div>
    </>
  );
}

function numeric(v: Partial<PricingConfig>): Partial<PricingConfig> {
  return Object.fromEntries(
    Object.entries(v).filter(([, x]) => typeof x === "number" && Number.isFinite(x)),
  ) as Partial<PricingConfig>;
}

function Group({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-3">
        <span className="block text-base font-semibold">{title}</span>
        <span className="block text-sm text-ink-2">{hint}</span>
      </legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

function MoneyField({
  id,
  label,
  field,
  error,
}: {
  id: string;
  label: string;
  field: UseFormRegisterReturn;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          step={50}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-11 pr-12 font-mono tabular"
          {...field}
        />
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-mono text-sm text-ink-2">
          Kz
        </span>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
