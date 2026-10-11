"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/lib/store";

/** Default placeholder while the persisted store loads: a heading and three rows. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="A carregar">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="mt-2 flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Renders `children` only after the persisted store has loaded from
 * localStorage, so static HTML and the first client render match and pages
 * never flash mock data before the user's own data.
 */
export function HydrationGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const hydrated = useHydrated();
  return <>{hydrated ? children : (fallback ?? <PageSkeleton />)}</>;
}
