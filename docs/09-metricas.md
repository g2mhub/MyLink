# 09 · Métricas de Cliques

## 1. Modelo de dados (resumo — detalhe no doc 03 §3)

Tabela `click_events` (eventos brutos):

| Coluna | Conteúdo |
|---|---|
| `kind` | `'view'` (visualização da página) ou `'click'` (clique em link) |
| `page_id` | obrigatório, FK → `pages` (on delete cascade) |
| `link_id` | obrigatório em `click`; **null em `view`** |
| `occurred_at` | `timestamptz default now()` |
| `device` | `mobile` \| `tablet` \| `desktop` (derivado do UA na Edge Function) |
| `referer_host` | host do `Referer` (ex.: `instagram.com`, `l.facebook.com`) |

**Decisões:**
- **Sem ID de usuário e sem IP na tabela** → métricas são anônimas por construção; nada de LGPD-cheio para o visitante.
- Eventos brutos, sem pré-agregação na fase 1: volume esperado é pequeno (30 usuários ⇒ milhares de linhas/mês) e a RPC agrega sob demanda.
- **Marco de escala (doc 11):** > 2–3 M de linhas ⇒ adicionar tabela `click_daily_agg` (rollup por dia/link) via cron/trigger e manter brutos só 90 dias.

## 2. Coleta

```
Visitante abre /klauz ──► POST track-click {acao:'view', paginaId}      (1× por montagem)
Visitante clica link  ──► POST track-click {acao:'click', linkId} ──► {ok, url} ──► navega
```

- Edge Function `track-click` (doc 04 §4): valida, filtra bots, rate-limit por IP, grava com `service_role`.
- Cliente usa `keepalive` + `AbortController` (800 ms) — métrica **nunca** atrasa o clique.
- Contagem fiável: pageview conta **uma vez por montagem**; SPA volta ao topo via `navigate` da mesma rota ⇒ guarda com ref por `pageId` na sessão para não duplar em navegações internas (a página pública é externa — montagem = visita).

## 3. Consulta agregada — RPC `get_metrics(page_id, de, ate)`

Retorna (doc 03 §5):

```jsonc
{
  "de": "2026-09-19", "ate": "2026-10-18", "janela_dias": 30,
  "totais":   { "views": 128, "clicks": 42 },
  "por_dia":  [ { "dia": "2026-10-12", "views": 21, "clicks": 9 }, ... ],
  "por_link": [ { "link_id": "…", "titulo": "Instagram", "icone": "instagram",
                  "url": "https://instagram.com/…", "clicks": 18 }, ... ]
}
```

- **Segurança:** `security definer` + confere `owner_id = auth.uid()` antes de retornar qualquer coisa (RLS sozinho não deixaria o dono ler `click_events`, que é `force row level security` sem policies).
- **Plano:** recorta `de` pela janela do plano (`metrics_days`; Free = 30 dias) e devolve `janela_dias` para a UI exibir "Dados disponíveis dos últimos 30 dias".
- Orçamento: índices `(page_id, occurred_at desc)` e `(link_id, occurred_at desc) where link_id is not null` deixam as 3 agregações em milissegundos nesse volume.

## 4. Telas de métricas

Resumo (wireframe no doc 06 §8):

- **Filtros:** chips `7 dias` · `30 dias` · `90 dias` (90 dias bloqueado no Free com cadeado + tooltip "Disponível no Pro").
- **Cards:** Visualizações · Cliques · Taxa de cliques (`clicks/views`, com `-` se views = 0).
- **Gráfico:** `Recharts` — barras (`views`, cor `brand-500` a 30%) + linha (`clicks`, `brand-600`), eixo X em `dd/MM`, tooltip pt-BR, `aria-label` descritivo + tabela de dados acessível (screen reader).
- **Tabela "Cliques por link":** ícone, título, cliques, barra proporcional, % e botão [Abrir] (abre o link em nova aba). Ordenada desc por cliques; links com 0 cliques no período aparecem com "—".
- **Visão geral do painel** (doc 06 §5): mini-resumo de 7 dias (`views`, `clicks`, sparkline) + top 3 links recentes — usa a mesma RPC com período curto.
- **CSV:** `[Baixar CSV]` gera `metricas-{handle}-{de}-{ate}.csv` no cliente (BOM UTF-8, separador `;`, decimais pt-BR) — download estático, sem servidor.
- Estados: skeleton no load; "Sem dados neste período" com `EmptyState`; erro com [Tentar novamente].

## 5. Limites de exibição por plano

| | Free | Pro |
|---|---|---|
| Janela de dados | últimos 30 dias | histórico completo (`-1`) |
| Gráfico diário | ✅ | ✅ |
| Por link | ✅ | ✅ |
| CSV | ✅ | ✅ |
| 90 dias / datas antigas | 🔒 | ✅ |
| Métricas por dispositivo e origem (fase 2) | 🔒 | ✅ |

Os dados brutos dos planos gratuitos **continuam sendo coletados** (a janela limita a *exibição*, não a coleta) — assim o upgrade imediatamente mostra histórico.

## 6. Onde NÃO usar métrica (anti-padrões evitados)

- Sem webhook de terceiros (GA/Meta Pixel) na fase 1 — evita cookie banner e dependência externa.
- Sem contagem "por sessão/visitante único" na fase 1 (sem armazenar identificador do visitante). `por_dia` é soma de eventos.
- `custom_domains` (fase futura) herdará a mesma coleta.
