import type { Metadata } from "next";
import { AppShell, PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Operadores · Administração" };

// Temporary stub (v2 domain step): rebuilt by the admin worker.
export default function AdminOperadoresPage() {
  return (
    <AppShell role="admin">
      <PageHeader title="Operadores" description="Um operador activo por superfície: salário base, estado e histórico de comissões." />
      <EmptyState title="Em preparação" description="A gestão de operadores chega nesta versão." />
    </AppShell>
  );
}
