import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { TasksView } from "@/components/agente/tasks-view";

export const metadata: Metadata = {
  title: "Tarefas do agente",
  description: "Pedidos atribuídos, consultas em curso e pagamentos por confirmar.",
};

export default function AgentePage() {
  return (
    <AppShell role="agente">
      <TasksView />
    </AppShell>
  );
}
