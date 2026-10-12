import { describe, expect, test } from "bun:test";
import {
  DEMO_ENTITY,
  formatIban,
  generateReference,
  isReferenceExpired,
  isValidIban,
  isValidNif,
  luandaDayKey,
  nextLuandaMidnight,
} from "./finance";
import { AGENTS, EARNINGS, OBJECTIVES, REQUESTS, WITHDRAWALS } from "./mock";
import { evaluateObjective, isObjectiveLocked, monthPeriod, objectiveStatus } from "./objectives";
import {
  computeAmounts,
  DEFAULT_PRICING,
  distribution,
  grossPrice,
  priceBreakdown,
  quoteFor,
  requestKind,
  requestKindLabel,
  splitNet,
  validatePricing,
  validateSplit,
} from "./pricing";
import { computeWallet, canWithdraw } from "./wallet";
import type { Agent, Withdrawal } from "./types";

const cfg = DEFAULT_PRICING;

describe("pricing", () => {
  test("kind and label", () => {
    expect(requestKind(1)).toBe("simples");
    expect(requestKind([1, 2])).toBe("multiplo");
    expect(requestKindLabel(1)).toBe("Consulta simples");
    expect(requestKindLabel(2)).toBe("Consulta dupla");
    expect(requestKindLabel(3)).toBe("Consulta tripla");
    expect(requestKindLabel(4)).toBe("Consulta quádrupla");
    expect(requestKindLabel(7)).toBe("Consulta de 7 itens");
  });

  test("gross price: 1 000 simple, 800 per item when multiple", () => {
    expect(grossPrice(1, cfg)).toBe(1000);
    expect(grossPrice(2, cfg)).toBe(1600);
    expect(grossPrice(3, cfg)).toBe(2400);
    // formatKz uses non-breaking spaces.
    expect(priceBreakdown(3, cfg)).toBe("3 itens × 800 Kz");
    expect(priceBreakdown(1, cfg)).toBe("1 item × 1 000 Kz");
  });

  test("net and taxes at 14%", () => {
    expect(computeAmounts(1, cfg)).toMatchObject({ gross: 1000, net: 877, taxes: 123 });
    expect(computeAmounts(3, cfg)).toMatchObject({ gross: 2400, net: 2105, taxes: 295 });
  });

  test("distribution: 60/35/5 provisional, 60/30/10 met, always sums to net", () => {
    expect(distribution(877, cfg.split)).toMatchObject({ agent: 526, operator: 44, platform: 307, operatorPct: 5 });
    expect(distribution(877, cfg.split, true)).toMatchObject({ agent: 526, operator: 88, platform: 263, operatorPct: 10 });
    for (let net = 0; net < 5000; net += 37) {
      for (const pct of [5, 10]) {
        const s = splitNet(net, 60, pct);
        expect(s.agent + s.operator + s.platform).toBe(net);
        expect(s.platform).toBeGreaterThanOrEqual(0);
      }
    }
    expect(quoteFor(3, cfg).split).toMatchObject({ agent: 1263, final: false });
  });

  test("split and pricing validation", () => {
    expect(validateSplit(cfg.split)).toEqual([]);
    expect(validateSplit({ ...cfg.split, platformMet: 31 }).length).toBeGreaterThan(0);
    expect(validatePricing({ ...cfg, simplePrice: 0 }).length).toBeGreaterThan(0);
    expect(validatePricing(cfg)).toEqual([]);
  });
});

describe("finance helpers", () => {
  test("IBAN AO06 + 21 digits, spaces allowed", () => {
    expect(isValidIban("AO06 0040 0000 1234 5678 1012 3")).toBe(true);
    expect(isValidIban("ao06004000001234567810123")).toBe(true);
    expect(isValidIban("AO06 0040 0000 1234 5678 1012")).toBe(false);
    expect(isValidIban("PT50 0040 0000 1234 5678 1012 3")).toBe(false);
    expect(formatIban("AO06004000001234567810123")).toBe("AO06 0040 0000 1234 5678 1012 3");
  });

  test("NIF", () => {
    expect(isValidNif("5417 893 021")).toBe(true);
    expect(isValidNif("123")).toBe(false);
  });

  test("Luanda civil day (UTC+1)", () => {
    expect(luandaDayKey("2026-10-11T22:59:00Z")).toBe("2026-10-11");
    expect(luandaDayKey("2026-10-11T23:00:00Z")).toBe("2026-10-12");
    expect(new Date(nextLuandaMidnight("2026-10-12T10:00:00Z")).toISOString()).toBe("2026-10-12T23:00:00.000Z");
  });

  test("Multicaixa reference: demo entity, 9 digits, 72h, unique", () => {
    const at = Date.parse("2026-10-12T10:00:00Z");
    const ref = generateReference("MP-2026-00042", 2400, at);
    expect(ref.entity).toBe(DEMO_ENTITY);
    expect(ref.reference).toMatch(/^\d{9}$/);
    expect(ref.demo).toBe(true);
    expect(ref.expiresAt).toBe("2026-10-15T10:00:00.000Z");
    expect(generateReference("MP-2026-00042", 2400, at, [ref.reference]).reference).not.toBe(ref.reference);
    expect(isReferenceExpired(ref, at + 73 * 3600_000)).toBe(true);
    expect(isReferenceExpired(ref, at)).toBe(false);
  });
});

