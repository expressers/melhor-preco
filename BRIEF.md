# Melhor Preço — Briefing do MVP (para a equipa)

Fonte: "Briefing Técnico e Funcional — Desenvolvimento do MVP da plataforma Melhor Preço", v1.0 (PDF enviado por Mauro Yange). Mercado inicial: Luanda, Angola. Produto: plataforma web responsiva.

## 1. O que é
O Melhor Preço permite a consumidores consultar preços, disponibilidade, cores, tamanhos, características e localização de produtos em superfícies comerciais de Luanda sem se deslocarem. Funciona com uma rede de **agentes credenciados** (recrutados entre quem já orienta clientes informalmente nos centros comerciais e retail parks).
Conceito: "o Heetch das consultas de preços" — o cliente submete um pedido, a plataforma encaminha para um agente no terreno, o agente recolhe a informação e submete-a digitalmente.
**Não é loja online nem e-commerce.** Não vende, não processa encomendas, não negocia. Só intermedeia a recolha e disponibilização de informação comercial.

## 2. Âmbito desta entrega (MVP estático)
- **Sem base de dados nem backend.** Tudo estático, com dados fictícios em `src/lib/mock/` e estado do lado do cliente (Zustand + `persist` em localStorage, com try/catch) para que os fluxos se possam demonstrar de ponta a ponta no browser.
- Deploy como site estático no Render (`output: "export"`, pasta `out/`). Rotas dinâmicas `[id]` precisam de `generateStaticParams` a partir dos mocks; pedidos criados no browser abrem por query (`?id=`) ou rota estática equivalente — tem de funcionar no export estático.
- A arquitectura deve ficar preparada para ligar uma base de dados depois (camada `src/lib/data/` com funções que hoje leem os mocks).

## 3. Interfaces e ecrãs

### 3.0 Landing pública `/`
Explica o serviço em linguagem simples, o fluxo (pedido → agente no terreno → resultados → pagamento ao agente), o preço mínimo (600 Kz por consulta), as superfícies iniciais e duas entradas: "Fazer uma consulta" (cliente) e "Ser agente" (candidatura). Sem estatísticas inventadas, sem testemunhos falsos, sem logótipos de terceiros.

### 3.1 Área do cliente `/cliente/...`
- Registo/entrada (mock): nome, telefone, palavra-passe, e-mail opcional. Telefone é o contacto principal.
- **Nova consulta** — campos: categoria (lista), nome/descrição do produto, marca ou modelo (opcional), características pretendidas, tamanho/cor/variantes (opcional), fotografia de referência (opcional, preview local), superfície(s) comercial(is) (selecção múltipla), prazo/prioridade. Permite pedidos específicos e genéricos. Exemplo de placeholder/ajuda: geleira Hisense de 350 litros, cinzenta, no Shopping Popular e na Cidade da China. **O cliente vê o preço da consulta antes de confirmar.**
- **Os meus pedidos** e **detalhe do pedido**: número, descrição, superfícies, data/hora, estado actual, valor, informação de pagamento, histórico.
- Estados: Pedido submetido · A aguardar atribuição · Agente atribuído · Em consulta · Resposta submetida — pagamento pendente · Pagamento confirmado · Consulta concluída · Cancelado.
- Quando a resposta é submetida: o cliente vê o valor e os **dados de pagamento do agente (Multicaixa Express)**; os resultados completos ficam bloqueados até o agente confirmar o pagamento.
- **Resultados** (após pagamento), em formato comparativo lado a lado / lista organizada por superfície: produto, marca/modelo, preço, loja, localização na superfície, fotografias, disponibilidade, cores/tamanhos/variantes, data/hora, observações. Nota obrigatória: preços e disponibilidade correspondem ao momento da consulta e podem mudar.

