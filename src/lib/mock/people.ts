import type { Agent, Client, Operator, Surface } from "../types";

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

/** Demo IBAN: "AO06" + bank 0040 + branch 0000 + 11-digit account + 2 check digits. Fictitious. */
const iban = (phone: string, holder: string) => ({
  iban: `AO0600400000${phone.replace(/\D/g, "").replace(/^244/, "00")}10`,
  holder,
});

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
    bank: iban("+244 923 418 207", "Domingos Kiala"),
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
    bank: iban("+244 912 664 350", "Isabel N. Mateus"),
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
    bank: iban("+244 935 102 778", "Adilson Tchipilica"),
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
    bank: iban("+244 941 330 864", "Rosa Kalunga"),
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
    bank: iban("+244 933 476 120", "Josefa Nangolo"),
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
  kind: "particular",
  name,
  phone,
  password: "demo1234",
  status: "activo",
  createdAt,
  ...extra,
});

/** Company client: `name` is the responsible person. NIFs and e-mails are fictitious. */
const empresa = (companyName: string, nif: string, email: string): Partial<Client> => ({
  kind: "empresa",
  company: { name: companyName, nif },
  email,
});

export const CLIENTS: Client[] = [
  client(1, "Ana Paula Cassoma", "+244 923 115 480", "2026-08-22T18:10:00.000Z", {
    email: "ana.cassoma@exemplo.ao",
  }),
  client(
    2,
    "Edvaldo Muachissengue",
    "+244 912 870 233",
    "2026-08-24T09:40:00.000Z",
    empresa("Construções Muachissengue, Lda.", "5417893021", "compras@muachissengue.exemplo.ao"),
  ),
  client(3, "Luzia Ngunza", "+244 934 662 091", "2026-08-25T12:00:00.000Z", {
    email: "luzia.ngunza@exemplo.ao",
  }),
  client(
    4,
    "Hélder Kapinga",
    "+244 925 304 718",
    "2026-08-27T20:15:00.000Z",
    empresa("Kapinga Uniformes e Serviços, Lda.", "5000452187", "helder@kapinga.exemplo.ao"),
  ),
  client(5, "Fátima dos Santos Neto", "+244 941 228 507", "2026-08-29T07:50:00.000Z"),
  client(6, "Osvaldo Chilombo", "+244 923 990 146", "2026-08-30T13:25:00.000Z"),
  client(7, "Madalena Quissanga", "+244 918 455 302", "2026-08-30T16:00:00.000Z"),
  client(
    8,
    "Bruno Ndala",
    "+244 936 117 864",
    "2026-08-31T10:05:00.000Z",
    empresa("Ndala Comercial (SU), Lda.", "5402116734", "bruno.ndala@ndala.exemplo.ao"),
  ),
  client(9, "Joana Sapalo", "+244 927 603 551", "2026-08-31T19:30:00.000Z"),
  client(
    10,
    "Nelson Cardoso Lumbo",
    "+244 913 742 088",
    "2026-08-31T08:45:00.000Z",
    empresa("Lumbo Engenharia e Obras, S.A.", "5419002468", "nelson.lumbo@lumbo.exemplo.ao"),
  ),
  client(11, "Esperança Wanga", "+244 944 381 260", "2026-10-01T11:10:00.000Z"),
  client(12, "Kátia Ngola", "+244 922 058 913", "2026-10-03T14:35:00.000Z", {
    status: "suspenso",
  }),
];

/** One active operator per surface (CHANGES §3). Base salary is monthly, in Kz. */
export const OPERATORS: Operator[] = [
  {
    id: "op-001",
    code: "OP-001",
    name: "Helena Mbinda",
    phone: "+244 923 640 118",
    email: "helena.mbinda@exemplo.ao",
    surfaceId: SP,
    baseSalary: 150_000,
    status: "activo",
    joinedAt: "2026-08-15T08:00:00.000Z",
  },
  {
    id: "op-002",
    code: "OP-002",
    name: "Gaspar Ndombele",
    phone: "+244 912 377 905",
    surfaceId: CC,
    baseSalary: 150_000,
    status: "activo",
    joinedAt: "2026-09-16T08:00:00.000Z",
  },
  {
    id: "op-003",
    code: "OP-003",
    name: "Valdemar Cachimbombo",
    phone: "+244 935 811 462",
    surfaceId: NSP,
    baseSalary: 140_000,
    status: "activo",
    joinedAt: "2026-08-15T08:00:00.000Z",
  },
  {
    id: "op-004",
    code: "OP-004",
    name: "Suzana Tchissola",
    phone: "+244 926 158 730",
    surfaceId: CC,
    baseSalary: 150_000,
    status: "inactivo",
    joinedAt: "2026-08-15T08:00:00.000Z",
    note: "Saiu a 15 de Setembro. Substituída por OP-002.",
  },
];
