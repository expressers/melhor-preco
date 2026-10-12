import { formatKz } from "../format";
import { formatReference, generateReference } from "../finance";
import { REQUEST_STATUS_ORDER } from "../labels";
import { DEFAULT_PRICING, quoteFor } from "../pricing";
import { computeIncomplete } from "../rules";
import type {
  AuditEvent,
  Availability,
  Category,
  MulticaixaReference,
  Priority,
  RequestItem,
  RequestStatus,
  ResultItem,
  ServiceRequest,
} from "../types";
import { AGENTS, CLIENTS, OPERATORS } from "./people";
import { PHOTOS } from "./photos";

// Fictional requests (v2 model): items[], one surface, gross/net split and a
// fictitious Multicaixa reference. Every status of CHANGES §11 is covered.

export const ADMIN_NAME = "Administração";

const SP = "sf-shopping-popular";
const CC = "sf-cidade-da-china";
const NSP = "sf-novo-sao-paulo";

const MIN = 60_000;
const add = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * MIN).toISOString();
/** Luanda local time (UTC+1) to ISO. */
const lua = (date: string, time: string) => new Date(`${date}T${time}:00+01:00`).toISOString();

type ItemSpec = Omit<RequestItem, "id">;

type R = {
  item: number; // 1-based index into items
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
  surfaceId: string;
  items: ItemSpec[];
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
  /** Minutes between the reference and the confirmed payment. */
  payMinutes?: number;
  paidBy?: "admin" | "demo";
}

const rank = (s: RequestStatus) => REQUEST_STATUS_ORDER.indexOf(s);

/** Operator of a surface at a given moment (CC changed operator on 16 Sep). */
function operatorAt(surfaceId: string, at: string) {
  const ops = OPERATORS.filter((o) => o.surfaceId === surfaceId && o.joinedAt <= at);
  return ops.find((o) => o.status === "activo") ?? ops[0];
}

const refNote = (ref: MulticaixaReference) =>
  `Entidade ${ref.entity} · Referência ${formatReference(ref.reference)} · ${formatKz(ref.amount)} (demonstração)`;

