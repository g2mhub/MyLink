# 10 · Planos e Limites

## 1. Modelo (decisão registrada)

**Sem gateway de pagamento.** O plano é atribuído **manualmente pelo administrador** no painel administrativo ([doc 14](docs/14-painel-administrativo.md)). O campo `plans.price_monthly_cents` existe para exibir o preço na UI e preparar a cobrança futura (Stripe na fase 2).

| | **Gratuito** | **Pago ("Pro")** |
|---|---|---|
| Código | `free` (id 1, default de novos usuários) | `pro` (id 2) |
| Mensalidade (exibida) | R$ 0,00 | **R$ 15,00/mês** (`price_monthly_cents = 1500`) |
| Páginas | 1 | ilimitadas (`max_pages = -1`) |
| Links por página | 5 | ilimitados (`max_links_per_page = -1`) |
| Personalização | temas prontos + cores | completa (temas + cores + fontes + layout + botão) |
| Métricas | últimos 30 dias | histórico completo (`metrics_days = -1`) |
| Domínio próprio | ❌ | ✅ (recurso futuro; já modelado em `custom_domains`) |

Seed em `supabase/migrations/0001_init.sql`. `profiles.plan_id` default `1`. Novos planos podem ser **criados pelo administrador** (tabela `plans` editável: nome, limites, preço).

## 2. Onde os limites são aplicados

**Fonte de verdade = banco (triggers); UI = conveniência.**

| Limite | Mecanismo | Mensagem exibida |
|---|---|---|
| Páginas | trigger `pages_limit_before_insert` | "Limite de 1 página atingido no seu plano. Fale com o administrador para fazer upgrade." |
| Links por página | trigger `links_limit_before_insert` (+ `before update of page_id`) | "Seu plano permite até 5 links por página. Fale com o administrador para fazer upgrade." |
| Janela de métricas | recorte no `get_metrics` + `janela_dias` no retorno | "Dados disponíveis dos últimos 30 dias." |

- `usePlanLimits()` no front-end desabilita botões **antes** do usuário bater no limite (tooltip CTA), mas o erro do trigger é tratado como caminho normal (toast pt-BR).
- Sem botão de "Assinar": o CTA do Free é **"Fale com o administrador"** (mailto/link de contato na tela de configurações), pois a ativação é manual.

## 3. Fluxo de ativação (fase 1)

1. Usuário Free atinge o limite → vê o CTA "Fale com o administrador".
2. Administrador abre **Admin → Usuários**, seleciona o usuário → **Atribuir plano** → `pro` → confirma.
3. A troca é imediata: `profiles.plan_id` é atualizado pela RPC `admin_assign_plan` (security definer, só admin) → limites desaparecem na próxima leitura (TanStack Query invalida no refetch).
4. **Downgrade** (pro → free) segue a regra §4: sem cascata; criações novas são barradas, existentes continuam no ar — com aviso no painel do usuário.

## 4. Mudança de plano e invariantes

| Situação | Resolução |
|---|---|
| Upgrade (admin) | `admin_assign_plan(user_id, plan_id)` → imediato |
| Downgrade que viola limites | permitido, sem apagar nada; usuário vê aviso "Seu plano atual tem menos páginas do que as que você já criou — as existentes continuam no ar." |
| Usuário bloqueado (`status='bloqueado'`) | não consegue logar; escritas barradas por RLS (doc 03 §6) — planos permanecem como estavam |
| Preço | exibido em `Configurações` e na tela pública de marketing: "Pro — R$ 15,00/mês" (`Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`) |
| Cobrança recorrente (fase 2) | Stripe Checkout + webhook → `profiles.plan_valid_until`; downgrade automático no vencimento (schema já reserva o campo) |

## 5. Campos no banco

```sql
-- plans (relevante; doc 03 §1)
price_monthly_cents integer not null default 0,   -- pro = 1500 (R$ 15,00)
max_pages           integer not null,             -- -1 = ilimitado
max_links_per_page  integer not null,
metrics_days        integer not null,             -- -1 = histórico todo
custom_domain       boolean not null default false
```

Administrador pode `insert/update/delete` em `plans` (policy `plans_admin`, doc 03 §6) — criar novos planos (ex.: "Pro Anual") é suportado pela UI de planos.

## 6. Aceite do módulo (resumo — ver doc 12)

- [ ] Usuário Free não cria a 2ª página nem o 6º link, em UI **e** via chamada direta ao PostgREST (erro do trigger).
- [ ] Após o admin atribuir `pro`, os mesmos botões liberam sem reload da página (refetch).
- [ ] Mensagens de limite em pt-BR com CTA "Fale com o administrador".
- [ ] Métricas Free cortam em 30 dias; Pro mostra o histórico todo.
- [ ] Preço R$ 15,00/mês formatado em pt-BR nas telas de configurações e landing.
