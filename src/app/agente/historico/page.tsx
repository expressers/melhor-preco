import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { HistoryView } from "@/components/agente/history-view";

export const metadata: Metadata = {
  title: "Histórico do agente",
  description: "Tarefas respondidas, valores recebidos e comissões.",
};

export default function HistoricoPage() {
  return (
    <AppShell role="agente">
      <HistoryView />
    </AppShell>
  );
}
