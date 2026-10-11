import { formatKz } from "../format";
import { REQUEST_STATUS_ORDER } from "../labels";
import { computePrice, DEFAULT_PRICING } from "../pricing";
import { computeIncomplete } from "../rules";
import type {
  AuditEvent,
  Availability,
  Category,
  Priority,
  RequestStatus,
  ResultItem,
  ServiceRequest,
} from "../types";
import { AGENTS, CLIENTS } from "./people";
import { PHOTOS } from "./photos";

export const ADMIN_NAME = "Administração";

const SP = "sf-shopping-popular";
const CC = "sf-cidade-da-china";
const NSP = "sf-novo-sao-paulo";

const MIN = 60_000;
const add = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * MIN).toISOString();
/** Luanda local time (UTC+1) to ISO. */
const lua = (date: string, time: string) => new Date(`${date}T${time}:00+01:00`).toISOString();

type R = {
  surfaceId: string;
  productName: string;
  brandModel?: string;
  price?: number;
  store?: string;
  location?: string;
  availability?: Availability;
  variants?: string;
  photos?: string[];
  observations?: string;
  notFound?: boolean;
};

interface Spec {
  n: number;
  clientId: string;
  category: Category;
  description: string;
  brand?: string;
  features?: string;
  variants?: string;
  photo?: string;
  surfaceIds: string[];
  priority?: Priority;
  deadline?: string;
  createdAt: string;
  status: RequestStatus;
  /** For cancelled requests: the last state reached before cancelling. */
  cancelledFrom?: RequestStatus;
  cancel?: { by: "cliente" | "admin"; reason: string };
  agentId?: string;
  rejectedBy?: { agentId: string; reason: string };
  results?: R[];
  late?: boolean;
  /** Minutes the agent spent in the field (accept -> answer). */
  fieldMinutes?: number;
}

const rank = (s: RequestStatus) => REQUEST_STATUS_ORDER.indexOf(s);

