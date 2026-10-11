import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PedidoDetail } from "@/components/cliente/pedido-detail";
import { PageSkeleton } from "@/components/hydration-gate";

export const metadata: Metadata = {
  title: "Detalhe do pedido",
  description: "Estado, pagamento ao agente, resultados por superfície e histórico do seu pedido.",
};

export default function PedidoPage() {
  return (
    <AppShell role="cliente">
      <Suspense fallback={<PageSkeleton />}>
        <PedidoDetail />
      </Suspense>
    </AppShell>
  );
}