### 3.2 Área do agente `/agente/...` (mobile-first, muito simples)
- Perfil: nome, telefone, foto, código único, superfície de afectação, estado da conta, dados de pagamento, histórico, indicadores.
- Tarefas: ver atribuídas, aceitar/rejeitar com motivo, ver descrição e superfície, actualizar estado, submeter resultados, ver o valor que lhe cabe (400 Kz), **confirmar recepção do pagamento**, histórico.
- Formulário de resposta: por produto encontrado — preço, loja, localização na loja, disponibilidade, marca/modelo, variantes, fotos do produto/etiqueta, observações. Vários produtos por pedido e opção "produto não encontrado". Data/hora automáticas.
- Só agentes aprovados e activos recebem pedidos.

### 3.3 Painel de administração `/admin/...` (desktop)
- Visão geral com indicadores: tarefas recebidas/concluídas, tempo médio de resposta, % rejeitados, % respostas incompletas, reclamações, avaliação.
- Clientes: pesquisar, histórico, suspender.
- Agentes: registar, aprovar, suspender, associar a superfícies, desempenho, histórico de tarefas e pagamentos, acções de formação.
- Superfícies comerciais: criar/editar, nome, endereço, localização, agentes, activar/desactivar. Configuração inicial: **Shopping Popular — Camama; Cidade da China — Zango; Novo São Paulo — Zango**; outros a adicionar depois (Kikolo, São Paulo).
- Pedidos: ver todos, atribuir/reatribuir agente, estados, respostas, validar, resolver reclamações/sem resposta, cancelar.
- Financeiro: valor de cada consulta, montante devido ao agente, comissão da plataforma, pagamentos confirmados, pendentes, liquidação das comissões, **exportar CSV**.
- Configuração de preços (mínimo 600 Kz).

## 4. Modelo económico
Mínimo 600 Kz por consulta = 400 Kz agente + 200 Kz plataforma. Preço pode variar com complexidade/nº de superfícies, configurável pelo admin, nunca abaixo de 600 Kz. Pagamento directo ao agente (Multicaixa Express) depois da resposta. Controlo obrigatório da comissão de 200 Kz devida (registo de devido vs liquidado). Nunca assumir pagamento só porque o cliente abriu a notificação ou o agente respondeu.

## 5. Regras de negócio
1. Só agentes aprovados recebem/executam consultas. 2. ID único por pedido (ex.: `MP-2026-00041`). 3. Estado sempre claro. 4. Preço visível antes de submeter. 5. Pagamento só pedido após resposta. 6. Resultados completos só após pagamento confirmado. 7. Impedir confirmação duplicada do mesmo pagamento. 8. Registo de auditoria (timeline com data/hora/interveniente em cada pedido). 9. Fotos associadas ao pedido. 10. Sinalizar consultas incompletas/atrasadas/sem resposta. 11. Dados pessoais só para autorizados. 12. Sem garantia de preço após a consulta. 13. Sem compras/negociação/pagamentos aos comerciantes. 14. Procedimento de reclamações.

Notificações: in-app (centro de notificações simples) para submissão, atribuição, aceitação, resposta, valor a pagar, pagamento confirmado, resultados, cancelamento/problema.

Fora do âmbito: apps nativas, integração automática Multicaixa, split automático, marketplace, carrinho, encomendas, entregas, negociação, chat, videochamadas, IA, histórico público de preços, integração com inventários, fidelização.

## 6. Stack (obrigatório)
- **Next.js (App Router, TypeScript) + Bun** (`bun`/`bunx` para tudo; lockfile `bun.lock`).
- **shadcn/ui** para os componentes de interface (instalados com `bunx shadcn@latest add ...`, nunca no estado default — aplicar os tokens abaixo).
- **Estilos próprios em Sass (`.scss`). Proibido criar ficheiros `.css`.** O ficheiro global é `src/app/globals.scss`; estilos de componentes em `*.module.scss` quando Tailwind não chegar. Se o shadcn gerar `globals.css`, converter para `.scss` e actualizar `components.json` (`tailwind.css`). Verificar cedo que o Tailwind compila através do Sass (`bun run build`); se o Tailwind v4 não aceitar o import vindo do Sass, resolver de forma limpa (p.ex. `@import url(...)`/configuração do PostCSS) e documentar no README.
- Ícones: `@phosphor-icons/react` (uma só família, peso consistente). Animação: `motion/react` com moderação. Fontes: `next/font` (Geist + Geist Mono).
- Estado: Zustand. Formulários: react-hook-form + zod.
- `next.config`: `output: "export"`, `images.unoptimized: true`, `trailingSlash: true`.
- `render.yaml` na raiz: site estático, publica `out/`.

