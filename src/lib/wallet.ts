// Agent wallet and withdrawals (CHANGES-v2 §6). Pure functions only.

import { isValidIban, luandaDayKey, nextLuandaMidnight } from "./finance";
import type { Agent, AgentEarning, Withdrawal } from "./types";

export interface WalletSummary {
  earned: number; // all credits (60% of net of paid requests)
  withdrawn: number; // confirmed withdrawals
  pending: number; // withdrawals waiting for the admin (reserved)
  available: number; // earned - withdrawn - pending
  earnings: AgentEarning[]; // newest first
  withdrawals: Withdrawal[]; // newest first
}

export function computeWallet(
  agentId: string,
  earnings: readonly AgentEarning[],
  withdrawals: readonly Withdrawal[],
): WalletSummary {
  const mine = earnings.filter((e) => e.agentId === agentId).sort((a, b) => b.at.localeCompare(a.at));
  const outs = withdrawals
    .filter((w) => w.agentId === agentId)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const sum = (xs: { amount: number }[]) => xs.reduce((t, x) => t + x.amount, 0);
  const earned = sum(mine);
  const withdrawn = sum(outs.filter((w) => w.status === "confirmed"));
  const pending = sum(outs.filter((w) => w.status === "pending"));
  return { earned, withdrawn, pending, available: earned - withdrawn - pending, earnings: mine, withdrawals: outs };
}

export type WithdrawCheck =
  | { ok: true; nextAllowedAt: null }
  | { ok: false; error: string; nextAllowedAt: string | null };

/**
 * Rules of CHANGES §6: at most one withdrawal request per Luanda civil day
 * (rejected requests do not count, so a typo can be fixed the same day),
 * amount a positive integer ≤ available balance, valid IBAN on file.
 * `nextAllowedAt` (ISO) tells the UI when the agent can ask again.
 */
export function canWithdraw(params: {
  agent: Pick<Agent, "id" | "bank" | "status">;
  withdrawals: readonly Withdrawal[];
  available: number;
  amount?: number; // omit to only check the daily rule / IBAN
  now?: number;
}): WithdrawCheck {
  const { agent, withdrawals, available, amount } = params;
  const now = params.now ?? Date.now();
  const today = luandaDayKey(now);
  const usedToday = withdrawals.some(
    (w) => w.agentId === agent.id && w.status !== "rejected" && luandaDayKey(w.requestedAt) === today,
  );
  if (usedToday)
    return {
      ok: false,
      error: "Só pode pedir um levantamento por dia. Volte a tentar amanhã.",
      nextAllowedAt: new Date(nextLuandaMidnight(now)).toISOString(),
    };
  if (agent.status === "suspenso")
    return { ok: false, error: "A sua conta está suspensa. Contacte a administração.", nextAllowedAt: null };
  if (!agent.bank || !isValidIban(agent.bank.iban) || !agent.bank.holder.trim())
    return { ok: false, error: "Registe um IBAN válido e o titular da conta no seu perfil.", nextAllowedAt: null };
  if (available <= 0) return { ok: false, error: "Não tem saldo disponível para levantar.", nextAllowedAt: null };
  if (amount !== undefined) {
    if (!Number.isInteger(amount) || amount <= 0)
      return { ok: false, error: "Indique um montante válido, em Kz.", nextAllowedAt: null };
    if (amount > available)
      return { ok: false, error: "O montante é superior ao saldo disponível.", nextAllowedAt: null };
  }
  return { ok: true, nextAllowedAt: null };
}
