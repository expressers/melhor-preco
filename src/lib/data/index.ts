// Data access layer. Today every function reads the static mocks; tomorrow
// the bodies can call a database or an API without changing call sites.
// Functions are async on purpose so the swap does not change signatures.
//
// In the browser, the live (mutable) state is the Zustand store in
// `src/lib/store.ts`, seeded from `getSeed()`. Use these functions for
// static/server contexts (e.g. landing page lists, generateStaticParams).

import {
  AGENTS,
  AUDIT,
  CLIENTS,
  COMPLAINTS,
  EARNINGS,
  NOTIFICATIONS,
  OBJECTIVES,
  OPERATORS,
  PRICING,
  REQUESTS,
  SURFACES,
  WITHDRAWALS,
} from "../mock";
import type {
  Agent,
  AgentEarning,
  AuditLogEntry,
  Client,
  Complaint,
  Notification,
  Objective,
  Operator,
  PricingConfig,
  ServiceRequest,
  Surface,
  Withdrawal,
} from "../types";

export interface SeedState {
  surfaces: Surface[];
  agents: Agent[];
  operators: Operator[];
  clients: Client[];
  requests: ServiceRequest[];
  earnings: AgentEarning[];
  withdrawals: Withdrawal[];
  objectives: Objective[];
  audit: AuditLogEntry[];
  notifications: Notification[];
  complaints: Complaint[];
  pricing: PricingConfig;
}

/** Deep copy of all mock data, safe to mutate (used to seed / reset the store). */
export function getSeed(): SeedState {
  return structuredClone({
    surfaces: SURFACES,
    agents: AGENTS,
    operators: OPERATORS,
    clients: CLIENTS,
    requests: REQUESTS,
    earnings: EARNINGS,
    withdrawals: WITHDRAWALS,
    objectives: OBJECTIVES,
    audit: AUDIT,
    notifications: NOTIFICATIONS,
    complaints: COMPLAINTS,
    pricing: PRICING,
  });
}

export async function getSurfaces(opts: { activeOnly?: boolean } = {}): Promise<Surface[]> {
  return opts.activeOnly ? SURFACES.filter((s) => s.active) : SURFACES;
}

export async function getSurface(id: string): Promise<Surface | undefined> {
  return SURFACES.find((s) => s.id === id);
}

export async function getAgents(): Promise<Agent[]> {
  return AGENTS;
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  return AGENTS.find((a) => a.id === id);
}

export async function getOperators(filter: { surfaceId?: string } = {}): Promise<Operator[]> {
  return OPERATORS.filter((o) => !filter.surfaceId || o.surfaceId === filter.surfaceId);
}

export async function getOperator(id: string): Promise<Operator | undefined> {
  return OPERATORS.find((o) => o.id === id);
}

export async function getClients(): Promise<Client[]> {
  return CLIENTS;
}

export async function getClient(id: string): Promise<Client | undefined> {
  return CLIENTS.find((c) => c.id === id);
}

export async function getRequests(
  filter: { clientId?: string; agentId?: string; surfaceId?: string } = {},
): Promise<ServiceRequest[]> {
  return REQUESTS.filter(
    (r) =>
      (!filter.clientId || r.clientId === filter.clientId) &&
      (!filter.agentId || r.agentId === filter.agentId) &&
      (!filter.surfaceId || r.surfaceId === filter.surfaceId),
  );
}

export async function getRequest(id: string): Promise<ServiceRequest | undefined> {
  return REQUESTS.find((r) => r.id === id);
}

export async function getEarnings(filter: { agentId?: string } = {}): Promise<AgentEarning[]> {
  return EARNINGS.filter((e) => !filter.agentId || e.agentId === filter.agentId);
}

export async function getWithdrawals(filter: { agentId?: string } = {}): Promise<Withdrawal[]> {
  return WITHDRAWALS.filter((w) => !filter.agentId || w.agentId === filter.agentId);
}

export async function getObjectives(filter: { surfaceId?: string; periodKey?: string } = {}): Promise<Objective[]> {
  return OBJECTIVES.filter(
    (o) => (!filter.surfaceId || o.surfaceId === filter.surfaceId) && (!filter.periodKey || o.period.key === filter.periodKey),
  );
}

export async function getAudit(): Promise<AuditLogEntry[]> {
  return AUDIT;
}

export async function getNotifications(): Promise<Notification[]> {
  return NOTIFICATIONS;
}

export async function getComplaints(): Promise<Complaint[]> {
  return COMPLAINTS;
}

export async function getPricing(): Promise<PricingConfig> {
  return PRICING;
}
