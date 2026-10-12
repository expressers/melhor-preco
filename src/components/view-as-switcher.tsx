"use client";

import { ArrowCounterClockwiseIcon, CaretDownIcon, EyeIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AGENT_STATUS, CLIENT_KIND, OPERATOR_STATUS, ROLE } from "@/lib/labels";
import { clientDisplayName } from "@/lib/rules";
import { useHydrated, useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLES: Role[] = ["cliente", "agente", "operador", "admin"];

/**
 * Demo selector "Ver como: Cliente / Agente / Operador / Admin". Sets the role
 * in the store and navigates to that area. Also lets the demo pick which
 * agent, operator or client is acting, and resets the demo data.
 */
export function ViewAsSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useStore((s) => s.session);
  const agents = useStore((s) => s.agents);
  const clients = useStore((s) => s.clients);
  const operators = useStore((s) => s.operators);
  const surfaces = useStore((s) => s.surfaces);
  const setCurrentOperator = useStore((s) => s.setCurrentOperator);
  const setViewAs = useStore((s) => s.setViewAs);
  const setCurrentAgent = useStore((s) => s.setCurrentAgent);
  const setCurrentClient = useStore((s) => s.setCurrentClient);
  const reset = useStore((s) => s.reset);

  const go = (role: Role) => {
    setViewAs(role);
    router.push(ROLE[role].home);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5", className)}>
          <EyeIcon />
          <span className="max-sm:sr-only">Ver como:</span>
          <span className="font-semibold">{hydrated ? ROLE[session.viewAs].label : "…"}</span>
          <CaretDownIcon className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <DropdownMenuLabel>Ver como</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={session.viewAs} onValueChange={(v) => go(v as Role)}>
          {ROLES.map((r) => (
            <DropdownMenuRadioItem key={r} value={r}>
              {ROLE[r].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {session.viewAs === "agente" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Agente em demonstração</DropdownMenuLabel>
            <div className="max-h-56 overflow-y-auto">
              <DropdownMenuRadioGroup
                value={session.currentAgentId ?? ""}
                onValueChange={(id) => {
                  setCurrentAgent(id);
                  router.push(ROLE.agente.home);
                }}
              >
                {agents.map((a) => (
                  <DropdownMenuRadioItem key={a.id} value={a.id} className="items-start">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">
                        <span className="font-mono tabular">{a.code}</span> {a.name}
                      </span>
                      <span className="text-xs text-ink-2">{AGENT_STATUS[a.status].label}</span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </div>
          </>
        )}

        {session.viewAs === "operador" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Operador em demonstração</DropdownMenuLabel>
            <div className="max-h-56 overflow-y-auto">
              <DropdownMenuRadioGroup
                value={session.currentOperatorId ?? ""}
                onValueChange={(id) => {
                  setCurrentOperator(id);
                  router.push(ROLE.operador.home);
                }}
              >
                {operators.map((o) => (
                  <DropdownMenuRadioItem key={o.id} value={o.id} className="items-start">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">
                        <span className="font-mono tabular">{o.code}</span> {o.name}
                      </span>
                      <span className="text-xs text-ink-2">
                        {surfaces.find((s) => s.id === o.surfaceId)?.name ?? o.surfaceId} · {OPERATOR_STATUS[o.status].label}
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </div>
          </>
        )}

        {session.viewAs === "cliente" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Cliente em demonstração</DropdownMenuLabel>
            <div className="max-h-56 overflow-y-auto">
              <DropdownMenuRadioGroup
                value={session.currentClientId ?? ""}
                onValueChange={(id) => {
                  setCurrentClient(id);
                  router.push(ROLE.cliente.home);
                }}
              >
                {clients.map((c) => (
                  <DropdownMenuRadioItem key={c.id} value={c.id} className="items-start">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{clientDisplayName(c)}</span>
                      <span className="text-xs text-ink-2">
                        {CLIENT_KIND[c.kind].label}
                        {c.kind === "empresa" ? ` · ${c.name}` : ""}
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            // reset() keeps session.viewAs: stay in the area being viewed.
            const role = session.viewAs;
            reset();
            toast.success("Dados de demonstração repostos.");
            router.push(ROLE[role].home);
          }}
        >
          <ArrowCounterClockwiseIcon />
          Repor dados de demonstração
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
