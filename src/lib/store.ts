// Client-side state (import only from "use client" components) for the static
// MVP. Seeded from the data layer (mocks), persisted to localStorage, and the
// single place where business rules (BRIEF §5, CHANGES-v2) mutate data.
// Every action appends to the global audit log (and, for requests, to the
// request timeline) and emits in-app notifications.
//
// Actions return `ActionResult`: `{ ok: true, ... }` or `{ ok: false, error }`
// with a pt-AO message ready for a toast.

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { getSeed, type SeedState } from "./data";
import {
  formatIban,
  formatReference,
  generateReference,
  isReferenceExpired,
  isValidIban,
  isValidNif,
  normalizeIban,
  normalizeNif,
} from "./finance";
import { formatKz } from "./format";
import { REQUEST_STATUS } from "./labels";
import { ADMIN_NAME } from "./mock";
import {
  evaluateObjective,
  isObjectiveLocked,
  isPeriodOver,
  monthPeriod,
  objectiveStatus,
  paidRequestsInPeriod,
  validateObjective,
  type ObjectiveEvaluation,
} from "./objectives";
import { quoteFor, splitNet, validatePricing, type PriceQuote } from "./pricing";
import {
  activeOperatorFor,
  agentAvailability,
  agentServesSurface,
  computeIncomplete,
  isAgentEligible,
  nextRequestId,
  nextSeqId,
  requestTitle,
  type AgentAvailability,
} from "./rules";
import type {
  Agent,
  AgentEarning,
  AuditEvent,
  AuditLogEntry,
  BankInfo,
  Category,
  Client,
  ClientKind,
  ComplaintStatus,
  ItemVariations,
  Notification,
  Objective,
  Operator,
  OperatorStatus,
  Priority,
  PricingConfig,
  RequestItem,
  RequestStatus,
  ResultItem,
  RevenueBasis,
  Role,
  ServiceRequest,
  Surface,
  Withdrawal,
} from "./types";
import { computeWallet, canWithdraw, type WalletSummary, type WithdrawCheck } from "./wallet";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface Session {
  viewAs: Role;
  currentClientId: string | null;
  currentAgentId: string | null;
  currentOperatorId: string | null;
}

export interface NewItemInput {
  category: Category;
  name: string;
  brand?: string;
  characteristics?: string;
  variations?: ItemVariations;
  photo?: string; // data URL from a local file preview
}

export interface NewRequestInput {
  items: NewItemInput[];
  surfaceId: string;
  priority: Priority;
  deadline?: string;
  clientId?: string; // defaults to session.currentClientId
}

/** What the agent fills per offer. `id` and `at` are set automatically. */
export type ResultInput = Omit<ResultItem, "id" | "at" | "photos"> & { photos?: string[] };

export interface NewClientInput {
  kind: ClientKind;
  name: string; // person (responsible, for empresa)
  phone: string;
  password: string;
  email?: string;
  company?: { name: string; nif: string }; // required when kind === "empresa"
}

export interface NewAgentInput {
  name: string;
  phone: string;
  email?: string;
  photo?: string;
  surfaceIds: string[];
  bank?: BankInfo;
}

export interface OperatorInput {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  surfaceId: string;
  baseSalary: number;
  status: OperatorStatus;
  note?: string;
}

export interface ObjectiveInput {
  id?: string;
  surfaceId: string;
  periodKey: string; // "2026-11" (monthly period, Luanda time)
  revenueTarget: number;
  paidRequestsTarget?: number;
  basis: RevenueBasis;
  pctBelow: number;
  pctMet: number;
}

export interface StoreState extends SeedState {
  session: Session;
}

export interface StoreActions {
  // Demo / session
  reset: () => void; // keeps session.viewAs
  setViewAs: (role: Role) => void;
  setCurrentClient: (id: string | null) => void;
  setCurrentAgent: (id: string | null) => void;
  setCurrentOperator: (id: string | null) => void;
  registerClient: (input: NewClientInput) => ActionResult<{ client: Client }>;
  login: (phone: string, password: string) => ActionResult<{ client: Client }>;
  logout: () => void;

  // Pricing
  quote: (itemCount: number) => PriceQuote;
  updatePricing: (config: PricingConfig) => ActionResult<{ pricing: PricingConfig }>;

  // Requests: client
  createRequest: (input: NewRequestInput) => ActionResult<{ request: ServiceRequest }>;
  cancelRequest: (id: string, reason: string, by?: "cliente" | "admin") => ActionResult;
  completeRequest: (id: string) => ActionResult;
  createComplaint: (requestId: string, reason: string) => ActionResult<{ id: string }>;

  // Requests: operator (own surface) or admin (any)
  assignAgent: (requestId: string, agentId: string, by?: "operador" | "admin") => ActionResult;
  updateStatus: (requestId: string, status: RequestStatus, note?: string) => ActionResult;
  setComplaintStatus: (id: string, status: ComplaintStatus, resolution?: string) => ActionResult;

  // Requests: agent (agentId defaults to session.currentAgentId)
  acceptRequest: (requestId: string, agentId?: string) => ActionResult;
  startConsultation: (requestId: string, agentId?: string) => ActionResult;
  rejectRequest: (requestId: string, reason: string, agentId?: string) => ActionResult;
  submitResults: (requestId: string, results: ResultInput[], agentId?: string) => ActionResult;

  // Payment by Multicaixa reference (platform confirms)
  confirmReferencePayment: (requestId: string, via?: "admin" | "demo") => ActionResult;
  regenerateReference: (requestId: string) => ActionResult;

  // Wallet / withdrawals
  updateAgentBank: (agentId: string, bank: BankInfo) => ActionResult;
  requestWithdrawal: (amount: number, agentId?: string) => ActionResult<{ withdrawal: Withdrawal }>;
  confirmWithdrawal: (id: string, transferRef: string) => ActionResult;
  rejectWithdrawal: (id: string, reason: string) => ActionResult;

  // Operators
  upsertOperator: (input: OperatorInput) => ActionResult<{ operator: Operator }>;
  setOperatorStatus: (id: string, status: OperatorStatus) => ActionResult;

  // Objectives
  upsertObjective: (input: ObjectiveInput, reason?: string) => ActionResult<{ objective: Objective }>;
  deleteObjective: (id: string) => ActionResult;
  closeObjective: (id: string, opts?: { early?: boolean }) => ActionResult<{ objective: Objective }>;
  closePeriod: (periodKey: string, opts?: { early?: boolean }) => ActionResult<{ closed: number }>;

  // People
  suspendClient: (id: string, reason?: string) => ActionResult;
  reactivateClient: (id: string) => ActionResult;
  registerAgent: (input: NewAgentInput) => ActionResult<{ agent: Agent }>;
  approveAgent: (id: string) => ActionResult;
  activateAgent: (id: string) => ActionResult;
  suspendAgent: (id: string, reason?: string) => ActionResult;
  setAgentSurfaces: (id: string, surfaceIds: string[]) => ActionResult;
  addAgentTraining: (id: string, title: string) => ActionResult;

  // Surfaces
  upsertSurface: (
    surface: Omit<Surface, "id" | "createdAt"> & { id?: string },
  ) => ActionResult<{ surface: Surface }>;
  setSurfaceActive: (id: string, active: boolean) => ActionResult;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (role: Role, userId?: string) => void;
}

export type Store = StoreState & StoreActions;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = () => new Date().toISOString();
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const fail = (error: string) => ({ ok: false as const, error });
const digits = (s: string) => s.replace(/\D/g, "").replace(/^244/, "");
const PAID: RequestStatus[] = ["pagamento_confirmado", "concluido"];

/** localStorage that never throws (private mode, quota, SSR). */
const memory = new Map<string, string>();
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return memory.get(k) ?? null;
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      memory.set(k, v);
    }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      memory.delete(k);
    }
  },
};

export const DEFAULT_SESSION: Session = {
  viewAs: "cliente",
  currentClientId: "cl-001",
  currentAgentId: "ag-001",
  currentOperatorId: "op-001",
};

