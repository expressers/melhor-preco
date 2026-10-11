import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { PriceTag } from "@/components/price-tag";
import { ProductPhoto } from "@/components/product-photo";
import { Receipt, ReceiptNote, ReceiptRule, ReceiptRow } from "@/components/receipt";
import { Button } from "@/components/ui/button";
import { formatKz } from "@/lib/format";
import { PHOTOS } from "@/lib/mock";
import { routes } from "@/lib/routes";
import styles from "./landing.module.scss";

/** Illustrative answer for the brief's own example request (BRIEF §3.1). */
const EXAMPLE = [
  {
    surface: "Shopping Popular",
    price: 389_000,
    store: "Loja 14, piso 1",
    stock: "Disponível",
  },
  {
    surface: "Cidade da China",
    price: 362_500,
    store: "Pavilhão B, banca 7",
    stock: "Últimas 2 unidades",
  },
];

export function Hero({ minimum }: { minimum: number }) {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 pt-8 pb-16 sm:px-6 sm:pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:pt-16 lg:pb-24">
      <div className="flex flex-col items-start gap-6">
        <h1 className="max-w-[14ch] text-[2.5rem] sm:text-6xl lg:text-[4.25rem]">
          Saiba o preço antes de sair de casa.
        </h1>
        <p className="measure text-lg leading-relaxed text-ink-2 sm:text-xl">
          Um agente credenciado vai ao mercado por si e traz preço, stock, variantes e fotografias.
          Desde <span className="font-mono tabular font-semibold whitespace-nowrap text-ink">{formatKz(minimum)}</span>.
        </p>
        <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row">
          <Button asChild variant="tag" size="lg">
            <Link href={routes.cliente.nova}>
              Fazer uma consulta
              <ArrowRightIcon data-icon="inline-end" weight="bold" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={routes.agente.candidatura}>Ser agente</Link>
          </Button>
        </div>
      </div>

      <figure className="relative mx-auto w-full max-w-[26rem] lg:mr-0">
        <div className={styles.heroSlip}>
          <PriceTag amount={minimum} size="lg" label="Valor da consulta" className={styles.heroTag} />
          <Receipt title="Exemplo de resposta" meta="ilustrativo">
            <div className="flex items-start gap-3">
              <ProductPhoto
                src={PHOTOS.fridge}
                alt="Geleira de duas portas, cinzenta"
                ratio="1/1"
                sizes="64px"
                className="w-16 shrink-0"
                priority
              />
              <div className="min-w-0 pr-8">
                <p className="font-semibold text-ink">Geleira Hisense 350 L</p>
                <p className="text-ink-2">Cinzenta, duas portas</p>
              </div>
            </div>
            <ReceiptRule />
            {EXAMPLE.map((row, i) => (
              <div key={row.surface} className="flex flex-col gap-1">
                <ReceiptRow label={row.surface} value={formatKz(row.price)} strong />
                <ReceiptRow label={row.store} value={row.stock} mono={false} className="text-xs" />
                {i < EXAMPLE.length - 1 && <ReceiptRule className="mt-2" />}
              </div>
            ))}
            <ReceiptRule />
            <ReceiptNote />
          </Receipt>
        </div>
        <figcaption className="sr-only">
          Exemplo ilustrativo de uma resposta: geleira Hisense de 350 litros, cinzenta, consultada no Shopping
          Popular e na Cidade da China.
        </figcaption>
      </figure>
    </section>
  );
}
