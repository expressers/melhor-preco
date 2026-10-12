import type { Metadata } from "next";
import { AppShell, PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Carteira do agente",
  description: "Saldo disponível, ganhos por pedido e levantamentos por IBAN.",
};

// Temporary stub (v2 domain step): rebuilt by the agente worker.
export default function CarteiraPage() {
  return (
    <AppShell role="agente">
      <PageHeader title="Carteira" description="Saldo disponível, ganhos por pedido (60% do líquido) e levantamentos." />
      <EmptyState title="Em preparação" description="A carteira e os levantamentos por IBAN chegam nesta versão." />
    </AppShell>
  );
}
