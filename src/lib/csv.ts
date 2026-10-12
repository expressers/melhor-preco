// CSV export (browser only). Semicolon separator + UTF-8 BOM so Excel in
// pt-AO/pt-PT locales opens it with accents and columns intact.

import type { ServiceRequest } from "./types";

export type CsvValue =string | number | boolean | null | undefined;

export function toCsv(headers: string[], rows: CsvValue[][], separator = ";"): string {
  const esc = (v: CsvValue) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[";\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(separator)).join("\r\n");
}

/** Finance columns of CHANGES §9 (one row per request). */
export const FINANCE_CSV_HEADERS = [
  "Pedido",
  "Data",
  "Superfície",
  "Cliente",
  "Tipo de cliente",
  "Tipo de pedido",
  "Itens",
  "Estado",
  "Bruto (Kz)",
  "Impostos e taxas (Kz)",
  "Líquido (Kz)",
  "Agente 60% (Kz)",
  "Plataforma (Kz)",
  "Operador (Kz)",
  "Operador %",
  "Repartição",
  "Referência",
  "Estado do pagamento da referência",
  "Pago em",
];

/**
 * One CSV row per request, aligned with FINANCE_CSV_HEADERS. Pass display
 * names already resolved; `referenceStatus` is the display label.
 */
export function financeCsvRow(
  r: ServiceRequest,
  names: { surface: string; client: string; clientKind: string; status: string; referenceStatus: string },
): CsvValue[] {
  return [
    r.id,
    r.createdAt.slice(0, 10),
    names.surface,
    names.client,
    names.clientKind,
    r.kind === "multiplo" ? "Múltiplo" : "Simples",
    r.amounts.itemCount,
    names.status,
    r.amounts.gross,
    r.amounts.taxes,
    r.amounts.net,
    r.split.agent,
    r.split.platform,
    r.split.operator,
    r.split.operatorPct,
    r.split.final ? "Final" : "Provisória",
    r.reference ? `${r.reference.entity} ${r.reference.reference}` : "",
    names.referenceStatus,
    r.paidAt?.slice(0, 10) ?? "",
  ];
}

/** Builds the CSV and triggers a download. No-op outside the browser. */
export function downloadCsv(filename: string, headers: string[], rows: CsvValue[][]): void {
  if (typeof window === "undefined") return;
  const blob = new Blob(["﻿" + toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
