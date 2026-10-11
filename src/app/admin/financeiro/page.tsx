import type { Metadata } from "next";
import { AdminFinance } from "@/components/admin/finance";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "Financeiro · Administração" };

export default function AdminFinanceiroPage() {
  return (
    <AppShell role="admin">
      <AdminFinance />
    </AppShell>
  );
}
