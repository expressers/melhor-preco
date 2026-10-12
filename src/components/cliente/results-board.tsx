import { CameraSlashIcon, MapPinIcon, StorefrontIcon } from "@phosphor-icons/react";
import { PriceTag } from "@/components/price-tag";
import { ProductPhoto } from "@/components/product-photo";
import { ReceiptNote } from "@/components/receipt";
import { AvailabilityBadge, ToneBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { CATEGORY_LABEL } from "@/lib/labels";
import { formatVariations } from "@/lib/rules";
import type { ResultItem, ServiceRequest, Surface } from "@/lib/types";

/**
 * Unlocked results, one block per requested item. Offers of the same item sit
 * side by side from md; the lowest price of an item gets "Melhor preço".
 */
export function ResultsBoard({ request, surface }: { request: ServiceRequest; surface?: Surface }) {
  return (
    <div className="flex flex-col gap-10">
      {request.items.map((it, i) => {
        const offers = request.results.filter((r) => r.itemId === it.id);
        const found = offers.filter((r) => !r.notFound);
        const prices = found.filter((r) => r.price != null).map((r) => r.price!);
        const best = prices.length > 1 ? Math.min(...prices) : undefined;
        const asked = formatVariations(it.variations);
        return (
          <section key={it.id} aria-labelledby={`res-${it.id}`} className="flex min-w-0 flex-col gap-4">
            <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-ink pb-2">
              <div className="flex min-w-0 items-baseline gap-3">
                <span className="font-mono text-sm text-ink-2 tabular">{i + 1}.</span>
                <div className="min-w-0">
                  <h3 id={`res-${it.id}`} className="text-lg">
                    {it.name}
                  </h3>
                  <p className="text-[0.8125rem] text-ink-2">
                    {CATEGORY_LABEL[it.category]}
                    {it.brand && `, ${it.brand}`}
                    {asked && `. Pedido: ${asked}`}
                  </p>
                </div>
              </div>
              <span className="shrink-0 font-mono text-xs text-ink-2 tabular">
                {found.length} {found.length === 1 ? "oferta" : "ofertas"}
                {surface && ` · ${surface.name}`}
              </span>
            </header>
            {offers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ink/20 px-4 py-4 text-sm text-ink-2">
                O agente não registou nada para este item.
              </p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {offers.map((r) => (
                  <li key={r.id} className="min-w-0">
                    {r.notFound ? <NotFound item={r} /> : <Found item={r} best={best} />}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <ReceiptNote className="measure rounded-lg bg-paper-2 px-4 py-3 text-[0.8125rem]" />
    </div>
  );
}

function Found({ item, best }: { item: ResultItem; best?: number }) {
  const [first, ...rest] = item.photos;
  const isBest = best != null && item.price === best;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface">
      {first && (
        <ProductPhoto
          src={first}
          alt={`${item.productName}${item.store ? `, na loja ${item.store}` : ""}`}
          ratio="4/3"
          sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
          className="rounded-none"
        />
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {item.availability && <AvailabilityBadge availability={item.availability} />}
          {isBest && <ToneBadge tone="tag">Melhor preço</ToneBadge>}
          {!first && (
            <span className="inline-flex items-center gap-1 text-xs text-ink-2">
              <CameraSlashIcon aria-hidden className="size-3.5" />
              Sem fotografia
            </span>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <h4 className="text-base leading-snug font-semibold">{item.productName}</h4>
          {item.brandModel && <p className="text-sm text-ink-2">{item.brandModel}</p>}
        </div>
        {item.price != null ? (
          <PriceTag amount={item.price} size="lg" label="Preço na loja" className="self-start" />
        ) : (
          <p className="text-sm text-ink-2">Preço não indicado.</p>
        )}
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
          {item.store && (
            <>
              <dt className="flex items-center gap-1.5 text-ink-2">
                <StorefrontIcon aria-hidden className="size-4" />
                Loja
              </dt>
              <dd className="text-ink">{item.store}</dd>
            </>
          )}
          {item.location && (
            <>
              <dt className="flex items-center gap-1.5 text-ink-2">
                <MapPinIcon aria-hidden className="size-4" />
                Onde
              </dt>
              <dd className="text-ink">{item.location}</dd>
            </>
          )}
          {item.variants && (
            <>
              <dt className="text-ink-2">Variantes</dt>
              <dd className="text-ink">{item.variants}</dd>
            </>
          )}
        </dl>
        {item.observations && (
          <p className="border-l-2 border-tag pl-3 text-sm leading-relaxed text-ink">{item.observations}</p>
        )}
        {rest.length > 0 && (
          <ul className="flex gap-2" aria-label="Mais fotografias">
            {rest.map((src, i) => (
              <li key={i} className="w-16">
                <ProductPhoto src={src} alt={`${item.productName}, fotografia ${i + 2}`} ratio="1/1" sizes="64px" />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-auto font-mono text-xs text-ink-2 tabular">
          Registado a <time dateTime={item.at}>{formatDateTime(item.at)}</time>
        </p>
      </div>
    </article>
  );
}

function NotFound({ item }: { item: ResultItem }) {
  return (
    <article className="flex h-full flex-col gap-2 rounded-lg border border-dashed border-ink/25 px-4 py-4">
      <ToneBadge tone="neutral" className="self-start">
        Não encontrado
      </ToneBadge>
      <h4 className="text-base leading-snug font-semibold">{item.productName}</h4>
      {item.observations && <p className="text-sm leading-relaxed text-ink-2">{item.observations}</p>}
      <p className="mt-auto font-mono text-xs text-ink-2 tabular">
        Verificado a <time dateTime={item.at}>{formatDateTime(item.at)}</time>
      </p>
    </article>
  );
}
