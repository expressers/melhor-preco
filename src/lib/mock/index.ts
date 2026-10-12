import { normalizeIban } from "../finance";
import { formatKz } from "../format";
import { evaluateObjective, monthPeriod, paidRequestsInPeriod } from "../objectives";
import { DEFAULT_PRICING, splitNet } from "../pricing";
import type {
  AgentEarning,
  AuditLogEntry,
  Complaint,
  Notification,
  Objective,
  PricingConfig,
  ServiceRequest,
  Withdrawal,
} from "../types";
import { AGENTS, CLIENTS, OPERATORS, SURFACES } from "./people";
import { ADMIN_NAME, RAW_REQUESTS } from "./requests";

export { AGENTS, CLIENTS, OPERATORS, SURFACES, ADMIN_NAME };
export { PHOTOS } from "./photos";

const SP = "sf-shopping-popular";
const CC = "sf-cidade-da-china";
const NSP = "sf-novo-sao-paulo";

const add = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
const lua = (date: string, time: string) => new Date(`${date}T${time}:00+01:00`).toISOString();

export const PRICING: PricingConfig = DEFAULT_PRICING;

// ---------------------------------------------------------------------------
// Objectives: September 2026 closed, October 2026 running (CHANGES §7).
// ---------------------------------------------------------------------------

const SEP = monthPeriod("2026-09");
const OCT = monthPeriod("2026-10");
const SEP_CLOSED_AT = lua("2026-10-01", "09:00");

const objective = (
  surfaceId: string,
  period: typeof SEP,
  revenueTarget: number,
  extra: Partial<Objective> = {},
): Objective => ({
  id: `obj-${period.key}-${surfaceId}`,
  surfaceId,
  period,
  revenueTarget,
  basis: "net",
  pctBelow: 5,
  pctMet: 10,
  platformRetained: 5,
  status: "running",
  corrections: [],
  createdAt: add(period.startsAt, -60 * 24 * 7),
  ...extra,
});

const DRAFT_OBJECTIVES: Objective[] = [
  // Setembro: SP met (also the paid-requests criterion), CC below, NSP met after an admin correction.
  objective(SP, SEP, 9_000, { paidRequestsTarget: 8 }),
  objective(CC, SEP, 8_000),
  objective(NSP, SEP, 7_000, {
    corrections: [
      {
        at: lua("2026-09-13", "10:30"),
        actor: ADMIN_NAME,
        reason: "O mercado do Novo São Paulo esteve fechado de 10 a 12 de Setembro por obras na cobertura.",
        changes: `Meta de facturação: ${formatKz(8_500)} → ${formatKz(7_000)}`,
      },
    ],
  }),
  // Outubro: running, with progress.
  objective(SP, OCT, 12_000, { paidRequestsTarget: 12 }),
  objective(CC, OCT, 9_000),
  objective(NSP, OCT, 8_000),
];

const activeOperator = (surfaceId: string) =>
  OPERATORS.find((o) => o.surfaceId === surfaceId && o.status === "activo");

/** Close September with the pure evaluator so mocks and the store agree. */
export const OBJECTIVES: Objective[] = DRAFT_OBJECTIVES.map((o) => {
  if (o.period.key !== "2026-09") return o;
  const e = evaluateObjective(o, RAW_REQUESTS, PRICING.split);
  return {
    ...o,
    status: "closed",
    result: {
      revenue: e.revenue,
      gross: e.gross,
      net: e.net,
      paidCount: e.paidCount,
      met: e.met,
      operatorPct: e.operatorPct,
      commission: e.commission,
      platform: e.platform,
      operatorId: activeOperator(o.surfaceId)?.id,
      closedAt: SEP_CLOSED_AT,
    },
  };
});

/** Requests paid in a closed period carry the final split of that period. */
export const REQUESTS: ServiceRequest[] = (() => {
  const final = new Map<string, number>();
  for (const o of OBJECTIVES)
    if (o.result) for (const r of paidRequestsInPeriod(RAW_REQUESTS, o.surfaceId, o.period)) final.set(r.id, o.result.operatorPct);
  return RAW_REQUESTS.map((r) => {
    const pct = final.get(r.id);
    if (pct === undefined) return r;
    return { ...r, split: { ...splitNet(r.amounts.net, PRICING.split.agent, pct), operatorPct: pct, final: true } };
  });
})();

// ---------------------------------------------------------------------------
// Wallets: 60% of the net of each paid request; withdrawals (CHANGES §6).
// ---------------------------------------------------------------------------

export const EARNINGS: AgentEarning[] = REQUESTS.filter((r) => r.paidAt && r.agentId).map((r) => ({
  id: `${r.id}-ag`,
  agentId: r.agentId!,
  requestId: r.id,
  net: r.amounts.net,
  amount: r.split.agent,
  at: r.paidAt!,
}));

const bankOf = (agentId: string) => {
  const a = AGENTS.find((x) => x.id === agentId)!;
  return { iban: normalizeIban(a.bank!.iban), holder: a.bank!.holder };
};

