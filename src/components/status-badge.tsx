import { Badge } from "@/components/ui/badge";
import {
  AGENT_STATUS,
  AVAILABILITY,
  CLIENT_KIND,
  CLIENT_STATUS,
  COMPLAINT_STATUS,
  OBJECTIVE_STATUS,
  OPERATOR_STATUS,
  REFERENCE_STATUS,
  REQUEST_KIND,
  REQUEST_STATUS,
  WITHDRAWAL_STATUS,
  type Tone,
} from "@/lib/labels";
import type {
  AgentStatus,
  Availability,
  ClientKind,
  ClientStatus,
  ComplaintStatus,
  ObjectiveStatus,
  OperatorStatus,
  ReferenceStatus,
  RequestKind,
  RequestStatus,
  WithdrawalStatus,
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

export function WithdrawalStatusBadge({ status, className }: { status: WithdrawalStatus; className?: string }) {
  const s = WITHDRAWAL_STATUS[status];
  return <ToneBadge tone={s.tone} className={className}>{s.label}</ToneBadge>;
}

/** Pass `referenceDisplayStatus(ref)` from @/lib/finance so expiry shows. */
export function ReferenceStatusBadge({
  status,
  className,
}: {
  status: ReferenceStatus | "expirada";
  className?: string;
}) {
  const s = REFERENCE_STATUS[status];
  return <ToneBadge tone={s.tone} className={className}>{s.label}</ToneBadge>;
}

export function OperatorStatusBadge({ status, className }: { status: OperatorStatus; className?: string }) {
  const s = OPERATOR_STATUS[status];
  return <ToneBadge tone={s.tone} className={className}>{s.label}</ToneBadge>;
}

/** Pass `objectiveStatus(obj)` from @/lib/objectives (time-derived). */
export function ObjectiveStatusBadge({ status, className }: { status: ObjectiveStatus; className?: string }) {
  const s = OBJECTIVE_STATUS[status];
  return <ToneBadge tone={s.tone} className={className}>{s.label}</ToneBadge>;
}

export function RequestKindBadge({ kind, className }: { kind: RequestKind; className?: string }) {
  const s = REQUEST_KIND[kind];
  return <ToneBadge tone={s.tone} className={className}>{s.label}</ToneBadge>;
}

export function ClientKindBadge({ kind, className }: { kind: ClientKind; className?: string }) {
  return (
    <ToneBadge tone={kind === "empresa" ? "info" : "neutral"} className={className}>
      {CLIENT_KIND[kind].label}
    </ToneBadge>
  );
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
