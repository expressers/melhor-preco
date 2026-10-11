import type { Metadata } from "next";
import { AdminOverview } from "@/components/admin/overview";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "Visão geral · Administração" };

export default function AdminPage() {
  return (
    <AppShell role="admin">
      <AdminOverview />
    </AppShell>
  );
}
