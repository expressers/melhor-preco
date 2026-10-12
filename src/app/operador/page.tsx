import type { Metadata } from "next";
import { AppShell, PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Operador",
  description: "Fila de pedidos da superfície, atribuição a agentes e objectivo do período.",
};

// Temporary stub (v2 domain step): rebuilt by the operador worker.
export default function OperadorPage() {
  return (
    <AppShell role="operador">
      <PageHeader title="Pedidos da superfície" description="Atribua os pedidos da sua superfície aos agentes disponíveis." />
      <EmptyState title="Em preparação" description="A fila de atribuição do operador chega nesta versão." />
    </AppShell>
  );
}