describe("wallet and withdrawals", () => {
  const agent: Pick<Agent, "id" | "bank" | "status"> = {
    id: "ag-x",
    status: "activo",
    bank: { iban: "AO06004000001234567810123", holder: "Teste" },
  };
  const w = (over: Partial<Withdrawal>): Withdrawal => ({
    id: "lv-x",
    agentId: "ag-x",
    amount: 100,
    iban: agent.bank!.iban,
    holder: "Teste",
    status: "pending",
    requestedAt: "2026-10-12T08:00:00Z",
    ...over,
  });
  const now = Date.parse("2026-10-12T15:00:00Z");

  test("one per Luanda day; rejected do not count", () => {
    const blocked = canWithdraw({ agent, withdrawals: [w({})], available: 1000, amount: 100, now });
    expect(blocked.ok).toBe(false);
    expect(blocked.nextAllowedAt).toBe("2026-10-12T23:00:00.000Z");
    expect(canWithdraw({ agent, withdrawals: [w({ status: "rejected" })], available: 1000, amount: 100, now }).ok).toBe(true);
    // 22:30 UTC on the 11th is 23:30 in Luanda: a different civil day.
    expect(canWithdraw({ agent, withdrawals: [w({ requestedAt: "2026-10-11T22:30:00Z" })], available: 1000, amount: 100, now }).ok).toBe(true);
  });

  test("amount ≤ available and IBAN required", () => {
    expect(canWithdraw({ agent, withdrawals: [], available: 500, amount: 501, now }).ok).toBe(false);
    expect(canWithdraw({ agent: { ...agent, bank: undefined }, withdrawals: [], available: 500, amount: 100, now }).ok).toBe(false);
  });

  test("balance = earnings - confirmed - pending", () => {
    const sum = computeWallet(
      "ag-x",
      [{ id: "e1", agentId: "ag-x", requestId: "r", net: 877, amount: 526, at: "2026-10-01T00:00:00Z" }],
      [w({ amount: 100, status: "confirmed" }), w({ id: "lv-y", amount: 50 }), w({ id: "lv-z", amount: 70, status: "rejected" })],
    );
    expect(sum).toMatchObject({ earned: 526, withdrawn: 100, pending: 50, available: 376 });
  });
});

describe("objectives", () => {
  test("lock after start; status derived from time", () => {
    const o = { status: "running" as const, period: monthPeriod("2026-11") };
    expect(objectiveStatus(o, Date.parse("2026-10-20T00:00:00Z"))).toBe("planned");
    expect(isObjectiveLocked(o, Date.parse("2026-10-31T23:00:00Z"))).toBe(true); // 00:00 Luanda on 1 Nov
  });

  test("September mocks: SP met, CC below, NSP met after correction", () => {
    const sep = OBJECTIVES.filter((o) => o.period.key === "2026-09");
    const by = (s: string) => sep.find((o) => o.surfaceId === s)!;
    expect(by("sf-shopping-popular").result?.met).toBe(true);
    expect(by("sf-cidade-da-china").result?.met).toBe(false);
    expect(by("sf-novo-sao-paulo").corrections.length).toBe(1);
    expect(by("sf-novo-sao-paulo").result?.met).toBe(true);
    for (const o of sep) expect(evaluateObjective(o, REQUESTS).commission).toBe(o.result!.commission);
  });

  test("criteria: revenue and optional paid count", () => {
    const o = OBJECTIVES.find((x) => x.id === "obj-2026-09-sf-shopping-popular")!;
    expect(evaluateObjective({ ...o, paidRequestsTarget: 99 }, REQUESTS).met).toBe(false);
    expect(evaluateObjective({ ...o, basis: "gross", revenueTarget: 1 }, REQUESTS).met).toBe(true);
  });
});

describe("mocks coherence", () => {
  test("every request has one surface and items; earnings = 60% of net of paid requests", () => {
    for (const r of REQUESTS) {
      expect(r.items.length).toBeGreaterThan(0);
      expect(typeof r.surfaceId).toBe("string");
      expect(r.split.agent + r.split.platform + r.split.operator).toBe(r.amounts.net);
    }
    for (const e of EARNINGS) expect(e.amount).toBe(Math.round(e.net * 0.6));
  });

  test("withdrawals never exceed earnings", () => {
    for (const a of AGENTS) expect(computeWallet(a.id, EARNINGS, WITHDRAWALS).available).toBeGreaterThanOrEqual(0);
  });
});