## 7. Direcção visual — "Etiqueta"
Leitura: produto web (Operate) com landing (Persuade), para consumidores de Luanda a usar sobretudo telemóveis Android, agentes no terreno com o telemóvel numa mão, e um operador no desktop.
O mundo visual vem do objecto mais universal dos mercados: **a etiqueta de preço**. Fundo neutro frio, tinta quase-preta, e um único acento: amarelo de etiqueta. Preços sempre em Geist Mono com `tabular-nums`, como num talão.

Tokens (variáveis CSS no `globals.scss`, mapeadas no tema shadcn):
- `--paper` #F3F4F1 (fundo) · `--surface` #FFFFFF · `--ink` #111311 (texto/primário) · `--ink-2` #4A4F4A · `--line` #DADDD6
- `--tag` #FFD21F (acento único: etiquetas de preço, CTA principal com texto `--ink`, destaques) — nunca texto amarelo sobre branco.
- Estados (discretos, só em badges): sucesso #1F7A4D, aviso #B26B00, erro #B3261E, info #2F5BD3.
- Raio: cartões/inputs 12px; botões pill; badges pill. Sombras quase nenhumas, tingidas.
- Tipografia: Geist (UI), Geist Mono (preços, IDs de pedido, códigos de agente). Títulos com tracking negativo; corpo máx. 65ch.
- Motivo gráfico: etiqueta com furo/canto cortado para preços e o "talão" (receipt) no ecrã de resultados com linha tracejada. Sem gradientes roxos, sem glassmorphism, sem emojis, sem cards iguais em grelha de três.
- Movimento (Emil Kowalski): só `transform`/`opacity`; ease-out forte `cubic-bezier(0.23,1,0.32,1)`; 150–250ms em UI; `:active` scale(0.97) em botões; `prefers-reduced-motion` respeitado; hovers só em `(hover:hover)`.
- Linguagem: português de Angola (grafia pré-AO como no briefing: "projecto", "actualizar", "selecção"), tom directo e caloroso. Moeda: "Kz" com separador de milhar por espaço (ex.: 1 200 Kz).
- Mobile-first, sem scroll horizontal, áreas de toque ≥ 44px, contraste WCAG AA.

## 8. Dados fictícios
3 superfícies iniciais + 2 inactivas (Kikolo, São Paulo); ~8 agentes (alguns pendentes de aprovação, 1 suspenso) com nomes angolanos plausíveis e códigos `AG-0xx`; ~12 clientes; ~20 pedidos cobrindo todos os estados, com resultados realistas (electrodomésticos, telemóveis, roupa, materiais) e preços em Kz plausíveis; lançamentos financeiros coerentes com 600/400/200.
Imagens: usar fotos de produto genéricas livres (Unsplash/Pexels via URL permitida ou ficheiros em `public/`), nunca marcas registadas como imagem principal.

## 9. Critérios de aceitação (demo)
O fluxo de ponta a ponta tem de ser demonstrável no browser: cliente cria conta e submete pedido → admin atribui a agente aprovado → agente aceita e submete preços/fotos/localização → cliente vê valor e dados de pagamento → agente confirma pagamento → resultados desbloqueados e comissão registada → cliente vê histórico → admin vê o pedido e o financeiro e exporta CSV. Incluir um selector "Ver como: Cliente / Agente / Admin" para a demo.
`bun run build` sem erros; `bun run lint` limpo; páginas sem erros na consola.