function initialState(): StoreState {
  return { ...getSeed(), session: { ...DEFAULT_SESSION } };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const STORE_KEY = "melhor-preco:v2";

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      // --- internal helpers (closures over set/get) -----------------------
      const actorFor = (role: Role | "sistema", id?: string): string => {
        const s = get();
        if (role === "admin") return ADMIN_NAME;
        if (role === "sistema") return "Sistema";
        if (role === "agente") {
          const aid = id ?? s.session.currentAgentId;
          return s.agents.find((a) => a.id === aid)?.name ?? "Agente";
        }
        if (role === "operador") {
          const oid = id ?? s.session.currentOperatorId;
          return s.operators.find((o) => o.id === oid)?.name ?? "Operador";
        }
        return s.clients.find((c) => c.id === (id ?? s.session.currentClientId))?.name ?? "Cliente";
      };

      const event = (role: AuditEvent["role"], action: string, note?: string, actor?: string): AuditEvent => ({
        at: now(),
        actor: actor ?? actorFor(role),
        role,
        action,
        note,
      });

      const notify = (n: Omit<Notification, "id" | "at" | "read">): Notification => ({
        ...n,
        id: uid("nt"),
        at: now(),
        read: false,
      });

      const auditRows = (entity: AuditLogEntry["entity"], entityId: string, events: AuditEvent[]): AuditLogEntry[] =>
        events.map((e) => ({ ...e, id: uid("au"), entity, entityId }));

      /** Appends to the global audit log + notifications (newest notifications first). */
      const log = (
        entity: AuditLogEntry["entity"],
        entityId: string,
        events: AuditEvent[],
        notifications: Notification[] = [],
      ) =>
        set((s) => ({
          audit: [...s.audit, ...auditRows(entity, entityId, events)],
          notifications: [...notifications, ...s.notifications],
        }));

      /** Immutable update of one request + timeline + audit + optional extra state. */
      const patchRequest = (
        id: string,
        fn: (r: ServiceRequest) => Partial<ServiceRequest>,
        events: AuditEvent[],
        extra: (s: StoreState) => Partial<StoreState> = () => ({}),
        notifications: Notification[] = [],
      ) =>
        set((s) => {
          const ex = extra(s);
          return {
            ...ex,
            requests: s.requests.map((r) =>
              r.id === id ? { ...r, ...fn(r), timeline: [...r.timeline, ...events], updatedAt: now() } : r,
            ),
            audit: [...s.audit, ...auditRows("request", id, events)],
            notifications: [...notifications, ...(ex.notifications ?? s.notifications)],
          };
        });

      const findRequest = (id: string) => get().requests.find((r) => r.id === id);
      const findAgent = (id: string | null | undefined) => (id ? get().agents.find((a) => a.id === id) : undefined);
      const findOperator = (id: string | null | undefined) =>
        id ? get().operators.find((o) => o.id === id) : undefined;
      const surfaceName = (id: string) => get().surfaces.find((s) => s.id === id)?.name ?? id;

      const patchAgent = (id: string, patch: Partial<Agent>, action?: string, note?: string): ActionResult => {
        if (!findAgent(id)) return fail("Agente não encontrado.");
        set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
        if (action) log("agent", id, [event(get().session.viewAs === "agente" ? "agente" : "admin", action, note)]);
        return { ok: true };
      };

      const agentOwns = (r: ServiceRequest, agentId?: string) => {
        const agent = findAgent(agentId ?? get().session.currentAgentId);
        if (!agent || r.agentId !== agent.id) return fail("Este pedido não está atribuído a si.");
        if (!isAgentEligible(agent)) return fail("A sua conta não está activa para executar pedidos.");
        return { ok: true as const, agent };
      };

      const operatorNotice = (surfaceId: string, n: Omit<Notification, "id" | "at" | "read" | "role" | "userId">) => {
        const op = activeOperatorFor(surfaceId, get().operators);
        return op ? [notify({ ...n, role: "operador", userId: op.id })] : [];
      };

      /** Evaluates and closes one objective against the current requests. Also re-closes after a correction. */
      const doClose = (o: Objective, actor: AuditEvent): Objective => {
        const s = get();
        const e = evaluateObjective(o, s.requests, s.pricing.split);
        const op = activeOperatorFor(o.surfaceId, s.operators);
        const closed: Objective = {
          ...o,
          status: "closed",
          result: {
            revenue: e.revenue,
            gross: e.gross,
            net: e.net,
            paidCount: e.paidCount,
            met: e.met,
            operatorPct: e.operatorPct,
            commission: e.commission,
            platform: e.platform,
            operatorId: o.result?.operatorId ?? op?.id,
            closedAt: now(),
          },
        };
        const ids = new Set(paidRequestsInPeriod(s.requests, o.surfaceId, o.period).map((r) => r.id));
        const ev: AuditEvent = {
          ...actor,
          action: `Período ${o.period.label} fechado em ${surfaceName(o.surfaceId)}: objectivo ${e.met ? "cumprido" : "não cumprido"}`,
          note: `Facturação ${formatKz(e.revenue)} de ${formatKz(o.revenueTarget)}; comissão do operador ${formatKz(e.commission)} (${e.operatorPct}%)`,
        };
        set((st) => ({
          objectives: st.objectives.map((x) => (x.id === o.id ? closed : x)),
          requests: st.requests.map((r) =>
            ids.has(r.id)
              ? {
                  ...r,
                  split: { ...splitNet(r.amounts.net, st.pricing.split.agent, e.operatorPct), operatorPct: e.operatorPct, final: true },
                }
              : r,
          ),
        }));
        log("objective", o.id, [ev], [
          ...(closed.result?.operatorId
            ? [
                notify({
                  role: "operador",
                  userId: closed.result.operatorId,
                  title: e.met ? "Objectivo cumprido" : "Período fechado",
                  body: `${o.period.label}: comissão de ${formatKz(e.commission)} (${e.operatorPct}%).`,
                }),
              ]
            : []),
        ]);
        return closed;
      };

      return {
        ...initialState(),

        // --- Demo / session -----------------------------------------------
        reset: () => {
          const viewAs = get().session.viewAs;
          const fresh = initialState();
          set({ ...fresh, session: { ...fresh.session, viewAs } });
        },
        setViewAs: (role) => set((s) => ({ session: { ...s.session, viewAs: role } })),
        setCurrentClient: (id) => set((s) => ({ session: { ...s.session, currentClientId: id } })),
        setCurrentAgent: (id) => set((s) => ({ session: { ...s.session, currentAgentId: id } })),
        setCurrentOperator: (id) => set((s) => ({ session: { ...s.session, currentOperatorId: id } })),

        registerClient: (input) => {
          const name = input.name.trim();
          if (name.length < 3)
            return fail(input.kind === "empresa" ? "Indique o nome do responsável." : "Indique o seu nome.");
          if (digits(input.phone).length !== 9) return fail("O telefone deve ter 9 dígitos.");
          if (input.password.length < 6) return fail("A palavra-passe precisa de 6 caracteres ou mais.");
          let company: Client["company"];
          if (input.kind === "empresa") {
            if (!input.company || input.company.name.trim().length < 2) return fail("Indique o nome da empresa.");
            if (!isValidNif(input.company.nif)) return fail("Indique um NIF válido (9 a 14 caracteres).");
            company = { name: input.company.name.trim(), nif: normalizeNif(input.company.nif) };
          }
          if (input.email?.trim() && !/^\S+@\S+\.\S+$/.test(input.email.trim())) return fail("O e-mail não parece válido.");
          if (get().clients.some((c) => digits(c.phone) === digits(input.phone)))
            return fail("Já existe uma conta com este telefone. Entre com a sua palavra-passe.");
          const client: Client = {
            id: uid("cl"),
            kind: input.kind,
            name,
            company,
            phone: input.phone.trim(),
            email: input.email?.trim() || undefined,
            password: input.password,
            status: "activo",
            createdAt: now(),
          };
          set((s) => ({
            clients: [...s.clients, client],
            session: { ...s.session, currentClientId: client.id, viewAs: "cliente" },
          }));
          log("client", client.id, [
            event("cliente", input.kind === "empresa" ? "Conta de empresa criada" : "Conta de particular criada", company?.name, name),
          ]);
          return { ok: true, client };
        },

        login: (phone, password) => {
          const client = get().clients.find((c) => digits(c.phone) === digits(phone));
          if (!client || client.password !== password) return fail("Telefone ou palavra-passe incorrectos.");
          if (client.status === "suspenso") return fail("Esta conta está suspensa. Contacte o apoio Melhor Preço.");
          set((s) => ({ session: { ...s.session, currentClientId: client.id, viewAs: "cliente" } }));
          return { ok: true, client };
        },

        logout: () => set((s) => ({ session: { ...s.session, currentClientId: null } })),

        // --- Pricing --------------------------------------------------------
        quote: (itemCount) => quoteFor(Math.max(1, itemCount), get().pricing),

        updatePricing: (config) => {
          const pricing: PricingConfig = {
            simplePrice: Math.round(config.simplePrice),
            multiItemPrice: Math.round(config.multiItemPrice),
            taxRate: config.taxRate,
            split: { ...config.split },
          };
          const errors = validatePricing(pricing);
          if (errors.length) return fail(errors[0]);
          const old = get().pricing;
          set({ pricing });
          log("pricing", "pricing", [
            event(
              "admin",
              "Configuração de preços actualizada",
              `Simples ${formatKz(old.simplePrice)} → ${formatKz(pricing.simplePrice)}; por item ${formatKz(old.multiItemPrice)} → ${formatKz(pricing.multiItemPrice)}; taxa ${Math.round(old.taxRate * 100)}% → ${Math.round(pricing.taxRate * 100)}%; repartição ${pricing.split.agent}/${pricing.split.platformBelow}/${pricing.split.operatorBelow} e ${pricing.split.agent}/${pricing.split.platformMet}/${pricing.split.operatorMet}`,
            ),
          ]);
          return { ok: true, pricing };
        },

        // --- Client ---------------------------------------------------------
        createRequest: (input) => {
          const s = get();
          const clientId = input.clientId ?? s.session.currentClientId;
          const client = s.clients.find((c) => c.id === clientId);
          if (!client) return fail("Entre na sua conta para fazer uma consulta.");
          if (client.status === "suspenso") return fail("A sua conta está suspensa.");
          if (input.items.length === 0) return fail("Adicione pelo menos um item.");
          const bad = input.items.findIndex((it) => it.name.trim().length < 3);
          if (bad >= 0) return fail(`Descreva o produto do item ${bad + 1}.`);
          const surface = s.surfaces.find((x) => x.id === input.surfaceId);
          if (!surface) return fail("Escolha a superfície comercial.");
          if (!surface.active) return fail("A superfície escolhida não está activa.");

          const id = nextRequestId(s.requests);
          const q = quoteFor(input.items.length, s.pricing);
          const at = now();
          const opt = (v?: string) => v?.trim() || undefined;
          const items: RequestItem[] = input.items.map((it, i) => {
            const variations = it.variations && {
              models: opt(it.variations.models),
              colours: opt(it.variations.colours),
              sizes: opt(it.variations.sizes),
            };
            return {
              id: `${id}-i${i + 1}`,
              category: it.category,
              name: it.name.trim(),
              brand: opt(it.brand),
              characteristics: opt(it.characteristics),
              variations: variations && Object.values(variations).some(Boolean) ? variations : undefined,
              photo: it.photo,
            };
          });
          const operator = activeOperatorFor(surface.id, s.operators);
          const events: AuditEvent[] = [
            { at, actor: client.name, role: "cliente", action: "Pedido submetido", note: `${q.label}: ${q.breakdown} = ${formatKz(q.gross)}` },
            { at, actor: "Sistema", role: "sistema", action: "Pedido em fila para atribuição pelo operador", note: operator?.name },
          ];
          const request: ServiceRequest = {
            id,
            clientId: client.id,
            items,
            surfaceId: surface.id,
            priority: input.priority,
            deadline: input.deadline,
            kind: q.kind,
            amounts: { itemCount: q.itemCount, unitPrice: q.unitPrice, gross: q.gross, taxRate: q.taxRate, taxes: q.taxes, net: q.net },
            split: q.split,
            status: "aguarda_atribuicao",
            operatorId: operator?.id,
            createdAt: at,
            updatedAt: at,
            rejections: [],
            results: [],
            timeline: events,
            flags: { late: false, incomplete: false },
          };
          set((st) => ({ requests: [request, ...st.requests] }));
          log("request", id, events, [
            notify({
              role: "cliente",
              userId: client.id,
              requestId: id,
              title: "Pedido submetido",
              body: `Recebemos o pedido ${id} (${q.label}, ${formatKz(q.gross)}). O operador do ${surface.name} vai atribuí-lo a um agente.`,
            }),
            ...operatorNotice(surface.id, {
              requestId: id,
              title: "Novo pedido por atribuir",
              body: `${id}: ${requestTitle(request)} (${q.label}).`,
            }),
            notify({ role: "admin", requestId: id, title: "Novo pedido submetido", body: `${id}: ${requestTitle(request)}, ${surface.name}.` }),
          ]);
          return { ok: true, request };
        },

        cancelRequest: (id, reason, by = "cliente") => {
          const r = findRequest(id);
          if (!r) return fail("Pedido não encontrado.");
          if (!reason.trim()) return fail("Indique o motivo do cancelamento.");
          if (r.status === "cancelado") return fail("Este pedido já foi cancelado.");
          const clientAllowed: RequestStatus[] = ["submetido", "aguarda_atribuicao", "agente_atribuido"];
          const adminAllowed: RequestStatus[] = [...clientAllowed, "em_consulta", "resposta_submetida"];
          if (!(by === "cliente" ? clientAllowed : adminAllowed).includes(r.status))
            return fail(
              by === "cliente"
                ? "Já não é possível cancelar: o agente está no terreno ou já respondeu."
                : "Não é possível cancelar um pedido já pago ou concluído.",
            );
          const n: Notification[] = [
            notify({ role: "cliente", userId: r.clientId, requestId: id, title: "Pedido cancelado", body: `O pedido ${id} foi cancelado. Motivo: ${reason.trim()}` }),
            ...operatorNotice(r.surfaceId, { requestId: id, title: "Pedido cancelado", body: `${id} foi cancelado.` }),
          ];
          if (r.agentId)
            n.push(notify({ role: "agente", userId: r.agentId, requestId: id, title: "Pedido cancelado", body: `O pedido ${id} foi cancelado. Não é preciso continuar.` }));
          patchRequest(
            id,
            (x) => ({
              status: "cancelado",
              cancelReason: reason.trim(),
              reference: x.reference ? { ...x.reference, status: "anulada" } : undefined,
            }),
            [event(by, "Pedido cancelado", reason.trim()), ...(r.reference ? [event("sistema", "Referência Multicaixa anulada")] : [])],
            undefined,
            n,
          );
          return { ok: true };
        },

        completeRequest: (id) => {
          const r = findRequest(id);
          if (!r) return fail("Pedido não encontrado.");
          if (r.status === "concluido") return { ok: true };
          if (r.status !== "pagamento_confirmado") return fail("Só se conclui um pedido depois de o pagamento ser confirmado.");
          patchRequest(id, () => ({ status: "concluido", completedAt: now() }), [event("cliente", "Consulta concluída", undefined, actorFor("cliente", r.clientId))]);
          return { ok: true };
        },

        createComplaint: (requestId, reason) => {
          const r = findRequest(requestId);
          if (!r) return fail("Pedido não encontrado.");
          if (reason.trim().length < 10) return fail("Explique o problema em pelo menos uma frase.");
          const id = uid("rc");
          set((s) => ({
            complaints: [{ id, requestId, clientId: r.clientId, reason: reason.trim(), status: "aberta", createdAt: now() }, ...s.complaints],
          }));
          patchRequest(requestId, () => ({}), [event("cliente", "Reclamação aberta", reason.trim())], undefined, [
            notify({ role: "admin", requestId, title: "Nova reclamação", body: `${requestId}: ${reason.trim()}` }),
          ]);
          return { ok: true, id };
        },

        // --- Operator / admin ---------------------------------------------
        assignAgent: (requestId, agentId, by) => {
          const s = get();
          const role = by ?? (s.session.viewAs === "operador" ? "operador" : "admin");
          const r = findRequest(requestId);
          const agent = findAgent(agentId);
          if (!r) return fail("Pedido não encontrado.");
          if (!isAgentEligible(agent)) return fail("Só agentes aprovados e activos podem receber pedidos.");
          if (!["submetido", "aguarda_atribuicao", "agente_atribuido", "em_consulta"].includes(r.status))
            return fail("Este pedido já não pode ser atribuído.");
          let actor = ADMIN_NAME;
          if (role === "operador") {
            const op = findOperator(s.session.currentOperatorId);
            if (!op || op.status !== "activo") return fail("Não há um operador activo nesta sessão.");
            if (op.surfaceId !== r.surfaceId) return fail("Este pedido é de outra superfície.");
            if (!agentServesSurface(agent, r.surfaceId)) return fail(`${agent.code} não trabalha no ${surfaceName(r.surfaceId)}.`);
            actor = op.name;
          }
          if (r.agentId === agent.id) return fail(`O pedido já está com ${agent.code}.`);
          const previous = r.agentId;
          const n = [
            notify({ role: "agente", userId: agent.id, requestId, title: "Novo pedido atribuído", body: `${requestId}: ${requestTitle(r)}. Aceite ou rejeite.` }),
            notify({ role: "cliente", userId: r.clientId, requestId, title: "Agente atribuído", body: `O agente ${agent.code} vai tratar do pedido ${requestId}.` }),
          ];
          if (previous)
            n.push(notify({ role: "agente", userId: previous, requestId, title: "Pedido reatribuído", body: `O pedido ${requestId} passou para outro agente.` }));
          patchRequest(
            requestId,
            () => ({ agentId: agent.id, status: "agente_atribuido", acceptedAt: undefined }),
            [event(role, previous ? `Pedido reatribuído ao agente ${agent.code}` : `Agente ${agent.code} atribuído`, agent.name, actor)],
            undefined,
            n,
          );
          return { ok: true };
        },

        updateStatus: (requestId, status, note) => {
          const r = findRequest(requestId);
          if (!r) return fail("Pedido não encontrado.");
          if (status === "pagamento_confirmado") return fail("Confirme o pagamento pela referência Multicaixa (Financeiro → Pagamentos).");
          if (status === "concluido") return get().completeRequest(requestId);
          if (status === "resposta_submetida") return fail("A resposta é submetida pelo agente.");
          if (status === "cancelado") return get().cancelRequest(requestId, note ?? "Cancelado pela administração", "admin");
          if (["agente_atribuido", "em_consulta"].includes(status) && !r.agentId) return fail("Atribua primeiro um agente.");
          // "Devolver ao agente": an unpaid answer goes back to em_consulta and its reference is annulled.
          if (r.status === "resposta_submetida" && status === "em_consulta") {
            patchRequest(
              requestId,
              (x) => ({ status: "em_consulta", reference: x.reference ? { ...x.reference, status: "anulada" } : undefined }),
              [event("admin", "Resposta devolvida ao agente", note), event("sistema", "Referência Multicaixa anulada")],
              undefined,
              [
                notify({ role: "cliente", userId: r.clientId, requestId, title: "Resposta em revisão", body: `A resposta do pedido ${requestId} voltou ao agente para correcção. A referência anterior foi anulada.` }),
                ...(r.agentId ? [notify({ role: "agente", userId: r.agentId, requestId, title: "Resposta devolvida", body: note ?? "Corrija e submeta de novo." })] : []),
              ],
            );
            return { ok: true };
          }
          if (!["submetido", "aguarda_atribuicao", "agente_atribuido", "em_consulta"].includes(r.status))
            return fail("Este pedido já tem resposta: o estado não pode recuar.");
          patchRequest(
            requestId,
            () => ({ status, ...(status === "aguarda_atribuicao" || status === "submetido" ? { agentId: undefined, acceptedAt: undefined } : {}) }),
            [event("admin", "Estado actualizado", note ? `${REQUEST_STATUS[status].label}. ${note}` : REQUEST_STATUS[status].label)],
            undefined,
            [notify({ role: "cliente", userId: r.clientId, requestId, title: "Estado do pedido actualizado", body: `${requestId} está agora em: ${REQUEST_STATUS[status].label}.` })],
          );
          return { ok: true };
        },

        setComplaintStatus: (id, status, resolution) => {
          const c = get().complaints.find((x) => x.id === id);
          if (!c) return fail("Reclamação não encontrada.");
          if (status === "resolvida" && !resolution?.trim()) return fail("Escreva a resolução antes de fechar a reclamação.");
          set((s) => ({
            complaints: s.complaints.map((x) =>
              x.id === id
                ? { ...x, status, resolution: resolution?.trim() || x.resolution, resolvedAt: status === "resolvida" ? now() : undefined }
                : x,
            ),
          }));
          patchRequest(
            c.requestId,
            () => ({}),
            [event("admin", status === "resolvida" ? "Reclamação resolvida" : "Reclamação em análise", resolution)],
            undefined,
            status === "resolvida"
              ? [notify({ role: "cliente", userId: c.clientId, requestId: c.requestId, title: "Reclamação resolvida", body: resolution?.trim() ?? "" })]
              : [],
          );
          return { ok: true };
        },

        // --- Agent ----------------------------------------------------------
        acceptRequest: (requestId, agentId) => {
          const r = findRequest(requestId);
          if (!r) return fail("Pedido não encontrado.");
          const own = agentOwns(r, agentId);
          if (!own.ok) return own;
          if (r.status !== "agente_atribuido" || r.acceptedAt) return fail("Este pedido já não está à espera de aceitação.");
          patchRequest(
            requestId,
            () => ({ acceptedAt: now() }),
            [event("agente", "Pedido aceite pelo agente", undefined, own.agent.name)],
            undefined,
            [notify({ role: "cliente", userId: r.clientId, requestId, title: "O agente aceitou o pedido", body: `${own.agent.code} vai à ${surfaceName(r.surfaceId)} tratar da sua consulta.` })],
          );
          return { ok: true };
        },

        startConsultation: (requestId, agentId) => {
          const r = findRequest(requestId);
          if (!r) return fail("Pedido não encontrado.");
          const own = agentOwns(r, agentId);
          if (!own.ok) return own;
          if (r.status === "em_consulta") return fail("A consulta já está em curso.");
          if (r.status !== "agente_atribuido") return fail("Este pedido já não pode ser iniciado.");
          const at = now();
          const events = [
            ...(r.acceptedAt ? [] : [event("agente", "Pedido aceite pelo agente", undefined, own.agent.name)]),
            event("agente", "Consulta iniciada no terreno", undefined, own.agent.name),
          ];
          patchRequest(requestId, (x) => ({ status: "em_consulta", acceptedAt: x.acceptedAt ?? at }), events, undefined, [
            notify({ role: "cliente", userId: r.clientId, requestId, title: "Consulta em curso", body: `${own.agent.code} está no terreno a recolher os preços.` }),
          ]);
          return { ok: true };
        },

        rejectRequest: (requestId, reason, agentId) => {
          const r = findRequest(requestId);
          if (!r) return fail("Pedido não encontrado.");
          const own = agentOwns(r, agentId);
          if (!own.ok) return own;
          if (!["agente_atribuido", "em_consulta"].includes(r.status)) return fail("Já não é possível rejeitar este pedido.");
          if (reason.trim().length < 5) return fail("Indique o motivo da rejeição.");
          const at = now();
          patchRequest(
            requestId,
            (x) => ({
              status: "aguarda_atribuicao",
              agentId: undefined,
              acceptedAt: undefined,
              rejections: [...x.rejections, { agentId: own.agent.id, reason: reason.trim(), at }],
            }),
            [
              event("agente", "Pedido rejeitado pelo agente", reason.trim(), own.agent.name),
              event("sistema", "Pedido devolvido à fila de atribuição"),
            ],
            undefined,
            [
              ...operatorNotice(r.surfaceId, { requestId, title: "Pedido rejeitado por um agente", body: `${own.agent.code} rejeitou ${requestId}: ${reason.trim()}` }),
              notify({ role: "admin", requestId, title: "Pedido rejeitado por um agente", body: `${own.agent.code} rejeitou ${requestId}.` }),
            ],
          );
          return { ok: true };
        },

        submitResults: (requestId, input, agentId) => {
          const r = findRequest(requestId);
          if (!r) return fail("Pedido não encontrado.");
          const own = agentOwns(r, agentId);
          if (!own.ok) return own;
          const started = r.status === "em_consulta" || (r.status === "agente_atribuido" && !!r.acceptedAt);
          if (!started) return fail("Aceite o pedido antes de submeter a resposta.");
          if (input.length === 0) return fail("Adicione pelo menos um produto ou marque como não encontrado.");
          const itemIds = new Set(r.items.map((i) => i.id));
          for (const it of input) {
            if (!itemIds.has(it.itemId)) return fail("Há um resultado associado a um item que não faz parte do pedido.");
            if (it.notFound) continue;
            if (it.price == null || !Number.isFinite(it.price) || it.price <= 0) return fail(`Indique o preço de "${it.productName || "produto"}".`);
            if (!it.store?.trim()) return fail(`Indique a loja de "${it.productName || "produto"}".`);
          }
          const missing = r.items.findIndex((i) => !input.some((x) => x.itemId === i.id));
          if (missing >= 0) return fail(`Falta a resposta do item ${missing + 1} (${r.items[missing].name}). Marque-o como não encontrado se for o caso.`);

          const at = now();
          const results: ResultItem[] = input.map((it, i) => ({
            ...it,
            id: `${requestId}-r${i + 1}`,
            productName: it.productName.trim() || r.items.find((x) => x.id === it.itemId)!.name,
            photos: it.photos ?? [],
            at,
          }));
          const found = results.filter((x) => !x.notFound).length;
          const incomplete = computeIncomplete(results, r.items);
          const taken = get().requests.flatMap((x) => (x.reference ? [x.reference.reference] : []));
          const reference = generateReference(requestId, r.amounts.gross, Date.now(), taken);
          patchRequest(
            requestId,
            (x) => ({
              status: "resposta_submetida",
              results,
              respondedAt: at,
              acceptedAt: x.acceptedAt ?? at,
              reference,
              flags: { late: x.flags.late, incomplete },
            }),
            [
              ...(r.status === "agente_atribuido" ? [event("agente", "Consulta iniciada no terreno", undefined, own.agent.name)] : []),
              event(
                "agente",
                "Resposta submetida",
                `${found} produto(s) encontrado(s)${results.length > found ? `, ${results.length - found} não encontrado(s)` : ""}`,
                own.agent.name,
              ),
              event(
                "sistema",
                "Referência Multicaixa gerada",
                `Entidade ${reference.entity} · Referência ${formatReference(reference.reference)} · ${formatKz(reference.amount)} (demonstração)`,
              ),
            ],
            undefined,
            [
              notify({
                role: "cliente",
                userId: r.clientId,
                requestId,
                title: "Resposta pronta: pague a referência",
                body: `Pague ${formatKz(r.amounts.gross)} em qualquer ATM ou Multicaixa Express (Entidade ${reference.entity}, Referência ${formatReference(reference.reference)}). Os resultados abrem quando a plataforma confirmar o pagamento.`,
              }),
              ...(incomplete
                ? [notify({ role: "admin", requestId, title: "Resposta incompleta", body: `${requestId} tem itens não encontrados ou sem preço/foto.` })]
                : []),
            ],
          );
          return { ok: true };
        },

        // --- Payment --------------------------------------------------------
        confirmReferencePayment: (requestId, via = "admin") => {
          const r = findRequest(requestId);
          if (!r) return fail("Pedido não encontrado.");
          // Rule 7: never confirm the same payment twice (idempotent: no change on retry).
          if (r.paidAt || PAID.includes(r.status) || r.reference?.status === "paga") return fail("Este pagamento já foi confirmado.");
          // Rule 5: payment only after the answer.
          if (r.status !== "resposta_submetida" || !r.reference) return fail("Ainda não há referência para pagar: o agente não submeteu a resposta.");
          if (r.reference.status !== "pendente") return fail("Esta referência foi anulada.");
          if (isReferenceExpired(r.reference)) return fail("A referência expirou. Gere uma nova referência antes de confirmar.");
          if (!r.agentId) return fail("Pedido sem agente associado.");
          const at = now();
          const earning: AgentEarning = { id: `${requestId}-ag`, agentId: r.agentId, requestId, net: r.amounts.net, amount: r.split.agent, at };
          const agent = findAgent(r.agentId);
          patchRequest(
            requestId,
            (x) => ({ status: "pagamento_confirmado", paidAt: at, reference: { ...x.reference!, status: "paga", paidAt: at, confirmedBy: via } }),
            [
              via === "admin"
                ? event("admin", "Pagamento da referência confirmado", formatKz(r.amounts.gross))
                : event("sistema", "Pagamento da referência simulado (demonstração)", formatKz(r.amounts.gross)),
              event(
                "sistema",
                "Resultados desbloqueados e carteira do agente creditada",
                `Agente: ${formatKz(r.split.agent)} (60% do líquido de ${formatKz(r.amounts.net)}); plataforma ${formatKz(r.split.platform)} e operador ${formatKz(r.split.operator)} provisórios`,
              ),
            ],
            (s) => ({ earnings: s.earnings.some((e) => e.id === earning.id) ? s.earnings : [...s.earnings, earning] }),
            [
              notify({ role: "cliente", userId: r.clientId, requestId, title: "Resultados disponíveis", body: `O pagamento foi confirmado. Já pode ver os resultados do pedido ${requestId}.` }),
              notify({ role: "agente", userId: r.agentId, requestId, title: "Carteira creditada", body: `Recebeu ${formatKz(r.split.agent)} do pedido ${requestId}.` }),
              ...operatorNotice(r.surfaceId, { requestId, title: "Pagamento confirmado", body: `${requestId}: +${formatKz(r.amounts.net)} de facturação líquida${agent ? ` (${agent.code})` : ""}.` }),
            ],
          );
          return { ok: true };
        },

        regenerateReference: (requestId) => {
          const r = findRequest(requestId);
          if (!r) return fail("Pedido não encontrado.");
          if (r.status !== "resposta_submetida" || !r.reference) return fail("Este pedido não tem uma referência por pagar.");
          if (!isReferenceExpired(r.reference)) return fail("A referência actual ainda é válida.");
          const taken = get().requests.flatMap((x) => (x.reference ? [x.reference.reference] : []));
          const reference = generateReference(requestId, r.amounts.gross, Date.now(), taken);
          patchRequest(requestId, () => ({ reference }), [
            event("admin", "Nova referência Multicaixa gerada", `Entidade ${reference.entity} · Referência ${formatReference(reference.reference)} (demonstração)`),
          ], undefined, [
            notify({ role: "cliente", userId: r.clientId, requestId, title: "Nova referência de pagamento", body: `Referência ${formatReference(reference.reference)}, ${formatKz(reference.amount)}.` }),
          ]);
          return { ok: true };
        },

        // --- Wallet ---------------------------------------------------------
        updateAgentBank: (agentId, bank) => {
          if (!isValidIban(bank.iban)) return fail("IBAN inválido: deve começar por AO06 e ter mais 21 dígitos.");
          if (bank.holder.trim().length < 3) return fail("Indique o nome do titular da conta.");
          const iban = normalizeIban(bank.iban);
          return patchAgent(agentId, { bank: { iban, holder: bank.holder.trim() } }, "Dados bancários actualizados", `IBAN ${formatIban(iban)}`);
        },

        requestWithdrawal: (amount, agentId) => {
          const s = get();
          const agent = findAgent(agentId ?? s.session.currentAgentId);
          if (!agent) return fail("Agente não encontrado.");
          const wallet = computeWallet(agent.id, s.earnings, s.withdrawals);
          const check = canWithdraw({ agent, withdrawals: s.withdrawals, available: wallet.available, amount: Math.round(amount) });
          if (!check.ok) return fail(check.error);
          const withdrawal: Withdrawal = {
            id: nextSeqId(s.withdrawals, "lv"),
            agentId: agent.id,
            amount: Math.round(amount),
            iban: agent.bank!.iban,
            holder: agent.bank!.holder,
            status: "pending",
            requestedAt: now(),
          };
          set((st) => ({ withdrawals: [...st.withdrawals, withdrawal] }));
          log("withdrawal", withdrawal.id, [event("agente", "Levantamento pedido", `${formatKz(withdrawal.amount)} para ${formatIban(withdrawal.iban)}`, agent.name)], [
            notify({ role: "admin", title: "Levantamento por confirmar", body: `${agent.code} pediu um levantamento de ${formatKz(withdrawal.amount)} (${withdrawal.id}).` }),
          ]);
          return { ok: true, withdrawal };
        },

        confirmWithdrawal: (id, transferRef) => {
          const w = get().withdrawals.find((x) => x.id === id);
          if (!w) return fail("Levantamento não encontrado.");
          if (w.status !== "pending") return fail("Este levantamento já foi tratado.");
          if (transferRef.trim().length < 4) return fail("Indique a referência da transferência bancária.");
          const at = now();
          set((s) => ({ withdrawals: s.withdrawals.map((x) => (x.id === id ? { ...x, status: "confirmed", confirmedAt: at, transferRef: transferRef.trim() } : x)) }));
          log("withdrawal", id, [event("admin", "Levantamento confirmado", `${formatKz(w.amount)}, transferência ${transferRef.trim()}`)], [
            notify({ role: "agente", userId: w.agentId, title: "Levantamento transferido", body: `Transferimos ${formatKz(w.amount)} para o seu IBAN (ref. ${transferRef.trim()}).` }),
          ]);
          return { ok: true };
        },

        rejectWithdrawal: (id, reason) => {
          const w = get().withdrawals.find((x) => x.id === id);
          if (!w) return fail("Levantamento não encontrado.");
          if (w.status !== "pending") return fail("Este levantamento já foi tratado.");
          if (reason.trim().length < 5) return fail("Indique o motivo da rejeição.");
          const at = now();
          set((s) => ({ withdrawals: s.withdrawals.map((x) => (x.id === id ? { ...x, status: "rejected", rejectedAt: at, reason: reason.trim() } : x)) }));
          log("withdrawal", id, [event("admin", "Levantamento rejeitado", reason.trim())], [
            notify({ role: "agente", userId: w.agentId, title: "Levantamento rejeitado", body: `${formatKz(w.amount)} voltaram ao saldo disponível. Motivo: ${reason.trim()}` }),
          ]);
          return { ok: true };
        },

        // --- Operators ------------------------------------------------------
        upsertOperator: (input) => {
          const s = get();
          if (input.name.trim().length < 3) return fail("Indique o nome do operador.");
          if (digits(input.phone).length !== 9) return fail("O telefone deve ter 9 dígitos.");
          if (!s.surfaces.some((x) => x.id === input.surfaceId)) return fail("Escolha a superfície do operador.");
          if (!Number.isInteger(input.baseSalary) || input.baseSalary < 0) return fail("Indique o salário base mensal, em Kz.");
          const existing = input.id ? findOperator(input.id) : undefined;
          if (input.id && !existing) return fail("Operador não encontrado.");
          const clash = s.operators.find((o) => o.status === "activo" && o.surfaceId === input.surfaceId && o.id !== input.id);
          if (input.status === "activo" && clash)
            return fail(`Já existe um operador activo no ${surfaceName(input.surfaceId)} (${clash.code}). Desactive-o primeiro.`);
          const id = existing?.id ?? nextSeqId(s.operators, "op");
          const operator: Operator = {
            id,
            code: existing?.code ?? id.toUpperCase(),
            name: input.name.trim(),
            phone: input.phone.trim(),
            email: input.email?.trim() || undefined,
            surfaceId: input.surfaceId,
            baseSalary: input.baseSalary,
            status: input.status,
            joinedAt: existing?.joinedAt ?? now(),
            note: input.note?.trim() || undefined,
          };
          set((st) => ({ operators: existing ? st.operators.map((o) => (o.id === id ? operator : o)) : [...st.operators, operator] }));
          log("operator", id, [
            event("admin", existing ? "Operador actualizado" : "Operador registado", `${operator.code} · ${surfaceName(operator.surfaceId)} · salário base ${formatKz(operator.baseSalary)}`),
          ]);
          return { ok: true, operator };
        },

        setOperatorStatus: (id, status) => {
          const o = findOperator(id);
          if (!o) return fail("Operador não encontrado.");
          if (o.status === status) return { ok: true };
          const r = get().upsertOperator({ ...o, status });
          return r.ok ? { ok: true } : r;
        },

        // --- Objectives -----------------------------------------------------
        upsertObjective: (input, reason) => {
          const s = get();
          if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.periodKey)) return fail("Escolha o mês do período.");
          if (!s.surfaces.some((x) => x.id === input.surfaceId)) return fail("Escolha a superfície.");
          const fields = {
            revenueTarget: Math.round(input.revenueTarget),
            paidRequestsTarget: input.paidRequestsTarget ? Math.round(input.paidRequestsTarget) : undefined,
            basis: input.basis,
            pctBelow: input.pctBelow,
            pctMet: input.pctMet,
          };
          const errors = validateObjective(fields, s.pricing.split);
          if (errors.length) return fail(errors[0]);
          const existing = input.id ? s.objectives.find((o) => o.id === input.id) : undefined;
          if (input.id && !existing) return fail("Objectivo não encontrado.");
          const period = existing?.period ?? monthPeriod(input.periodKey);
          if (!existing && s.objectives.some((o) => o.surfaceId === input.surfaceId && o.period.key === period.key))
            return fail(`Já existe um objectivo para ${surfaceName(input.surfaceId)} em ${period.label}.`);
          const draft = existing ?? ({ status: "planned", period } as Pick<Objective, "status" | "period">);
          const locked = isObjectiveLocked(draft);
          if (locked && (s.session.viewAs !== "admin" || !reason || reason.trim().length < 10))
            return fail("O período já começou: só é possível uma correcção administrativa com motivo (10 caracteres ou mais).");

          const changes: string[] = [];
          if (existing) {
            if (existing.revenueTarget !== fields.revenueTarget)
              changes.push(`Meta de facturação: ${formatKz(existing.revenueTarget)} → ${formatKz(fields.revenueTarget)}`);
            if (existing.paidRequestsTarget !== fields.paidRequestsTarget)
              changes.push(`Meta de consultas pagas: ${existing.paidRequestsTarget ?? "sem meta"} → ${fields.paidRequestsTarget ?? "sem meta"}`);
            if (existing.basis !== fields.basis) changes.push(`Base: ${existing.basis === "net" ? "líquida" : "bruta"} → ${fields.basis === "net" ? "líquida" : "bruta"}`);
            if (existing.pctBelow !== fields.pctBelow || existing.pctMet !== fields.pctMet)
              changes.push(`Percentagens do operador: ${existing.pctBelow}%/${existing.pctMet}% → ${fields.pctBelow}%/${fields.pctMet}%`);
            if (changes.length === 0) return { ok: true, objective: existing };
          }
          const actor = actorFor("admin");
          const objective: Objective = {
            ...(existing ?? {
              id: `obj-${period.key}-${input.surfaceId}`,
              surfaceId: input.surfaceId,
              period,
              status: "planned" as const,
              corrections: [],
              createdAt: now(),
            }),
            ...fields,
            platformRetained: fields.pctMet - fields.pctBelow,
            status: existing?.status === "closed" ? "closed" : objectiveStatus(draft),
            corrections:
              locked && reason
                ? [...(existing?.corrections ?? []), { at: now(), actor, reason: reason.trim(), changes: changes.join("; ") || "Objectivo criado depois do início do período" }]
                : (existing?.corrections ?? []),
          } as Objective;
          set((st) => ({
            objectives: existing ? st.objectives.map((o) => (o.id === objective.id ? objective : o)) : [...st.objectives, objective],
          }));
          log("objective", objective.id, [
            event(
              "admin",
              locked ? "Correcção administrativa do objectivo" : existing ? "Objectivo actualizado" : "Objectivo definido",
              `${surfaceName(objective.surfaceId)}, ${period.label}. ${changes.join("; ") || `Meta ${formatKz(objective.revenueTarget)}`}${locked && reason ? `. Motivo: ${reason.trim()}` : ""}`,
            ),
          ]);
          if (objective.status === "closed") {
            const reclosed = doClose(objective, event("admin", "Recalcular"));
            return { ok: true, objective: reclosed };
          }
          return { ok: true, objective };
        },

        deleteObjective: (id) => {
          const o = get().objectives.find((x) => x.id === id);
          if (!o) return fail("Objectivo não encontrado.");
          if (isObjectiveLocked(o)) return fail("Só é possível apagar objectivos de períodos que ainda não começaram.");
          set((s) => ({ objectives: s.objectives.filter((x) => x.id !== id) }));
          log("objective", id, [event("admin", "Objectivo apagado", `${surfaceName(o.surfaceId)}, ${o.period.label}`)]);
          return { ok: true };
        },

        closeObjective: (id, opts = {}) => {
          const o = get().objectives.find((x) => x.id === id);
          if (!o) return fail("Objectivo não encontrado.");
          if (o.status === "closed") return fail("Este período já foi fechado.");
          if (objectiveStatus(o) === "planned") return fail("O período ainda não começou.");
          if (!isPeriodOver(o.period) && !opts.early) return fail("O período ainda não terminou.");
          const closed = doClose(o, event(get().session.viewAs === "admin" ? "admin" : "sistema", ""));
          return { ok: true, objective: closed };
        },

        closePeriod: (periodKey, opts = {}) => {
          const open = get().objectives.filter((o) => o.period.key === periodKey && o.status !== "closed");
          if (open.length === 0) return fail("Não há objectivos por fechar neste período.");
          for (const o of open) {
            const r = get().closeObjective(o.id, opts);
            if (!r.ok) return r;
          }
          return { ok: true, closed: open.length };
        },

        // --- People ---------------------------------------------------------
        suspendClient: (id, reason) => {
          if (!get().clients.some((c) => c.id === id)) return fail("Cliente não encontrado.");
          set((s) => ({
            clients: s.clients.map((c) => (c.id === id ? { ...c, status: "suspenso" } : c)),
            session: s.session.currentClientId === id && s.session.viewAs !== "admin" ? { ...s.session, currentClientId: null } : s.session,
          }));
          log("client", id, [event("admin", "Cliente suspenso", reason)], [
            notify({ role: "cliente", userId: id, title: "Conta suspensa", body: reason ?? "Contacte o apoio Melhor Preço." }),
          ]);
          return { ok: true };
        },

        reactivateClient: (id) => {
          if (!get().clients.some((c) => c.id === id)) return fail("Cliente não encontrado.");
          set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, status: "activo" } : c)) }));
          log("client", id, [event("admin", "Cliente reactivado")]);
          return { ok: true };
        },

        registerAgent: (input) => {
          const s = get();
          if (input.name.trim().length < 3) return fail("Indique o nome completo.");
          if (digits(input.phone).length !== 9) return fail("O telefone deve ter 9 dígitos.");
          if (s.agents.some((a) => digits(a.phone) === digits(input.phone))) return fail("Já existe uma candidatura com este telefone.");
          if (input.surfaceIds.length === 0) return fail("Escolha a superfície onde costuma trabalhar.");
          if (input.bank && !isValidIban(input.bank.iban)) return fail("IBAN inválido: deve começar por AO06 e ter mais 21 dígitos.");
          const n = s.agents.reduce((m, a) => Math.max(m, Number(a.code.slice(3)) || 0), 0) + 1;
          const code = `AG-${String(n).padStart(3, "0")}`;
          const agent: Agent = {
            id: `ag-${String(n).padStart(3, "0")}`,
            code,
            name: input.name.trim(),
            phone: input.phone.trim(),
            email: input.email?.trim() || undefined,
            photo: input.photo,
            status: "pendente",
            surfaceIds: input.surfaceIds,
            bank: input.bank ? { iban: normalizeIban(input.bank.iban), holder: input.bank.holder.trim() || input.name.trim() } : undefined,
            joinedAt: now(),
            trainings: [],
          };
          set((st) => ({ agents: [...st.agents, agent] }));
          log("agent", agent.id, [event("sistema", "Candidatura de agente recebida", `${agent.name} (${code})`)], [
            notify({ role: "admin", title: "Nova candidatura de agente", body: `${agent.name} (${code}) aguarda aprovação.` }),
          ]);
          return { ok: true, agent };
        },

        approveAgent: (id) => {
          const a = findAgent(id);
          if (!a) return fail("Agente não encontrado.");
          if (a.status !== "pendente") return fail("Só candidaturas pendentes podem ser aprovadas.");
          return patchAgent(id, { status: "aprovado" }, "Candidatura aprovada");
        },

        activateAgent: (id) => {
          const a = findAgent(id);
          if (!a) return fail("Agente não encontrado.");
          if (a.status === "activo") return fail("Este agente já está activo.");
          if (a.status === "pendente") return fail("Aprove a candidatura antes de activar.");
          if (a.surfaceIds.length === 0) return fail("Associe o agente a pelo menos uma superfície.");
          const r = patchAgent(id, { status: "activo", note: undefined }, "Agente activado");
          set((s) => ({ notifications: [notify({ role: "agente", userId: id, title: "Conta activa", body: "Já pode receber pedidos." }), ...s.notifications] }));
          return r;
        },

        suspendAgent: (id, reason) => {
          const a = findAgent(id);
          if (!a) return fail("Agente não encontrado.");
          if (a.status === "suspenso") return fail("Este agente já está suspenso.");
          return patchAgent(id, { status: "suspenso", note: reason?.trim() || a.note }, "Agente suspenso", reason);
        },

        setAgentSurfaces: (id, surfaceIds) =>
          patchAgent(id, { surfaceIds: [...new Set(surfaceIds)] }, "Superfícies do agente actualizadas", surfaceIds.map(surfaceName).join(", ")),

        addAgentTraining: (id, title) => {
          const a = findAgent(id);
          if (!a) return fail("Agente não encontrado.");
          if (!title.trim()) return fail("Indique o nome da formação.");
          return patchAgent(id, { trainings: [...a.trainings, { title: title.trim(), at: now() }] }, "Formação registada", title.trim());
        },

        // --- Surfaces -------------------------------------------------------
        upsertSurface: (input) => {
          if (input.name.trim().length < 3) return fail("Indique o nome da superfície.");
          const existing = input.id ? get().surfaces.find((s) => s.id === input.id) : undefined;
          const surface: Surface = existing
            ? { ...existing, ...input, id: existing.id }
            : {
                ...input,
                id: `sf-${input.name
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[̀-ͯ]/g, "")
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "")}-${Date.now().toString(36).slice(-4)}`,
                createdAt: now(),
              };
          set((s) => ({ surfaces: existing ? s.surfaces.map((x) => (x.id === surface.id ? surface : x)) : [...s.surfaces, surface] }));
          log("surface", surface.id, [event("admin", existing ? "Superfície actualizada" : "Superfície criada", surface.name)]);
          return { ok: true, surface };
        },

        setSurfaceActive: (id, active) => {
          if (!get().surfaces.some((s) => s.id === id)) return fail("Superfície não encontrada.");
          set((s) => ({ surfaces: s.surfaces.map((x) => (x.id === id ? { ...x, active } : x)) }));
          log("surface", id, [event("admin", active ? "Superfície activada" : "Superfície desactivada", surfaceName(id))]);
          return { ok: true };
        },

        // --- Notifications --------------------------------------------------
        markNotificationRead: (id) =>
          set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),

        markAllNotificationsRead: (role, userId) =>
          set((s) => ({
            notifications: s.notifications.map((n) =>
              n.role === role && (role === "admin" || n.userId === userId) ? { ...n, read: true } : n,
            ),
          })),
      };
    },
    {
      name: STORE_KEY,
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      // Hydrate after mount (see useHydrated) so static HTML and the first
      // client render match.
      skipHydration: true,
      partialize: (s) => ({
        surfaces: s.surfaces,
        agents: s.agents,
        operators: s.operators,
        clients: s.clients,
        requests: s.requests,
        earnings: s.earnings,
        withdrawals: s.withdrawals,
        objectives: s.objectives,
        audit: s.audit,
        notifications: s.notifications,
        complaints: s.complaints,
        pricing: s.pricing,
        session: s.session,
      }),
      // Unknown/old shapes fall back to a fresh seed instead of crashing.
      migrate: () => initialState(),
      merge: (persisted, current) => {
        const p = persisted as Partial<StoreState> | undefined;
        const valid =
          !!p &&
          Array.isArray(p.requests) &&
          Array.isArray(p.operators) &&
          Array.isArray(p.objectives) &&
          !!p.pricing &&
          typeof p.pricing.simplePrice === "number" &&
          !!p.session &&
          p.requests.every((r) => Array.isArray(r?.items) && typeof r?.surfaceId === "string");
        if (!valid) return current;
        return { ...current, ...p, session: { ...DEFAULT_SESSION, ...p.session } };
      },
    },
  ),
);

