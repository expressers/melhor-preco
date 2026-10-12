import type { Metadata } from "next";
import { AppShell, PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Detalhe do pedido · Operador" };

// Temporary stub (v2 domain step): rebuilt by the operador worker
// (client component reading `?id=` inside <Suspense>, like admin/pedido).
export default function OperadorPedidoPage() {
  return (
    <AppShell role="operador">
      <PageHeader title="Detalhe do pedido" description="Atribuir ou reatribuir o pedido a um agente da superfície." />
      <EmptyState title="Em preparação" description="O detalhe do pedido para o operador chega nesta versão." />
    </AppShell>
  );
}
