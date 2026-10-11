import type { Metadata } from "next";
import { AdminComplaints } from "@/components/admin/complaints";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "Reclamações · Administração" };

export default function AdminReclamacoesPage() {
  return (
    <AppShell role="admin">
      <AdminComplaints />
    </AppShell>
  );
}
