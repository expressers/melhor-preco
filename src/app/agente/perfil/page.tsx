import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ProfileView } from "@/components/agente/profile-view";

export const metadata: Metadata = {
  title: "Perfil do agente",
  description: "Código de agente, superfícies, estado da conta, dados Multicaixa Express e indicadores.",
};

export default function PerfilPage() {
  return (
    <AppShell role="agente">
      <ProfileView />
    </AppShell>
  );
}
