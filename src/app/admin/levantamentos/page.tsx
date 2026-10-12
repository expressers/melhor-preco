import type { Metadata } from "next";
import { AppShell, PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Levantamentos · Administração" };

// Temporary stub (v2 domain step): rebuilt by the admin worker.
export default function AdminLevantamentosPage() {
  return (
    <AppShell role="admin">
      <PageHeader title="Levantamentos" description="Pedidos de levantamento dos agentes por transferência para IBAN." />
      <EmptyState title="Em preparação" description="A confirmação e rejeição de levantamentos chega nesta versão." />
    </AppShell>
  );
}
