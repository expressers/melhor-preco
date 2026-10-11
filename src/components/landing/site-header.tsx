import Link from "next/link";
import { TagMark } from "@/components/price-tag";
import { ViewAsSwitcher } from "@/components/view-as-switcher";
import { routes } from "@/lib/routes";

/** Landing header: wordmark, the agent entry and the demo "Ver como" selector. */
export function SiteHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
      <Link
        href={routes.home}
        className="-mx-2 inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-[0.9375rem] font-semibold tracking-tight text-ink"
      >
        <TagMark />
        Melhor Preço
      </Link>
      <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
        <Link
          href={routes.agente.candidatura}
          className="hidden min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink-2 transition-colors hover-fine:text-ink sm:inline-flex"
        >
          Ser agente
        </Link>
        <ViewAsSwitcher />
      </nav>
    </header>
  );
}
