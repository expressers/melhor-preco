import type {
  AgentStatus,
  Availability,
  Category,
  ClientKind,
  ClientStatus,
  ComplaintStatus,
  ObjectiveStatus,
  OperatorStatus,
  Priority,
  ReferenceStatus,
  RequestKind,
  RequestStatus,
  RevenueBasis,
  Role,
  WithdrawalStatus,
} from "./types";

/** Badge tones map 1:1 to Badge variants in components/ui/badge.tsx. */
export type Tone = "neutral" | "info" | "warning" | "success" | "error" | "tag" | "default";

export const REQUEST_STATUS_ORDER: RequestStatus[] = [
  "submetido",
  "aguarda_atribuicao",
  "agente_atribuido",
  "em_consulta",
  "resposta_submetida",
  "pagamento_confirmado",
  "concluido",
  "cancelado",
];

export const REQUEST_STATUS: Record<RequestStatus, { label: string; short: string; tone: Tone }> = {
  submetido: { label: "Pedido submetido", short: "Submetido", tone: "neutral" },
  aguarda_atribuicao: { label: "A aguardar atribuição pelo operador", short: "Em fila", tone: "neutral" },
  agente_atribuido: { label: "Agente atribuído", short: "Atribuído", tone: "info" },
  em_consulta: { label: "Em consulta", short: "Em consulta", tone: "info" },
  resposta_submetida: {
    label: "Resposta submetida, pagamento pendente",
    short: "Pagamento pendente",
    tone: "warning",
  },
  pagamento_confirmado: { label: "Pagamento confirmado", short: "Pago", tone: "success" },
  concluido: { label: "Consulta concluída", short: "Concluída", tone: "success" },
  cancelado: { label: "Cancelado", short: "Cancelado", tone: "error" },
};

/** Statuses in which a request is still open (not finished nor cancelled). */
export const OPEN_STATUSES: RequestStatus[] = [
  "submetido",
  "aguarda_atribuicao",
  "agente_atribuido",
  "em_consulta",
  "resposta_submetida",
];

/** Statuses in which full results are unlocked for the client. */
export const UNLOCKED_STATUSES: RequestStatus[] = ["pagamento_confirmado", "concluido"];

export const AGENT_STATUS: Record<AgentStatus, { label: string; tone: Tone }> = {
  pendente: { label: "Pendente de aprovação", tone: "warning" },
  aprovado: { label: "Aprovado, por activar", tone: "info" },
  activo: { label: "Activo", tone: "success" },
  suspenso: { label: "Suspenso", tone: "error" },
};

export const CLIENT_STATUS: Record<ClientStatus, { label: string; tone: Tone }> = {
  activo: { label: "Activo", tone: "success" },
  suspenso: { label: "Suspenso", tone: "error" },
};

export const CLIENT_KIND: Record<ClientKind, { label: string; hint: string }> = {
  particular: { label: "Particular", hint: "Para si ou para a sua casa" },
  empresa: { label: "Empresa", hint: "Compras da empresa, comparação de fornecedores" },
};

export const REQUEST_KIND: Record<RequestKind, { label: string; tone: Tone }> = {
  simples: { label: "Pedido simples", tone: "neutral" },
  multiplo: { label: "Pedido múltiplo", tone: "tag" },
};

export const OPERATOR_STATUS: Record<OperatorStatus, { label: string; tone: Tone }> = {
  activo: { label: "Activo", tone: "success" },
  inactivo: { label: "Inactivo", tone: "neutral" },
};

export const AGENT_AVAILABILITY: Record<"disponivel" | "em_consulta", { label: string; tone: Tone }> = {
  disponivel: { label: "Disponível", tone: "success" },
  em_consulta: { label: "Em consulta", tone: "info" },
};

export const WITHDRAWAL_STATUS: Record<WithdrawalStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pendente", tone: "warning" },
  confirmed: { label: "Transferido", tone: "success" },
  rejected: { label: "Rejeitado", tone: "error" },
};

export const REFERENCE_STATUS: Record<ReferenceStatus | "expirada", { label: string; tone: Tone }> = {
  pendente: { label: "Por pagar", tone: "warning" },
  paga: { label: "Paga", tone: "success" },
  anulada: { label: "Anulada", tone: "neutral" },
  expirada: { label: "Expirada", tone: "error" },
};

export const OBJECTIVE_STATUS: Record<ObjectiveStatus, { label: string; tone: Tone }> = {
  planned: { label: "Planeado", tone: "neutral" },
  running: { label: "Em curso", tone: "info" },
  closed: { label: "Fechado", tone: "success" },
};

export const REVENUE_BASIS: Record<RevenueBasis, { label: string; hint: string }> = {
  net: { label: "Facturação líquida", hint: "Bruto menos impostos e taxas (por defeito)" },
  gross: { label: "Facturação bruta", hint: "O que os clientes pagaram" },
};

/** Split recipients, as in Mauro's table. */
export const SPLIT_LABEL = {
  agent: "Agente de consulta",
  platform: "Plataforma",
  operator: "Operador da superfície",
} as const;

export const COMPLAINT_STATUS: Record<ComplaintStatus, { label: string; tone: Tone }> = {
  aberta: { label: "Aberta", tone: "error" },
  em_analise: { label: "Em análise", tone: "warning" },
  resolvida: { label: "Resolvida", tone: "success" },
};

export const AVAILABILITY: Record<Availability, { label: string; tone: Tone }> = {
  disponivel: { label: "Disponível", tone: "success" },
  poucas_unidades: { label: "Poucas unidades", tone: "warning" },
  esgotado: { label: "Esgotado", tone: "error" },
  por_encomenda: { label: "Por encomenda", tone: "info" },
};

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "electrodomesticos", label: "Electrodomésticos" },
  { value: "telemoveis", label: "Telemóveis e tablets" },
  { value: "electronica", label: "Electrónica e TV" },
  { value: "roupa", label: "Roupa" },
  { value: "calcado", label: "Calçado" },
  { value: "materiais", label: "Materiais de construção" },
  { value: "mobiliario", label: "Mobiliário e casa" },
  { value: "alimentacao", label: "Alimentação e bebidas" },
  { value: "beleza", label: "Beleza e higiene" },
  { value: "outros", label: "Outros" },
];

export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
) as Record<Category, string>;

export const PRIORITY: Record<Priority, { label: string; hint: string }> = {
  normal: { label: "Normal", hint: "Resposta em até 24 horas" },
  urgente: { label: "Urgente", hint: "Resposta no próprio dia, sem custo adicional" },
};

export const ROLE: Record<Role, { label: string; home: string }> = {
  cliente: { label: "Cliente", home: "/cliente" },
  agente: { label: "Agente", home: "/agente" },
  operador: { label: "Operador", home: "/operador" },
  admin: { label: "Admin", home: "/admin" },
};
