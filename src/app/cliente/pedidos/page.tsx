import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PedidosList } from "@/components/cliente/pedidos-list";

export const metadata: Metadata = {
  title: "Os meus pedidos",
  description: "Todos os seus pedidos de consulta: número, superfícies, estado e valor.",
};

export default function PedidosPage() {
  return (
    <AppShell role="cliente">
      <PedidosList />
    </AppShell>
  );
}
