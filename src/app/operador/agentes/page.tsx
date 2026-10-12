import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { OperadorAgents } from "@/components/operador/agents-view";

export const metadata: Metadata = { title: "Agentes · Operador" };

export default function OperadorAgentesPage() {
  return (
    <AppShell role="operador">
      <OperadorAgents />
    </AppShell>
  );
}
