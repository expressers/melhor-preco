import { PriceTag } from "@/components/price-tag";
import { Receipt, ReceiptNote, ReceiptRow, ReceiptRule, ReceiptTotal } from "@/components/receipt";
import { formatKz, NBSP } from "@/lib/format";
import type { PricingConfig } from "@/lib/types";

/** Minimum price and an honest breakdown of where the money goes (BRIEF §4). */
export function Pricing({ pricing }: { pricing: PricingConfig }) {
  return (
    <section aria-labelledby="preco" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-20">
        <div className="flex flex-col items-start gap-6">
          <h2 id="preco" className="max-w-[16ch] text-3xl sm:text-[2.75rem]">
            Uma consulta numa superfície custa
          </h2>
          <PriceTag amount={pricing.minimum} size="xl" label="Preço mínimo da consulta" />
          <p className="measure leading-relaxed text-ink-2">
            Nunca menos do que isto, e o valor final aparece sempre antes de confirmar o pedido. Só paga depois de
            receber a resposta, por Multicaixa Express, directamente ao agente que foi ao local.
          </p>
        </div>

        <Receipt title="Para onde vai o valor" meta="por consulta" className="w-full max-w-[26rem] lg:justify-self-end">
          <ReceiptRow label="Agente no terreno" value={formatKz(pricing.agentShare)} />
          <ReceiptRow label="Plataforma Melhor Preço" value={formatKz(pricing.platformShare)} />
          <ReceiptRule />
          <ReceiptTotal label="Mínimo" amount={pricing.minimum} />
          <ReceiptRule />
          <ReceiptRow label="Cada superfície a mais" value={`+${NBSP}${formatKz(pricing.extraSurfaceIncrement)}`} />
          <ReceiptRow label="Prioridade urgente" value={`+${NBSP}${formatKz(pricing.urgentIncrement)}`} />
          <ReceiptRule />
          <ReceiptNote>
            O agente fica com a parte dele e entrega a comissão à plataforma. Nada lhe é pedido antes da
            resposta.
          </ReceiptNote>
        </Receipt>
      </div>
    </section>
  );
}
