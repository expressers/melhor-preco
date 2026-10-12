import type { Metadata } from "next";
import { AppShell, PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Agentes · Operador" };

// Temporary stub (v2 domain step): rebuilt by the operador worker.
export default function OperadorAgentesPage() {
  return (
    <AppShell role="operador">
      <PageHeader title="Agentes da superfície" description="Quem está disponível e quem está em consulta." />
      <EmptyState title="Em preparação" description="A lista de agentes da superfície chega nesta versão." />
    </AppShell>
  );
}
