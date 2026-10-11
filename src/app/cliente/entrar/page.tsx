import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { EntrarForm } from "@/components/cliente/entrar-form";

export const metadata: Metadata = {
  title: "Entrar ou criar conta",
  description: "Crie a sua conta Melhor Preço com o seu telefone, ou entre para ver os seus pedidos.",
};

export default function EntrarPage() {
  return (
    <AppShell role="cliente">
      <EntrarForm />
    </AppShell>
  );
}
