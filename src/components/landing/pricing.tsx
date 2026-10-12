import { PriceTag } from "@/components/price-tag";
import { Receipt, ReceiptNote, ReceiptRow, ReceiptRule, ReceiptTotal } from "@/components/receipt";
import { formatKz } from "@/lib/format";
import { grossPrice, priceBreakdown } from "@/lib/pricing";
import type { PricingConfig } from "@/lib/types";

// TEMPORARY (domain step): numbers updated to CHANGES-v2 §1; the landing
// worker owns copy and layout.

/** Simple and multiple prices (CHANGES-v2 §1, §8). */
export function Pricing({ pricing }: { pricing: PricingConfig }) {
  return (
    <section aria-labelledby="preco" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-20">
        <div className="flex flex-col items-start gap-6">
          <h2 id="preco" className="max-w-[16ch] text-3xl sm:text-[2.75rem]">
            Uma consulta simples custa
          </h2>
          <PriceTag amount={pricing.simplePrice} size="xl" label="Preço da consulta simples" />
          <p className="measure leading-relaxed text-ink-2">
            Com dois ou mais itens, cada item custa {formatKz(pricing.multiItemPrice)}. O valor aparece sempre antes de
            confirmar. Só paga depois da resposta, com uma referência Multicaixa da plataforma.
          </p>
        </div>

        <Receipt title="Exemplos" meta="valores com impostos" className="w-full max-w-[26rem] lg:justify-self-end">
          <ReceiptRow label="Consulta simples" value={formatKz(grossPrice(1, pricing))} />
          <ReceiptRow label={`Consulta dupla (${priceBreakdown(2, pricing)})`} value={formatKz(grossPrice(2, pricing))} />
          <ReceiptRule />
          <ReceiptTotal label={`Consulta tripla (${priceBreakdown(3, pricing)})`} amount={grossPrice(3, pricing)} />
          <ReceiptRule />
          <ReceiptNote>As variações de um item (cores, tamanhos, modelos) não contam como itens extra.</ReceiptNote>
        </Receipt>
      </div>
    </section>
  );
}
