// Pure business rules (BRIEF §4, §5). No React, no store: reusable by the
// store, the data layer, mocks and, later, a server.

import { OPEN_STATUSES, UNLOCKED_STATUSES } from "./labels";
import type { Agent, ResultItem, ServiceRequest } from "./types";

const HOUR = 60 * 60 * 1000;

/** Rule 1: only approved AND active agents receive or execute requests. */
export function isAgentEligible(agent: Agent | undefined): agent is Agent {
  return !!agent && agent.status === "activo";
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

/** Rule 6: full results only after the agent confirms the payment. */
export function resultsUnlocked(req: Pick<ServiceRequest, "status">): boolean {
  return UNLOCKED_STATUSES.includes(req.status);
}

export function isOpen(req: Pick<ServiceRequest, "status">): boolean {
  return OPEN_STATUSES.includes(req.status);
}

/** Rule 10: an answer is incomplete if a surface has no entry, or an entry lacks price or photo. */
export function computeIncomplete(results: ResultItem[], surfaceIds: string[]): boolean {
  if (results.length === 0) return true;
  const covered = new Set(results.map((r) => r.surfaceId));
  if (surfaceIds.some((s) => !covered.has(s))) return true;
  return results.some((r) => r.notFound || (!r.notFound && (r.price == null || r.photos.length === 0)));
}

/** Expected answer window: deadline if set, else 24h (normal) or 8h (urgente) after creation. */
export function dueAt(req: Pick<ServiceRequest, "createdAt" | "deadline" | "priority">): number {
  if (req.deadline) return new Date(req.deadline).getTime();
  return new Date(req.createdAt).getTime() + (req.priority === "urgente" ? 8 : 24) * HOUR;
}

/** Rule 10: late = still waiting for an answer after the expected window. */
export function isLate(req: ServiceRequest, now: number = Date.now()): boolean {
  const waiting = ["submetido", "aguarda_atribuicao", "agente_atribuido", "em_consulta"].includes(
    req.status,
  );
  return waiting && now > dueAt(req);
}

/** Live flags (stored flags are a snapshot; prefer this in UI). */
export function getFlags(req: ServiceRequest, now: number = Date.now()) {
  return {
    late: isLate(req, now) || (req.flags.late && isOpen(req)),
    incomplete:
      req.results.length > 0 ? computeIncomplete(req.results, req.surfaceIds) : req.flags.incomplete,
    noAnswer: req.status === "em_consulta" && now - new Date(req.updatedAt).getTime() > 12 * HOUR,
  };
}
