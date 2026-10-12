"use client";

import { TargetIcon } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Money, PriceTag } from "@/components/price-tag";
import { ObjectiveStatusBadge } from "@/components/status-badge";
import { formatNumber, NBSP } from "@/lib/format";
import { REVENUE_BASIS } from "@/lib/labels";
import { objectiveStatus, paidRequestsInPeriod } from "@/lib/objectives";
import { splitNet } from "@/lib/pricing";
import { useCurrentObjective, useObjectiveEvaluation, useStore } from "@/lib/store";
import type { Operator } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./operador.module.scss";

const DAY = 24 * 60 * 60 * 1000;

function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}${NBSP}%`;
}

/**
 * Objective of the running period for the operator's surface: revenue vs
 * target, optional paid-count target, days left and the estimated commission.
 * Numbers come from evaluateObjective, the same function the admin uses.
 */
export function ObjectivePanel({ operator, now }: { operator: Operator; now: number }) {
  const objective = useCurrentObjective(operator.surfaceId, now);
  const evaluation = useObjectiveEvaluation(objective);
  const requests = useStore((s) => s.requests);
  const split = useStore((s) => s.pricing.split);

  // What the commission would be at the "met" percentage, on the same paid requests.
  const ifMet = useMemo(() => {
    if (!objective) return 0;
    return paidRequestsInPeriod(requests, objective.surfaceId, objective.period).reduce(
      (t, r) => t + splitNet(r.amounts.net, split.agent, objective.pctMet).operator,
      0,
    );
  }, [objective, requests, split]);

  if (!objective || !evaluation) {
    return (
      <section aria-labelledby="objectivo" className="flex flex-col gap-3 rounded-lg border border-dashed border-ink/20 p-5">
        <span aria-hidden className="grid size-10 place-items-center rounded-full bg-paper-2 text-ink">
          <TargetIcon className="size-5" />
        </span>
        <h2 id="objectivo" className="text-base font-semibold">
          Sem objectivo neste período
        </h2>
        <p className="text-sm text-ink-2">
          A administração define o objectivo de facturação da superfície antes do início de cada período. Até lá, a
          comissão estimada fica nos {split.operatorBelow}{NBSP}%.
        </p>
        <SalaryNote operator={operator} />
      </section>
    );
  }

  const daysLeft = Math.max(0, Math.ceil((new Date(objective.period.endsAt).getTime() - now) / DAY));
  const ratio = evaluation.revenueRatio;
  const missing = Math.max(0, objective.revenueTarget - evaluation.revenue);

  return (
    <section aria-labelledby="objectivo" className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 id="objectivo" className="text-base font-semibold">
            Objectivo de {objective.period.label}
          </h2>
          <p className="text-sm text-ink-2">
            {daysLeft === 0 ? "Último dia do período" : `Faltam ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}`}
          </p>
        </div>
        <ObjectiveStatusBadge status={objectiveStatus(objective, now)} />
      </div>

      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-ink-2">
          <Money amount={evaluation.revenue} className="text-xl font-semibold text-ink" />
          <span>
            de <Money amount={objective.revenueTarget} />
          </span>
        </p>
        <Meter ratio={ratio} met={evaluation.met} label={`${REVENUE_BASIS[objective.basis].label}: ${pct(ratio)} da meta`} />
        <p className="flex justify-between gap-2 text-xs text-ink-2">
          <span>{REVENUE_BASIS[objective.basis].label}</span>
          <span className="font-mono tabular">{pct(ratio)}</span>
        </p>
        {missing > 0 && (
          <p className="text-sm text-ink-2">
            Faltam <Money amount={missing} className="text-ink" /> para a meta.
          </p>
        )}
      </div>

      {objective.paidRequestsTarget != null && evaluation.paidRatio != null && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-2">
            <span className="font-mono font-semibold text-ink tabular">{formatNumber(evaluation.paidCount)}</span> de{" "}
            <span className="font-mono tabular">{formatNumber(objective.paidRequestsTarget)}</span> consultas pagas
          </p>
          <Meter
            small
            ratio={evaluation.paidRatio}
            met={evaluation.paidCount >= objective.paidRequestsTarget}
            label={`Consultas pagas: ${pct(evaluation.paidRatio)} da meta`}
          />
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-ink">Comissão estimada</span>
            <span className="text-xs text-ink-2">
              {evaluation.operatorPct}
              {NBSP}% do líquido, {evaluation.met ? "objectivo cumprido" : "abaixo do objectivo"}
            </span>
          </div>
          <PriceTag amount={evaluation.commission} label="Comissão estimada" />
        </div>
        {!evaluation.met && (
          <p className="text-sm text-ink-2">
            Se cumprir o objectivo, a comissão passa a {objective.pctMet}
            {NBSP}%: <Money amount={ifMet} className="text-ink" /> com as consultas pagas até agora.
          </p>
        )}
        <p className="text-xs text-ink-2">
          Valor provisório. O cumprimento e a comissão final são calculados no fecho do período.
        </p>
      </div>

      <SalaryNote operator={operator} />
    </section>
  );
}

function SalaryNote({ operator }: { operator: Operator }) {
  return (
    <p className="rounded-lg bg-paper px-3 py-2.5 text-sm text-ink-2">
      O salário base de <Money amount={operator.baseSalary} className="text-ink" /> por mês é pago à parte e não
      depende do objectivo.
    </p>
  );
}

function Meter({ ratio, met, small, label }: { ratio: number; met: boolean; small?: boolean; label: string }) {
  const clamped = Math.min(1, Math.max(0, ratio));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className={cn(styles.meter, small && styles.meterSmall)}
    >
      <span
        aria-hidden
        className={cn(styles.meterFill, met && styles.meterMet)}
        style={{ "--progress": clamped } as CSSProperties}
      />
    </div>
  );
}
