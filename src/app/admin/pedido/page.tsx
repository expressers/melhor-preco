import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminRequestDetail } from "@/components/admin/request-detail";
import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/hydration-gate";

export const metadata: Metadata = { title: "Detalhe do pedido · Administração" };

export default function AdminPedidoPage() {
  return (
    <AppShell role="admin">
      <Suspense fallback={<PageSkeleton />}>
        <AdminRequestDetail />
      </Suspense>
    </AppShell>
  );
}
