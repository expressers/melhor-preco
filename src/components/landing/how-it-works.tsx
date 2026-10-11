import { cn } from "@/lib/utils";
import styles from "./landing.module.scss";

const STEPS = [
  {
    title: "Diz o que procura",
    body: "Descreve o produto, escolhe as superfícies e o prazo. Vê o valor da consulta antes de confirmar.",
  },
  {
    title: "Um agente vai ao local",
    body: "Um agente credenciado, activo nessa superfície, aceita o pedido e percorre as lojas por si.",
  },
  {
    title: "Recebe a resposta",
    body: "É avisado quando a resposta chega, com o valor a pagar e os dados Multicaixa Express do agente.",
  },
  {
    title: "Paga ao agente e vê tudo",
    body: "Paga directamente ao agente. Quando ele confirma a recepção, abre os preços, lojas e fotografias.",
  },
];

/** The flow as a talão rail: pedido → agente no terreno → resultados → pagamento. */
export function HowItWorks() {
  return (
    <section aria-labelledby="como-funciona" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <h2 id="como-funciona" className="max-w-[18ch] text-3xl sm:text-[2.75rem]">
        Como funciona uma consulta
      </h2>
      <ol className={cn(styles.rail, "mt-10 md:mt-14")}>
        {STEPS.map((step, i) => (
          <li key={step.title} className={styles.step}>
            <span aria-hidden className={cn(styles.tick, i === STEPS.length - 1 && styles.tickLast)} />
            <h3 className="text-lg">{step.title}</h3>
            <p className="mt-2 leading-relaxed text-ink-2">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
