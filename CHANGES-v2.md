# Melhor Preço — Alterações v2 (feedback do Mauro Yange, 11–12 out 2026)

Fonte: mensagens de WhatsApp do Mauro Yange ("Feedback inicial", "E mais", tabela de distribuição e "mais um ponto"). Este documento **substitui** o BRIEF.md onde houver conflito (modelo económico, pagamentos, superfícies por pedido, papéis). Tudo o resto do BRIEF continua válido (stack, Sass sem .css, shadcn, direcção visual "Etiqueta", pt-AO, export estático, Render).

## 1. Itens, pedido simples e pedido múltiplo
- Um pedido passa a ter **uma lista de itens** (`items[]`). Cada item: categoria, nome/descrição, marca/modelo (opc.), características (opc.), variações pretendidas — modelos, cores, tamanhos (opc.), foto de referência (opc.).
- As variações de um item **não contam como itens extra**.
- **Pedido simples** = 1 item → **1 000 Kz** (valor bruto, já inclui impostos e taxas).
- **Pedido múltiplo** = 2 ou mais itens → **800 Kz por item** (bruto). Ex.: 3 itens = 2 400 Kz. Etiquetas "consulta dupla / tripla / quádrupla / N itens".
- No formulário de nova consulta: botão "Adicionar outro item". Ao adicionar o 2.º item, o pedido passa **automaticamente** a "Pedido múltiplo" e o talão de preço actualiza ao vivo (mostrar claramente o tipo e o cálculo: `3 itens × 800 Kz`). Remover itens volta a "simples".
- Valores configuráveis pelo admin (preço simples, preço por item no múltiplo). Os antigos acréscimos (superfície extra, urgente) **deixam de existir**; a prioridade fica só como informação.

## 2. Uma superfície por pedido
- Cada pedido fica ligado a **uma só superfície** (que pode ser um retail park com várias lojas). Trocar a selecção múltipla por selecção única. Se o cliente quiser outra superfície, faz outro pedido (dizer isto em texto de ajuda).

## 3. Operador da superfície (novo papel)
- Cada superfície tem **um Operador**: colaborador directo da plataforma, sentado numa banca de informações da marca na superfície (banca promocional, t-shirt, chapéu, telemóvel e plano de internet). É responsável pela mobilização da superfície.
- **O operador distribui os pedidos da sua superfície pelos agentes** (é ele quem atribui/reatribui, não o admin — o admin continua a poder intervir).
- Nova área `/operador` (mobile/tablet-first, simples): fila de pedidos da superfície por atribuir; agentes da superfície e o seu estado (disponível / em consulta); atribuir e reatribuir; pedidos em curso e atrasados; progresso do objectivo do período (facturação vs meta) e comissão estimada (5% ou 10%).
- "Ver como" passa a ter: Cliente · Agente · **Operador** · Admin.
- Admin → nova página **Operadores**: registar, associar a uma superfície (1 operador activo por superfície), salário base (valor mensal), estado, histórico de comissões.
- Remuneração do operador: **salário base** (componente salarial separada, não é comissão) **+ comissão variável única** de 5% ou 10% sobre a facturação da plataforma na sua superfície, conforme cumpra os objectivos.

## 4. Distribuição financeira (sobre o valor líquido)
- Bruto = o que o cliente paga. **Líquido = bruto − impostos e taxas**. Taxa de impostos e taxas configurável pelo admin; **valor por defeito 14% (IVA)**, com nota "a confirmar com o Mauro". Líquido = bruto / (1 + taxa), arredondado ao Kz.
- Distribuição do líquido (tabela do Mauro):

| Destinatário | Abaixo dos objectivos | Objectivos cumpridos |
|---|---|---|
| Agente de consulta | 60% | 60% |
| Plataforma | 35% | 30% |
| Operador da superfície | 5% | 10% |
| Total | 100% | 100% |

- O agente ganha **sempre 60% do líquido**, creditado quando o pagamento do cliente é confirmado.
- Os 40% restantes ficam provisoriamente como 35% plataforma / 5% operador e são **acertados no fecho do período**: se a superfície cumpriu o objectivo, o operador recebe 10% e a plataforma 30%; senão 5% / 35% (os 5% adicionais ficam retidos pela plataforma).

