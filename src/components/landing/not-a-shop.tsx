import { CheckIcon, XIcon } from "@phosphor-icons/react/ssr";

const DO = [
  "Ver o preço do dia, na loja",
  "Confirmar se há stock",
  "Anotar cores, tamanhos e variantes",
  "Dizer em que loja está e onde fica",
  "Fotografar o produto e a etiqueta",
];

const DONT = [
  "Vender ou reservar produtos",
  "Negociar preços com o comerciante",
  "Fazer encomendas ou entregas",
  "Pagar a lojas em seu nome",
  "Garantir o preço depois da consulta",
];

/** Says plainly that this is not a shop (BRIEF §1, rule 13). */
export function NotAShop() {
  return (
    <section aria-labelledby="nao-loja" className="border-y border-line bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="flex flex-col gap-4">
          <h2 id="nao-loja" className="max-w-[16ch] text-3xl sm:text-[2.75rem]">
            Não somos uma loja. Vamos ver por si.
          </h2>
          <p className="measure leading-relaxed text-ink-2">
            O Melhor Preço só recolhe informação. Se decidir comprar, a compra é entre si e a loja, quando e
            como quiser.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 sm:gap-6">
          <div>
            <h3 className="text-base">O agente faz</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {DO.map((item) => (
                <li key={item} className="flex items-start gap-3 leading-snug">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-tag text-ink">
                    <CheckIcon aria-hidden weight="bold" className="size-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base">Não fazemos</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {DONT.map((item) => (
                <li key={item} className="flex items-start gap-3 leading-snug text-ink-2">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-paper-2 text-ink-2">
                    <XIcon aria-hidden weight="bold" className="size-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
