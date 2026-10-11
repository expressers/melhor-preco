import type { Metadata } from "next";
import { ApplicationPage } from "@/components/agente/application-form";

export const metadata: Metadata = {
  title: "Ser agente",
  description:
    "Candidate-se a agente Melhor Preço: faça consultas de preços no seu centro comercial e ganhe pelo menos 400 Kz por consulta.",
};

export default function CandidaturaPage() {
  return <ApplicationPage />;
}
