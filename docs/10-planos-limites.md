# 10 · Planos e Limites

## 1. Modelo (decisão registrada)

**Fase 1: planos com limites, sem cobrança.** Tabela `plans` + triggers aplicam limites (doc 03 §4.3–4.4); não há gateway de pagamento nesta fase — Stripe e `plan_valid_until` ficam prontos no banco para a fase 2.

| | **Gratuito** | **Pro** |
|---|---|---|
| Código | `free` (id 1, default) | `pro` (id 2) |
| Páginas | 1 | ilimitadas |
| Links por página | 5 | ilimitados |
| Métricas | últimos 30 dias | histórico completo |
| Temas e personalização | ✅ | ✅ |
| Domínio próprio | ❌ | ✅ (recurso futuro; já modelado em `custom_domains`) |
| Preço de referência | R$ 0 | R$ 19,90/mês *(sem cobrança nesta fase)* |

Seed em `supabase/seed.sql` (doc 03 §8). `profiles.plan_id` default `1`.

## 2. Onde os limites são aplicados

**Fonte de verdade = banco (triggers), UI = conveniência.**

| Limite | Mecanismo | Mensagem exibida |
|---|---|---|
| Páginas | trigger `pages_limit_before_insert` → `raise exception` | "Limite de 1 página atingido no seu plano. Faça upgrade para criar mais." (toast + CTA `/painel/configuracoes`) |
| Links por página | trigger `links_limit_before_insert` (+ `before update of page_id`) | "Seu plano permite até 5 links por página. Faça upgrade para adicionar mais." |
| Janela de métricas | recorte no `get_metrics` + `janela_dias` no retorno | "Dados disponíveis dos últimos 30 dias." |

**Por que triggers e não só front-end:** o cliente pode ser contornado (dev tools, chamada direta à API) — RLS/triggers são a garantia real. O front-end lê os limites via `usePlanLimits()` para **desabilitar botões com tooltip antes** do usuário bater no erro (melhor UX), mas trata o erro do trigger como caminho normal.

```ts
// hooks/usePlanLimits.ts
const { plano } = useSession();
const limiteLinks = plano.maxLinksPorPagina;            // -1 → ilimitado
const podeCriarPagina = plano.maxPaginas === -1 || paginasAtuais < plano.maxPaginas;
const podeAdicionarLink = limiteLinks === -1 || linksDaPagina < limiteLinks;
```

## 3. UX de upgrade (sem cobrança nesta fase)

- **Próximo do limite (≥ 80%):** badge discreto perto do botão "+ Adicionar": "4 de 5 links".
- **No limite:** botão desabilitado + tooltip CTA.
- **Trigger disparado mesmo assim:** toast de erro com botão "Ver planos".
- **`/painel/configuracoes`:** card do plano atual com barras de uso (páginas, links) + card Pro comparando limites + botão **"Conhecer o Pro"** que abre modal explicando: *"O pagamento está em breve. Deixe seu e-mail na lista de espera"* (captura numa tabela `waitlist_pro` — SQL opcional, fase 1.5).
- **Nunca** mostrar preço clicável/com checkout inexistente.

## 4. Caminhos de mudança de plano (fase 1)

| Situação | Resolução |
|---|---|
| Upgrade manual (teste/parceria) | Dashboard Supabase: `update profiles set plan_id = 2 where id = '…'` |
| Downgrade que viola limites (ex.: Pro → Free com 3 páginas) | **Permitido, sem cascata:** as páginas existentes continuam visíveis; apenas **novas** criações são barradas. Aviso no card do plano: "Seu plano atual tem menos páginas do que as que você já criou — as existentes continuam no ar." |
| Cancelamento/validade (fase 2) | `plan_valid_until` + job que volta para `free` (schema pronto) |

## 5. Fase 2 (cobrança) — fora do escopo, esboço para não retrabalhar

1. Stripe Checkout (session por usuário) + webhook `/api/stripe` (Edge Function ou Netlify Function) confirmando pagamento → `update profiles set plan_id, plan_valid_until`.
2. Cancelamento respeita fim do ciclo; downgrade automático aplica a regra da §4.
3. Preço exibido = `plans.price_monthly_cents` formatado em pt-BR (`Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`).

## 6. Aceite do módulo (resumo — ver doc 12)

- [ ] Usuário Free não cria a 2ª página nem o 6º link, em UI **e** via chamada direta ao PostgREST (erro do trigger).
- [ ] Usuário Pro (`plan_id=2`) não encontra limites.
- [ ] Mensagens de limite em pt-BR com CTA visível.
- [ ] Métricas Free cortam em 30 dias mesmo pedindo período maior; Pro mostra o histórico todo.
