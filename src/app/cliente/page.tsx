import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ClienteHome } from "@/components/cliente/cliente-home";

export const metadata: Metadata = {
  title: "Área do cliente",
  description: "Os seus pedidos de consulta de preços em Luanda: o que precisa de pagamento, o que está em curso e os resultados.",
};

export default function ClientePage() {
  return (
    <AppShell role="cliente">
      <ClienteHome />
    </AppShell>
  );
}
