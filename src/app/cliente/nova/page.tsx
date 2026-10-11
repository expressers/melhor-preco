import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { NovaConsulta } from "@/components/cliente/nova-consulta";

export const metadata: Metadata = {
  title: "Nova consulta",
  description:
    "Peça a um agente que confirme preço, stock e localização de um produto no Shopping Popular, na Cidade da China ou no Novo São Paulo. Vê o valor antes de confirmar.",
};

export default function NovaConsultaPage() {
  return (
    <AppShell role="cliente">
      <NovaConsulta />
    </AppShell>
  );
}
