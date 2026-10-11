import type { Metadata } from "next";
import { AppShell, PageHeader } from "@/components/app-shell";

export const metadata: Metadata = { title: "Área do cliente" };

export default function ClientePage() {
  return (
    <AppShell role="cliente">
      <PageHeader title="Área do cliente" description="Em construção." />
    </AppShell>
  );
}