function build(s: Spec): ServiceRequest {
  const id = `MP-2026-${String(s.n).padStart(5, "0")}`;
  const priority = s.priority ?? "normal";
  const quote = computePrice(DEFAULT_PRICING, s.surfaceIds.length, priority);
  const client = CLIENTS.find((c) => c.id === s.clientId)!;
  const agent = AGENTS.find((a) => a.id === s.agentId);
  const reached = s.status === "cancelado" ? (s.cancelledFrom ?? "submetido") : s.status;
  const has = (st: RequestStatus) => rank(reached) >= rank(st);

  const tl: AuditEvent[] = [];
  let t = s.createdAt;
  tl.push({
    at: t,
    actor: client.name,
    role: "cliente",
    action: "Pedido submetido",
    note: `Valor da consulta: ${formatKz(quote.price)}`,
  });

  if (has("aguarda_atribuicao")) {
    t = add(t, 1);
    tl.push({ at: t, actor: "Sistema", role: "sistema", action: "Pedido em fila para atribuição" });
  }

  if (s.rejectedBy && has("aguarda_atribuicao")) {
    const r = AGENTS.find((a) => a.id === s.rejectedBy!.agentId)!;
    t = add(t, 20);
    tl.push({ at: t, actor: ADMIN_NAME, role: "admin", action: `Agente ${r.code} atribuído`, note: r.name });
    t = add(t, 15);
    tl.push({
      at: t,
      actor: r.name,
      role: "agente",
      action: "Pedido rejeitado pelo agente",
      note: s.rejectedBy.reason,
    });
    t = add(t, 1);
    tl.push({ at: t, actor: "Sistema", role: "sistema", action: "Pedido devolvido à fila de atribuição" });
  }

  if (has("agente_atribuido") && agent) {
    t = add(t, 25);
    tl.push({ at: t, actor: ADMIN_NAME, role: "admin", action: `Agente ${agent.code} atribuído`, note: agent.name });
  }
  if (has("em_consulta") && agent) {
    t = add(t, 12);
    tl.push({ at: t, actor: agent.name, role: "agente", action: "Pedido aceite pelo agente" });
    t = add(t, 3);
    tl.push({ at: t, actor: agent.name, role: "agente", action: "Consulta iniciada no terreno" });
  }

  let results: ResultItem[] = [];
  let respondedAt: string | undefined;
  let paidAt: string | undefined;
  if (has("resposta_submetida") && agent) {
    const start = t;
    t = add(t, s.fieldMinutes ?? 140);
    respondedAt = t;
    const list = s.results ?? [];
    results = list.map((r, i) => ({
      id: `${id}-r${i + 1}`,
      surfaceId: r.surfaceId,
      notFound: !!r.notFound,
      productName: r.productName,
      brandModel: r.brandModel,
      price: r.price,
      store: r.store,
      location: r.location,
      availability: r.availability,
      variants: r.variants,
      photos: r.photos ?? [],
      observations: r.observations,
      at: add(start, Math.round(((i + 1) * (s.fieldMinutes ?? 140)) / (list.length + 1))),
    }));
    const found = results.filter((r) => !r.notFound).length;
    tl.push({
      at: t,
      actor: agent.name,
      role: "agente",
      action: "Resposta submetida",
      note: `${found} produto(s) encontrado(s)${results.length > found ? `, ${results.length - found} não encontrado(s)` : ""}`,
    });
    tl.push({
      at: add(t, 0.1),
      actor: "Sistema",
      role: "sistema",
      action: "Pagamento ao agente pedido ao cliente",
      note: `${formatKz(quote.price)} por Multicaixa Express para ${agent.paymentInfo.phone}`,
    });
  }
  if (has("pagamento_confirmado") && agent) {
    t = add(t, 48);
    paidAt = t;
    tl.push({ at: t, actor: agent.name, role: "agente", action: "Recepção do pagamento confirmada", note: formatKz(quote.price) });
    tl.push({
      at: add(t, 0.1),
      actor: "Sistema",
      role: "sistema",
      action: "Resultados desbloqueados e comissão registada",
      note: `Comissão devida à plataforma: ${formatKz(quote.platformShare)}`,
    });
  }
  if (has("concluido") && agent) {
    t = add(t, 35);
    tl.push({ at: t, actor: client.name, role: "cliente", action: "Consulta concluída" });
  }
  if (s.status === "cancelado" && s.cancel) {
    t = add(t, 40);
    tl.push({
      at: t,
      actor: s.cancel.by === "cliente" ? client.name : ADMIN_NAME,
      role: s.cancel.by,
      action: "Pedido cancelado",
      note: s.cancel.reason,
    });
  }

  return {
    id,
    clientId: s.clientId,
    category: s.category,
    description: s.description,
    brand: s.brand,
    features: s.features,
    variants: s.variants,
    photo: s.photo,
    surfaceIds: s.surfaceIds,
    priority,
    deadline: s.deadline,
    price: quote.price,
    agentShare: quote.agentShare,
    platformShare: quote.platformShare,
    status: s.status,
    agentId: has("agente_atribuido") ? s.agentId : undefined,
    createdAt: s.createdAt,
    updatedAt: t,
    respondedAt,
    paidAt,
    rejections: s.rejectedBy
      ? [{ agentId: s.rejectedBy.agentId, reason: s.rejectedBy.reason, at: add(s.createdAt, 36) }]
      : [],
    cancelReason: s.cancel?.reason,
    results,
    timeline: tl,
    flags: {
      late: !!s.late,
      incomplete: results.length > 0 && computeIncomplete(results, s.surfaceIds),
    },
  };
}

