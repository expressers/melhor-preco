import type { Metadata } from "next";
import { AdminAgents } from "@/components/admin/agents";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "Agentes · Administração" };

export default function AdminAgentesPage() {
  return (
    <AppShell role="admin">
      <AdminAgents />
    </AppShell>
  );
}
