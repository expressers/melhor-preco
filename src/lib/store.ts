// Client-side state (import only from "use client" components) for the static MVP. Seeded from the data layer (mocks),
// persisted to localStorage, and the single place where business rules
// (BRIEF §4-§5) mutate data. Every action appends an audit event to the
// request timeline and emits the in-app notifications of BRIEF §5.
//
// Actions return `ActionResult`: `{ ok: true, ... }` or `{ ok: false, error }`
// with a pt-AO message ready for a toast.

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { getSeed, type SeedState } from "./data";
import { formatKz } from "./format";
import { ADMIN_NAME } from "./mock";
import { computePrice, sanitizePricing, type PriceQuote } from "./pricing";
import { computeIncomplete, isAgentEligible, nextRequestId } from "./rules";
import type {
  Agent,
  AuditEvent,
  Category,
  Client,
  ComplaintStatus,
  LedgerEntry,
  Notification,
  PaymentInfo,
  Priority,
  PricingConfig,
  RequestStatus,
  ResultItem,
  Role,
  ServiceRequest,
  Surface,
} from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface Session {
  viewAs: Role;
  currentClientId: string | null;
  currentAgentId: string | null;
}

export interface NewRequestInput {
  category: Category;
  description: string;
  brand?: string;
  features?: string;
  variants?: string;
  photo?: string; // data URL from a local file preview
  surfaceIds: string[];
  priority: Priority;
  deadline?: string;
  clientId?: string; // defaults to session.currentClientId
}

/** What the agent fills per product. `at` and `id` are set automatically. */
export type ResultInput = Omit<ResultItem, "id" | "at" | "photos"> & { photos?: string[] };

export interface NewClientInput {
  name: string;
  phone: string;
  password: string;
  email?: string;
}

export interface NewAgentInput {
  name: string;
  phone: string;
  email?: string;
  photo?: string;
  surfaceIds: string[];
  paymentInfo?: PaymentInfo;
}

export interface StoreState extends SeedState {
  session: Session;
}

export interface StoreActions {
  // Demo / session
  reset: () => void;
  setViewAs: (role: Role) => void;
  setCurrentClient: (id: string | null) => void;
  setCurrentAgent: (id: string | null) => void;
  registerClient: (input: NewClientInput) => ActionResult<{ client: Client }>;
  login: (phone: string, password: string) => ActionResult<{ client: Client }>;
  logout: () => void;

  // Pricing
  quote: (surfaceCount: number, priority?: Priority) => PriceQuote;
  updatePricing: (config: PricingConfig) => ActionResult<{ pricing: PricingConfig }>;

  // Requests: client
  createRequest: (input: NewRequestInput) => ActionResult<{ request: ServiceRequest }>;
  cancelRequest: (id: string, reason: string, by?: "cliente" | "admin") => ActionResult;
  completeRequest: (id: string) => ActionResult;
  createComplaint: (requestId: string, reason: string) => ActionResult<{ id: string }>;

  // Requests: admin
  assignAgent: (requestId: string, agentId: string) => ActionResult;
  updateStatus: (requestId: string, status: RequestStatus, note?: string) => ActionResult;
  setComplaintStatus: (id: string, status: ComplaintStatus, resolution?: string) => ActionResult;
  settleCommission: (ledgerId: string) => ActionResult;

  // Requests: agent (agentId defaults to session.currentAgentId)
  acceptRequest: (requestId: string, agentId?: string) => ActionResult;
  rejectRequest: (requestId: string, reason: string, agentId?: string) => ActionResult;
  submitResults: (requestId: string, items: ResultInput[], agentId?: string) => ActionResult;
  confirmPayment: (requestId: string, agentId?: string) => ActionResult;

