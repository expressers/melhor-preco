import type { Metadata } from "next";
import { AppShell, PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Objectivos · Administração" };

// Temporary stub (v2 domain step): rebuilt by the admin worker.
export default function AdminObjectivosPage() {
  return (
    <AppShell role="admin">
      <PageHeader title="Objectivos" description="Metas de facturação por superfície e período, cumprimento e comissão do operador." />
      <EmptyState title="Em preparação" description="Os objectivos e o histórico por período chegam nesta versão." />
    </AppShell>
  );
}
