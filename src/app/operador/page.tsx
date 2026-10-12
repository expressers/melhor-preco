import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { OperadorHome } from "@/components/operador/operador-home";

export const metadata: Metadata = {
  title: "Operador",
  description: "Fila de pedidos da superfície, atribuição a agentes e objectivo do período.",
};

export default function OperadorPage() {
  return (
    <AppShell role="operador">
      <OperadorHome />
    </AppShell>
  );
}
