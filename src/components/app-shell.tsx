"use client";

import {
  ChatCircleIcon,
  ClockIcon,
  GearIcon,
  HouseIcon,
  IdentificationCardIcon,
  ListIcon,
  PlusIcon,
  StorefrontIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { HydrationGate } from "@/components/hydration-gate";
import { NotificationCentre } from "@/components/notification-centre";
import { TagMark } from "@/components/price-tag";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ViewAsSwitcher } from "@/components/view-as-switcher";
import { NAV, routes, type NavItem } from "@/lib/routes";
import { useHydrated, useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<NavItem["icon"], Icon> = {
  house: HouseIcon,
  plus: PlusIcon,
  list: ListIcon,
  user: UserIcon,
  clock: ClockIcon,
  users: UsersIcon,
  storefront: StorefrontIcon,
  wallet: WalletIcon,
  gear: GearIcon,
  chat: ChatCircleIcon,
  identification: IdentificationCardIcon,
};

const AREA_LABEL: Record<Role, string> = {
  cliente: "Cliente",
  agente: "Agente",
  admin: "Administração",
};

/** Container width per area (header and main share it so edges line up). */
const WIDTH = {
  cliente: "max-w-5xl",
  agente: "max-w-3xl",
  admin: "max-w-[1400px]",
} as const;

const strip = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

function useIsActive() {
  const pathname = strip(usePathname() ?? "/");
  return (item: NavItem) => {
    const href = strip(item.href);
    return item.exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  };
}

export interface AppShellProps {
  /** Area of the app. Drives nav, width and the "Ver como" role sync. */
  role: Role;
  children: ReactNode;
  /** Wrap children in <HydrationGate> (default true). Set false for pages that render static content. */
  gate?: boolean;
  /** Override the area container width class (e.g. "max-w-5xl"). */
  width?: string;
}

/**
 * Responsive app frame for /cliente, /agente and /admin.
 * - Header: brand, area nav (desktop), notification centre, "Ver como" selector.
 * - Cliente/Agente on mobile: bottom tab bar within thumb reach.
 * - Admin: left sidebar from lg; sheet menu below.
 */
export function AppShell({ role, children, gate = true, width }: AppShellProps) {
  const hydrated = useHydrated();
  const viewAs = useStore((s) => s.session.viewAs);
  const setViewAs = useStore((s) => s.setViewAs);
  const isActive = useIsActive();
  const nav = NAV[role];
  const isAdmin = role === "admin";

  // Keep the store role in sync with the area being viewed, so notifications
  // and audit events are attributed to the right person.
  useEffect(() => {
    if (hydrated && viewAs !== role) setViewAs(role);
  }, [hydrated, viewAs, role, setViewAs]);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar para o conteúdo
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div
          className={cn(
            "mx-auto flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-5",
            isAdmin ? "max-w-none lg:px-6" : (width ?? WIDTH[role]),
          )}
        >
          {isAdmin && <AdminMenu nav={nav} isActive={isActive} />}

          <Link
            href={routes.home}
            className="press flex shrink-0 items-center gap-2 rounded-full py-1 pr-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <TagMark className="text-[1.05rem]" />
            <span className="text-[0.95rem] font-semibold tracking-[-0.02em] text-ink">Melhor Preço</span>
            <span className="hidden border-l border-line pl-2 text-sm text-ink-2 sm:inline">{AREA_LABEL[role]}</span>
          </Link>

          {!isAdmin && (
            <nav aria-label="Navegação da área" className="ml-4 hidden md:block">
              <ul className="flex items-center gap-1">
                {nav.map((item) => (
                  <li key={item.href}>
                    <TopLink item={item} active={isActive(item)} />
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <NotificationCentre />
            <ViewAsSwitcher />
          </div>
        </div>
      </header>

      <div className={cn("flex flex-1", isAdmin && "lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]")}>
        {isAdmin && (
          <aside className="hidden border-r border-line lg:block">
            <nav aria-label="Navegação da administração" className="sticky top-16 p-3">
              <SideNav nav={nav} isActive={isActive} />
            </nav>
          </aside>
        )}

        <main
          id="conteudo"
          className={cn(
            "mx-auto w-full min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-5 sm:pt-8 md:pb-16",
            isAdmin ? "max-w-[1400px] pb-16 lg:px-8" : (width ?? WIDTH[role]),
            isAdmin && width,
          )}
        >
          {gate ? <HydrationGate>{children}</HydrationGate> : children}
        </main>
      </div>

      {!isAdmin && <BottomNav nav={nav} isActive={isActive} />}
    </div>
  );
}

function TopLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex h-10 items-center rounded-full px-3.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
        active ? "bg-ink text-surface" : "text-ink-2 hover-fine:bg-ink/[0.06] hover-fine:text-ink",
      )}
    >
      {item.label}
    </Link>
  );
}

/** Mobile tab bar for cliente/agente: thumb reach, ≥ 56px targets, safe-area aware. */
function BottomNav({ nav, isActive }: { nav: NavItem[]; isActive: (i: NavItem) => boolean }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
        {nav.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.75rem] font-medium outline-none focus-visible:bg-paper",
                  active ? "text-ink" : "text-ink-2",
                )}
              >
                {active && (
                  <span aria-hidden className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 bg-tag" />
                )}
                <Icon className="size-6" weight={active ? "fill" : "regular"} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SideNav({
  nav,
  isActive,
  wrap,
}: {
  nav: NavItem[];
  isActive: (i: NavItem) => boolean;
  /** Wraps each link (used to close the mobile sheet on navigate). */
  wrap?: (node: ReactNode, key: string) => ReactNode;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(item);
        const link = (
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-full px-3.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
              active ? "bg-ink text-surface" : "text-ink-2 hover-fine:bg-ink/[0.06] hover-fine:text-ink",
            )}
          >
            <Icon className="size-[1.125rem]" weight={active ? "fill" : "regular"} />
            {item.label}
          </Link>
        );
        return <li key={item.href}>{wrap ? wrap(link, item.href) : link}</li>;
      })}
    </ul>
  );
}

function AdminMenu({ nav, isActive }: { nav: NavItem[]; isActive: (i: NavItem) => boolean }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
          <ListIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-paper p-3 pt-14">
        <SheetTitle className="sr-only">Menu da administração</SheetTitle>
        <nav aria-label="Navegação da administração">
          <SideNav
            nav={nav}
            isActive={isActive}
            wrap={(node, key) => (
              <SheetClose asChild key={key}>
                {node}
              </SheetClose>
            )}
          />
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/** Page heading block used at the top of area pages. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-2xl sm:text-[1.75rem]">{title}</h1>
        {description && <div className="measure text-[0.9375rem] text-ink-2">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
