// Surface objectives and operator commission (CHANGES-v2 §3, §4, §7).
// Pure functions only.

import { LUANDA_OFFSET_MS } from "./finance";
import { DEFAULT_SPLIT, splitNet } from "./pricing";
import type {
  Objective,
  ObjectivePeriod,
  ObjectiveStatus,
  RevenueBasis,
  ServiceRequest,
  SplitConfig,
} from "./types";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Monthly period in Luanda time from "2026-10": 1 Oct 00:00 → 1 Nov 00:00 (exclusive). */
export function monthPeriod(key: string): ObjectivePeriod {
  const [y, m] = key.split("-").map(Number);
  const start = Date.UTC(y, m - 1, 1) - LUANDA_OFFSET_MS;
  const end = Date.UTC(y, m, 1) - LUANDA_OFFSET_MS;
  return {
    key,
    label: `${MONTHS[m - 1]} ${y}`,
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
  };
}

const ms = (iso: string) => new Date(iso).getTime();

/** Effective status: closed once closed; else planned before start, running after. */
export function objectiveStatus(obj: Pick<Objective, "status" | "period">, now: number = Date.now()): ObjectiveStatus {
  if (obj.status === "closed") return "closed";
  return now < ms(obj.period.startsAt) ? "planned" : "running";
}

/** Objectives are frozen once the period starts (admin correction with reason only). */
export function isObjectiveLocked(obj: Pick<Objective, "status" | "period">, now: number = Date.now()): boolean {
  return objectiveStatus(obj, now) !== "planned";
}

/** Has the period ended (close allowed without "early")? */
export function isPeriodOver(period: ObjectivePeriod, now: number = Date.now()): boolean {
  return now >= ms(period.endsAt);
}

const PAID = ["pagamento_confirmado", "concluido"];

/** Requests of a surface whose payment was confirmed inside the period. */
export function paidRequestsInPeriod(
  requests: readonly ServiceRequest[],
  surfaceId: string,
  period: ObjectivePeriod,
): ServiceRequest[] {
  const a = ms(period.startsAt);
  const b = ms(period.endsAt);
  return requests.filter((r) => {
    if (r.surfaceId !== surfaceId || !r.paidAt || !PAID.includes(r.status)) return false;
    const t = ms(r.paidAt);
    return t >= a && t < b;
  });
}

export interface ObjectiveEvaluation {
  revenue: number; // on basis
  gross: number;
  net: number;
  paidCount: number;
  revenueRatio: number; // revenue / target (0..∞)
  paidRatio: number | null; // null when no paid-count target
  met: boolean;
  operatorPct: number;
  commission: number; // Σ round(net_i × pct)
  agents: number; // Σ agent shares
  platform: number; // net - agents - commission
}

/** Criteria: revenue (net or gross) ≥ target and, if set, paid requests ≥ target. */
export function isObjectiveMet(
  revenue: number,
  paidCount: number,
  target: { revenueTarget: number; paidRequestsTarget?: number },
): boolean {
  const revenueOk = revenue >= target.revenueTarget;
  const countOk = target.paidRequestsTarget == null || paidCount >= target.paidRequestsTarget;
  return revenueOk && countOk;
}

export function revenueOn(basis: RevenueBasis, rs: readonly ServiceRequest[]): number {
  return rs.reduce((t, r) => t + (basis === "gross" ? r.amounts.gross : r.amounts.net), 0);
}

/**
 * Evaluates an objective against requests (live progress or closing).
 * Commission is always computed on the net of each request (Mauro's table),
 * the basis only decides which revenue is compared to the target.
 */
export function evaluateObjective(
  obj: Pick<Objective, "surfaceId" | "period" | "revenueTarget" | "paidRequestsTarget" | "basis" | "pctBelow" | "pctMet">,
  requests: readonly ServiceRequest[],
  split: SplitConfig = DEFAULT_SPLIT,
): ObjectiveEvaluation {
  const paid = paidRequestsInPeriod(requests, obj.surfaceId, obj.period);
  const gross = revenueOn("gross", paid);
  const net = revenueOn("net", paid);
  const revenue = obj.basis === "gross" ? gross : net;
  const met = isObjectiveMet(revenue, paid.length, obj);
  const operatorPct = met ? obj.pctMet : obj.pctBelow;
  let commission = 0;
  let agents = 0;
  for (const r of paid) {
    const s = splitNet(r.amounts.net, split.agent, operatorPct);
    commission += s.operator;
    agents += s.agent;
  }
  return {
    revenue,
    gross,
    net,
    paidCount: paid.length,
    revenueRatio: obj.revenueTarget > 0 ? revenue / obj.revenueTarget : 1,
    paidRatio: obj.paidRequestsTarget ? paid.length / obj.paidRequestsTarget : null,
    met,
    operatorPct,
    commission,
    agents,
    platform: net - agents - commission,
  };
}

export interface ObjectiveInputCheck {
  revenueTarget: number;
  paidRequestsTarget?: number;
  pctBelow: number;
  pctMet: number;
}

/** Errors for objective fields; empty when valid. */
export function validateObjective(o: ObjectiveInputCheck, split: SplitConfig = DEFAULT_SPLIT): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(o.revenueTarget) || o.revenueTarget <= 0)
    errors.push("Indique uma meta de facturação positiva, em Kz.");
  if (o.paidRequestsTarget != null && (!Number.isInteger(o.paidRequestsTarget) || o.paidRequestsTarget <= 0))
    errors.push("A meta de consultas pagas tem de ser um número inteiro positivo.");
  if (![o.pctBelow, o.pctMet].every((p) => Number.isInteger(p) && p >= 0 && p <= 100 - split.agent))
    errors.push(`As percentagens do operador têm de estar entre 0% e ${100 - split.agent}%.`);
  if (o.pctMet < o.pctBelow)
    errors.push("A percentagem com objectivos cumpridos não pode ser menor do que abaixo dos objectivos.");
  return errors;
}