## 5. Pagamentos: referência Multicaixa directa à plataforma
- O cliente **já não paga ao agente**. Depois de o agente submeter a resposta, a plataforma gera uma **Referência Multicaixa** (Entidade, Referência de 9 dígitos, Montante) e o cliente paga em qualquer ATM/Multicaixa Express. Mostrar num talão com botão copiar e prazo de validade.
- A **plataforma confirma** o pagamento (no MVP: o admin marca a referência como paga em Financeiro → Pagamentos, e há um botão de demonstração "Simular pagamento da referência" visível só em modo demo). Só depois disso os resultados desbloqueiam. Continua proibida a confirmação duplicada.
- Remover tudo o que era "pagar ao agente", "dados Multicaixa Express do agente" e "agente confirma recepção do pagamento".
- Os valores das entidades/referências são fictícios e marcados como demonstração.

## 6. Ganhos e levantamentos do agente
- O agente vê na sua área a **carteira**: saldo disponível (acumulado), ganhos por pedido (60% do líquido de cada um), levantamentos feitos e pendentes.
- O agente pode **pedir um levantamento por transferência bancária para o IBAN registado**, **no máximo uma vez por dia** (dia civil de Luanda). Validar IBAN angolano (`AO06` + 21 dígitos) no perfil; montante ≤ saldo disponível; mostrar quando pode voltar a pedir.
- Admin → nova página **Levantamentos**: lista de pedidos de levantamento, confirmar (transferência feita, com referência da transferência) ou rejeitar com motivo. Tudo no registo de auditoria.
- O perfil do agente troca "Multicaixa Express" por **IBAN e titular da conta**.

## 7. Objectivos e comissões dos operadores (admin)
Nova página admin **Objectivos** que permite configurar e acompanhar:
- Objectivos de facturação de cada superfície e o respectivo **período** (ex.: mensal, datas início/fim).
- Critérios de cumprimento (ex.: facturação ≥ meta; opcionalmente nº de consultas pagas ≥ meta).
- Percentagem variável do operador (abaixo: 5%; cumprido: 10% — editáveis).
- Facturação considerada para o cálculo (líquida por defeito; opção bruta).
- Parcela retida pela plataforma quando os objectivos não são cumpridos (por defeito 5%).
- **Histórico** de resultados e comissões por período e superfície.
- Os objectivos têm de ser definidos **antes do início do período** (bloquear edição depois de começar, excepto correcção administrativa com motivo obrigatório, registada na auditoria).
- O sistema **calcula automaticamente** o cumprimento e a comissão no fecho do período, com registo auditável.
- Mocks: período actual (Outubro 2026, em curso, com progresso), período anterior (Setembro 2026, fechado: uma superfície cumpriu, outra não, uma terceira com correcção administrativa registada).

## 8. Cliente particular ou empresa
- No registo, escolher **Particular** ou **Empresa**. Empresa: nome da empresa, NIF, nome do responsável, telefone, e-mail (recomendado). Mostrar o tipo no admin (filtro em Clientes) e no talão do pedido.
- Landing: reforçar que o serviço serve sobretudo **compras empresariais** (procurement, comparação de fornecedores), sem perder o consumidor particular. Actualizar preços na landing (1 000 Kz por consulta simples; 800 Kz por item em pedidos múltiplos) e o fluxo (pagamento por referência Multicaixa à plataforma).

## 9. Financeiro e preços (admin) — actualizar
- Financeiro mostra por pedido: bruto, impostos e taxas, líquido, agente (60%), plataforma, operador (provisório/final), estado do pagamento da referência. Totais por período e por superfície. Exportar CSV com estas colunas.
- Preços: preço simples, preço por item no múltiplo, taxa de impostos e taxas, percentagens (com validação: somas = 100%).

## 10. Polimentos pendentes da revisão anterior
- Formulário de resposta do agente: não mostrar erros a vermelho antes de o agente interagir/submeter.
- Resultados sem fotografia: não mostrar um bloco cinzento enorme; usar um placeholder compacto.

## 11. Estados do pedido (actualizados)
Pedido submetido · A aguardar atribuição (pelo operador) · Agente atribuído · Em consulta · Resposta submetida — pagamento pendente (referência gerada) · Pagamento confirmado · Consulta concluída · Cancelado.

## 12. Aceitação (demo de ponta a ponta)
Cliente **empresa** cria pedido múltiplo com 3 itens numa superfície (vê 2 400 Kz antes de confirmar) → operador dessa superfície atribui a um agente → agente aceita e submete resultados por item → cliente recebe a referência Multicaixa → pagamento confirmado pela plataforma (admin ou botão demo) → resultados desbloqueados → carteira do agente aumenta 60% do líquido → agente pede levantamento por IBAN (segundo pedido no mesmo dia é bloqueado) → admin confirma o levantamento → objectivos/comissão do operador reflectem o novo valor → financeiro e CSV coerentes.
`bun run build` e `bun run lint` verdes; sem ficheiros .css; páginas sem erros na consola.
