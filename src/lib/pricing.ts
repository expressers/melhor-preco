// Pricing and distribution (CHANGES-v2 §1, §4). Pure functions only.

import { formatKz } from "./format";
import type { PricingConfig, RequestAmounts, RequestKind, RequestSplit, SplitConfig } from "./types";

export const DEFAULT_SPLIT: SplitConfig = {
  agent: 60,
  platformBelow: 35,
  operatorBelow: 5,
  platformMet: 30,
  operatorMet: 10,
};

export const DEFAULT_PRICING: PricingConfig = {
  simplePrice: 1000,
  multiItemPrice: 800,
  taxRate: 0.14, // IVA por defeito, a confirmar com o Mauro
  split: DEFAULT_SPLIT,
};

/** Shown next to the tax rate in admin and receipts. */
export const TAX_RATE_NOTE = "Taxa por defeito de 14% (IVA), a confirmar com o Mauro.";

const countOf = (items: number | readonly unknown[]) =>
  Math.max(0, typeof items === "number" ? Math.floor(items) : items.length);

/** 1 item → simples; 2+ → múltiplo. Variations never count as items. */
export function requestKind(items: number | readonly unknown[]): RequestKind {
  return countOf(items) >= 2 ? "multiplo" : "simples";
}

/** "Consulta simples", "Consulta dupla", "tripla", "quádrupla", "Consulta de 5 itens". */
export function requestKindLabel(items: number | readonly unknown[]): string {
  const n = countOf(items);
  if (n <= 1) return "Consulta simples";
  if (n === 2) return "Consulta dupla";
  if (n === 3) return "Consulta tripla";
  if (n === 4) return "Consulta quádrupla";
  return `Consulta de ${n} itens`;
}

/** Unit price for this item count: simple price for 1, per-item price for 2+. */
export function unitPrice(items: number | readonly unknown[], cfg: PricingConfig): number {
  return requestKind(items) === "multiplo" ? cfg.multiItemPrice : cfg.simplePrice;
}

/** Gross (what the client pays). 1 item = simplePrice; n ≥ 2 = n × multiItemPrice. */
export function grossPrice(items: number | readonly unknown[], cfg: PricingConfig): number {
  const n = Math.max(1, countOf(items));
  return n === 1 ? cfg.simplePrice : n * cfg.multiItemPrice;
}

/** "1 item × 1 000 Kz" or "3 itens × 800 Kz". */
export function priceBreakdown(items: number | readonly unknown[], cfg: PricingConfig): string {
  const n = Math.max(1, countOf(items));
  return `${n} ${n === 1 ? "item" : "itens"} × ${formatKz(unitPrice(n, cfg))}`;
}

/** Net = round(gross / (1 + taxRate)). */
export function netFromGross(gross: number, taxRate: number): number {
  return Math.round(gross / (1 + taxRate));
}

export function computeAmounts(items: number | readonly unknown[], cfg: PricingConfig): RequestAmounts {
  const itemCount = Math.max(1, countOf(items));
  const gross = grossPrice(itemCount, cfg);
  const net = netFromGross(gross, cfg.taxRate);
  return {
    itemCount,
    unitPrice: unitPrice(itemCount, cfg),
    gross,
    taxRate: cfg.taxRate,
    taxes: gross - net,
    net,
  };
}

/**
 * Splits the net in integer Kz that always sum to `net`: agent and operator
 * are rounded, the platform takes the remainder.
 */
export function splitNet(net: number, agentPct: number, operatorPct: number) {
  const agent = Math.round((net * agentPct) / 100);
  const operator = Math.round((net * operatorPct) / 100);
  return { agent, operator, platform: net - agent - operator };
}

/**
 * Distribution of the net (CHANGES §4). `met` undefined/false → "abaixo dos
 * objectivos" (provisional 60/35/5); `met` true → 60/30/10.
 * `operatorPct` overrides the operator percentage (from the period objective).
 */
export function distribution(
  net: number,
  split: SplitConfig = DEFAULT_SPLIT,
  met = false,
  operatorPct?: number,
): RequestSplit & { met: boolean } {
  const pct = operatorPct ?? (met ? split.operatorMet : split.operatorBelow);
  return { ...splitNet(net, split.agent, pct), operatorPct: pct, final: false, met };
}

export interface PriceQuote extends RequestAmounts {
  kind: RequestKind;
  label: string; // "Consulta tripla"
  breakdown: string; // "3 itens × 800 Kz"
  split: RequestSplit; // provisional
}

export function quoteFor(items: number | readonly unknown[], cfg: PricingConfig): PriceQuote {
  const amounts = computeAmounts(items, cfg);
  const d = distribution(amounts.net, cfg.split);
  return {
    ...amounts,
    kind: requestKind(amounts.itemCount),
    label: requestKindLabel(amounts.itemCount),
    breakdown: priceBreakdown(amounts.itemCount, cfg),
    split: { agent: d.agent, platform: d.platform, operator: d.operator, operatorPct: d.operatorPct, final: false },
  };
}

/** Errors for an admin-edited split; empty when valid (both columns = 100%). */
export function validateSplit(split: SplitConfig): string[] {
  const errors: string[] = [];
  const vals = Object.values(split);
  if (vals.some((v) => !Number.isInteger(v) || v < 0 || v > 100))
    errors.push("As percentagens têm de ser números inteiros entre 0 e 100.");
  if (split.agent + split.platformBelow + split.operatorBelow !== 100)
    errors.push("Abaixo dos objectivos: agente + plataforma + operador tem de somar 100%.");
  if (split.agent + split.platformMet + split.operatorMet !== 100)
    errors.push("Objectivos cumpridos: agente + plataforma + operador tem de somar 100%.");
  if (split.operatorMet < split.operatorBelow)
    errors.push("A percentagem do operador com objectivos cumpridos não pode ser menor do que abaixo dos objectivos.");
  return errors;
}

/** Errors for an admin-edited pricing config; empty when valid. */
export function validatePricing(cfg: PricingConfig): string[] {
  const errors: string[] = [];
  const posInt = (v: number) => Number.isInteger(v) && v > 0;
  if (!posInt(cfg.simplePrice)) errors.push("O preço da consulta simples tem de ser um valor inteiro positivo.");
  if (!posInt(cfg.multiItemPrice)) errors.push("O preço por item no pedido múltiplo tem de ser um valor inteiro positivo.");
  if (!Number.isFinite(cfg.taxRate) || cfg.taxRate < 0 || cfg.taxRate >= 1)
    errors.push("A taxa de impostos e taxas tem de estar entre 0% e 99%.");
  return [...errors, ...validateSplit(cfg.split)];
}
