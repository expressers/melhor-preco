import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { PriceTag } from "@/components/price-tag";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

/** Second entry: recruiting field agents (BRIEF §1, §3.2). */
export function BecomeAgent({ agentShare }: { agentShare: number }) {
  return (
    <section aria-labelledby="ser-agente" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div className="grid gap-10 rounded-lg bg-paper-2 px-5 py-10 sm:px-10 sm:py-14 md:grid-cols-[1fr_auto] md:items-end md:gap-16">
        <div className="flex flex-col items-start gap-5">
          <h2 id="ser-agente" className="max-w-[20ch] text-3xl sm:text-[2.75rem]">
            Conhece bem o seu mercado? Seja agente.
          </h2>
          <p className="measure leading-relaxed text-ink-2">
            Se já orienta clientes num destes mercados, passe a receber por cada consulta que responde, pago pelo
            cliente directamente por Multicaixa Express. A equipa aprova cada
            candidatura antes do primeiro pedido.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href={routes.agente.candidatura}>
              Ser agente
              <ArrowRightIcon data-icon="inline-end" weight="bold" />
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <PriceTag amount={agentShare} size="xl" tone="ink" label="Parte do agente por consulta" />
          <p className="text-sm text-ink-2">a sua parte, por consulta</p>
        </div>
      </div>
    </section>
  );
}