export const WITHDRAWALS: Withdrawal[] = [
  {
    id: "lv-001",
    agentId: "ag-001",
    amount: 2_500,
    ...bankOf("ag-001"),
    status: "confirmed",
    requestedAt: lua("2026-09-30", "18:10"),
    confirmedAt: lua("2026-10-01", "11:20"),
    transferRef: "TRF-DEMO-260930-0142",
  },
  {
    id: "lv-002",
    agentId: "ag-003",
    amount: 4_000,
    ...bankOf("ag-003"),
    status: "confirmed",
    requestedAt: lua("2026-10-06", "09:05"),
    confirmedAt: lua("2026-10-06", "15:40"),
    transferRef: "TRF-DEMO-261006-0388",
  },
  {
    id: "lv-003",
    agentId: "ag-001",
    amount: 1_500,
    ...bankOf("ag-001"),
    status: "rejected",
    requestedAt: lua("2026-10-09", "19:30"),
    rejectedAt: lua("2026-10-10", "10:15"),
    reason: "O banco devolveu a transferência: o nome do titular não correspondia ao IBAN. Confirme os dados no perfil.",
  },
  {
    id: "lv-004",
    agentId: "ag-002",
    amount: 2_000,
    ...bankOf("ag-002"),
    status: "pending",
    requestedAt: lua("2026-10-11", "17:45"),
  },
];

// ---------------------------------------------------------------------------
// Notifications, complaints, audit log
// ---------------------------------------------------------------------------

const req = (id: string) => REQUESTS.find((r) => r.id === id)!;

export const NOTIFICATIONS: Notification[] = [
  {
    id: "nt-001",
    role: "cliente",
    userId: "cl-001",
    requestId: "MP-2026-00030",
    title: "Resposta pronta: pague a referência",
    body: `Pague ${formatKz(req("MP-2026-00030").amounts.gross)} com a referência Multicaixa do pedido para ver os resultados.`,
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
    requestId: "MP-2026-00027",
    title: "Carteira creditada",
    body: `Recebeu ${formatKz(req("MP-2026-00027").split.agent)} do pedido MP-2026-00027.`,
    at: req("MP-2026-00027").paidAt!,
    read: true,
  },
  {
    id: "nt-006",
    role: "agente",
    userId: "ag-001",
    title: "Levantamento rejeitado",
    body: "O pedido de levantamento lv-003 foi rejeitado. Confirme o IBAN e o titular no perfil.",
    at: WITHDRAWALS[2].rejectedAt!,
    read: false,
  },
  {
    id: "nt-007",
    role: "operador",
    userId: "op-001",
    requestId: "MP-2026-00038",
    title: "Novo pedido por atribuir",
    body: "MP-2026-00038: consulta quádrupla no Shopping Popular.",
    at: req("MP-2026-00038").createdAt,
    read: false,
  },
  {
    id: "nt-008",
    role: "operador",
    userId: "op-003",
    requestId: "MP-2026-00037",
    title: "Pedido rejeitado por um agente",
    body: "AG-003 rejeitou MP-2026-00037. Precisa de nova atribuição.",
    at: add(req("MP-2026-00037").createdAt, 37),
    read: false,
  },
  {
    id: "nt-009",
    role: "admin",
    requestId: "MP-2026-00041",
    title: "Novo pedido submetido",
    body: "MP-2026-00041: geleira de 350 litros, Shopping Popular.",
    at: req("MP-2026-00041").createdAt,
    read: false,
  },
  {
    id: "nt-010",
    role: "admin",
    requestId: "MP-2026-00034",
    title: "Pedido urgente atrasado",
    body: "MP-2026-00034 passou o prazo das 17:00 sem resposta.",
    at: req("MP-2026-00034").deadline!,
    read: false,
  },
  {
    id: "nt-011",
    role: "admin",
    title: "Levantamento por confirmar",
    body: `AG-002 pediu um levantamento de ${formatKz(2_000)} (lv-004).`,
    at: WITHDRAWALS[3].requestedAt,
    read: false,
  },
];

export const COMPLAINTS: Complaint[] = [
  {
    id: "rc-001",
    requestId: "MP-2026-00024",
    clientId: "cl-004",
    reason: "O agente marcou os ténis brancos como não encontrados, mas um colega viu-os na Cidade da China no mesmo dia.",
    status: "aberta",
    createdAt: add(req("MP-2026-00024").updatedAt, 60 * 5),
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

/** Global audit log: every request timeline event plus finance/config events. */
export const AUDIT: AuditLogEntry[] = (() => {
  const rows: Omit<AuditLogEntry, "id">[] = [];
  for (const r of REQUESTS) for (const e of r.timeline) rows.push({ ...e, entity: "request", entityId: r.id });
  for (const o of OBJECTIVES) {
    for (const c of o.corrections)
      rows.push({ at: c.at, actor: c.actor, role: "admin", action: "Correcção administrativa do objectivo", note: `${c.changes}. Motivo: ${c.reason}`, entity: "objective", entityId: o.id });
    if (o.result)
      rows.push({
        at: o.result.closedAt,
        actor: "Sistema",
        role: "sistema",
        action: `Período ${o.period.label} fechado: objectivo ${o.result.met ? "cumprido" : "não cumprido"}`,
        note: `Comissão do operador: ${formatKz(o.result.commission)} (${o.result.operatorPct}%)`,
        entity: "objective",
        entityId: o.id,
      });
  }
  for (const w of WITHDRAWALS) {
    rows.push({ at: w.requestedAt, actor: AGENTS.find((a) => a.id === w.agentId)!.name, role: "agente", action: "Levantamento pedido", note: formatKz(w.amount), entity: "withdrawal", entityId: w.id });
    if (w.confirmedAt)
      rows.push({ at: w.confirmedAt, actor: ADMIN_NAME, role: "admin", action: "Levantamento confirmado", note: `Transferência ${w.transferRef}`, entity: "withdrawal", entityId: w.id });
    if (w.rejectedAt)
      rows.push({ at: w.rejectedAt, actor: ADMIN_NAME, role: "admin", action: "Levantamento rejeitado", note: w.reason, entity: "withdrawal", entityId: w.id });
  }
  return rows
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((e, i) => ({ ...e, id: `au-${String(i + 1).padStart(4, "0")}` }));
})();
