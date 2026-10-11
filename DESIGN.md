# Melhor Preço · DESIGN ("Etiqueta")

The visual world comes from the most universal object in any market: **the price tag**, and its companion, **the receipt (talão)**. Cool neutral paper, near-black ink, one accent: tag yellow. Everything else is restraint.

## Tokens (defined in `src/app/globals.scss`, mapped into the shadcn theme)
| Token | Value | Use |
|---|---|---|
| `--paper` | `#F3F4F1` | page background |
| `--paper-2` | `#E9EBE6` | sunken areas, secondary fills |
| `--surface` | `#FFFFFF` | cards, inputs, popovers |
| `--ink` | `#111311` | text, primary buttons |
| `--ink-2` | `#4A4F4A` | secondary text |
| `--line` | `#DADDD6` | borders, rules |
| `--tag` | `#FFD21F` | the single accent: price tags, the one primary CTA per screen, highlights. Always with `--ink` text. Never yellow text on white |
| `--tag-deep` | `#F2C200` | pressed/hover of tag surfaces |
| `--success` / `--warning` / `--error` / `--info` | `#1F7A4D` / `#965A00` / `#B3261E` / `#2F5BD3` | state colours, **only in badges** (10% tint fill + coloured text). Warning is darkened from the BRIEF `#B26B00` (3.8:1 on paper) to pass WCAG AA |

Tailwind names: `bg-paper`, `bg-paper-2`, `bg-surface`, `text-ink`, `text-ink-2`, `border-line`, `bg-tag`, `text-success` etc.

## Shape
- Cards and inputs: 12px (`rounded-lg`). Buttons and badges: pill (`rounded-full`). Nothing else.
- Shadows almost none, ink-tinted: `shadow-soft`, `shadow-lift` (popovers, toasts only).
- Group with spacing and hairlines before reaching for a card.

## Type
- Geist for UI; Geist Mono for **prices, request IDs (`MP-2026-00041`), agent codes (`AG-007`)**, always `tabular-nums` (utility `tabular`).
- Headings: weight 600, negative tracking (set in base layer). Body max 65ch (`measure`).
- Small labels in mono uppercase are rationed (receipt headers only).

## Motifs
- **PriceTag** (`src/components/price-tag.tsx`): yellow tag with a punched hole and a cut corner, mono tabular amount. Used for every money figure that matters (request price, agent share, result price).
- **Receipt** (`src/components/receipt.tsx`): white slip with dashed rules and a perforated (zigzag) edge. Used for results and payment summaries.
- **Timeline** of audit events: a thin ink rail with small square ticks, mono timestamps.

## Shared components (`src/components/`)
- `AppShell` + `PageHeader`: area frame. Solid paper header (no blur), ink pill for the active link, tag-yellow bar on the active mobile tab. Admin gets a sidebar from `lg`.
- `NotificationCentre`: popover from the bell; unread count in a tiny tag pill; unread rows marked with a small tag square.
- `ViewAsSwitcher`: "Ver como" dropdown (role, acting agent/client, reset demo data).
- `StatusBadge` and typed badges: tone tints only, never solid colour blocks.
- `Timeline`, `EmptyState` (dashed outline, says how to fill it), `ProductPhoto` (fixed frame, neutral fallback), `HydrationGate`/`PageSkeleton`.

## Motion (Emil Kowalski rules)
- Only `transform` and `opacity`. Ease `cubic-bezier(0.23, 1, 0.32, 1)` (`ease-out` token). 150-250ms for UI.
- Pressables: `:active` `scale(0.97)` (Button has it; `press` utility for custom ones).
- Hover only under `(hover: hover) and (pointer: fine)` (`hover-fine:` variant or `@include hover` mixin).
- `prefers-reduced-motion` respected globally. Popovers scale from their trigger origin.
- No animation on things used dozens of times a day (list rows, tabs).

## Layout
- Mobile-first, no horizontal scroll, touch targets ≥ 44px. Agent area is single column, one-hand. Admin uses desktop width with tables.
- Light theme only.

## Bans
Purple gradients, glassmorphism, emojis, three equal cards in a row, em-dashes in copy, decorative status dots, yellow text on white, `.css` files (styles are Tailwind utilities or `*.module.scss`).
