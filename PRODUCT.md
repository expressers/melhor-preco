# Melhor Preço · PRODUCT

Source of truth for scope and rules: `BRIEF.md`. This file captures the durable product context design decisions depend on.

## What it is
A web platform (responsive, mobile-first) for Luanda, Angola. A consumer asks "how much is X, and is it in stock, at these shopping surfaces?"; the platform routes the request to an accredited field agent who goes to the surface, collects price, availability, variants, location and photos, and submits them. The consumer pays the agent directly (Multicaixa Express) after the answer; full results unlock once the agent confirms the payment.

It is **not** a shop. No selling, orders, carts, delivery, negotiation or chat. Only information gathering.

## People and scenes
| Who | Device and scene | What success looks like |
|---|---|---|
| Cliente (consumer) | Mid-range Android, mobile data, at home or at work | Submits a request in under a minute, sees the price before confirming, knows the state at a glance, reads results like a receipt |
| Agente (field agent) | Phone in one hand, inside a crowded market (Shopping Popular, Cidade da China, Novo São Paulo) | Accepts, fills the answer per product fast with big targets, confirms payment once |
| Admin (operator) | Desktop | Assigns agents, watches late/incomplete requests, reconciles 400/200 split, exports CSV |

## Surfaces and modes
- `/` landing: **Persuade**. Plain explanation of the flow, 600 Kz minimum price, initial surfaces, two entries (Fazer uma consulta / Ser agente). No invented stats, no fake testimonials, no third-party logos.
- `/cliente`, `/agente`: **Operate**, mobile-first.
- `/admin`: **Operate**, desktop density.

## Economics (non-negotiable)
- Minimum 600 Kz per consulta = 400 Kz agent + 200 Kz platform.
- Extra surfaces add a configurable increment; price never below 600 Kz; client sees it before submitting.
- Payment only requested after the answer; never assumed. Duplicate confirmations rejected. Platform commission tracked as due vs settled.

## Voice
Português de Angola, grafia pré-AO ("projecto", "actualizar", "selecção", "recepção"). Direct and warm, short sentences, concrete verbs ("Fazer uma consulta", "Confirmar recepção do pagamento"). Money as `1 200 Kz`. No hype words, no emojis, no em-dashes in UI copy. Always remind that prices are those at the moment of the consulta and may change.

## Anti-references
E-commerce storefronts, fintech purple gradients, glassmorphism, three equal feature cards, stock "happy people" heroes, dashboards full of decorative charts.
