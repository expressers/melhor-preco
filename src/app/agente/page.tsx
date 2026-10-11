import type { Metadata } from "next";
import { AppShell, PageHeader } from "@/components/app-shell";

export const metadata: Metadata = { title: "Tarefas do agente" };

export default function AgentePage() {
  return (
    <AppShell role="agente">
      <PageHeader title="Tarefas" description="Em construção." />
    </AppShell>
  );
}
