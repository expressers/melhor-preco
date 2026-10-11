import type { Metadata } from "next";
import { AdminSurfaces } from "@/components/admin/surfaces";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "Superfícies · Administração" };

export default function AdminSuperficiesPage() {
  return (
    <AppShell role="admin">
      <AdminSurfaces />
    </AppShell>
  );
}