// ---------------------------------------------------------------------------
// Hydration guard
// ---------------------------------------------------------------------------

const subscribeHydration = (cb: () => void) => useStore.persist.onFinishHydration(cb);

/**
 * `false` on the server and on the first client render; `true` once the
 * persisted state is loaded. Render skeletons until it is true.
 */
export function useHydrated(): boolean {
  const hydrated = useSyncExternalStore(subscribeHydration, () => useStore.persist.hasHydrated(), () => false);
  useEffect(() => {
    if (!useStore.persist.hasHydrated()) void useStore.persist.rehydrate();
  }, []);
  return hydrated;
}

// ---------------------------------------------------------------------------
// Selector hooks (memoised so components don't re-render in loops)
// ---------------------------------------------------------------------------

export function useCurrentClient(): Client | undefined {
  const id = useStore((s) => s.session.currentClientId);
  const clients = useStore((s) => s.clients);
  return useMemo(() => clients.find((c) => c.id === id), [clients, id]);
}

export function useCurrentAgent(): Agent | undefined {
  const id = useStore((s) => s.session.currentAgentId);
  const agents = useStore((s) => s.agents);
  return useMemo(() => agents.find((a) => a.id === id), [agents, id]);
}

export function useCurrentOperator(): Operator | undefined {
  const id = useStore((s) => s.session.currentOperatorId);
  const operators = useStore((s) => s.operators);
  return useMemo(() => operators.find((o) => o.id === id), [operators, id]);
}

