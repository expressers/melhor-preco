// Data access layer. Today every function reads the static mocks; tomorrow
// the bodies can call a database or an API without changing call sites.
// Functions are async on purpose so the swap does not change signatures.
//
// In the browser, the live (mutable) state is the Zustand store in
// `src/lib/store.ts`, seeded from `getSeed()`. Use these functions for
// static/server contexts (e.g. landing page lists, generateStaticParams).

import {
  AGENTS,
  CLIENTS,
  COMPLAINTS,
  LEDGER,
  NOTIFICATIONS,
  PRICING,
  REQUESTS,
  SURFACES,
} from "../mock";
import type {
  Agent,
  Client,
  Complaint,
  LedgerEntry,
  Notification,
  PricingConfig,
  ServiceRequest,
  Surface,
} from "../types";

export interface SeedState {
  surfaces: Surface[];
  agents: Agent[];
  clients: Client[];
  requests: ServiceRequest[];
  ledger: LedgerEntry[];
  notifications: Notification[];
  complaints: Complaint[];
  pricing: PricingConfig;
}

/** Deep copy of all mock data, safe to mutate (used to seed / reset the store). */
export function getSeed(): SeedState {
  return structuredClone({
    surfaces: SURFACES,
    agents: AGENTS,
    clients: CLIENTS,
    requests: REQUESTS,
    ledger: LEDGER,
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

export async function getClients(): Promise<Client[]> {
  return CLIENTS;
}

export async function getClient(id: string): Promise<Client | undefined> {
  return CLIENTS.find((c) => c.id === id);
}

export async function getRequests(
  filter: { clientId?: string; agentId?: string } = {},
): Promise<ServiceRequest[]> {
  return REQUESTS.filter(
    (r) =>
      (!filter.clientId || r.clientId === filter.clientId) &&
      (!filter.agentId || r.agentId === filter.agentId),
  );
}

export async function getRequest(id: string): Promise<ServiceRequest | undefined> {
  return REQUESTS.find((r) => r.id === id);
}

export async function getLedger(): Promise<LedgerEntry[]> {
  return LEDGER;
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
