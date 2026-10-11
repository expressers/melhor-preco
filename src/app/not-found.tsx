import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

/** 404 for the static export (out/404.html). */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-5 px-4 py-16">
      <span className="font-mono text-sm text-ink-2 tabular">404</span>
      <h1 className="text-3xl sm:text-4xl">Esta página não tem etiqueta.</h1>
      <p className="measure text-ink-2">
        O endereço pode estar incompleto ou a página mudou de sítio. Volte ao início ou abra a sua área.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="tag">
          <Link href={routes.home}>Ir para o início</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={routes.cliente.pedidos}>Os meus pedidos</Link>
        </Button>
      </div>
    </main>
  );
}
