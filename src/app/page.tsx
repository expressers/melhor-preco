import type { Metadata } from "next";
import { BecomeAgent } from "@/components/landing/become-agent";
import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { NotAShop } from "@/components/landing/not-a-shop";
import { Pricing } from "@/components/landing/pricing";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Surfaces } from "@/components/landing/surfaces";
import { getPricing, getSurfaces } from "@/lib/data";
import { quoteFor } from "@/lib/pricing";

export const metadata: Metadata = {
  title: { absolute: "Melhor Preço · Saiba o preço antes de sair de casa" },
  description:
    "Um agente credenciado vai ao Shopping Popular, à Cidade da China ou ao Novo São Paulo por si e traz preço, stock, variantes e fotografias. 1 000 Kz por consulta simples, 800 Kz por item em pedidos múltiplos, pagos por referência Multicaixa depois da resposta.",
  openGraph: {
    title: "Melhor Preço · Saiba o preço antes de sair de casa",
    description:
      "Consultas de preço e disponibilidade nas superfícies comerciais de Luanda, feitas por agentes no terreno. Não é uma loja.",
    locale: "pt_AO",
    type: "website",
  },
};

export default async function Home() {
  const [surfaces, pricing] = await Promise.all([getSurfaces(), getPricing()]);
  const active = surfaces.filter((s) => s.active);
  const upcoming = surfaces.filter((s) => !s.active);

  return (
    <>
      <SiteHeader />
      <main className="flex flex-col">
        <Hero minimum={pricing.simplePrice} />
        <NotAShop />
        <HowItWorks />
        <Pricing pricing={pricing} />
        <Surfaces active={active} upcoming={upcoming} />
        <BecomeAgent agentShare={quoteFor(1, pricing).split.agent} />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
