import { Badge } from "@/components/ui/badge";
import {
  AGENT_STATUS,
  AVAILABILITY,
  CLIENT_STATUS,
  COMPLAINT_STATUS,
  LEDGER_STATUS,
  REQUEST_STATUS,
  type Tone,
} from "@/lib/labels";
import type {
  AgentStatus,
  Availability,
  ClientStatus,
  ComplaintStatus,
  LedgerStatus,
  RequestStatus,
} from "@/lib/types";

/** Pill in one of the state tones. Use the typed wrappers below when you can. */
export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge variant={tone} className={className}>
      {children}
    </Badge>
  );
}

/** Request state ("Em consulta", "Pagamento pendente"…). `short` for tight rows. */
export function StatusBadge({
  status,
  short = false,
  className,
}: {
  status: RequestStatus;
  short?: boolean;
  className?: string;
}) {
  const s = REQUEST_STATUS[status];
  return (
    <ToneBadge tone={s.tone} className={className}>
      <span title={short ? s.label : undefined}>{short ? s.short : s.label}</span>
    </ToneBadge>
  );
}

export function AgentStatusBadge({ status, className }: { status: AgentStatus; className?: string }) {
  const s = AGENT_STATUS[status];
  return <ToneBadge tone={s.tone} className={className}>{s.label}</ToneBadge>;
}

export function ClientStatusBadge({ status, className }: { status: ClientStatus; className?: string }) {
  const s = CLIENT_STATUS[status];
  return <ToneBadge tone={s.tone} className={className}>{s.label}</ToneBadge>;
}

export function LedgerStatusBadge({ status, className }: { status: LedgerStatus; className?: string }) {
  const s = LEDGER_STATUS[status];
  return <ToneBadge tone={s.tone} className={className}>{s.label}</ToneBadge>;
}

export function ComplaintStatusBadge({
  status,
  className,
}: {
  status: ComplaintStatus;
  className?: string;
}) {
  const s = COMPLAINT_STATUS[status];
  return <ToneBadge tone={s.tone} className={className}>{s.label}</ToneBadge>;
}

export function AvailabilityBadge({
  availability,
  className,
}: {
  availability: Availability;
  className?: string;
}) {
  const s = AVAILABILITY[availability];
  return <ToneBadge tone={s.tone} className={className}>{s.label}</ToneBadge>;
}
