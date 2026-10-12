import { MapPinIcon, StorefrontIcon } from "@phosphor-icons/react";
import { PriceTag } from "@/components/price-tag";
import { ProductPhoto } from "@/components/product-photo";
import { ReceiptNote } from "@/components/receipt";
import { AvailabilityBadge, ToneBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import type { ResultItem, ServiceRequest, Surface } from "@/lib/types";

/**
 * Unlocked results, one column per surface: side by side from md, stacked on
 * mobile. The lowest found price across all surfaces gets the "Melhor preço" tag.
 */
export function ResultsBoard({ request, surfaces }: { request: ServiceRequest; surfaces: Map<string, Surface> }) {
  const prices = request.results.filter((r) => !r.notFound && r.price != null).map((r) => r.price!);
  const best = prices.length > 1 ? Math.min(...prices) : undefined;
  const cols = Math.min(request.items.length, 3);

  return (
    <div className="flex flex-col gap-5">
      <div
        className="grid gap-x-5 gap-y-8 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
        style={{ "--cols": cols } as React.CSSProperties}
      >
        {request.items.map(({ id: sid, name: itemName }) => {
          const surface = surfaces.get(request.surfaceId);
          const items = request.results.filter((r) => r.itemId === sid);
          const found = items.filter((r) => !r.notFound).length;
          return (
            <section key={sid} aria-labelledby={`sf-${sid}`} className="flex min-w-0 flex-col gap-3">
              <header className="flex items-baseline justify-between gap-3 border-b-2 border-ink pb-2">
                <div className="min-w-0">
                  <h3 id={`sf-${sid}`} className="truncate text-lg">
                    {itemName}
                  </h3>
                  {surface && <p className="text-[0.8125rem] text-ink-2">{surface.area}</p>}
                </div>
                <span className="shrink-0 font-mono text-xs text-ink-2 tabular">
                  {found}/{items.length} {items.length === 1 ? "encontrado" : "encontrados"}
                </span>
              </header>
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-ink/20 px-4 py-6 text-sm text-ink-2">
                  O agente não registou nada nesta superfície.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {items.map((item) => (
                    <li key={item.id}>
                      {item.notFound ? <NotFound item={item} /> : <Found item={item} best={best} />}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <ReceiptNote className="measure rounded-lg bg-paper-2 px-4 py-3 text-[0.8125rem]" />
    </div>
  );
}

function Found({ item, best }: { item: ResultItem; best?: number }) {
  const [first, ...rest] = item.photos;
  const isBest = best != null && item.price === best;
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <ProductPhoto
        src={first}
        alt={`${item.productName}${item.store ? `, na loja ${item.store}` : ""}`}
        ratio="4/3"
        sizes="(min-width: 768px) 33vw, 100vw"
        className="rounded-none"
      />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {item.availability && <AvailabilityBadge availability={item.availability} />}
          {isBest && <ToneBadge tone="tag">Melhor preço</ToneBadge>}
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
        <p className="font-mono text-xs text-ink-2 tabular">
          Registado a <time dateTime={item.at}>{formatDateTime(item.at)}</time>
        </p>
      </div>
    </article>
  );
}

function NotFound({ item }: { item: ResultItem }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-dashed border-ink/25 px-4 py-4">
      <ToneBadge tone="neutral">Não encontrado</ToneBadge>
      <h4 className="text-base leading-snug font-semibold">{item.productName}</h4>
      {item.observations && <p className="text-sm leading-relaxed text-ink-2">{item.observations}</p>}
      <p className="font-mono text-xs text-ink-2 tabular">
        Verificado a <time dateTime={item.at}>{formatDateTime(item.at)}</time>
      </p>
    </article>
  );
}
