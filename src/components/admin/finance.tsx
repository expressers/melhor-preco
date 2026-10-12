"use client";

// TEMPORARY (domain step): bare v2 finance table + CSV (CHANGES §9). The
// admin worker rebuilds this screen (totals per period and surface, filters).

import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/app-shell";
import { Money } from "@/components/price-tag";
import { Receipt, ReceiptRow } from "@/components/receipt";
import { Button } from "@/components/ui/button";
import { downloadCsv, financeCsvRow, FINANCE_CSV_HEADERS } from "@/lib/csv";
import { referenceDisplayStatus } from "@/lib/finance";
import { CLIENT_KIND, REFERENCE_STATUS, REQUEST_STATUS } from "@/lib/labels";
import { clientDisplayName } from "@/lib/rules";
import { useFinanceSummary, useStore } from "@/lib/store";
import { useNow } from "./kit";

export function AdminFinance() {
  const requests = useStore((s) => s.requests);
  const surfaces = useStore((s) => s.surfaces);
  const clients = useStore((s) => s.clients);
  const sum = useFinanceSummary();
  const now = useNow();

  const rows = requests
    .filter((r) => r.status !== "cancelado")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => {
      const c = clients.find((x) => x.id === r.clientId);
      return financeCsvRow(r, {
        surface: surfaces.find((s) => s.id === r.surfaceId)?.name ?? r.surfaceId,
        client: c ? clientDisplayName(c) : r.clientId,
        clientKind: c ? CLIENT_KIND[c.kind].label : "",
        status: REQUEST_STATUS[r.status].label,
        referenceStatus: r.reference ? REFERENCE_STATUS[referenceDisplayStatus(r.reference, now)].label : "Sem referência",
      });
    });

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Bruto, impostos e taxas, líquido e repartição por pedido."
        actions={
          <Button variant="outline" onClick={() => downloadCsv("melhor-preco-financeiro", FINANCE_CSV_HEADERS, rows)}>
            <DownloadSimpleIcon />
            Exportar CSV
          </Button>
        }
      />
      <Receipt title="Pedidos pagos" meta={`${sum.paidCount} pedidos`} className="mb-8 max-w-md">
        <ReceiptRow label="Bruto" value={<Money amount={sum.gross} />} />
        <ReceiptRow label="Impostos e taxas" value={<Money amount={sum.taxes} />} />
        <ReceiptRow label="Líquido" value={<Money amount={sum.net} />} />
        <ReceiptRow label="Agentes (60%)" value={<Money amount={sum.agent} />} />
        <ReceiptRow label="Plataforma" value={<Money amount={sum.platform} />} />
        <ReceiptRow label="Operadores (final)" value={<Money amount={sum.operatorFinal} />} />
        <ReceiptRow label="Operadores (provisório)" value={<Money amount={sum.operatorProvisional} />} className="pb-4" />
      </Receipt>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-2">
              {FINANCE_CSV_HEADERS.map((h) => (
                <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[0])} className="border-t border-line">
                {row.map((v, i) => (
                  <td key={i} className="px-3 py-2 font-mono whitespace-nowrap tabular">
                    {String(v ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
