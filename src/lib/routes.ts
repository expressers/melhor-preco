// Route contract shared by every area. Detail pages use `?id=` (client +
// Suspense) so requests created in the browser work in the static export.

import type { Role } from "./types";

export const routes = {
  home: "/",
  cliente: {
    home: "/cliente",
    entrar: "/cliente/entrar",
    nova: "/cliente/nova",
    pedidos: "/cliente/pedidos",
    pedido: (id: string) => `/cliente/pedido?id=${encodeURIComponent(id)}`,
  },
  agente: {
    home: "/agente",
    candidatura: "/agente/candidatura",
    historico: "/agente/historico",
    perfil: "/agente/perfil",
    tarefa: (id: string) => `/agente/tarefa?id=${encodeURIComponent(id)}`,
  },
  admin: {
    home: "/admin",
    pedidos: "/admin/pedidos",
    pedido: (id: string) => `/admin/pedido?id=${encodeURIComponent(id)}`,
    agentes: "/admin/agentes",
    clientes: "/admin/clientes",
    superficies: "/admin/superficies",
    financeiro: "/admin/financeiro",
    reclamacoes: "/admin/reclamacoes",
    precos: "/admin/precos",
  },
} as const;

/** Link to a request detail page for a given role. */
export function requestHref(role: Role, id: string): string {
  if (role === "cliente") return routes.cliente.pedido(id);
  if (role === "agente") return routes.agente.tarefa(id);
  return routes.admin.pedido(id);
}

export interface NavItem {
  href: string;
  label: string;
  /** Phosphor icon name, resolved in AppShell. */
  icon: "house" | "plus" | "list" | "user" | "clock" | "users" | "storefront" | "wallet" | "gear" | "chat" | "identification";
  /** Exact match only (for area home links). */
  exact?: boolean;
}

export const NAV: Record<Role, NavItem[]> = {
  cliente: [
    { href: routes.cliente.home, label: "Início", icon: "house", exact: true },
    { href: routes.cliente.nova, label: "Nova consulta", icon: "plus" },
    { href: routes.cliente.pedidos, label: "Pedidos", icon: "list" },
  ],
  agente: [
    { href: routes.agente.home, label: "Tarefas", icon: "list", exact: true },
    { href: routes.agente.historico, label: "Histórico", icon: "clock" },
    { href: routes.agente.perfil, label: "Perfil", icon: "identification" },
  ],
  admin: [
    { href: routes.admin.home, label: "Visão geral", icon: "house", exact: true },
    { href: routes.admin.pedidos, label: "Pedidos", icon: "list" },
    { href: routes.admin.agentes, label: "Agentes", icon: "identification" },
    { href: routes.admin.clientes, label: "Clientes", icon: "users" },
    { href: routes.admin.superficies, label: "Superfícies", icon: "storefront" },
    { href: routes.admin.financeiro, label: "Financeiro", icon: "wallet" },
    { href: routes.admin.reclamacoes, label: "Reclamações", icon: "chat" },
    { href: routes.admin.precos, label: "Preços", icon: "gear" },
  ],
};