const SPECS: Spec[] = [
  // ---- Concluídas -------------------------------------------------------
  {
    n: 21,
    clientId: "cl-001",
    category: "electrodomesticos",
    description: "Geleira de 350 litros, duas portas",
    brand: "Hisense",
    features: "Frost free, classe energética A+",
    variants: "Cinzenta ou inox",
    surfaceIds: [SP, CC],
    createdAt: lua("2026-09-22", "09:14"),
    status: "concluido",
    agentId: "ag-001",
    fieldMinutes: 190,
    results: [
      {
        surfaceId: SP,
        productName: "Geleira combinada 350 L",
        brandModel: "Hisense RD-35DC4SA",
        price: 389_000,
        store: "Casa dos Frios Camama",
        location: "Piso 0, corredor C, loja 12",
        availability: "disponivel",
        variants: "Cinzenta (3 unidades), inox (1 unidade)",
        photos: [PHOTOS.fridge],
        observations: "Garantia de 12 meses na loja. Entrega no Camama paga à parte.",
      },
      {
        surfaceId: CC,
        productName: "Geleira combinada 350 L",
        brandModel: "Hisense RD-35DC4SA",
        price: 362_500,
        store: "Armazém Lucky Star",
        location: "Pavilhão 4, porta 27",
        availability: "poucas_unidades",
        variants: "Só cinzenta",
        photos: [PHOTOS.fridge],
        observations: "Preço de pronto pagamento. Sem garantia escrita.",
      },
    ],
  },
  {
    n: 22,
    clientId: "cl-002",
    category: "materiais",
    description: "Cimento Portland 42,5, saco de 50 kg",
    features: "Preço por saco e por palete",
    surfaceIds: [NSP],
    createdAt: lua("2026-09-23", "07:40"),
    status: "concluido",
    agentId: "ag-003",
    fieldMinutes: 95,
    results: [
      {
        surfaceId: NSP,
        productName: "Cimento Portland CEM II 42,5 (50 kg)",
        brandModel: "Cimangola",
        price: 6_500,
        store: "Materiais Kudissanga",
        location: "Ala sul, banca 88",
        availability: "disponivel",
        variants: "Palete de 40 sacos a 252 000 Kz",
        photos: [PHOTOS.construction],
        observations: "Descarga não incluída.",
      },
      {
        surfaceId: NSP,
        productName: "Cimento Portland 42,5 (50 kg)",
        brandModel: "Nova Cimangola",
        price: 6_300,
        store: "Depósito Tchiweka",
        location: "Saída para a estrada, armazém azul",
        availability: "disponivel",
        photos: [PHOTOS.construction],
      },
    ],
  },
  {
    n: 23,
    clientId: "cl-003",
    category: "telemoveis",
    description: "Telemóvel Android com 128 GB, bateria grande",
    brand: "Samsung Galaxy A15 ou equivalente",
    features: "Dual SIM, 128 GB, 4 GB RAM",
    surfaceIds: [CC, NSP],
    createdAt: lua("2026-09-24", "11:02"),
    status: "concluido",
    agentId: "ag-003",
    fieldMinutes: 160,
    results: [
      {
        surfaceId: CC,
        productName: "Smartphone 6,5\" 128 GB",
        brandModel: "Samsung Galaxy A15",
        price: 149_900,
        store: "Telecel Zango",
        location: "Pavilhão 2, loja 5",
        availability: "disponivel",
        variants: "Preto, azul claro",
        photos: [PHOTOS.phone],
        observations: "Selado, com factura.",
      },
      {
        surfaceId: CC,
        productName: "Smartphone 6,6\" 128 GB",
        brandModel: "Tecno Spark 20",
        price: 92_000,
        store: "Telecel Zango",
        location: "Pavilhão 2, loja 5",
        availability: "disponivel",
        variants: "Preto, dourado",
        photos: [PHOTOS.phone],
      },
      {
        surfaceId: NSP,
        productName: "Smartphone 128 GB",
        brandModel: "Samsung Galaxy A15",
        notFound: true,
        observations: "Nenhuma das 6 bancas de telemóveis tinha o modelo.",
      },
    ],
  },
  {
    n: 24,
    clientId: "cl-004",
    category: "roupa",
    description: "T-shirts brancas de algodão para uniforme, tamanhos M e L",
    variants: "20 unidades M, 15 unidades L",
    surfaceIds: [CC],
    createdAt: lua("2026-09-26", "14:20"),
    status: "concluido",
    agentId: "ag-002",
    fieldMinutes: 75,
    results: [
      {
        surfaceId: CC,
        productName: "T-shirt 100% algodão, gola redonda",
        price: 3_500,
        store: "Têxteis Guangzhou",
        location: "Pavilhão 7, banca 112",
        availability: "disponivel",
        variants: "M e L em stock; a partir de 30 unidades fica a 3 100 Kz",
        photos: [PHOTOS.tshirt],
      },
    ],
  },
  {
    n: 25,
    clientId: "cl-001",
    category: "electronica",
    description: "Televisor de 43 polegadas, smart TV",
    features: "Full HD ou 4K, com Wi-Fi",
    surfaceIds: [SP],
    createdAt: lua("2026-09-29", "18:45"),
    status: "concluido",
    agentId: "ag-004",
    fieldMinutes: 120,
    results: [
      {
        surfaceId: SP,
        productName: "Smart TV 43\" 4K",
        brandModel: "TCL 43P635",
        price: 214_000,
        store: "Electro Kamba",
        location: "Piso 1, loja 33",
        availability: "disponivel",
        photos: [PHOTOS.tv],
        observations: "Inclui suporte de parede.",
      },
      {
        surfaceId: SP,
        productName: "Smart TV 43\" Full HD",
        brandModel: "Hisense 43A4",
        price: 187_500,
        store: "Mundo Digital",
        location: "Piso 0, loja 8",
        availability: "poucas_unidades",
        photos: [PHOTOS.tv],
      },
    ],
  },
  {
    n: 26,
    clientId: "cl-005",
    category: "calcado",
    description: "Ténis de corrida de senhora, número 38",
    surfaceIds: [SP],
    createdAt: lua("2026-09-30", "10:10"),
    status: "concluido",
    agentId: "ag-001",
    fieldMinutes: 85,
    results: [
      {
        surfaceId: SP,
        productName: "Ténis de corrida, sola amortecida",
        price: 22_500,
        store: "Passo Certo",
        location: "Piso 0, corredor A, loja 3",
        availability: "disponivel",
        variants: "38 em branco e cinzento; 39 em preto",
        photos: [PHOTOS.shoes],
      },
    ],
  },
  // ---- Pagamento confirmado (resultados desbloqueados) ------------------
  {
    n: 27,
    clientId: "cl-006",
    category: "electrodomesticos",
    description: "Máquina de lavar roupa de 7 kg",
    features: "Carga frontal",
    surfaceIds: [SP, NSP],
    createdAt: lua("2026-10-03", "08:30"),
    status: "pagamento_confirmado",
    agentId: "ag-001",
    fieldMinutes: 200,
    results: [
      {
        surfaceId: SP,
        productName: "Máquina de lavar 7 kg, carga frontal",
        brandModel: "LG F2J3HS0W",
        price: 268_000,
        store: "Casa dos Frios Camama",
        location: "Piso 0, corredor C, loja 12",
        availability: "disponivel",
        photos: [PHOTOS.washer],
      },
      {
        surfaceId: NSP,
        productName: "Máquina de lavar 7 kg",
        brandModel: "Midea MF100W70",
        price: 231_000,
        store: "Electro Zango 3",
        location: "Entrada norte, loja 2",
        availability: "por_encomenda",
        photos: [PHOTOS.washer],
        observations: "Chega em 5 dias. Pedem sinal de 50%.",
      },
    ],
  },
  {
    n: 28,
    clientId: "cl-007",
    category: "materiais",
    description: "Tinta plástica branca, balde de 20 litros",
    features: "Para interior",
    surfaceIds: [CC],
    createdAt: lua("2026-10-05", "13:05"),
    status: "pagamento_confirmado",
    agentId: "ag-002",
    fieldMinutes: 70,
    results: [
      {
        surfaceId: CC,
        productName: "Tinta plástica mate branca 20 L",
        brandModel: "Robbialac",
        price: 38_000,
        store: "Tintas Huambo",
        location: "Pavilhão 1, loja 19",
        availability: "disponivel",
        photos: [PHOTOS.paint],
      },
      {
        surfaceId: CC,
        productName: "Tinta plástica branca 20 L (marca branca)",
        price: 24_500,
        store: "Armazém Lucky Star",
        location: "Pavilhão 4, porta 27",
        availability: "disponivel",
        photos: [],
        observations: "Não foi possível fotografar: o vendedor não autorizou.",
      },
    ],
  },
  {
    n: 29,
    clientId: "cl-008",
    category: "electrodomesticos",
    description: "Micro-ondas de 20 litros",
    surfaceIds: [SP],
    priority: "urgente",
    createdAt: lua("2026-10-07", "09:00"),
    status: "pagamento_confirmado",
    agentId: "ag-004",
    fieldMinutes: 60,
    results: [
      {
        surfaceId: SP,
        productName: "Micro-ondas 20 L com grill",
        brandModel: "Samsung MG20A7013",
        price: 61_000,
        store: "Electro Kamba",
        location: "Piso 1, loja 33",
        availability: "disponivel",
        photos: [PHOTOS.microwave],
      },
    ],
  },
  // ---- Resposta submetida, pagamento pendente ---------------------------
  {
    n: 30,
    clientId: "cl-001",
    category: "electrodomesticos",
    description: "Ar condicionado split de 12 000 BTU",
    features: "Inverter, com instalação se possível",
    surfaceIds: [SP],
    createdAt: lua("2026-10-09", "10:15"),
    status: "resposta_submetida",
    agentId: "ag-001",
    fieldMinutes: 130,
    results: [
      {
        surfaceId: SP,
        productName: "Ar condicionado split 12 000 BTU inverter",
        brandModel: "Midea Xtreme",
        price: 285_000,
        store: "Frio Total",
        location: "Piso 0, loja 41",
        availability: "disponivel",
        photos: [PHOTOS.airCon],
        observations: "Instalação a 35 000 Kz, com tubagem até 3 m.",
      },
      {
        surfaceId: SP,
        productName: "Ar condicionado split 12 000 BTU",
        brandModel: "Gree GWH12",
        price: 259_000,
        store: "Mundo Digital",
        location: "Piso 0, loja 8",
        availability: "poucas_unidades",
        photos: [PHOTOS.airCon],
      },
    ],
  },
  {
    n: 31,
    clientId: "cl-009",
    category: "roupa",
    description: "Vestido de cerimónia, tamanho 40",
    variants: "Azul-marinho ou verde",
    surfaceIds: [CC, NSP],
    createdAt: lua("2026-10-09", "16:40"),
    status: "resposta_submetida",
    agentId: "ag-003",
    fieldMinutes: 150,
    results: [
      {
        surfaceId: CC,
        productName: "Vestido midi de cerimónia",
        price: 15_000,
        store: "Moda Shanghai",
        location: "Pavilhão 7, banca 64",
        availability: "disponivel",
        variants: "Azul-marinho 40 e 42",
        photos: [PHOTOS.dress],
      },
      {
        surfaceId: NSP,
        productName: "Vestido de cerimónia",
        notFound: true,
        observations: "Só havia tamanhos 36 e 38.",
      },
    ],
  },
  {
    n: 32,
    clientId: "cl-010",
    category: "materiais",
    description: "Varão de ferro de 12 mm, 12 metros",
    features: "Preço por unidade e por tonelada",
    surfaceIds: [NSP],
    createdAt: lua("2026-10-10", "07:55"),
    status: "resposta_submetida",
    agentId: "ag-003",
    fieldMinutes: 80,
    results: [
      {
        surfaceId: NSP,
        productName: "Varão nervurado 12 mm x 12 m",
        price: 4_800,
        store: "Ferragens Mwangole",
        location: "Ala sul, armazém 3",
        availability: "disponivel",
        variants: "Tonelada a 585 000 Kz",
        photos: [PHOTOS.construction],
      },
    ],
  },
  // ---- Em consulta ------------------------------------------------------
  {
    n: 33,
    clientId: "cl-003",
    category: "mobiliario",
    description: "Colchão de casal 140x190, espuma de alta densidade",
    surfaceIds: [SP],
    createdAt: lua("2026-10-10", "11:20"),
    status: "em_consulta",
    agentId: "ag-001",
  },
  {
    n: 34,
    clientId: "cl-011",
    category: "alimentacao",
    description: "Arroz agulha, saco de 25 kg, e óleo alimentar de 5 L",
    features: "Preço por grosso para 10 sacos",
    surfaceIds: [CC],
    priority: "urgente",
    deadline: lua("2026-10-10", "17:00"),
    createdAt: lua("2026-10-10", "08:05"),
    status: "em_consulta",
    agentId: "ag-002",
    late: true,
  },
  // ---- Agente atribuído (à espera de aceitação) -------------------------
  {
    n: 35,
    clientId: "cl-001",
    category: "telemoveis",
    description: "Tablet de 10 polegadas para estudos",
    features: "Com capa e 64 GB no mínimo",
    surfaceIds: [SP],
    createdAt: lua("2026-10-11", "08:10"),
    status: "agente_atribuido",
    agentId: "ag-001",
  },
  {
    n: 36,
    clientId: "cl-005",
    category: "beleza",
    description: "Cabelo humano liso, 20 polegadas, 3 pacotes",
    surfaceIds: [CC],
    createdAt: lua("2026-10-11", "08:45"),
    status: "agente_atribuido",
    agentId: "ag-002",
  },
  // ---- A aguardar atribuição -------------------------------------------
  {
    n: 37,
    clientId: "cl-002",
    category: "materiais",
    description: "Mosaico cerâmico 60x60 para sala, cor creme",
    features: "Preço por metro quadrado, 45 m²",
    surfaceIds: [NSP, CC],
    createdAt: lua("2026-10-11", "07:30"),
    status: "aguarda_atribuicao",
    rejectedBy: { agentId: "ag-003", reason: "Hoje estou só no Novo São Paulo, não consigo ir à Cidade da China." },
  },
  {
    n: 38,
    clientId: "cl-008",
    category: "electrodomesticos",
    description: "Fogão a gás de 4 bocas com forno",
    surfaceIds: [SP],
    createdAt: lua("2026-10-11", "09:20"),
    status: "aguarda_atribuicao",
  },
  // ---- Cancelados -------------------------------------------------------
  {
    n: 39,
    clientId: "cl-006",
    category: "calcado",
    description: "Sapatos escolares pretos, números 32 e 35",
    surfaceIds: [SP],
    createdAt: lua("2026-10-01", "15:00"),
    status: "cancelado",
    cancelledFrom: "aguarda_atribuicao",
    cancel: { by: "cliente", reason: "Já comprei noutro sítio." },
  },
  {
    n: 40,
    clientId: "cl-012",
    category: "telemoveis",
    description: "Telemóveis usados em lote para revenda",
    surfaceIds: [CC],
    createdAt: lua("2026-10-04", "12:30"),
    status: "cancelado",
    cancelledFrom: "aguarda_atribuicao",
    cancel: { by: "admin", reason: "Pedido fora do âmbito: a plataforma não negocia lotes para revenda." },
  },
  // ---- Submetido agora --------------------------------------------------
  {
    n: 41,
    clientId: "cl-004",
    category: "electrodomesticos",
    description: "Geleira Hisense de 350 litros, cinzenta",
    brand: "Hisense",
    variants: "Cinzenta",
    surfaceIds: [SP, CC],
    createdAt: lua("2026-10-11", "10:02"),
    status: "submetido",
  },
];

export const REQUESTS: ServiceRequest[] = SPECS.map(build);