function build(s: Spec): ServiceRequest {
  const id = `MP-2026-${String(s.n).padStart(5, "0")}`;
  const priority = s.priority ?? "normal";
  const q = quoteFor(s.items.length, DEFAULT_PRICING);
  const items: RequestItem[] = s.items.map((it, i) => ({ ...it, id: `${id}-i${i + 1}` }));
  const client = CLIENTS.find((c) => c.id === s.clientId)!;
  const agent = AGENTS.find((a) => a.id === s.agentId);
  const operator = operatorAt(s.surfaceId, s.createdAt);
  const reached = s.status === "cancelado" ? (s.cancelledFrom ?? "submetido") : s.status;
  const has = (st: RequestStatus) => rank(reached) >= rank(st);

  const tl: AuditEvent[] = [];
  let t = s.createdAt;
  tl.push({
    at: t,
    actor: client.name,
    role: "cliente",
    action: "Pedido submetido",
    note: `${q.label}: ${q.breakdown} = ${formatKz(q.gross)}`,
  });

  if (has("aguarda_atribuicao")) {
    t = add(t, 1);
    tl.push({ at: t, actor: "Sistema", role: "sistema", action: "Pedido em fila para atribuição pelo operador" });
  }

  if (s.rejectedBy && has("aguarda_atribuicao")) {
    const r = AGENTS.find((a) => a.id === s.rejectedBy!.agentId)!;
    t = add(t, 20);
    tl.push({ at: t, actor: operator?.name ?? ADMIN_NAME, role: "operador", action: `Agente ${r.code} atribuído`, note: r.name });
    t = add(t, 15);
    tl.push({ at: t, actor: r.name, role: "agente", action: "Pedido rejeitado pelo agente", note: s.rejectedBy.reason });
    t = add(t, 1);
    tl.push({ at: t, actor: "Sistema", role: "sistema", action: "Pedido devolvido à fila de atribuição" });
  }

  let acceptedAt: string | undefined;
  if (has("agente_atribuido") && agent) {
    t = add(t, 25);
    tl.push({ at: t, actor: operator?.name ?? ADMIN_NAME, role: "operador", action: `Agente ${agent.code} atribuído`, note: agent.name });
  }
  if (has("em_consulta") && agent) {
    t = add(t, 12);
    acceptedAt = t;
    tl.push({ at: t, actor: agent.name, role: "agente", action: "Pedido aceite pelo agente" });
    t = add(t, 3);
    tl.push({ at: t, actor: agent.name, role: "agente", action: "Consulta iniciada no terreno" });
  }

  let results: ResultItem[] = [];
  let respondedAt: string | undefined;
  let paidAt: string | undefined;
  let completedAt: string | undefined;
  let reference: MulticaixaReference | undefined;
  if (has("resposta_submetida") && agent) {
    const start = t;
    t = add(t, s.fieldMinutes ?? 140);
    respondedAt = t;
    const list = s.results ?? [];
    results = list.map((r, i) => ({
      id: `${id}-r${i + 1}`,
      itemId: `${id}-i${r.item}`,
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
    reference = generateReference(id, q.gross, add(t, 0.1));
    tl.push({ at: add(t, 0.1), actor: "Sistema", role: "sistema", action: "Referência Multicaixa gerada", note: refNote(reference) });
  }
  if (has("pagamento_confirmado") && agent && reference) {
    t = add(t, s.payMinutes ?? 48);
    paidAt = t;
    const by = s.paidBy ?? "admin";
    reference = { ...reference, status: "paga", paidAt, confirmedBy: by };
    tl.push({
      at: t,
      actor: by === "admin" ? ADMIN_NAME : "Sistema",
      role: by === "admin" ? "admin" : "sistema",
      action: by === "admin" ? "Pagamento da referência confirmado" : "Pagamento da referência simulado (demonstração)",
      note: formatKz(q.gross),
    });
    tl.push({
      at: add(t, 0.1),
      actor: "Sistema",
      role: "sistema",
      action: "Resultados desbloqueados e carteira do agente creditada",
      note: `Agente: ${formatKz(q.split.agent)} (60% do líquido de ${formatKz(q.net)})`,
    });
  }
  if (has("concluido") && agent) {
    t = add(t, 35);
    completedAt = t;
    tl.push({ at: t, actor: client.name, role: "cliente", action: "Consulta concluída" });
  }
  if (s.status === "cancelado" && s.cancel) {
    t = add(t, 40);
    if (reference) reference = { ...reference, status: "anulada" };
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
    items,
    surfaceId: s.surfaceId,
    priority,
    deadline: s.deadline,
    kind: q.kind,
    amounts: {
      itemCount: q.itemCount,
      unitPrice: q.unitPrice,
      gross: q.gross,
      taxRate: q.taxRate,
      taxes: q.taxes,
      net: q.net,
    },
    split: q.split,
    status: s.status,
    agentId: has("agente_atribuido") ? s.agentId : undefined,
    operatorId: operator?.id,
    createdAt: s.createdAt,
    updatedAt: t,
    acceptedAt,
    respondedAt,
    paidAt,
    completedAt,
    reference,
    rejections: s.rejectedBy
      ? [{ agentId: s.rejectedBy.agentId, reason: s.rejectedBy.reason, at: add(s.createdAt, 36) }]
      : [],
    cancelReason: s.cancel?.reason,
    results,
    timeline: tl,
    flags: {
      late: !!s.late,
      incomplete: results.length > 0 && computeIncomplete(results, items),
    },
  };
}

// ---------------------------------------------------------------------------
// Historic, completed requests (September and early October). Compact form:
// one found offer per item.
// ---------------------------------------------------------------------------

type H = [category: Category, name: string, price: number, store: string, location: string, photo?: string];

function hist(
  n: number,
  clientId: string,
  surfaceId: string,
  agentId: string,
  date: string,
  time: string,
  rows: H[],
): Spec {
  return {
    n,
    clientId,
    surfaceId,
    agentId,
    createdAt: lua(date, time),
    status: "concluido",
    fieldMinutes: 60 + rows.length * 30,
    items: rows.map(([category, name]) => ({ category, name })),
    results: rows.map(([, name, price, store, location, photo], i) => ({
      item: i + 1,
      productName: name,
      price,
      store,
      location,
      availability: "disponivel" as const,
      photos: photo ? [photo] : [],
    })),
  };
}

const HISTORIC: Spec[] = [
  hist(1, "cl-002", SP, "ag-001", "2026-09-01", "08:20", [
    ["materiais", "Tubo PVC 110 mm, 6 m", 9_800, "Ferragens Camama", "Piso 0, loja 51", PHOTOS.construction],
    ["materiais", "Joelho PVC 110 mm", 1_200, "Ferragens Camama", "Piso 0, loja 51", PHOTOS.construction],
  ]),
  hist(2, "cl-004", CC, "ag-002", "2026-09-02", "10:05", [
    ["roupa", "Polo de algodão azul-marinho", 4_200, "Têxteis Guangzhou", "Pavilhão 7, banca 112", PHOTOS.tshirt],
  ]),
  hist(3, "cl-001", SP, "ag-004", "2026-09-03", "17:40", [
    ["electrodomesticos", "Ventilador de pé 16\"", 27_500, "Electro Kamba", "Piso 1, loja 33", PHOTOS.airCon],
  ]),
  hist(4, "cl-010", NSP, "ag-003", "2026-09-04", "07:30", [
    ["materiais", "Areia lavada, metro cúbico", 18_000, "Depósito Tchiweka", "Saída para a estrada, armazém azul", PHOTOS.construction],
    ["materiais", "Brita 1, metro cúbico", 24_000, "Depósito Tchiweka", "Saída para a estrada, armazém azul", PHOTOS.construction],
    ["materiais", "Bloco de cimento 15 cm", 350, "Materiais Kudissanga", "Ala sul, banca 88", PHOTOS.construction],
  ]),
  hist(5, "cl-008", SP, "ag-001", "2026-09-05", "09:10", [
    ["electronica", "Impressora multifunções laser", 145_000, "Mundo Digital", "Piso 0, loja 8", PHOTOS.tv],
    ["outros", "Resma de papel A4 80 g", 4_500, "Papelaria Kianda", "Piso 1, loja 4"],
  ]),
  hist(6, "cl-005", CC, "ag-003", "2026-09-06", "11:45", [
    ["beleza", "Creme hidratante corporal 400 ml", 3_900, "Cosméticos Lua Nova", "Pavilhão 3, banca 22"],
  ]),
  hist(7, "cl-002", NSP, "ag-003", "2026-09-08", "08:00", [
    ["materiais", "Telha de fibrocimento 2,44 m", 7_200, "Ferragens Mwangole", "Ala sul, armazém 3", PHOTOS.construction],
  ]),
  hist(8, "cl-003", SP, "ag-004", "2026-09-09", "18:20", [
    ["calcado", "Sandálias de senhora, número 37", 9_500, "Passo Certo", "Piso 0, corredor A, loja 3", PHOTOS.shoes],
  ]),
  hist(9, "cl-006", NSP, "ag-003", "2026-09-10", "10:30", [
    ["mobiliario", "Cadeira de plástico com braços", 6_000, "Casa Zango", "Entrada norte, banca 9"],
    ["mobiliario", "Mesa de plástico 4 lugares", 21_000, "Casa Zango", "Entrada norte, banca 9"],
  ]),
  hist(10, "cl-007", SP, "ag-001", "2026-09-11", "15:15", [
    ["telemoveis", "Carregador USB-C 25 W", 6_500, "Telecel Camama", "Piso 1, loja 19", PHOTOS.phone],
  ]),
  hist(11, "cl-004", CC, "ag-002", "2026-09-13", "09:00", [
    ["roupa", "Calças de trabalho, tamanho 42", 8_800, "Fardas Huambo", "Pavilhão 6, loja 2", PHOTOS.tshirt],
    ["calcado", "Botas de segurança, número 42", 19_500, "Fardas Huambo", "Pavilhão 6, loja 2", PHOTOS.shoes],
  ]),
  hist(12, "cl-009", NSP, "ag-003", "2026-09-15", "16:50", [
    ["alimentacao", "Feijão manteiga, saco de 25 kg", 32_000, "Armazém Kalandula", "Ala norte, armazém 1"],
  ]),
  hist(13, "cl-010", SP, "ag-004", "2026-09-17", "08:40", [
    ["electrodomesticos", "Bebedouro de água com garrafão", 49_000, "Frio Total", "Piso 0, loja 41", PHOTOS.fridge],
    ["electrodomesticos", "Micro-ondas 20 L", 58_000, "Electro Kamba", "Piso 1, loja 33", PHOTOS.microwave],
    ["mobiliario", "Cadeira de escritório", 39_500, "Casa & Escritório", "Piso 1, loja 27"],
  ]),
  hist(14, "cl-001", CC, "ag-002", "2026-09-19", "12:10", [
    ["electrodomesticos", "Ferro de engomar a vapor", 12_000, "Armazém Lucky Star", "Pavilhão 4, porta 27"],
  ]),
  hist(15, "cl-008", NSP, "ag-003", "2026-09-21", "09:25", [
    ["alimentacao", "Água mineral 1,5 L, pack de 6", 2_100, "Armazém Kalandula", "Ala norte, armazém 1"],
  ]),
  hist(16, "cl-003", SP, "ag-001", "2026-10-01", "10:00", [
    ["mobiliario", "Estante de 5 prateleiras", 54_000, "Casa & Escritório", "Piso 1, loja 27"],
    ["mobiliario", "Candeeiro de pé", 18_500, "Casa & Escritório", "Piso 1, loja 27"],
  ]),
  hist(17, "cl-002", CC, "ag-002", "2026-10-02", "08:15", [
    ["materiais", "Rolo de fio eléctrico 2,5 mm, 100 m", 42_000, "Eléctrica Xangai", "Pavilhão 5, loja 11", PHOTOS.construction],
    ["materiais", "Disjuntor 20 A", 2_800, "Eléctrica Xangai", "Pavilhão 5, loja 11", PHOTOS.construction],
  ]),
  hist(18, "cl-010", NSP, "ag-003", "2026-10-03", "07:45", [
    ["materiais", "Cimento cola, saco de 25 kg", 5_200, "Materiais Kudissanga", "Ala sul, banca 88", PHOTOS.construction],
  ]),
  hist(19, "cl-004", SP, "ag-004", "2026-10-04", "11:30", [
    ["roupa", "Boné bordado, encomenda de 50", 2_500, "Bordados Camama", "Piso 0, loja 60", PHOTOS.tshirt],
  ]),
  hist(20, "cl-007", SP, "ag-001", "2026-10-06", "16:05", [
    ["beleza", "Secador de cabelo 2 000 W", 16_000, "Beleza Total", "Piso 1, loja 12"],
  ]),
];

// ---------------------------------------------------------------------------
// Detailed requests, one or more per status.
// ---------------------------------------------------------------------------

const DETAILED: Spec[] = [
  // ---- Concluídas -------------------------------------------------------
  {
    n: 21,
    clientId: "cl-001",
    surfaceId: SP,
    items: [
      {
        category: "electrodomesticos",
        name: "Geleira de 350 litros, duas portas",
        brand: "Hisense",
        characteristics: "Frost free, classe energética A+",
        variations: { colours: "Cinzenta ou inox" },
      },
    ],
    createdAt: lua("2026-09-22", "09:14"),
    status: "concluido",
    agentId: "ag-001",
    fieldMinutes: 190,
    results: [
      {
        item: 1,
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
        item: 1,
        productName: "Geleira combinada 350 L",
        brandModel: "Hisense RD-35DC4SA",
        price: 372_000,
        store: "Electro Kamba",
        location: "Piso 1, loja 33",
        availability: "poucas_unidades",
        variants: "Só cinzenta",
        photos: [PHOTOS.fridge],
      },
    ],
  },
  {
    n: 22,
    clientId: "cl-002",
    surfaceId: NSP,
    items: [
      { category: "materiais", name: "Cimento Portland 42,5, saco de 50 kg", characteristics: "Preço por saco e por palete" },
      { category: "materiais", name: "Varão de ferro 10 mm, 12 m" },
    ],
    createdAt: lua("2026-09-23", "07:40"),
    status: "concluido",
    agentId: "ag-003",
    fieldMinutes: 95,
    results: [
      {
        item: 1,
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
        item: 2,
        productName: "Varão nervurado 10 mm x 12 m",
        price: 3_600,
        store: "Ferragens Mwangole",
        location: "Ala sul, armazém 3",
        availability: "disponivel",
        photos: [PHOTOS.construction],
      },
    ],
  },
  {
    n: 23,
    clientId: "cl-003",
    surfaceId: CC,
    items: [
      {
        category: "telemoveis",
        name: "Telemóvel Android com 128 GB, bateria grande",
        brand: "Samsung Galaxy A15 ou equivalente",
        characteristics: "Dual SIM, 128 GB, 4 GB RAM",
        variations: { colours: "Preto ou azul" },
      },
    ],
    createdAt: lua("2026-09-24", "11:02"),
    status: "concluido",
    agentId: "ag-003",
    fieldMinutes: 160,
    results: [
      {
        item: 1,
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
        item: 1,
        productName: "Smartphone 6,6\" 128 GB",
        brandModel: "Tecno Spark 20",
        price: 92_000,
        store: "Telecel Zango",
        location: "Pavilhão 2, loja 5",
        availability: "disponivel",
        variants: "Preto, dourado",
        photos: [PHOTOS.phone],
      },
    ],
  },
  {
    n: 24,
    clientId: "cl-004",
    surfaceId: CC,
    items: [
      {
        category: "roupa",
        name: "T-shirts brancas de algodão para uniforme",
        variations: { sizes: "20 unidades M, 15 unidades L" },
      },
      { category: "roupa", name: "Bonés pretos lisos", variations: { sizes: "Tamanho único" } },
      { category: "calcado", name: "Ténis brancos de lona", variations: { sizes: "38 a 44" } },
    ],
    createdAt: lua("2026-09-26", "14:20"),
    status: "concluido",
    agentId: "ag-002",
    fieldMinutes: 110,
    results: [
      {
        item: 1,
        productName: "T-shirt 100% algodão, gola redonda",
        price: 3_500,
        store: "Têxteis Guangzhou",
        location: "Pavilhão 7, banca 112",
        availability: "disponivel",
        variants: "M e L em stock; a partir de 30 unidades fica a 3 100 Kz",
        photos: [PHOTOS.tshirt],
      },
      {
        item: 2,
        productName: "Boné de algodão preto",
        price: 1_800,
        store: "Têxteis Guangzhou",
        location: "Pavilhão 7, banca 112",
        availability: "disponivel",
        photos: [PHOTOS.tshirt],
      },
      {
        item: 3,
        productName: "Ténis de lona brancos",
        notFound: true,
        observations: "Só havia em preto. Disseram que chegam brancos na próxima semana.",
      },
    ],
  },
  {
    n: 25,
    clientId: "cl-001",
    surfaceId: SP,
    items: [
      { category: "electronica", name: "Televisor de 43 polegadas, smart TV", characteristics: "Full HD ou 4K, com Wi-Fi" },
    ],
    createdAt: lua("2026-09-29", "18:45"),
    status: "concluido",
    agentId: "ag-004",
    fieldMinutes: 120,
    results: [
      {
        item: 1,
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
        item: 1,
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
    surfaceId: SP,
    items: [{ category: "calcado", name: "Ténis de corrida de senhora", variations: { sizes: "38", colours: "Branco ou cinzento" } }],
    createdAt: lua("2026-10-01", "10:10"),
    status: "concluido",
    agentId: "ag-001",
    fieldMinutes: 85,
    results: [
      {
        item: 1,
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
    surfaceId: SP,
    items: [
      { category: "electrodomesticos", name: "Máquina de lavar roupa de 7 kg", characteristics: "Carga frontal" },
      { category: "electrodomesticos", name: "Máquina de secar roupa" },
    ],
    createdAt: lua("2026-10-03", "08:30"),
    status: "pagamento_confirmado",
    agentId: "ag-001",
    fieldMinutes: 200,
    results: [
      {
        item: 1,
        productName: "Máquina de lavar 7 kg, carga frontal",
        brandModel: "LG F2J3HS0W",
        price: 268_000,
        store: "Casa dos Frios Camama",
        location: "Piso 0, corredor C, loja 12",
        availability: "disponivel",
        photos: [PHOTOS.washer],
      },
      {
        item: 2,
        productName: "Máquina de secar 7 kg",
        brandModel: "Midea MD100",
        price: 231_000,
        store: "Electro Kamba",
        location: "Piso 1, loja 33",
        availability: "por_encomenda",
        photos: [PHOTOS.washer],
        observations: "Chega em 5 dias. Pedem sinal de 50%.",
      },
    ],
  },
  {
    n: 28,
    clientId: "cl-007",
    surfaceId: CC,
    items: [{ category: "materiais", name: "Tinta plástica branca, balde de 20 litros", characteristics: "Para interior" }],
    createdAt: lua("2026-10-05", "13:05"),
    status: "pagamento_confirmado",
    agentId: "ag-002",
    fieldMinutes: 70,
    paidBy: "demo",
    results: [
      {
        item: 1,
        productName: "Tinta plástica mate branca 20 L",
        brandModel: "Robbialac",
        price: 38_000,
        store: "Tintas Huambo",
        location: "Pavilhão 1, loja 19",
        availability: "disponivel",
        photos: [PHOTOS.paint],
      },
      {
        item: 1,
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
    surfaceId: SP,
    items: [{ category: "electrodomesticos", name: "Micro-ondas de 20 litros" }],
    priority: "urgente",
    createdAt: lua("2026-10-07", "09:00"),
    status: "pagamento_confirmado",
    agentId: "ag-004",
    fieldMinutes: 60,
    results: [
      {
        item: 1,
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
  // ---- Resposta submetida, pagamento pendente (referência gerada) -------
  {
    n: 30,
    clientId: "cl-001",
    surfaceId: SP,
    items: [
      {
        category: "electrodomesticos",
        name: "Ar condicionado split de 12 000 BTU",
        characteristics: "Inverter, com instalação se possível",
      },
      { category: "electrodomesticos", name: "Estabilizador de corrente 5 000 VA" },
    ],
    createdAt: lua("2026-10-11", "08:15"),
    status: "resposta_submetida",
    agentId: "ag-001",
    fieldMinutes: 130,
    results: [
      {
        item: 1,
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
        item: 1,
        productName: "Ar condicionado split 12 000 BTU",
        brandModel: "Gree GWH12",
        price: 259_000,
        store: "Mundo Digital",
        location: "Piso 0, loja 8",
        availability: "poucas_unidades",
        photos: [PHOTOS.airCon],
      },
      {
        item: 2,
        productName: "Estabilizador 5 000 VA",
        brandModel: "Tecnoware",
        price: 74_000,
        store: "Mundo Digital",
        location: "Piso 0, loja 8",
        availability: "disponivel",
        photos: [],
      },
    ],
  },
  {
    n: 31,
    clientId: "cl-009",
    surfaceId: CC,
    items: [{ category: "roupa", name: "Vestido de cerimónia", variations: { sizes: "40", colours: "Azul-marinho ou verde" } }],
    createdAt: lua("2026-10-10", "16:40"),
    status: "resposta_submetida",
    agentId: "ag-003",
    fieldMinutes: 150,
    results: [
      {
        item: 1,
        productName: "Vestido midi de cerimónia",
        price: 15_000,
        store: "Moda Shanghai",
        location: "Pavilhão 7, banca 64",
        availability: "disponivel",
        variants: "Azul-marinho 40 e 42",
        photos: [PHOTOS.dress],
      },
    ],
  },
  {
    // Reference generated on 7 Oct: expired by now (shows the "Expirada" state).
    n: 32,
    clientId: "cl-010",
    surfaceId: NSP,
    items: [
      { category: "materiais", name: "Varão de ferro de 12 mm, 12 metros", characteristics: "Preço por unidade e por tonelada" },
      { category: "materiais", name: "Arame recozido, rolo de 25 kg" },
      { category: "materiais", name: "Prego de 3 polegadas, caixa de 5 kg" },
    ],
    createdAt: lua("2026-10-07", "07:55"),
    status: "resposta_submetida",
    agentId: "ag-003",
    fieldMinutes: 80,
    results: [
      {
        item: 1,
        productName: "Varão nervurado 12 mm x 12 m",
        price: 4_800,
        store: "Ferragens Mwangole",
        location: "Ala sul, armazém 3",
        availability: "disponivel",
        variants: "Tonelada a 585 000 Kz",
        photos: [PHOTOS.construction],
      },
      {
        item: 2,
        productName: "Arame recozido 25 kg",
        price: 27_000,
        store: "Ferragens Mwangole",
        location: "Ala sul, armazém 3",
        availability: "poucas_unidades",
        photos: [PHOTOS.construction],
      },
      {
        item: 3,
        productName: "Prego 3\" (5 kg)",
        price: 6_500,
        store: "Materiais Kudissanga",
        location: "Ala sul, banca 88",
        availability: "disponivel",
        photos: [PHOTOS.construction],
      },
    ],
  },
  // ---- Em consulta ------------------------------------------------------
  {
    n: 33,
    clientId: "cl-003",
    surfaceId: SP,
    items: [{ category: "mobiliario", name: "Colchão de casal 140x190, espuma de alta densidade" }],
    createdAt: lua("2026-10-11", "14:20"),
    status: "em_consulta",
    agentId: "ag-004",
  },
  {
    n: 34,
    clientId: "cl-011",
    surfaceId: CC,
    items: [
      { category: "alimentacao", name: "Arroz agulha, saco de 25 kg", characteristics: "Preço por grosso para 10 sacos" },
      { category: "alimentacao", name: "Óleo alimentar de 5 L", characteristics: "Preço por caixa" },
    ],
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
    surfaceId: SP,
    items: [
      {
        category: "telemoveis",
        name: "Tablet de 10 polegadas para estudos",
        characteristics: "Com capa e 64 GB no mínimo",
        variations: { models: "Samsung Galaxy Tab A9 ou Lenovo Tab M10" },
      },
    ],
    createdAt: lua("2026-10-11", "08:10"),
    status: "agente_atribuido",
    agentId: "ag-001",
  },
  {
    n: 36,
    clientId: "cl-005",
    surfaceId: CC,
    items: [{ category: "beleza", name: "Cabelo humano liso, 20 polegadas, 3 pacotes" }],
    createdAt: lua("2026-10-11", "08:45"),
    status: "agente_atribuido",
    agentId: "ag-002",
  },
  // ---- A aguardar atribuição -------------------------------------------
  {
    n: 37,
    clientId: "cl-002",
    surfaceId: NSP,
    items: [
      { category: "materiais", name: "Mosaico cerâmico 60x60 para sala", characteristics: "Preço por metro quadrado, 45 m²", variations: { colours: "Creme" } },
      { category: "materiais", name: "Cimento cola para mosaico, saco de 25 kg" },
    ],
    createdAt: lua("2026-10-11", "07:30"),
    status: "aguarda_atribuicao",
    rejectedBy: { agentId: "ag-003", reason: "Hoje estou sem transporte para o Novo São Paulo, só volto amanhã." },
  },
  {
    n: 38,
    clientId: "cl-008",
    surfaceId: SP,
    items: [
      { category: "electrodomesticos", name: "Fogão a gás de 4 bocas com forno" },
      { category: "electrodomesticos", name: "Exaustor de cozinha 60 cm" },
      { category: "electrodomesticos", name: "Geleira de bebidas com porta de vidro" },
      { category: "mobiliario", name: "Mesa de inox para cozinha industrial", variations: { sizes: "120 x 60 cm" } },
    ],
    createdAt: lua("2026-10-11", "16:20"),
    status: "aguarda_atribuicao",
  },
  // ---- Cancelados -------------------------------------------------------
  {
    n: 39,
    clientId: "cl-006",
    surfaceId: SP,
    items: [{ category: "calcado", name: "Sapatos escolares pretos", variations: { sizes: "32 e 35" } }],
    createdAt: lua("2026-10-01", "15:00"),
    status: "cancelado",
    cancelledFrom: "aguarda_atribuicao",
    cancel: { by: "cliente", reason: "Já comprei noutro sítio." },
  },
  {
    n: 40,
    clientId: "cl-012",
    surfaceId: CC,
    items: [{ category: "telemoveis", name: "Telemóveis usados em lote para revenda" }],
    createdAt: lua("2026-10-04", "12:30"),
    status: "cancelado",
    cancelledFrom: "aguarda_atribuicao",
    cancel: { by: "admin", reason: "Pedido fora do âmbito: a plataforma não negocia lotes para revenda." },
  },
  // ---- Submetido agora --------------------------------------------------
  {
    n: 41,
    clientId: "cl-004",
    surfaceId: SP,
    items: [
      {
        category: "electrodomesticos",
        name: "Geleira de 350 litros",
        brand: "Hisense",
        variations: { colours: "Cinzenta" },
      },
    ],
    createdAt: lua("2026-10-11", "19:02"),
    status: "submetido",
  },
];

/** All mock requests (ids are not strictly chronological; sort in UI). Split is provisional here, finalised in mock/index. */
export const RAW_REQUESTS: ServiceRequest[] = [...HISTORIC, ...DETAILED].map(build);
