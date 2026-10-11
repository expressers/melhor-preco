// Domain types for Melhor Preço. Dates are ISO 8601 strings (serialisable to
// localStorage and, later, to a database). Money is integer Kwanzas (Kz).

export type Role = "cliente" | "agente" | "admin";

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

export type AgentStatus = "pendente" | "aprovado" | "activo" | "suspenso";

export interface PaymentInfo {
  method: "multicaixa-express";
  phone: string; // Multicaixa Express number, "+244 923 456 789"
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
  paymentInfo: PaymentInfo;
  joinedAt: ISODate;
  trainings: { title: string; at: ISODate }[];
  note?: string; // admin note (e.g. reason for suspension)
}

export type ClientStatus = "activo" | "suspenso";

export interface Client {
  id: string; // "cl-001"
  name: string;
  phone: string; // primary contact
  email?: string;
  password: string; // mock only, never do this with a real backend
  status: ClientStatus;
  createdAt: ISODate;
}

/** The 8 states from BRIEF §3.1, in flow order. */
export type RequestStatus =
  | "submetido"
  | "aguarda_atribuicao"
  | "agente_atribuido"
  | "em_consulta"
  | "resposta_submetida"
  | "pagamento_confirmado"
  | "concluido"
  | "cancelado";

export type Priority = "normal" | "urgente";

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

export interface ResultItem {
  id: string;
  surfaceId: string;
  notFound: boolean; // "produto não encontrado" entry
  productName: string;
  brandModel?: string;
  price?: number; // Kz
  store?: string;
  location?: string; // location inside the surface, "Pavilhão B, loja 14"
  availability?: Availability;
  variants?: string; // colours / sizes found
  photos: string[]; // URLs or data URLs
  observations?: string;
  at: ISODate; // automatic timestamp
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
  category: Category;
  description: string; // product name / description
  brand?: string;
  features?: string;
  variants?: string;
  photo?: string; // reference photo, data URL or URL
  surfaceIds: string[];
  priority: Priority;
  deadline?: ISODate;
  price: number; // total paid by client
  agentShare: number;
  platformShare: number;
  status: RequestStatus;
  agentId?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  respondedAt?: ISODate;
  paidAt?: ISODate;
  rejections: { agentId: string; reason: string; at: ISODate }[];
  cancelReason?: string;
  results: ResultItem[];
  timeline: AuditEvent[];
  flags: { late: boolean; incomplete: boolean };
}

/** Alias kept short for consumers: `Request` collides with the DOM global, so prefer `ServiceRequest`. */
export type MPRequest = ServiceRequest;

export type LedgerKind = "agent_share" | "platform_commission";
export type LedgerStatus = "devido" | "confirmado" | "liquidado";

/**
 * One row per money obligation.
 * - agent_share: created "devido" when the answer is submitted; "confirmado" when the agent confirms receipt.
 * - platform_commission: created "devido" when the agent confirms payment; "liquidado" when admin settles it.
 */
export interface LedgerEntry {
  id: string;
  requestId: string;
  agentId: string;
  kind: LedgerKind;
  amount: number;
  status: LedgerStatus;
  createdAt: ISODate;
  confirmedAt?: ISODate;
  settledAt?: ISODate;
}

export interface Notification {
  id: string;
  role: Role;
  userId?: string; // client or agent id; undefined for admin broadcast
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

export interface PricingConfig {
  minimum: number; // 600, never lower
  agentShare: number; // 400
  platformShare: number; // 200
  extraSurfaceIncrement: number; // per surface beyond the first
  extraSurfaceAgentShare: number; // part of the increment that goes to the agent
  urgentIncrement: number; // added when priority is "urgente"
}
