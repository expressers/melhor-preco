import type { Metadata } from "next";
import { AdminPricing } from "@/components/admin/pricing";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "Preços · Administração" };

export default function AdminPrecosPage() {
  return (
    <AppShell role="admin">
      <AdminPricing />
    </AppShell>
  );
}