export function useRequest(id: string | null | undefined): ServiceRequest | undefined {
  const requests = useStore((s) => s.requests);
  return useMemo(() => (id ? requests.find((r) => r.id === id) : undefined), [requests, id]);
}

/** Requests sorted newest first, optionally filtered by client, agent or surface. */
export function useRequests(
  filter: { clientId?: string | null; agentId?: string | null; surfaceId?: string | null } = {},
) {
  const requests = useStore((s) => s.requests);
  const { clientId, agentId, surfaceId } = filter;
  return useMemo(
    () =>
      requests
        .filter(
          (r) =>
            (clientId === undefined || r.clientId === clientId) &&
            (agentId === undefined || r.agentId === agentId) &&
            (surfaceId === undefined || r.surfaceId === surfaceId),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests, clientId, agentId, surfaceId],
  );
}

/** Notifications for the current "Ver como" role/user, newest first. */
export function useMyNotifications(): { items: Notification[]; unread: number } {
  const notifications = useStore((s) => s.notifications);
  const session = useStore((s) => s.session);
  return useMemo(() => {
    const userId =
      session.viewAs === "cliente"
        ? session.currentClientId
        : session.viewAs === "agente"
          ? session.currentAgentId
          : session.viewAs === "operador"
            ? session.currentOperatorId
            : undefined;
    const items = notifications
      .filter((n) => n.role === session.viewAs && (session.viewAs === "admin" || n.userId === userId))
      .sort((a, b) => b.at.localeCompare(a.at));
    return { items, unread: items.filter((n) => !n.read).length };
  }, [notifications, session]);
}

