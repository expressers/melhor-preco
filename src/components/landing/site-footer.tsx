import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { TagMark } from "@/components/price-tag";
import { Button } from "@/components/ui/button";
import { ViewAsSwitcher } from "@/components/view-as-switcher";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import styles from "./landing.module.scss";

/** Closing call to action, demo note with "Ver como", small print. */
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-14 sm:px-6 md:py-20">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <p className="max-w-[18ch] text-3xl font-semibold tracking-[-0.03em] text-surface sm:text-[2.75rem] sm:leading-[1.1]">
            Pergunte antes de atravessar Luanda.
          </p>
          <Button asChild variant="tag" size="lg">
            <Link href={routes.cliente.nova}>
              Fazer uma consulta
              <ArrowRightIcon data-icon="inline-end" weight="bold" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-8 border-t border-paper/15 pt-8 text-sm md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-col gap-2 text-paper/75">
            <p className="flex items-center gap-2 font-semibold text-surface">
              <TagMark /> Melhor Preço
            </p>
            <p className="measure leading-relaxed">
              Demonstração com dados fictícios. Preços e disponibilidade correspondem ao momento da consulta e
              podem mudar. O Melhor Preço não vende nem garante preços.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href={routes.agente.candidatura}
              className={cn(styles.arrowLink, "inline-flex min-h-11 items-center gap-1.5 font-medium text-surface")}
            >
              Ser agente
              <ArrowRightIcon aria-hidden className={cn(styles.arrow, "size-4")} />
            </Link>
            <ViewAsSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
