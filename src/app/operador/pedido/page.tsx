import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/hydration-gate";
import { OperadorRequestDetail } from "@/components/operador/request-detail";

export const metadata: Metadata = { title: "Detalhe do pedido · Operador" };

export default function OperadorPedidoPage() {
  return (
    <AppShell role="operador">
      <Suspense fallback={<PageSkeleton />}>
        <OperadorRequestDetail />
      </Suspense>
    </AppShell>
  );
}
