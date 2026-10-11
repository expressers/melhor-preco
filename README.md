# Melhor Preço

MVP estático da plataforma Melhor Preço (Luanda): o cliente pede o preço de um produto numa ou mais superfícies comerciais, um agente credenciado vai ao local e submete preços, fotografias e localização, e o cliente paga ao agente por Multicaixa Express depois da resposta. Não é uma loja.

Fonte de verdade do âmbito: [`BRIEF.md`](BRIEF.md). Produto e direcção visual: [`PRODUCT.md`](PRODUCT.md), [`DESIGN.md`](DESIGN.md).

Sem backend: os dados de demonstração estão em `src/lib/mock/`, lidos pela camada `src/lib/data/` (pronta para ligar uma base de dados), e o estado vive no browser (Zustand persistido em `localStorage`, chave `melhor-preco:v1`).

## Comandos (só Bun)

```bash
bun install        # dependências (bun.lock)
bun run dev        # servidor de desenvolvimento (Turbopack), http://localhost:3000
bun run build      # export estático para out/
bun run lint       # ESLint
```

`bun run build` gera um site estático em `out/` (`output: "export"`, `trailingSlash: true`, `images.unoptimized`). Os pedidos criados no browser abrem por query string (`/cliente/pedido/?id=MP-2026-00042`), por isso funcionam sem rotas dinâmicas.

## Deploy no Render

`render.yaml` define um site estático: `bun install --frozen-lockfile && bun run build`, publica `./out`. Basta criar um Blueprint no Render a partir do repositório.

## Demonstração

- **Ver como** (no cabeçalho de todas as páginas e no rodapé da landing): muda entre Cliente, Agente e Admin e escolhe o cliente ou o agente que está a agir. Só agentes activos recebem pedidos.
- **Palavra-passe de demonstração** dos clientes fictícios: `demo1234` (entrar com o telefone de qualquer cliente). Também pode criar uma conta nova.
- **Repor dados de demonstração** (no menu Ver como) apaga o que fez no browser e volta aos dados iniciais.
- Fluxo completo: cliente cria conta e submete pedido → admin atribui a um agente activo → agente aceita e submete a resposta → cliente vê o valor e os dados de pagamento → agente confirma a recepção do pagamento → resultados desbloqueados e comissão registada → admin vê o financeiro e exporta CSV.

## Estilos: Sass + Tailwind v4

Não há ficheiros `.css` no repositório. Os estilos são utilitários Tailwind e `*.module.scss`.

1. `src/app/globals.scss` é compilado primeiro pelo Sass. `@use "tailwindcss"` inclui o CSS do Tailwind.
2. O resultado passa pelo PostCSS com `@tailwindcss/postcss` (`postcss.config.mjs`), que processa `@theme`, `@custom-variant`, `@utility` e gera os utilitários.
3. **tw-animate-css** (animações dos componentes shadcn) não pode passar pelo Sass: os utilitários com `--value(...)` não são SCSS válido. Por isso é importado com um caminho relativo terminado em `.css`:

   ```scss
   @import "../../node_modules/tw-animate-css/dist/tw-animate.css";
   ```

   O Sass deixa um `@import` de `.css` intacto e o plugin PostCSS do Tailwind inclui-o e compila-o. O nome do pacote sozinho (`@import url("tw-animate-css")`) funcionava no build mas dava erro 500 no `next dev`, porque o Turbopack tentava resolvê-lo por conta própria.

Tokens, mixins (`src/styles/_mixins.scss`) e regras de movimento estão descritos em `DESIGN.md`.