/** Active agents, those serving `surfaceId` first. Admin can pick any; operators only the first group. */
export function useEligibleAgents(surfaceId?: string): Agent[] {
  const agents = useStore((s) => s.agents);
  return useMemo(() => {
    const score = (a: Agent) => (surfaceId && a.surfaceIds.includes(surfaceId) ? 1 : 0);
    return agents.filter(isAgentEligible).sort((a, b) => score(b) - score(a));
  }, [agents, surfaceId]);
}

/** Active agents of a surface with availability (operator board). */
export function useSurfaceAgents(surfaceId: string | undefined): { agent: Agent; availability: AgentAvailability }[] {
  const agents = useStore((s) => s.agents);
  const requests = useStore((s) => s.requests);
  return useMemo(
    () =>
      surfaceId
        ? agents
            .filter((a) => agentServesSurface(a, surfaceId))
            .map((agent) => ({ agent, availability: agentAvailability(agent.id, requests) }))
        : [],
    [agents, requests, surfaceId],
  );
}

/** Wallet of an agent (defaults to the current agent) + withdrawal eligibility now. */
export function useWallet(agentId?: string | null, now?: number): (WalletSummary & { check: WithdrawCheck }) | undefined {
  const currentId = useStore((s) => s.session.currentAgentId);
  const agents = useStore((s) => s.agents);
  const earnings = useStore((s) => s.earnings);
  const withdrawals = useStore((s) => s.withdrawals);
  const id = agentId ?? currentId;
  return useMemo(() => {
    const agent = agents.find((a) => a.id === id);
    if (!agent) return undefined;
    const w = computeWallet(agent.id, earnings, withdrawals);
    return { ...w, check: canWithdraw({ agent, withdrawals, available: w.available, now }) };
  }, [agents, earnings, withdrawals, id, now]);
}

