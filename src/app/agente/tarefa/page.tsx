import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/hydration-gate";
import { TaskDetail } from "@/components/agente/task-detail";

export const metadata: Metadata = {
  title: "Tarefa",
  description: "Detalhe do pedido, resposta com preços e confirmação do pagamento.",
};

export default function TarefaPage() {
  return (
    <AppShell role="agente">
      <Suspense fallback={<PageSkeleton />}>
        <TaskDetail />
      </Suspense>
    </AppShell>
  );
}
