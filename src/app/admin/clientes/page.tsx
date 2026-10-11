import type { Metadata } from "next";
import { AdminClients } from "@/components/admin/clients";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "Clientes · Administração" };

export default function AdminClientesPage() {
  return (
    <AppShell role="admin">
      <AdminClients />
    </AppShell>
  );
}
