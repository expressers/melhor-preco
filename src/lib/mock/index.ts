import { formatKz } from "../format";
import { DEFAULT_PRICING } from "../pricing";
import type { Complaint, LedgerEntry, Notification, PricingConfig } from "../types";
import { AGENTS, CLIENTS, SURFACES } from "./people";
import { REQUESTS } from "./requests";

export { AGENTS, CLIENTS, SURFACES, REQUESTS };
export { ADMIN_NAME } from "./requests";
export { PHOTOS } from "./photos";

const add = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();

/**
 * Ledger coherent with 600 = 400 + 200: the client pays the full price to the
 * agent by Multicaixa Express; the agent keeps `agentShare` and owes
 * `platformShare` to the platform.
 */
export const LEDGER: LedgerEntry[] = REQUESTS.flatMap((r) => {
  if (!r.respondedAt || !r.agentId) return [];
  const rows: LedgerEntry[] = [
    {
      id: `${r.id}-ag`,
      requestId: r.id,
      agentId: r.agentId,
      kind: "agent_share",
      amount: r.agentShare,
      status: r.paidAt ? "confirmado" : "devido",
      createdAt: r.respondedAt,
      confirmedAt: r.paidAt,
    },
  ];
  if (r.paidAt) {
    const settled = r.status === "concluido";
    rows.push({
      id: `${r.id}-pl`,
      requestId: r.id,
      agentId: r.agentId,
      kind: "platform_commission",
      amount: r.platformShare,
      status: settled ? "liquidado" : "devido",
      createdAt: r.paidAt,
      settledAt: settled ? add(r.paidAt, 60 * 24 * 2) : undefined,
    });
  }
  return rows;
});

const req = (id: string) => REQUESTS.find((r) => r.id === id)!;

export const NOTIFICATIONS: Notification[] = [
  {
    id: "nt-001",
    role: "cliente",
    userId: "cl-001",
    requestId: "MP-2026-00030",
    title: "Resposta pronta: falta o pagamento",
    body: `O agente encontrou 2 produtos. Pague ${formatKz(req("MP-2026-00030").price)} por Multicaixa Express para ver os resultados.`,
    at: req("MP-2026-00030").respondedAt!,
    read: false,
  },
  {
    id: "nt-002",
    role: "cliente",
    userId: "cl-001",
    requestId: "MP-2026-00035",
    title: "Agente atribuído",
    body: "O agente AG-001 vai tratar do pedido MP-2026-00035.",
    at: add(req("MP-2026-00035").createdAt, 26),
    read: false,
  },
  {
    id: "nt-003",
    role: "cliente",
    userId: "cl-001",
    requestId: "MP-2026-00025",
    title: "Resultados disponíveis",
    body: "O pagamento foi confirmado. Já pode ver os resultados do pedido MP-2026-00025.",
    at: req("MP-2026-00025").paidAt!,
    read: true,
  },
  {
    id: "nt-004",
    role: "agente",
    userId: "ag-001",
    requestId: "MP-2026-00035",
    title: "Novo pedido atribuído",
    body: "Tablet de 10 polegadas no Shopping Popular. Aceite ou rejeite.",
    at: add(req("MP-2026-00035").createdAt, 26),
    read: false,
  },
  {
    id: "nt-005",
    role: "agente",
    userId: "ag-001",
    requestId: "MP-2026-00030",
    title: "Confirme quando receber o pagamento",
    body: "A cliente foi informada do valor. Confirme a recepção para desbloquear os resultados.",
    at: req("MP-2026-00030").respondedAt!,
    read: true,
  },
  {
    id: "nt-006",
    role: "admin",
    requestId: "MP-2026-00041",
    title: "Novo pedido por atribuir",
    body: "MP-2026-00041: geleira de 350 litros, Shopping Popular e Cidade da China.",
    at: req("MP-2026-00041").createdAt,
    read: false,
  },
  {
    id: "nt-007",
    role: "admin",
    requestId: "MP-2026-00037",
    title: "Pedido rejeitado por um agente",
    body: "AG-003 rejeitou MP-2026-00037. Precisa de nova atribuição.",
    at: add(req("MP-2026-00037").createdAt, 37),
    read: false,
  },
  {
    id: "nt-008",
    role: "admin",
    requestId: "MP-2026-00034",
    title: "Pedido urgente atrasado",
    body: "MP-2026-00034 passou o prazo das 17:00 sem resposta.",
    at: req("MP-2026-00034").deadline!,
    read: false,
  },
];

export const COMPLAINTS: Complaint[] = [
  {
    id: "rc-001",
    requestId: "MP-2026-00023",
    clientId: "cl-003",
    reason: "No Novo São Paulo o agente marcou como não encontrado, mas uma vizinha viu o modelo lá no mesmo dia.",
    status: "aberta",
    createdAt: add(req("MP-2026-00023").updatedAt, 60 * 5),
  },
  {
    id: "rc-002",
    requestId: "MP-2026-00022",
    clientId: "cl-002",
    reason: "O preço do cimento na loja já era 6 800 Kz quando lá fui dois dias depois.",
    status: "resolvida",
    createdAt: add(req("MP-2026-00022").updatedAt, 60 * 50),
    resolvedAt: add(req("MP-2026-00022").updatedAt, 60 * 54),
    resolution:
      "Explicado ao cliente que os preços correspondem ao momento da consulta e podem mudar. Sem reembolso.",
  },
];

export const PRICING: PricingConfig = DEFAULT_PRICING;
