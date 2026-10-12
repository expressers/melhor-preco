// Pure business rules (BRIEF §5, CHANGES-v2). No React, no store: reusable by
// the store, the data layer, mocks and, later, a server.

import { OPEN_STATUSES, UNLOCKED_STATUSES } from "./labels";
import type { Agent, Client, Operator, RequestItem, ResultItem, ServiceRequest } from "./types";

const HOUR = 60 * 60 * 1000;

/** Rule 1: only approved AND active agents receive or execute requests. */
export function isAgentEligible(agent: Agent | undefined): agent is Agent {
  return !!agent && agent.status === "activo";
}

/** Eligible and associated with the surface (what the operator may pick). */
export function agentServesSurface(agent: Agent | undefined, surfaceId: string): boolean {
  return isAgentEligible(agent) && agent.surfaceIds.includes(surfaceId);
}

/** Rule 2: unique id "MP-2026-00041". Next number after the highest existing. */
export function nextRequestId(existing: { id: string }[], year = new Date().getFullYear()): string {
  const prefix = `MP-${year}-`;
  const max = existing.reduce((m, r) => {
    if (!r.id.startsWith(prefix)) return m;
    const n = Number(r.id.slice(prefix.length));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(5, "0")}`;
}

/** Next sequential id with a prefix: nextSeqId(list, "lv") → "lv-004". */
export function nextSeqId(existing: { id: string }[], prefix: string, width = 3): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  const max = existing.reduce((m, x) => Math.max(m, Number(re.exec(x.id)?.[1] ?? 0)), 0);
  return `${prefix}-${String(max + 1).padStart(width, "0")}`;
}

/** Rule 6: full results only after the platform confirms the payment. */
export function resultsUnlocked(req: Pick<ServiceRequest, "status">): boolean {
  return UNLOCKED_STATUSES.includes(req.status);
}

export function isOpen(req: Pick<ServiceRequest, "status">): boolean {
  return OPEN_STATUSES.includes(req.status);
}

/** Rule 10: incomplete if an item has no entry, or an entry is not found / lacks price or photo. */
export function computeIncomplete(results: ResultItem[], items: Pick<RequestItem, "id">[]): boolean {
  if (results.length === 0) return true;
  const covered = new Set(results.map((r) => r.itemId));
  if (items.some((i) => !covered.has(i.id))) return true;
  return results.some((r) => r.notFound || r.price == null || r.photos.length === 0);
}

/** Expected answer window: deadline if set, else 24h (normal) or 8h (urgente) after creation. */
export function dueAt(req: Pick<ServiceRequest, "createdAt" | "deadline" | "priority">): number {
  if (req.deadline) return new Date(req.deadline).getTime();
  return new Date(req.createdAt).getTime() + (req.priority === "urgente" ? 8 : 24) * HOUR;
}

const WAITING = ["submetido", "aguarda_atribuicao", "agente_atribuido", "em_consulta"];

/** Rule 10: late = still waiting for an answer after the expected window. */
export function isLate(req: ServiceRequest, now: number = Date.now()): boolean {
  return WAITING.includes(req.status) && now > dueAt(req);
}

/** Live flags (stored flags are a snapshot; prefer this in UI). */
export function getFlags(req: ServiceRequest, now: number = Date.now()) {
  return {
    late: isLate(req, now) || (req.flags.late && isOpen(req)),
    incomplete: req.results.length > 0 ? computeIncomplete(req.results, req.items) : req.flags.incomplete,
    noAnswer: req.status === "em_consulta" && now - new Date(req.updatedAt).getTime() > 12 * HOUR,
  };
}

/** Company name for empresa, person name for particular. */
export function clientDisplayName(c: Pick<Client, "kind" | "name" | "company">): string {
  return c.kind === "empresa" && c.company ? c.company.name : c.name;
}

/** Short description of a request: first item name, "+ N itens" when multiple. */
export function requestTitle(req: Pick<ServiceRequest, "items">): string {
  const first = req.items[0]?.name ?? "Consulta";
  return req.items.length > 1 ? `${first} + ${req.items.length - 1} ${req.items.length === 2 ? "item" : "itens"}` : first;
}

export type AgentAvailability = "disponivel" | "em_consulta";

/** For the operator board: busy if the agent holds an assigned / in-progress request. */
export function agentAvailability(agentId: string, requests: readonly ServiceRequest[]): AgentAvailability {
  return requests.some(
    (r) => r.agentId === agentId && (r.status === "agente_atribuido" || r.status === "em_consulta"),
  )
    ? "em_consulta"
    : "disponivel";
}

/** Active operator of a surface (max one). */
export function activeOperatorFor(surfaceId: string, operators: readonly Operator[]): Operator | undefined {
  return operators.find((o) => o.surfaceId === surfaceId && o.status === "activo");
}