  // People
  suspendClient: (id: string, reason?: string) => ActionResult;
  reactivateClient: (id: string) => ActionResult;
  registerAgent: (input: NewAgentInput) => ActionResult<{ agent: Agent }>;
  approveAgent: (id: string) => ActionResult;
  activateAgent: (id: string) => ActionResult;
  suspendAgent: (id: string, reason?: string) => ActionResult;
  setAgentSurfaces: (id: string, surfaceIds: string[]) => ActionResult;
  addAgentTraining: (id: string, title: string) => ActionResult;
  updateAgentPaymentInfo: (id: string, info: PaymentInfo) => ActionResult;

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

const DEFAULT_SESSION: Session = {
  viewAs: "cliente",
  currentClientId: "cl-001",
  currentAgentId: "ag-001",
};

function initialState(): StoreState {
  return { ...getSeed(), session: { ...DEFAULT_SESSION } };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const STORE_KEY = "melhor-preco:v1";

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      // --- internal helpers (closures over set/get) -----------------------
      const actorFor = (role: Role | "sistema", agentId?: string): string => {
        const s = get();
        if (role === "admin") return ADMIN_NAME;
        if (role === "sistema") return "Sistema";
        if (role === "agente") {
          const id = agentId ?? s.session.currentAgentId;
          return s.agents.find((a) => a.id === id)?.name ?? "Agente";
        }
        return s.clients.find((c) => c.id === s.session.currentClientId)?.name ?? "Cliente";
      };

      const event = (
        role: AuditEvent["role"],
        action: string,
        note?: string,
        actor?: string,
      ): AuditEvent => ({ at: now(), actor: actor ?? actorFor(role), role, action, note });

      const notify = (n: Omit<Notification, "id" | "at" | "read">): Notification => ({
        ...n,
        id: uid("nt"),
        at: now(),
        read: false,
      });

      /** Immutable update of one request + optional extra state. */
      const patchRequest = (
        id: string,
        fn: (r: ServiceRequest) => Partial<ServiceRequest>,
        events: AuditEvent[],
        extra: Partial<StoreState> = {},
        notifications: Notification[] = [],
      ) =>
        set((s) => ({
          ...extra,
          requests: s.requests.map((r) =>
            r.id === id
              ? { ...r, ...fn(r), timeline: [...r.timeline, ...events], updatedAt: now() }
              : r,
          ),
          notifications: [...notifications, ...(extra.notifications ?? s.notifications)],
        }));

      const findRequest = (id: string) => get().requests.find((r) => r.id === id);
      const findAgent = (id: string | null | undefined) =>
        id ? get().agents.find((a) => a.id === id) : undefined;

      const patchAgent = (id: string, patch: Partial<Agent>): ActionResult => {
        if (!findAgent(id)) return fail("Agente não encontrado.");
        set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
        return { ok: true };
      };

      const agentOwns = (r: ServiceRequest, agentId?: string) => {
        const id = agentId ?? get().session.currentAgentId;
        const agent = findAgent(id);
        if (!agent || r.agentId !== agent.id) return fail("Este pedido não está atribuído a si.");
        if (!isAgentEligible(agent)) return fail("A sua conta não está activa para executar pedidos.");
        return { ok: true as const, agent };
      };

      return {
        ...initialState(),

        // --- Demo / session -----------------------------------------------
        reset: () => set(initialState()),
        setViewAs: (role) => set((s) => ({ session: { ...s.session, viewAs: role } })),
        setCurrentClient: (id) => set((s) => ({ session: { ...s.session, currentClientId: id } })),
        setCurrentAgent: (id) => set((s) => ({ session: { ...s.session, currentAgentId: id } })),

        registerClient: (input) => {
          const name = input.name.trim();
          if (name.length < 3) return fail("Indique o seu nome.");
          if (digits(input.phone).length !== 9) return fail("O telefone deve ter 9 dígitos.");
          if (input.password.length < 6) return fail("A palavra-passe precisa de 6 caracteres ou mais.");
          if (get().clients.some((c) => digits(c.phone) === digits(input.phone)))
            return fail("Já existe uma conta com este telefone. Entre com a sua palavra-passe.");
          const client: Client = {
            id: uid("cl"),
            name,
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
          return { ok: true, client };
        },

        login: (phone, password) => {
          const client = get().clients.find((c) => digits(c.phone) === digits(phone));
          if (!client || client.password !== password)
            return fail("Telefone ou palavra-passe incorrectos.");
          if (client.status === "suspenso")
            return fail("Esta conta está suspensa. Contacte o apoio Melhor Preço.");
          set((s) => ({ session: { ...s.session, currentClientId: client.id, viewAs: "cliente" } }));
          return { ok: true, client };
        },

        logout: () => set((s) => ({ session: { ...s.session, currentClientId: null } })),

        // --- Pricing --------------------------------------------------------
        quote: (surfaceCount, priority = "normal") =>
          computePrice(get().pricing, Math.max(1, surfaceCount), priority),

        updatePricing: (config) => {
          const pricing = sanitizePricing(config);
          set({ pricing });
          return { ok: true, pricing };
        },

        // --- Client ---------------------------------------------------------
        createRequest: (input) => {
          const s = get();
          const clientId = input.clientId ?? s.session.currentClientId;
          const client = s.clients.find((c) => c.id === clientId);
          if (!client) return fail("Entre na sua conta para fazer uma consulta.");
          if (client.status === "suspenso") return fail("A sua conta está suspensa.");
          if (input.description.trim().length < 3) return fail("Descreva o produto que procura.");
          const surfaceIds = [...new Set(input.surfaceIds)];
          if (surfaceIds.length === 0) return fail("Escolha pelo menos uma superfície comercial.");
          if (surfaceIds.some((id) => !s.surfaces.find((x) => x.id === id && x.active)))
            return fail("Uma das superfícies escolhidas não está activa.");

          const q = computePrice(s.pricing, surfaceIds.length, input.priority);
          const at = now();
          const request: ServiceRequest = {
            id: nextRequestId(s.requests),
            clientId: client.id,
            category: input.category,
            description: input.description.trim(),
            brand: input.brand?.trim() || undefined,
            features: input.features?.trim() || undefined,
            variants: input.variants?.trim() || undefined,
            photo: input.photo,
            surfaceIds,
            priority: input.priority,
            deadline: input.deadline,
            price: q.price,
            agentShare: q.agentShare,
            platformShare: q.platformShare,
            status: "submetido",
            createdAt: at,
            updatedAt: at,
            rejections: [],
            results: [],
            timeline: [
              {
                at,
                actor: client.name,
                role: "cliente",
                action: "Pedido submetido",
                note: `Valor da consulta: ${formatKz(q.price)}`,
              },
            ],
            flags: { late: false, incomplete: false },
          };
          set((st) => ({
            requests: [request, ...st.requests],
            notifications: [
              notify({
                role: "cliente",
                userId: client.id,
                requestId: request.id,
                title: "Pedido submetido",
                body: `Recebemos o pedido ${request.id}. Vamos atribuí-lo a um agente.`,
              }),
              notify({
                role: "admin",
                requestId: request.id,
                title: "Novo pedido por atribuir",
                body: `${request.id}: ${request.description}.`,
              }),
              ...st.notifications,
            ],
          }));
          return { ok: true, request };
        },

        cancelRequest: (id, reason, by = "cliente") => {
          const r = findRequest(id);
          if (!r) return fail("Pedido não encontrado.");
          if (!reason.trim()) return fail("Indique o motivo do cancelamento.");
          if (r.status === "cancelado") return fail("Este pedido já foi cancelado.");
          const clientAllowed = ["submetido", "aguarda_atribuicao", "agente_atribuido"];
          const adminAllowed = [...clientAllowed, "em_consulta", "resposta_submetida"];
          if (!(by === "cliente" ? clientAllowed : adminAllowed).includes(r.status))
            return fail(
              by === "cliente"
                ? "Já não é possível cancelar: o agente está no terreno ou já respondeu."
                : "Não é possível cancelar um pedido já pago ou concluído.",
            );
          const n: Notification[] = [
            notify({
              role: "cliente",
              userId: r.clientId,
              requestId: id,
              title: "Pedido cancelado",
              body: `O pedido ${id} foi cancelado. Motivo: ${reason.trim()}`,
            }),
          ];
          if (r.agentId)
            n.push(
              notify({
                role: "agente",
                userId: r.agentId,
                requestId: id,
                title: "Pedido cancelado",
                body: `O pedido ${id} foi cancelado. Não é preciso continuar.`,
              }),
            );
          if (by === "cliente")
            n.push(notify({ role: "admin", requestId: id, title: "Pedido cancelado pelo cliente", body: id }));
          patchRequest(
            id,
            () => ({ status: "cancelado", cancelReason: reason.trim() }),
            [event(by, "Pedido cancelado", reason.trim())],
            // an unpaid agent share for a cancelled answer is dropped
            { ledger: get().ledger.filter((l) => !(l.requestId === id && l.status === "devido")) },
            n,
          );
          return { ok: true };
        },

        completeRequest: (id) => {
          const r = findRequest(id);
          if (!r) return fail("Pedido não encontrado.");
          if (r.status === "concluido") return { ok: true };
          if (r.status !== "pagamento_confirmado")
            return fail("Só se conclui um pedido depois de o pagamento ser confirmado.");
          patchRequest(id, () => ({ status: "concluido" }), [event("cliente", "Consulta concluída")]);
          return { ok: true };
        },

        createComplaint: (requestId, reason) => {
          const r = findRequest(requestId);
          if (!r) return fail("Pedido não encontrado.");
          if (reason.trim().length < 10) return fail("Explique o problema em pelo menos uma frase.");
          const id = uid("rc");
          set((s) => ({
            complaints: [
              {
                id,
                requestId,
                clientId: r.clientId,
                reason: reason.trim(),
                status: "aberta",
                createdAt: now(),
              },
              ...s.complaints,
            ],
          }));
          patchRequest(
            requestId,
            () => ({}),
            [event("cliente", "Reclamação aberta", reason.trim())],
            {},
            [
              notify({
                role: "admin",
                requestId,
                title: "Nova reclamação",
                body: `${requestId}: ${reason.trim()}`,
              }),
            ],
          );
          return { ok: true, id };
        },

        // --- Admin ----------------------------------------------------------
        assignAgent: (requestId, agentId) => {
          const r = findRequest(requestId);
          const agent = findAgent(agentId);
          if (!r) return fail("Pedido não encontrado.");
          if (!isAgentEligible(agent))
            return fail("Só agentes aprovados e activos podem receber pedidos.");
          if (!["submetido", "aguarda_atribuicao", "agente_atribuido", "em_consulta"].includes(r.status))
            return fail("Este pedido já não pode ser atribuído.");
          if (r.agentId === agent.id) return fail(`O pedido já está com ${agent.code}.`);
          const reassign = !!r.agentId;
          const n = [
            notify({
              role: "agente",
              userId: agent.id,
              requestId,
              title: "Novo pedido atribuído",
              body: `${requestId}: ${r.description}. Aceite ou rejeite.`,
            }),
            notify({
              role: "cliente",
              userId: r.clientId,
              requestId,
              title: "Agente atribuído",
              body: `O agente ${agent.code} vai tratar do pedido ${requestId}.`,
            }),
          ];
          if (reassign && r.agentId)
            n.push(
              notify({
                role: "agente",
                userId: r.agentId,
                requestId,
                title: "Pedido reatribuído",
                body: `O pedido ${requestId} passou para outro agente.`,
              }),
            );
          patchRequest(
            requestId,
            () => ({ agentId: agent.id, status: "agente_atribuido" }),
            [
              event(
                "admin",
                reassign ? `Pedido reatribuído ao agente ${agent.code}` : `Agente ${agent.code} atribuído`,
                agent.name,
              ),
            ],
            {},
            n,
          );
          return { ok: true };
        },

        updateStatus: (requestId, status, note) => {
          const r = findRequest(requestId);
          if (!r) return fail("Pedido não encontrado.");
          if (status === "pagamento_confirmado" || status === "concluido")
            return fail("O pagamento só pode ser confirmado pelo agente que o recebeu.");
          if (status === "resposta_submetida" && r.results.length === 0)
            return fail("Não há resposta submetida neste pedido.");
          if (status === "cancelado") return get().cancelRequest(requestId, note ?? "Cancelado pela administração", "admin");
          if (["agente_atribuido", "em_consulta"].includes(status) && !r.agentId)
            return fail("Atribua primeiro um agente.");
          const role: Role = get().session.viewAs;
          patchRequest(
            requestId,
            () => ({ status }),
            [event(role, `Estado actualizado`, note)],
            {},
            [
              notify({
                role: "cliente",
                userId: r.clientId,
                requestId,
                title: "Estado do pedido actualizado",
                body: `${requestId} está agora em: ${status.replace(/_/g, " ")}.`,
              }),
            ],
          );
          return { ok: true };
        },

        setComplaintStatus: (id, status, resolution) => {
          const c = get().complaints.find((x) => x.id === id);
          if (!c) return fail("Reclamação não encontrada.");
          if (status === "resolvida" && !resolution?.trim())
            return fail("Escreva a resolução antes de fechar a reclamação.");
          set((s) => ({
            complaints: s.complaints.map((x) =>
              x.id === id
                ? {
                    ...x,
                    status,
                    resolution: resolution?.trim() || x.resolution,
                    resolvedAt: status === "resolvida" ? now() : undefined,
                  }
                : x,
            ),
          }));
          patchRequest(
            c.requestId,
            () => ({}),
            [event("admin", status === "resolvida" ? "Reclamação resolvida" : "Reclamação em análise", resolution)],
            {},
            status === "resolvida"
              ? [
                  notify({
                    role: "cliente",
                    userId: c.clientId,
                    requestId: c.requestId,
                    title: "Reclamação resolvida",
                    body: resolution?.trim() ?? "",
                  }),
                ]
              : [],
          );
          return { ok: true };
        },

        settleCommission: (ledgerId) => {
          const l = get().ledger.find((x) => x.id === ledgerId);
          if (!l || l.kind !== "platform_commission") return fail("Comissão não encontrada.");
          if (l.status === "liquidado") return fail("Esta comissão já foi liquidada.");
          const at = now();
          set((s) => ({
            ledger: s.ledger.map((x) => (x.id === ledgerId ? { ...x, status: "liquidado", settledAt: at } : x)),
          }));
          patchRequest(l.requestId, () => ({}), [
            event("admin", "Comissão da plataforma liquidada", formatKz(l.amount)),
          ], {}, [
            notify({
              role: "agente",
              userId: l.agentId,
              requestId: l.requestId,
              title: "Comissão liquidada",
              body: `Registámos a liquidação de ${formatKz(l.amount)} do pedido ${l.requestId}.`,
            }),
          ]);
          return { ok: true };
        },

        // --- Agent ----------------------------------------------------------
        acceptRequest: (requestId, agentId) => {
          const r = findRequest(requestId);
          if (!r) return fail("Pedido não encontrado.");
          const own = agentOwns(r, agentId);
          if (!own.ok) return own;
          if (r.status !== "agente_atribuido") return fail("Este pedido já não está à espera de aceitação.");
          const actor = own.agent.name;
          patchRequest(
            requestId,
            () => ({ status: "em_consulta" }),
            [
              event("agente", "Pedido aceite pelo agente", undefined, actor),
              event("agente", "Consulta iniciada no terreno", undefined, actor),
            ],
            {},
            [
              notify({
                role: "cliente",
                userId: r.clientId,
                requestId,
                title: "O agente aceitou o pedido",
                body: `${own.agent.code} já está a tratar da sua consulta.`,
              }),
            ],
          );
          return { ok: true };
        },

        rejectRequest: (requestId, reason, agentId) => {
          const r = findRequest(requestId);
          if (!r) return fail("Pedido não encontrado.");
          const own = agentOwns(r, agentId);
          if (!own.ok) return own;
          if (!["agente_atribuido", "em_consulta"].includes(r.status))
            return fail("Já não é possível rejeitar este pedido.");
          if (reason.trim().length < 5) return fail("Indique o motivo da rejeição.");
          const at = now();
          patchRequest(
            requestId,
            (x) => ({
              status: "aguarda_atribuicao",
              agentId: undefined,
              rejections: [...x.rejections, { agentId: own.agent.id, reason: reason.trim(), at }],
            }),
            [
              event("agente", "Pedido rejeitado pelo agente", reason.trim(), own.agent.name),
              event("sistema", "Pedido devolvido à fila de atribuição"),
            ],
            {},
            [
              notify({
                role: "admin",
                requestId,
                title: "Pedido rejeitado por um agente",
                body: `${own.agent.code} rejeitou ${requestId}: ${reason.trim()}`,
              }),
            ],
          );
          return { ok: true };
        },

        submitResults: (requestId, items, agentId) => {
          const r = findRequest(requestId);
          if (!r) return fail("Pedido não encontrado.");
          const own = agentOwns(r, agentId);
          if (!own.ok) return own;
          if (r.status !== "em_consulta") return fail("Aceite o pedido antes de submeter a resposta.");
          if (items.length === 0) return fail("Adicione pelo menos um produto ou marque como não encontrado.");
          for (const it of items) {
            if (!r.surfaceIds.includes(it.surfaceId)) return fail("Há um produto numa superfície que não faz parte do pedido.");
            if (!it.notFound && (it.price == null || it.price <= 0))
              return fail(`Indique o preço de "${it.productName || "produto"}".`);
            if (!it.notFound && !it.store?.trim()) return fail(`Indique a loja de "${it.productName || "produto"}".`);
          }
          const at = now();
          const results: ResultItem[] = items.map((it, i) => ({
            ...it,
            id: `${requestId}-r${r.results.length + i + 1}`,
            photos: it.photos ?? [],
            at,
          }));
          const found = results.filter((x) => !x.notFound).length;
          const incomplete = computeIncomplete(results, r.surfaceIds);
          const agent = own.agent;
          const share: LedgerEntry = {
            id: `${requestId}-ag`,
            requestId,
            agentId: agent.id,
            kind: "agent_share",
            amount: r.agentShare,
            status: "devido",
            createdAt: at,
          };
          patchRequest(
            requestId,
            () => ({ status: "resposta_submetida", results, respondedAt: at, flags: { late: r.flags.late, incomplete } }),
            [
              event(
                "agente",
                "Resposta submetida",
                `${found} produto(s) encontrado(s)${results.length > found ? `, ${results.length - found} não encontrado(s)` : ""}`,
                agent.name,
              ),
              event(
                "sistema",
                "Pagamento ao agente pedido ao cliente",
                `${formatKz(r.price)} por Multicaixa Express para ${agent.paymentInfo.phone}`,
              ),
            ],
            { ledger: [...get().ledger.filter((l) => l.id !== share.id), share] },
            [
              notify({
                role: "cliente",
                userId: r.clientId,
                requestId,
                title: "Resposta pronta: falta o pagamento",
                body: `Pague ${formatKz(r.price)} por Multicaixa Express para ${agent.paymentInfo.phone} (${agent.paymentInfo.holder}). Os resultados abrem quando o agente confirmar.`,
              }),
              notify({
                role: "agente",
                userId: agent.id,
                requestId,
                title: "Confirme quando receber o pagamento",
                body: `O cliente foi informado do valor de ${formatKz(r.price)}. Confirme a recepção para desbloquear os resultados.`,
              }),
              ...(incomplete
                ? [
                    notify({
                      role: "admin",
                      requestId,
                      title: "Resposta incompleta",
                      body: `${requestId} tem produtos não encontrados ou sem preço/foto.`,
                    }),
                  ]
                : []),
            ],
          );
          return { ok: true };
        },

        confirmPayment: (requestId, agentId) => {
          const r = findRequest(requestId);
          if (!r) return fail("Pedido não encontrado.");
          const own = agentOwns(r, agentId);
          if (!own.ok) return own;
          // Rule 7: never confirm the same payment twice.
          if (r.paidAt || ["pagamento_confirmado", "concluido"].includes(r.status))
            return fail("Este pagamento já foi confirmado.");
          // Rule 5: payment only after the answer.
          if (r.status !== "resposta_submetida")
            return fail("Só pode confirmar o pagamento depois de submeter a resposta.");
          const at = now();
          const commission: LedgerEntry = {
            id: `${requestId}-pl`,
            requestId,
            agentId: own.agent.id,
            kind: "platform_commission",
            amount: r.platformShare,
            status: "devido",
            createdAt: at,
          };
          const ledger = get().ledger.some((l) => l.id === `${requestId}-ag`)
            ? get().ledger.map((l) =>
                l.id === `${requestId}-ag` ? { ...l, status: "confirmado" as const, confirmedAt: at } : l,
              )
            : [
                ...get().ledger,
                {
                  id: `${requestId}-ag`,
                  requestId,
                  agentId: own.agent.id,
                  kind: "agent_share" as const,
                  amount: r.agentShare,
                  status: "confirmado" as const,
                  createdAt: at,
                  confirmedAt: at,
                },
              ];
          patchRequest(
            requestId,
            () => ({ status: "pagamento_confirmado", paidAt: at }),
            [
              event("agente", "Recepção do pagamento confirmada", formatKz(r.price), own.agent.name),
              event(
                "sistema",
                "Resultados desbloqueados e comissão registada",
                `Comissão devida à plataforma: ${formatKz(r.platformShare)}`,
              ),
            ],
            { ledger: [...ledger.filter((l) => l.id !== commission.id), commission] },
            [
              notify({
                role: "cliente",
                userId: r.clientId,
                requestId,
                title: "Resultados disponíveis",
                body: `O pagamento foi confirmado. Já pode ver os resultados do pedido ${requestId}.`,
              }),
              notify({
                role: "admin",
                requestId,
                title: "Comissão devida",
                body: `${own.agent.code} deve ${formatKz(r.platformShare)} do pedido ${requestId}.`,
              }),
            ],
          );
          return { ok: true };
        },

        // --- People ---------------------------------------------------------
        suspendClient: (id, reason) => {
          if (!get().clients.some((c) => c.id === id)) return fail("Cliente não encontrado.");
          set((s) => ({
            clients: s.clients.map((c) => (c.id === id ? { ...c, status: "suspenso" } : c)),
            session:
              s.session.currentClientId === id && s.session.viewAs !== "admin"
                ? { ...s.session, currentClientId: null }
                : s.session,
            notifications: [
              notify({ role: "cliente", userId: id, title: "Conta suspensa", body: reason ?? "Contacte o apoio Melhor Preço." }),
              ...s.notifications,
            ],
          }));
          return { ok: true };
        },

        reactivateClient: (id) => {
          if (!get().clients.some((c) => c.id === id)) return fail("Cliente não encontrado.");
          set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, status: "activo" } : c)) }));
          return { ok: true };
        },

        registerAgent: (input) => {
          const s = get();
          if (input.name.trim().length < 3) return fail("Indique o nome completo.");
          if (digits(input.phone).length !== 9) return fail("O telefone deve ter 9 dígitos.");
          if (s.agents.some((a) => digits(a.phone) === digits(input.phone)))
            return fail("Já existe uma candidatura com este telefone.");
          if (input.surfaceIds.length === 0) return fail("Escolha a superfície onde costuma trabalhar.");
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
            paymentInfo: input.paymentInfo ?? {
              method: "multicaixa-express",
              phone: input.phone.trim(),
              holder: input.name.trim(),
            },
            joinedAt: now(),
            trainings: [],
          };
          set((st) => ({
            agents: [...st.agents, agent],
            notifications: [
              notify({ role: "admin", title: "Nova candidatura de agente", body: `${agent.name} (${code}) aguarda aprovação.` }),
              ...st.notifications,
            ],
          }));
          return { ok: true, agent };
        },

        approveAgent: (id) => {
          const a = findAgent(id);
          if (!a) return fail("Agente não encontrado.");
          if (a.status !== "pendente") return fail("Só candidaturas pendentes podem ser aprovadas.");
          return patchAgent(id, { status: "aprovado" });
        },

        activateAgent: (id) => {
          const a = findAgent(id);
          if (!a) return fail("Agente não encontrado.");
          if (a.status === "activo") return fail("Este agente já está activo.");
          if (a.status === "pendente") return fail("Aprove a candidatura antes de activar.");
          if (a.surfaceIds.length === 0) return fail("Associe o agente a pelo menos uma superfície.");
          const r = patchAgent(id, { status: "activo", note: undefined });
          set((s) => ({
            notifications: [
              notify({ role: "agente", userId: id, title: "Conta activa", body: "Já pode receber pedidos." }),
              ...s.notifications,
            ],
          }));
          return r;
        },

        suspendAgent: (id, reason) => {
          const a = findAgent(id);
          if (!a) return fail("Agente não encontrado.");
          if (a.status === "suspenso") return fail("Este agente já está suspenso.");
          return patchAgent(id, { status: "suspenso", note: reason?.trim() || a.note });
        },

        setAgentSurfaces: (id, surfaceIds) => patchAgent(id, { surfaceIds: [...new Set(surfaceIds)] }),

        addAgentTraining: (id, title) => {
          const a = findAgent(id);
          if (!a) return fail("Agente não encontrado.");
          if (!title.trim()) return fail("Indique o nome da formação.");
          return patchAgent(id, { trainings: [...a.trainings, { title: title.trim(), at: now() }] });
        },

        updateAgentPaymentInfo: (id, info) => {
          if (digits(info.phone).length !== 9) return fail("O número Multicaixa Express deve ter 9 dígitos.");
          return patchAgent(id, { paymentInfo: info });
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
          set((s) => ({
            surfaces: existing
              ? s.surfaces.map((x) => (x.id === surface.id ? surface : x))
              : [...s.surfaces, surface],
          }));
          return { ok: true, surface };
        },

        setSurfaceActive: (id, active) => {
          if (!get().surfaces.some((s) => s.id === id)) return fail("Superfície não encontrada.");
          set((s) => ({ surfaces: s.surfaces.map((x) => (x.id === id ? { ...x, active } : x)) }));
          return { ok: true };
        },

        // --- Notifications --------------------------------------------------
        markNotificationRead: (id) =>
          set((s) => ({
            notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
          })),

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
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      // Hydrate after mount (see useHydrated) so static HTML and the first
      // client render match.
      skipHydration: true,
      partialize: (s) => ({
        surfaces: s.surfaces,
        agents: s.agents,
        clients: s.clients,
        requests: s.requests,
        ledger: s.ledger,
        notifications: s.notifications,
        complaints: s.complaints,
        pricing: s.pricing,
        session: s.session,
      }),
      // Unknown/old shapes fall back to a fresh seed instead of crashing.
      migrate: () => initialState(),
      merge: (persisted, current) => {
        const p = persisted as Partial<StoreState> | undefined;
        if (!p || !Array.isArray(p.requests) || !p.session) return current;
        return { ...current, ...p };
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
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => useStore.persist.hasHydrated(),
    () => false,
  );
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