/** Objectives (optionally filtered), newest period first. */
export function useObjectives(filter: { surfaceId?: string; periodKey?: string } = {}): Objective[] {
  const objectives = useStore((s) => s.objectives);
  const { surfaceId, periodKey } = filter;
  return useMemo(
    () =>
      objectives
        .filter((o) => (!surfaceId || o.surfaceId === surfaceId) && (!periodKey || o.period.key === periodKey))
        .sort((a, b) => b.period.startsAt.localeCompare(a.period.startsAt) || a.surfaceId.localeCompare(b.surfaceId)),
    [objectives, surfaceId, periodKey],
  );
}

/** Live evaluation of an objective (for closed ones, mirrors the stored result). */
export function useObjectiveEvaluation(objective: Objective | undefined): ObjectiveEvaluation | undefined {
  const requests = useStore((s) => s.requests);
  const split = useStore((s) => s.pricing.split);
  return useMemo(() => (objective ? evaluateObjective(objective, requests, split) : undefined), [objective, requests, split]);
}

/**
 * Objective of the period running at `now` for a surface (operator home).
 * Pass a clock value from a hook (e.g. admin kit `useNow()`), not Date.now() in render.
 */
export function useCurrentObjective(surfaceId: string | undefined, now: number): Objective | undefined {
  const objectives = useStore((s) => s.objectives);
  return useMemo(() => {
    if (!surfaceId) return undefined;
    const t = now;
    return objectives.find(
      (o) => o.surfaceId === surfaceId && o.status !== "closed" && new Date(o.period.startsAt).getTime() <= t && t < new Date(o.period.endsAt).getTime(),
    );
  }, [objectives, surfaceId, now]);
}

