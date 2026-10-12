// Payment helpers (CHANGES-v2 §5, §6): Luanda civil day, IBAN, NIF and the
// fictitious Multicaixa reference. Pure functions only.

import type { MulticaixaReference } from "./types";

const HOUR = 60 * 60 * 1000;
/** Luanda is UTC+1 all year (Africa/Luanda, no DST). */
export const LUANDA_OFFSET_MS = HOUR;

const toMs = (t: number | string | Date) =>
  typeof t === "number" ? t : new Date(t).getTime();

/** Civil day in Luanda, "2026-10-12". */
export function luandaDayKey(t: number | string | Date): string {
  return new Date(toMs(t) + LUANDA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Next Luanda midnight after `t` (ms epoch). 00:00 Luanda = 23:00 UTC of the previous day. */
export function nextLuandaMidnight(t: number | string | Date): number {
  const local = new Date(toMs(t) + LUANDA_OFFSET_MS);
  const nextLocalMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
  return nextLocalMidnight - LUANDA_OFFSET_MS;
}

// --- IBAN --------------------------------------------------------------------

/** Removes spaces/dashes and upper-cases: "ao06 0040 ..." → "AO060040...". */
export function normalizeIban(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

/** Angolan IBAN as required by CHANGES §6: "AO06" + 21 digits (spaces allowed in input). */
export function isValidIban(raw: string): boolean {
  return /^AO06\d{21}$/.test(normalizeIban(raw));
}

/** "AO06 0040 0000 1234 5678 1012 3" (groups of 4). */
export function formatIban(raw: string): string {
  return normalizeIban(raw).replace(/(.{4})(?=.)/g, "$1 ");
}

/** "AO06 •••• •••• •••• •••• 1012 3" style, keeps the last 5 digits. */
export function maskIban(raw: string): string {
  const n = normalizeIban(raw);
  if (n.length < 9) return formatIban(n);
  return formatIban(n.slice(0, 4) + "•".repeat(n.length - 9) + n.slice(-5));
}

// --- NIF ---------------------------------------------------------------------

export function normalizeNif(raw: string): string {
  return raw.replace(/[\s.-]/g, "").toUpperCase();
}

/** Angolan NIF (mock check): 9 to 14 letters/digits, at least 9 digits. */
export function isValidNif(raw: string): boolean {
  const n = normalizeNif(raw);
  return /^[0-9A-Z]{9,14}$/.test(n) && (n.match(/\d/g)?.length ?? 0) >= 9;
}

// --- Multicaixa reference ----------------------------------------------------

/** Fictitious entity used in the demo. Never a real Multicaixa entity. */
export const DEMO_ENTITY = "99999";
/** Reference validity after generation. */
export const REFERENCE_VALIDITY_HOURS = 72;

/**
 * Deterministic fictitious 9-digit reference for a request:
 * "7" + 4 digits from the request number + 3 from a hash + 1 check digit.
 * Collisions with `taken` are resolved by bumping the hash part.
 */
export function generateReferenceNumber(requestId: string, taken: readonly string[] = []): string {
  const num = "7" + (requestId.match(/(\d+)$/)?.[1] ?? "0").slice(-4).padStart(4, "0");
  let h = 0;
  for (const ch of requestId) h = (h * 131 + ch.charCodeAt(0) * 7) % 1000;
  for (let i = 0; i < 1000; i++) {
    const body = num + String((h + i * 37) % 1000).padStart(3, "0");
    const check = [...body].reduce((s, d, k) => s + Number(d) * (k % 2 ? 3 : 1), 0) % 10;
    const ref = body + check;
    if (!taken.includes(ref)) return ref;
  }
  return num + "0000";
}

export function generateReference(
  requestId: string,
  amount: number,
  now: number | string | Date = Date.now(),
  taken: readonly string[] = [],
): MulticaixaReference {
  const at = toMs(now);
  return {
    entity: DEMO_ENTITY,
    reference: generateReferenceNumber(requestId, taken),
    amount,
    createdAt: new Date(at).toISOString(),
    expiresAt: new Date(at + REFERENCE_VALIDITY_HOURS * HOUR).toISOString(),
    status: "pendente",
    demo: true,
  };
}

/** "123 456 789" */
export function formatReference(ref: string): string {
  return ref.replace(/\D/g, "").replace(/(\d{3})(?=\d)/g, "$1 ");
}

export function isReferenceExpired(
  ref: Pick<MulticaixaReference, "status" | "expiresAt">,
  now: number = Date.now(),
): boolean {
  return ref.status === "pendente" && now > new Date(ref.expiresAt).getTime();
}

/** Status for display: "pendente" | "paga" | "anulada" | "expirada". */
export function referenceDisplayStatus(
  ref: Pick<MulticaixaReference, "status" | "expiresAt">,
  now: number = Date.now(),
): MulticaixaReference["status"] | "expirada" {
  return isReferenceExpired(ref, now) ? "expirada" : ref.status;
}
