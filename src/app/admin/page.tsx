import type { Metadata } from "next";
import { AppShell, PageHeader } from "@/components/app-shell";

export const metadata: Metadata = { title: "Administração" };

export default function AdminPage() {
  return (
    <AppShell role="admin">
      <PageHeader title="Visão geral" description="Em construção." />
    </AppShell>
  );
}
