// Domain types for Melhor Preço (v2, CHANGES-v2.md). Dates are ISO 8601
// strings (serialisable to localStorage and, later, to a database). Money is
// integer Kwanzas (Kz). Percentages are integers 0-100.

export type Role = "cliente" | "agente" | "operador" | "admin";

export type ISODate = string;

export interface Surface {
  id: string; // "sf-shopping-popular"
  name: string; // "Shopping Popular"
  area: string; // "Camama"
  address: string;
  location: string; // human description / landmark
  active: boolean;
  createdAt: ISODate;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export type AgentStatus = "pendente" | "aprovado" | "activo" | "suspenso";

/** Bank account for withdrawals. `iban` is stored normalised ("AO06" + 21 digits, no spaces). */
export interface BankInfo {
  iban: string;
  holder: string; // account holder name
}

export interface Agent {
  id: string; // "ag-001"
  code: string; // "AG-001"
  name: string;
  phone: string;
  email?: string;
  photo?: string; // URL
  status: AgentStatus;
  surfaceIds: string[];
  bank?: BankInfo; // required before asking for a withdrawal
  joinedAt: ISODate;
  trainings: { title: string; at: ISODate }[];
  note?: string; // admin note (e.g. reason for suspension)
}

export type ClientStatus = "activo" | "suspenso";
export type ClientKind = "particular" | "empresa";

export interface CompanyInfo {
  name: string; // "Construções Muachissengue, Lda."
  nif: string; // normalised, no spaces
}

export interface Client {
  id: string; // "cl-001"
  kind: ClientKind;
  /** Person name. For "empresa" this is the responsible person. */
  name: string;
  company?: CompanyInfo; // present when kind === "empresa"
  phone: string; // primary contact
  email?: string; // recommended for empresa
  password: string; // mock only, never do this with a real backend
  status: ClientStatus;
  createdAt: ISODate;
}

export type OperatorStatus = "activo" | "inactivo";

/** Platform employee at the brand's info desk of one surface (CHANGES §3). */
export interface Operator {
  id: string; // "op-001"
  code: string; // "OP-001"
  name: string;
  phone: string;
  email?: string;
  surfaceId: string; // one surface; max one "activo" operator per surface
  baseSalary: number; // Kz per month, separate from commission
  status: OperatorStatus;
  joinedAt: ISODate;
  note?: string;
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

/** Flow order (CHANGES §11). */
export type RequestStatus =
  | "submetido"
  | "aguarda_atribuicao"
  | "agente_atribuido"
  | "em_consulta"
  | "resposta_submetida" // reference generated, payment pending
  | "pagamento_confirmado"
  | "concluido"
  | "cancelado";

/** Information only, no surcharge (CHANGES §1). */
export type Priority = "normal" | "urgente";

export type RequestKind = "simples" | "multiplo";

export type Category =
  | "electrodomesticos"
  | "telemoveis"
  | "electronica"
  | "roupa"
  | "calcado"
  | "materiais"
  | "mobiliario"
  | "alimentacao"
  | "beleza"
  | "outros";

export type Availability = "disponivel" | "poucas_unidades" | "esgotado" | "por_encomenda";

export interface ItemVariations {
  models?: string;
  colours?: string;
  sizes?: string;
}

/** One product asked for. Variations do not count as extra items. */
export interface RequestItem {
  id: string; // "MP-2026-00041-i1"
  category: Category;
  name: string; // name / description
  brand?: string; // brand / model
  characteristics?: string;
  variations?: ItemVariations;
  photo?: string; // reference photo, data URL or URL
}

/** One offer found by the agent for a given item (several per item allowed). */
export interface ResultItem {
  id: string;
  itemId: string; // RequestItem.id
  notFound: boolean; // "produto não encontrado" entry
  productName: string;
  brandModel?: string;
  price?: number; // Kz
  store?: string;
  location?: string; // inside the surface, "Pavilhão B, loja 14"
  availability?: Availability;
  variants?: string; // colours / sizes found
  photos: string[]; // URLs or data URLs
  observations?: string;
  at: ISODate; // automatic timestamp
}

/** Gross → taxes → net, frozen at creation with the pricing config of the time. */
export interface RequestAmounts {
  itemCount: number;
  unitPrice: number; // 1 000 (simples) or 800 (por item, múltiplo)
  gross: number; // what the client pays (taxes included)
  taxRate: number; // 0.14
  taxes: number; // gross - net
  net: number; // round(gross / (1 + taxRate))
}

/** Distribution of the net (CHANGES §4). `final` once the period closes. */
export interface RequestSplit {
  agent: number; // always 60% of net
  platform: number;
  operator: number;
  operatorPct: number; // 5 provisional/below, 10 met
  final: boolean;
}

export type ReferenceStatus = "pendente" | "paga" | "anulada";

/** Fictitious Multicaixa payment reference (demo values). */
export interface MulticaixaReference {
  entity: string; // 5 digits, demo "99999"
  reference: string; // 9 digits, no spaces
  amount: number; // = gross
  createdAt: ISODate;
  expiresAt: ISODate;
  status: ReferenceStatus; // "expirada" is derived (see isReferenceExpired)
  paidAt?: ISODate;
  confirmedBy?: "admin" | "demo";
  demo: true;
}

export interface AuditEvent {
  at: ISODate;
  actor: string; // display name ("Sistema" for automatic events)
  role: Role | "sistema";
  action: string; // short human sentence in pt-AO
  note?: string;
}

export interface ServiceRequest {
  id: string; // "MP-2026-00041"
  clientId: string;
  items: RequestItem[];
  surfaceId: string; // exactly one surface (CHANGES §2)
  priority: Priority;
  deadline?: ISODate;
  kind: RequestKind;
  amounts: RequestAmounts;
  split: RequestSplit;
  status: RequestStatus;
  agentId?: string;
  operatorId?: string; // operator of the surface (who distributes it)
  createdAt: ISODate;
  updatedAt: ISODate;
  acceptedAt?: ISODate;
  respondedAt?: ISODate;
  paidAt?: ISODate;
  completedAt?: ISODate;
  reference?: MulticaixaReference; // generated when results are submitted
  rejections: { agentId: string; reason: string; at: ISODate }[];
  cancelReason?: string;
  results: ResultItem[];
  timeline: AuditEvent[];
  flags: { late: boolean; incomplete: boolean };
}

/** Alias kept short for consumers: `Request` collides with the DOM global, so prefer `ServiceRequest`. */
export type MPRequest = ServiceRequest;

// ---------------------------------------------------------------------------
// Money: wallet, withdrawals, objectives
// ---------------------------------------------------------------------------

/** Agent credit: 60% of the net of one paid request. Id `${requestId}-ag`. */
export interface AgentEarning {
  id: string;
  agentId: string;
  requestId: string;
  net: number;
  amount: number;
  at: ISODate;
}

export type WithdrawalStatus = "pending" | "confirmed" | "rejected";

export interface Withdrawal {
  id: string; // "lv-001"
  agentId: string;
  amount: number;
  iban: string; // snapshot at request time, normalised
  holder: string;
  status: WithdrawalStatus;
  requestedAt: ISODate;
  confirmedAt?: ISODate;
  rejectedAt?: ISODate;
  transferRef?: string; // bank transfer reference (on confirm)
  reason?: string; // rejection reason
}

export type RevenueBasis = "net" | "gross";
export type ObjectiveStatus = "planned" | "running" | "closed";

export interface ObjectivePeriod {
  key: string; // "2026-10"
  label: string; // "Outubro 2026"
  startsAt: ISODate; // inclusive
  endsAt: ISODate; // exclusive
}

export interface ObjectiveCorrection {
  at: ISODate;
  actor: string;
  reason: string; // mandatory
  changes: string; // human summary "Meta: 5 000 Kz → 3 500 Kz"
}

export interface ObjectiveResult {
  revenue: number; // on `basis`
  gross: number;
  net: number;
  paidCount: number;
  met: boolean;
  operatorPct: number;
  commission: number; // Kz for the operator (sum of final operator shares)
  platform: number; // Kz kept by the platform (net - agents - commission)
  operatorId?: string;
  closedAt: ISODate;
}

/** Billing objective of one surface for one period (CHANGES §7). */
export interface Objective {
  id: string; // "obj-2026-10-sf-shopping-popular"
  surfaceId: string;
  period: ObjectivePeriod;
  revenueTarget: number; // Kz on `basis`
  paidRequestsTarget?: number; // optional criterion
  basis: RevenueBasis; // "net" by default
  pctBelow: number; // 5
  pctMet: number; // 10
  platformRetained: number; // pctMet - pctBelow (5)
  status: ObjectiveStatus; // stored; prefer objectiveStatus(obj, now) in UI
  corrections: ObjectiveCorrection[];
  result?: ObjectiveResult; // set on close
  createdAt: ISODate;
}

/** Global audit log entry (requests, finance, people, config). */
export interface AuditLogEntry extends AuditEvent {
  id: string;
  entity: "request" | "withdrawal" | "operator" | "objective" | "pricing" | "agent" | "client" | "surface";
  entityId: string;
}

export interface Notification {
  id: string;
  role: Role;
  userId?: string; // client / agent / operator id; undefined for admin broadcast
  requestId?: string;
  title: string;
  body: string;
  at: ISODate;
  read: boolean;
}

export type ComplaintStatus = "aberta" | "em_analise" | "resolvida";

export interface Complaint {
  id: string;
  requestId: string;
  clientId: string;
  reason: string;
  status: ComplaintStatus;
  createdAt: ISODate;
  resolvedAt?: ISODate;
  resolution?: string;
}

/** Split percentages of the net. Each column sums to 100. */
export interface SplitConfig {
  agent: number; // 60
  platformBelow: number; // 35
  operatorBelow: number; // 5
  platformMet: number; // 30
  operatorMet: number; // 10
}

export interface PricingConfig {
  simplePrice: number; // 1 000 Kz gross, 1 item
  multiItemPrice: number; // 800 Kz gross per item, 2+ items
  taxRate: number; // 0.14 (IVA), a confirmar com o Mauro
  split: SplitConfig;
}
