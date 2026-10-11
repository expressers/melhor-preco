// CSV export (browser only). Semicolon separator + UTF-8 BOM so Excel in
// pt-AO/pt-PT locales opens it with accents and columns intact.

export type CsvValue = string | number | boolean | null | undefined;

export function toCsv(headers: string[], rows: CsvValue[][], separator = ";"): string {
  const esc = (v: CsvValue) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[";\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(separator)).join("\r\n");
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
