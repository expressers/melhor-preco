"use client";

import { CaretRightIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo } from "react";
import { Money, PriceTag } from "@/components/price-tag";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useStore } from "@/lib/store";
import type { ServiceRequest, Surface } from "@/lib/types";
import { cn } from "@/lib/utils";

/** id → Surface lookup (includes inactive ones, so old requests still show names). */
export function useSurfaceMap(): Map<string, Surface> {
  const surfaces = useStore((s) => s.surfaces);
  return useMemo(() => new Map(surfaces.map((s) => [s.id, s])), [surfaces]);
}

export function surfaceNames(ids: string[], map: Map<string, Surface>): string {
  return ids.map((id) => map.get(id)?.name ?? id).join(", ");
}

/** One request in a list: number, description, surfaces, date, state, value. */
export function RequestRow({ request, className }: { request: ServiceRequest; className?: string }) {
  const map = useSurfaceMap();
  const toPay = request.status === "resposta_submetida";

  return (
    <Link
      href={routes.cliente.pedido(request.id)}
      className={cn(
        "group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-4 outline-none transition-colors focus-visible:bg-paper focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:ring-inset hover-fine:bg-paper sm:px-5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-[0.8125rem] font-medium text-ink tabular">{request.id}</span>
          <time dateTime={request.createdAt} className="font-mono text-xs text-ink-2 tabular">
            {formatDateTime(request.createdAt)}
          </time>
        </div>
        <p className="line-clamp-2 text-[0.9375rem] leading-snug font-medium text-ink">{request.description}</p>
        <p className="truncate text-[0.8125rem] text-ink-2">{surfaceNames(request.surfaceIds, map)}</p>
      </div>

      <div className="flex flex-col items-end gap-2 self-start">
        {toPay ? (
          <PriceTag amount={request.price} size="sm" label="A pagar" />
        ) : (
          <Money amount={request.price} className="text-sm text-ink" />
        )}
        <CaretRightIcon
          aria-hidden
          className="size-4 text-ink-2 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
        />
      </div>

      <div className="col-span-2">
        <StatusBadge status={request.status} />
      </div>
    </Link>
  );
}

/** A hairline-divided list inside one white sheet (no card per row). */
export function RequestList({ requests }: { requests: ServiceRequest[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {requests.map((r) => (
        <li key={r.id}>
          <RequestRow request={r} />
        </li>
      ))}
    </ul>
  );
}
