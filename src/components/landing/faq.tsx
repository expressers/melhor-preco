import { PlusIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import styles from "./landing.module.scss";

const QUESTIONS = [
  {
    q: "O preço que recebo fica garantido?",
    a: "Não. Os preços e a disponibilidade correspondem ao momento em que o agente esteve na loja, com data e hora registadas. A loja pode mudá-los depois.",
  },
  {
    q: "Posso comprar através do Melhor Preço?",
    a: "Não. Não vendemos, não reservamos, não fazemos encomendas nem entregas e não negociamos com os comerciantes. Damos-lhe a informação; a compra fica consigo.",
  },
  {
    q: "Quando e como pago?",
    a: "Só depois de a resposta estar pronta. Vê o valor e os dados Multicaixa Express do agente, paga-lhe directamente e os resultados completos abrem quando ele confirma que recebeu.",
  },
  {
    q: "E se o produto não existir na superfície?",
    a: "O agente regista que não o encontrou nessa superfície, com data e hora. Também é uma resposta: fica a saber sem ter feito a viagem.",
  },
  {
    q: "Quem são os agentes?",
    a: "Pessoas que já conhecem e orientam clientes nas superfícies. Só agentes aprovados e activos pela equipa recebem pedidos.",
  },
  {
    q: "E se algo correr mal?",
    a: "Pode abrir uma reclamação no próprio pedido. A equipa analisa com base no histórico do pedido, que regista cada passo com data, hora e quem o fez.",
  },
];

/** Rules in question form: the honest small print, readable. */
export function Faq() {
  return (
    <section aria-labelledby="perguntas" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <h2 id="perguntas" className="max-w-[14ch] text-3xl sm:text-[2.75rem] lg:sticky lg:top-8 lg:self-start">
          Perguntas e regras
        </h2>
        <div className="border-t border-ink">
          {QUESTIONS.map(({ q, a }) => (
            <details key={q} className={cn(styles.faqItem, "group border-b border-line")}>
              <summary className="flex min-h-14 items-center justify-between gap-4 py-4 text-left text-[1.0625rem] font-semibold text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                {q}
                <PlusIcon aria-hidden weight="bold" className={cn(styles.caret, "size-4 shrink-0 text-ink-2")} />
              </summary>
              <p className="measure pb-5 leading-relaxed text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
