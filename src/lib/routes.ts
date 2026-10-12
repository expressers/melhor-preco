// Route contract shared by every area. Detail pages use `?id=` (client +
// Suspense) so requests created in the browser work in the static export.

import type { Role } from "./types";

const q = (base: string, id: string) => `${base}?id=${encodeURIComponent(id)}`;

export const routes = {
  home: "/",
  cliente: {
    home: "/cliente",
    entrar: "/cliente/entrar",
    nova: "/cliente/nova",
    pedidos: "/cliente/pedidos",
    pedido: (id: string) => q("/cliente/pedido", id),
  },
  agente: {
    home: "/agente",
    candidatura: "/agente/candidatura",
    historico: "/agente/historico",
    carteira: "/agente/carteira",
    perfil: "/agente/perfil",
    tarefa: (id: string) => q("/agente/tarefa", id),
  },
  operador: {
    home: "/operador",
    agentes: "/operador/agentes",
    pedido: (id: string) => q("/operador/pedido", id),
  },
  admin: {
    home: "/admin",
    pedidos: "/admin/pedidos",
    pedido: (id: string) => q("/admin/pedido", id),
    agentes: "/admin/agentes",
    operadores: "/admin/operadores",
    clientes: "/admin/clientes",
    superficies: "/admin/superficies",
    objectivos: "/admin/objectivos",
    financeiro: "/admin/financeiro",
    pagamentos: "/admin/pagamentos",
    levantamentos: "/admin/levantamentos",
    reclamacoes: "/admin/reclamacoes",
    precos: "/admin/precos",
  },
} as const;

/** Link to a request detail page for a given role. */
export function requestHref(role: Role, id: string): string {
  if (role === "cliente") return routes.cliente.pedido(id);
  if (role === "agente") return routes.agente.tarefa(id);
  if (role === "operador") return routes.operador.pedido(id);
  return routes.admin.pedido(id);
}

export interface NavItem {
  href: string;
  label: string;
  /** Phosphor icon name, resolved in AppShell. */
  icon:
    | "house"
    | "plus"
    | "list"
    | "user"
    | "clock"
    | "users"
    | "storefront"
    | "wallet"
    | "gear"
    | "chat"
    | "identification"
    | "target"
    | "bank"
    | "receipt";
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
    { href: routes.agente.carteira, label: "Carteira", icon: "wallet" },
    { href: routes.agente.historico, label: "Histórico", icon: "clock" },
    { href: routes.agente.perfil, label: "Perfil", icon: "identification" },
  ],
  operador: [
    { href: routes.operador.home, label: "Pedidos", icon: "list", exact: true },
    { href: routes.operador.agentes, label: "Agentes", icon: "users" },
  ],
  admin: [
    { href: routes.admin.home, label: "Visão geral", icon: "house", exact: true },
    { href: routes.admin.pedidos, label: "Pedidos", icon: "list" },
    { href: routes.admin.agentes, label: "Agentes", icon: "identification" },
    { href: routes.admin.operadores, label: "Operadores", icon: "user" },
    { href: routes.admin.clientes, label: "Clientes", icon: "users" },
    { href: routes.admin.superficies, label: "Superfícies", icon: "storefront" },
    { href: routes.admin.objectivos, label: "Objectivos", icon: "target" },
    { href: routes.admin.financeiro, label: "Financeiro", icon: "wallet" },
    { href: routes.admin.pagamentos, label: "Pagamentos", icon: "receipt" },
    { href: routes.admin.levantamentos, label: "Levantamentos", icon: "bank" },
    { href: routes.admin.reclamacoes, label: "Reclamações", icon: "chat" },
    { href: routes.admin.precos, label: "Preços", icon: "gear" },
  ],
};
