"use client";

// Small building blocks shared by the admin screens: action toasts, a live
// clock, id lookups, the confirmation dialog, search field and flag badges.

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import { ToneBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NBSP } from "@/lib/format";
import { getFlags } from "@/lib/rules";
import { Timeline } from "@/components/timeline";
import { luandaDayKey } from "@/lib/finance";
import { useAudit, useStore, type ActionResult } from "@/lib/store";
import type { Agent, AuditLogEntry, Client, Operator, ServiceRequest, Surface } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Toast the outcome of a store action. Returns true when it succeeded. */
export function report(result: ActionResult, success: string): boolean {
  if (result.ok) toast.success(success);
  else toast.error(result.error);
  return result.ok;
}

// --- Clock -----------------------------------------------------------------

let nowCache = 0;
function subscribeNow(cb: () => void) {
  const t = window.setInterval(() => {
    nowCache = Date.now();
    cb();
  }, 60_000);
  return () => window.clearInterval(t);
}
function snapshotNow() {
  if (!nowCache) nowCache = Date.now();
  return nowCache;
}

/** Current time, refreshed every minute (0 on the server). */
export function useNow(): number {
  return useSyncExternalStore(subscribeNow, snapshotNow, () => 0);
}

// --- Lookups ---------------------------------------------------------------

export function useLookups() {
  const agents = useStore((s) => s.agents);
  const clients = useStore((s) => s.clients);
  const surfaces = useStore((s) => s.surfaces);
  const operators = useStore((s) => s.operators);
  return useMemo(
    () => ({
      agent: new Map<string, Agent>(agents.map((a) => [a.id, a])),
      client: new Map<string, Client>(clients.map((c) => [c.id, c])),
      surface: new Map<string, Surface>(surfaces.map((s) => [s.id, s])),
      operator: new Map<string, Operator>(operators.map((o) => [o.id, o])),
    }),
    [agents, clients, surfaces, operators],
  );
}

// --- Formatting --------------------------------------------------------------

/** 0.123 -> "12,3 %" */
export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "sem dados";
  const v = Math.round(ratio * 1000) / 10;
  return `${String(v).replace(".", ",")}${NBSP}%`;
}

/** Milliseconds -> "3 h 20 min", "45 min", "2 d 4 h". */
export function formatDuration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min}${NBSP}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}${NBSP}h ${min % 60}${NBSP}min`;
  return `${Math.floor(h / 24)}${NBSP}d ${h % 24}${NBSP}h`;
}

const MONTHS_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Luanda month of an ISO date: "2026-10". */
export function monthKeyOf(iso: string): string {
  return luandaDayKey(iso).slice(0, 7);
}

/** "2026-10" -> "Outubro 2026" */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** Whole number from a text field ("12 000" ok); NaN when empty or invalid. */
export function parseIntField(v: string): number {
  const t = v.replace(/\s/g, "");
  return t === "" || !/^\d+$/.test(t) ? NaN : Number(t);
}

// --- Bits of UI --------------------------------------------------------------

/** Mono, tabular identifier (request id, agent code). */
export function Code({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono tabular text-[0.8125rem]", className)}>{children}</span>;
}

/** Section with a quiet heading and an optional action on the right. */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="measure text-sm text-ink-2">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** White panel with a hairline: the container for tables. Tables scroll inside it. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 overflow-hidden rounded-lg border border-line bg-surface", className)}>
      {children}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:max-w-sm", className)}>
      <MagnifyingGlassIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-2"
      />
      <Input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 pl-10"
      />
    </div>
  );
}

/** Case and accent insensitive match. */
export function matches(query: string, ...fields: (string | undefined | null)[]): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  const q = norm(query.trim());
  if (!q) return true;
  return fields.some((f) => f && norm(f).includes(q));
}

/** Late / no answer / incomplete badges for a request (BRIEF §5 rule 10). */
export function FlagBadges({ request, now }: { request: ServiceRequest; now: number }) {
  if (!now) return null;
  const f = getFlags(request, now);
  const showIncomplete = f.incomplete && request.results.length > 0 && request.status !== "cancelado";
  if (!f.late && !f.noAnswer && !showIncomplete) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {f.late && <ToneBadge tone="error">Atrasado</ToneBadge>}
      {f.noAnswer && <ToneBadge tone="warning">Sem resposta</ToneBadge>}
      {showIncomplete && <ToneBadge tone="warning">Incompleto</ToneBadge>}
    </span>
  );
}

/** Audit log of one entity type (or one entity), newest first, in a panel. */
export function AuditTrail({
  entity,
  entityId,
  filter,
  limit = 12,
  empty = "Ainda sem registos.",
}: {
  entity: AuditLogEntry["entity"];
  entityId?: string;
  filter?: (e: AuditLogEntry) => boolean;
  limit?: number;
  empty?: string;
}) {
  const all = useAudit({ entity, entityId });
  const list = (filter ? all.filter(filter) : all).slice(0, limit);
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      {list.length === 0 ? (
        <p className="text-sm text-ink-2">{empty}</p>
      ) : (
        // useAudit is newest first; Timeline takes chronological input.
        <Timeline events={[...list].reverse()} newestFirst />
      )}
    </div>
  );
}

// --- Confirmation dialog -----------------------------------------------------

export interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Ask for a free-text reason (suspension, cancellation, resolution). */
  reason?: { label: string; placeholder?: string; required?: boolean; singleLine?: boolean; minLength?: number };
  /** Return true to close the dialog (i.e. the action succeeded). */
  onConfirm: (reason: string) => boolean;
}

/** Confirmation before destructive or irreversible actions, with an optional reason field. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  destructive,
  reason,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (reason?.required && !text.trim()) {
      setError("Este campo é obrigatório.");
      return;
    }
    if (reason?.minLength && text.trim().length < reason.minLength) {
      setError(`Escreva pelo menos ${reason.minLength} caracteres.`);
      return;
    }
    if (onConfirm(text.trim())) {
      setOpen(false);
      setText("");
      setError(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="gap-5 p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description && <DialogDescription className="text-ink-2">{description}</DialogDescription>}
        </DialogHeader>
        {reason && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-reason">{reason.label}</Label>
            {reason.singleLine ? (
              <Input
                id="confirm-reason"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder={reason.placeholder}
                aria-invalid={!!error}
                aria-describedby={error ? "confirm-reason-error" : undefined}
                className="h-11 font-mono tabular"
                autoComplete="off"
              />
            ) : (
              <Textarea
                id="confirm-reason"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={reason.placeholder}
                aria-invalid={!!error}
                aria-describedby={error ? "confirm-reason-error" : undefined}
                rows={3}
              />
            )}
            {error && (
              <p id="confirm-reason-error" className="text-sm text-error">
                {error}
              </p>
            )}
          </div>
        )}
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline">Voltar</Button>
          </DialogClose>
          <Button variant={destructive ? "destructive" : "default"} onClick={submit}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