/** Closed objectives credited to an operator (commission history). */
export function useOperatorCommissions(operatorId: string | undefined): Objective[] {
  const objectives = useStore((s) => s.objectives);
  return useMemo(
    () =>
      objectives
        .filter((o) => o.result && o.result.operatorId === operatorId)
        .sort((a, b) => b.period.startsAt.localeCompare(a.period.startsAt)),
    [objectives, operatorId],
  );
}

/** Audit log, newest first, optionally for one entity. */
export function useAudit(filter: { entity?: AuditLogEntry["entity"]; entityId?: string } = {}): AuditLogEntry[] {
  const audit = useStore((s) => s.audit);
  const { entity, entityId } = filter;
  return useMemo(
    () =>
      audit
        .filter((e) => (!entity || e.entity === entity) && (!entityId || e.entityId === entityId))
        .sort((a, b) => b.at.localeCompare(a.at)),
    [audit, entity, entityId],
  );
}

/** Totals for the financial view (paid requests only, plus references and withdrawals). */
export function useFinanceSummary() {
  const requests = useStore((s) => s.requests);
  const withdrawals = useStore((s) => s.withdrawals);
  return useMemo(() => {
    const paid = requests.filter((r) => PAID.includes(r.status));
    const sum = (f: (r: ServiceRequest) => number, rs = paid) => rs.reduce((t, r) => t + f(r), 0);
    const pendingRefs = requests.filter((r) => r.status === "resposta_submetida" && r.reference?.status === "pendente");
    return {
      paidCount: paid.length,
      gross: sum((r) => r.amounts.gross),
      taxes: sum((r) => r.amounts.taxes),
      net: sum((r) => r.amounts.net),
      agent: sum((r) => r.split.agent),
      platform: sum((r) => r.split.platform),
      operator: sum((r) => r.split.operator),
      operatorFinal: sum((r) => (r.split.final ? r.split.operator : 0)),
      operatorProvisional: sum((r) => (r.split.final ? 0 : r.split.operator)),
      pendingReferences: pendingRefs.length,
      pendingReferencesAmount: sum((r) => r.amounts.gross, pendingRefs),
      withdrawalsPending: withdrawals.filter((w) => w.status === "pending").reduce((t, w) => t + w.amount, 0),
      withdrawalsConfirmed: withdrawals.filter((w) => w.status === "confirmed").reduce((t, w) => t + w.amount, 0),
    };
  }, [requests, withdrawals]);
}
