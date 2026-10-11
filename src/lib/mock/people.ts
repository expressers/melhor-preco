import type { Agent, Client, Surface } from "../types";

// Fictional data. Names, phones and numbers are invented.

export const SURFACES: Surface[] = [
  {
    id: "sf-shopping-popular",
    name: "Shopping Popular",
    area: "Camama",
    address: "Via Expressa, Camama, Talatona, Luanda",
    location: "Junto à rotunda do Camama, entrada principal pela Via Expressa",
    active: true,
    createdAt: "2026-08-01T08:00:00.000Z",
  },
  {
    id: "sf-cidade-da-china",
    name: "Cidade da China",
    area: "Zango",
    address: "Estrada de Catete, Zango, Viana, Luanda",
    location: "Pavilhões grossistas ao longo da Estrada de Catete",
    active: true,
    createdAt: "2026-08-01T08:00:00.000Z",
  },
  {
    id: "sf-novo-sao-paulo",
    name: "Novo São Paulo",
    area: "Zango",
    address: "Zango 3, Viana, Luanda",
    location: "Mercado coberto, acesso pela paragem do Zango 3",
    active: true,
    createdAt: "2026-08-01T08:00:00.000Z",
  },
  {
    id: "sf-kikolo",
    name: "Mercado do Kikolo",
    area: "Cacuaco",
    address: "Kikolo, Cacuaco, Luanda",
    location: "Por mapear: a adicionar numa fase seguinte",
    active: false,
    createdAt: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "sf-sao-paulo",
    name: "Mercado de São Paulo",
    area: "Sambizanga",
    address: "Bairro São Paulo, Sambizanga, Luanda",
    location: "Por mapear: a adicionar numa fase seguinte",
    active: false,
    createdAt: "2026-09-15T08:00:00.000Z",
  },
];

const SP = "sf-shopping-popular";
const CC = "sf-cidade-da-china";
const NSP = "sf-novo-sao-paulo";

const mcx = (phone: string, holder: string) =>
  ({ method: "multicaixa-express", phone, holder }) as const;

const BASE_TRAINING = { title: "Acolhimento e regras da plataforma", at: "2026-08-20T09:00:00.000Z" };

export const AGENTS: Agent[] = [
  {
    id: "ag-001",
    code: "AG-001",
    name: "Domingos Kiala",
    phone: "+244 923 418 207",
    email: "domingos.kiala@exemplo.ao",
    status: "activo",
    surfaceIds: [SP],
    paymentInfo: mcx("+244 923 418 207", "Domingos Kiala"),
    joinedAt: "2026-08-18T10:00:00.000Z",
    trainings: [BASE_TRAINING, { title: "Fotografar etiquetas de preço", at: "2026-09-03T09:00:00.000Z" }],
  },
  {
    id: "ag-002",
    code: "AG-002",
    name: "Isabel Nzinga Mateus",
    phone: "+244 912 664 350",
    status: "activo",
    surfaceIds: [CC],
    paymentInfo: mcx("+244 912 664 350", "Isabel N. Mateus"),
    joinedAt: "2026-08-18T10:30:00.000Z",
    trainings: [BASE_TRAINING],
  },
  {
    id: "ag-003",
    code: "AG-003",
    name: "Adilson Tchipilica",
    phone: "+244 935 102 778",
    status: "activo",
    surfaceIds: [NSP, CC],
    paymentInfo: mcx("+244 935 102 778", "Adilson Tchipilica"),
    joinedAt: "2026-08-19T09:00:00.000Z",
    trainings: [BASE_TRAINING, { title: "Fotografar etiquetas de preço", at: "2026-09-03T09:00:00.000Z" }],
  },
  {
    id: "ag-004",
    code: "AG-004",
    name: "Teresa Bumba",
    phone: "+244 924 557 019",
    status: "activo",
    surfaceIds: [SP],
    paymentInfo: mcx("+244 924 557 019", "Teresa Bumba"),
    joinedAt: "2026-08-25T11:00:00.000Z",
    trainings: [BASE_TRAINING],
  },
  {
    id: "ag-005",
    code: "AG-005",
    name: "Rosa Kalunga",
    phone: "+244 941 330 864",
    status: "aprovado",
    surfaceIds: [NSP],
    paymentInfo: mcx("+244 941 330 864", "Rosa Kalunga"),
    joinedAt: "2026-10-02T09:00:00.000Z",
    trainings: [],
    note: "Aprovada. Falta a sessão de acolhimento para activar.",
  },
  {
    id: "ag-006",
    code: "AG-006",
    name: "Mauro Sebastião",
    phone: "+244 926 781 445",
    status: "pendente",
    surfaceIds: [CC],
    paymentInfo: mcx("+244 926 781 445", "Mauro Sebastião"),
    joinedAt: "2026-10-08T15:20:00.000Z",
    trainings: [],
  },
  {
    id: "ag-007",
    code: "AG-007",
    name: "Celestino Lukamba",
    phone: "+244 915 209 612",
    status: "pendente",
    surfaceIds: [SP],
    paymentInfo: mcx("+244 915 209 612", "Celestino Lukamba"),
    joinedAt: "2026-10-10T12:05:00.000Z",
    trainings: [],
  },
  {
    id: "ag-008",
    code: "AG-008",
    name: "Josefa Nangolo",
    phone: "+244 933 476 120",
    status: "suspenso",
    surfaceIds: [NSP],
    paymentInfo: mcx("+244 933 476 120", "Josefa Nangolo"),
    joinedAt: "2026-08-19T09:30:00.000Z",
    trainings: [BASE_TRAINING],
    note: "Suspensa: duas respostas sem fotografias da etiqueta em setembro.",
  },
];

const client = (
  n: number,
  name: string,
  phone: string,
  createdAt: string,
  extra: Partial<Client> = {},
): Client => ({
  id: `cl-${String(n).padStart(3, "0")}`,
  name,
  phone,
  password: "demo1234",
  status: "activo",
  createdAt,
  ...extra,
});

export const CLIENTS: Client[] = [
  client(1, "Ana Paula Cassoma", "+244 923 115 480", "2026-09-02T18:10:00.000Z", {
    email: "ana.cassoma@exemplo.ao",
  }),
  client(2, "Edvaldo Muachissengue", "+244 912 870 233", "2026-09-04T09:40:00.000Z"),
  client(3, "Luzia Ngunza", "+244 934 662 091", "2026-09-05T12:00:00.000Z", {
    email: "luzia.ngunza@exemplo.ao",
  }),
  client(4, "Hélder Kapinga", "+244 925 304 718", "2026-09-07T20:15:00.000Z"),
  client(5, "Fátima dos Santos Neto", "+244 941 228 507", "2026-09-09T07:50:00.000Z"),
  client(6, "Osvaldo Chilombo", "+244 923 990 146", "2026-09-12T13:25:00.000Z"),
  client(7, "Madalena Quissanga", "+244 918 455 302", "2026-09-14T16:00:00.000Z"),
  client(8, "Bruno Ndala", "+244 936 117 864", "2026-09-18T10:05:00.000Z", {
    email: "bruno.ndala@exemplo.ao",
  }),
  client(9, "Joana Sapalo", "+244 927 603 551", "2026-09-21T19:30:00.000Z"),
  client(10, "Nelson Cardoso Lumbo", "+244 913 742 088", "2026-09-25T08:45:00.000Z"),
  client(11, "Esperança Wanga", "+244 944 381 260", "2026-10-01T11:10:00.000Z"),
  client(12, "Kátia Ngola", "+244 922 058 913", "2026-10-03T14:35:00.000Z", {
    status: "suspenso",
  }),
];
