import type { Priority, PricingConfig } from "./types";

/** Hard floor from the brief: a consulta never costs less than this. */
export const PRICE_FLOOR = 600;

export const DEFAULT_PRICING: PricingConfig = {
  minimum: 600,
  agentShare: 400,
  platformShare: 200,
  extraSurfaceIncrement: 300,
  extraSurfaceAgentShare: 200,
  urgentIncrement: 200,
};

export interface PriceQuote {
  price: number;
  agentShare: number;
  platformShare: number;
  extraSurfaces: number;
}

/**
 * Price of a consulta. Base (agent + platform) covers the first surface;
 * each extra surface adds `extraSurfaceIncrement` (of which
 * `extraSurfaceAgentShare` goes to the agent); "urgente" adds
 * `urgentIncrement`, all to the agent. Never below the configured minimum
 * nor below PRICE_FLOOR: any shortfall is added to the platform share.
 */
export function computePrice(
  config: PricingConfig,
  surfaceCount: number,
  priority: Priority = "normal",
): PriceQuote {
  const extraSurfaces = Math.max(0, surfaceCount - 1);
  const urgent = priority === "urgente" ? config.urgentIncrement : 0;
  const agentShare =
    config.agentShare + extraSurfaces * config.extraSurfaceAgentShare + urgent;
  let platformShare =
    config.platformShare +
    extraSurfaces * (config.extraSurfaceIncrement - config.extraSurfaceAgentShare);
  const floor = Math.max(PRICE_FLOOR, config.minimum);
  if (agentShare + platformShare < floor) platformShare = floor - agentShare;
  return { price: agentShare + platformShare, agentShare, platformShare, extraSurfaces };
}

/** Clamp an admin-edited config so it can never produce a price below the floor. */
export function sanitizePricing(config: PricingConfig): PricingConfig {
  const n = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
  const minimum = Math.max(PRICE_FLOOR, n(config.minimum));
  const agentShare = n(config.agentShare);
  const platformShare = Math.max(n(config.platformShare), minimum - agentShare);
  const extraSurfaceIncrement = n(config.extraSurfaceIncrement);
  return {
    minimum,
    agentShare,
    platformShare,
    extraSurfaceIncrement,
    extraSurfaceAgentShare: Math.min(n(config.extraSurfaceAgentShare), extraSurfaceIncrement),
    urgentIncrement: n(config.urgentIncrement),
  };
}
