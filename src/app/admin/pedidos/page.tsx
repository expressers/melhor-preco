import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminRequests } from "@/components/admin/requests-list";
import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/hydration-gate";

export const metadata: Metadata = { title: "Pedidos · Administração" };

export default function AdminPedidosPage() {
  return (
    <AppShell role="admin">
      <Suspense fallback={<PageSkeleton />}>
        <AdminRequests />
      </Suspense>
    </AppShell>
  );
}
