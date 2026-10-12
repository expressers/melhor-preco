import type { Metadata } from "next";
import { AdminOperators } from "@/components/admin/operators";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "Operadores · Administração" };

export default function AdminOperadoresPage() {
  return (
    <AppShell role="admin">
      <AdminOperators />
    </AppShell>
  );
}