export function useRequest(id: string | null | undefined): ServiceRequest | undefined {
  const requests = useStore((s) => s.requests);
  return useMemo(() => (id ? requests.find((r) => r.id === id) : undefined), [requests, id]);
}

/** Requests sorted newest first, optionally filtered by client or agent. */
export function useRequests(filter: { clientId?: string | null; agentId?: string | null } = {}) {
  const requests = useStore((s) => s.requests);
  const { clientId, agentId } = filter;
  return useMemo(
    () =>
      requests
        .filter(
          (r) =>
            (clientId === undefined || r.clientId === clientId) &&
            (agentId === undefined || r.agentId === agentId),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests, clientId, agentId],
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
          : undefined;
    const items = notifications
      .filter((n) => n.role === session.viewAs && (session.viewAs === "admin" || n.userId === userId))
      .sort((a, b) => b.at.localeCompare(a.at));
    return { items, unread: items.filter((n) => !n.read).length };
  }, [notifications, session]);
}

/** Agents that can receive a request, best match first (covers more of its surfaces). */
export function useEligibleAgents(surfaceIds: string[] = []): Agent[] {
  const agents = useStore((s) => s.agents);
  const key = surfaceIds.join("|");
  return useMemo(() => {
    const ids = key ? key.split("|") : [];
    const score = (a: Agent) => a.surfaceIds.filter((s) => ids.includes(s)).length;
    return agents.filter(isAgentEligible).sort((a, b) => score(b) - score(a));
  }, [agents, key]);
}

/** Totals for the financial view. */
export function useFinanceSummary() {
  const ledger = useStore((s) => s.ledger);
  return useMemo(() => {
    const sum = (f: (l: LedgerEntry) => boolean) =>
      ledger.filter(f).reduce((t, l) => t + l.amount, 0);
    return {
      agentDue: sum((l) => l.kind === "agent_share" && l.status === "devido"),
      agentConfirmed: sum((l) => l.kind === "agent_share" && l.status === "confirmado"),
      commissionDue: sum((l) => l.kind === "platform_commission" && l.status === "devido"),
      commissionSettled: sum((l) => l.kind === "platform_commission" && l.status === "liquidado"),
    };
  }, [ledger]);
}
