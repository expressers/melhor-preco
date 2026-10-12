import type { Metadata } from "next";
import { AppShell, PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Pagamentos · Administração" };

// Temporary stub (v2 domain step): rebuilt by the admin worker.
export default function AdminPagamentosPage() {
  return (
    <AppShell role="admin">
      <PageHeader title="Pagamentos" description="Referências Multicaixa geradas e confirmação do pagamento pela plataforma." />
      <EmptyState title="Em preparação" description="A lista de referências e a confirmação de pagamentos chegam nesta versão." />
    </AppShell>
  );
}
