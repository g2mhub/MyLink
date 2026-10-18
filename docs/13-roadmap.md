# 13 · Roadmap de Implementação

Estimativas para 1 dev full-stack em tempo parcial (~60 h/semana), com verificação de "definição de pronto" (doc 12 §5) ao fim de cada fase.

## Fases

| # | Fase | Entregas | Depende de | Estimativa |
|---|---|---|---|---|
| **0** | Fundação | Repo GitHub + Vite/React/TS + Tailwind + ESLint/Prettier; Supabase CLI + 1ª migração (`plans`, `profiles`, trigger `handle_new_user`); Netlify conectado com build preview; `.env.example`; esqueleto de rotas com guards | — | 2 dias |
| **1** | Autenticação e perfil | Cadastro (handle + debounce), login, login Google, confirmação de e-mail, recuperação de senha, `/auth/callback`, onboarding de handle, tela de perfil com avatar (crop/WebP) | 0 | 4 dias |
| **2** | Páginas e links | CRUD de páginas (migração `pages`), CRUD de links, drag-and-drop (@dnd-kit, mouse+teclado), ocultar/destaque, limites Free via triggers + `usePlanLimits`, seed de temas | 1 | 4 dias |
| **3** | Editor + preview | `PageRenderer` compartilhado, editor com 3 abas, `editorStore` (draft), auto-save com debounce/retry/offline, painel dividido com preview, ações Publicar/Copiar | 2 | 4 dias |
| **4** | Página pública | Rota `/:handle` e `/:handle/:slug`, 6 temas × 3 layouts × 3 botões, 404 com sugestões, cabeçalho social dinâmico, responsividade + a11y (axe) | 3 | 3 dias |
| **5** | Métricas | Migração `click_events`, Edge Function `track-click` (bot filter + rate-limit), tracking na pública, RPC `get_metrics`, telas de métricas (cards, gráfico, tabela, CSV), mini-resumo no dashboard | 4 | 3 dias |
| **6** | Painel completo | Dashboard com coach marks, "Minhas páginas" (cards, menu ⋯), Configurações/plano com barras de uso e modal Pro (lista de espera), estados globais (vazio/erro/offline) | 3 | 3 dias |
| **7** | Hardening e lançamento | Checklist do doc 12 §4 (segurança), Lighthouse CI nos previews, testes E2E F1–F5 no CI, páginas `/termos` e `/privacidade`, domínio `mylink.com.br`, DNS, smoke em iOS/Android real, monitor de uptime | 5 | 3 dias |

**Total ≈ 26 dias úteis (~5 semanas).**

## Marcos (M)

- **M1 — fundação + auth** (fim fase 1): dá pra entrar e editar perfil.
- **M2 — produto editável** (fim fase 3): dá pra montar a página com preview.
- **M3 — MVP navegável** (fim fase 4): página pública no ar com URL real.
- **M4 — métricas + lançamento interno** (fim fase 7): 20–30 usuários reais.

## Checklist de release manual (deploy + banco)

```bash
npm ci && npm run lint && npm run typecheck && npm run test -- --run && npm run build
supabase link --project-ref <ref>
supabase db push                      # migrações novas
supabase functions deploy track-click # se mudou
npm run db:types                      # regenera src/types/db.ts
git push origin main                  # deploy de produção no Netlify
```

Pós-deploy: smoke manual (doc 12 §6) + verificar headers (`curl -I`) + checar dashboard de uso do Supabase.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Página pública SPA sem OG tags corretas em WhatsApp/Slack | compartilhamento "sem prévia" (doc 08 §7) | fase 1: aceito; fase 2: edge prerender na Netlify |
| Plano Free sem backup automático | perda de dados | `pg_dump` semanal automatizado (cron local/GitHub Action) |
| Login Google requer domínio autorizado no Supabase | onboarding Google bloqueado | configurar no dia 0 da fase 1; fallback e-mail/senha já existe |
| Handle público conflitando com rotas do app | rota quebrada | lista de reservados no banco + router (docs 02/03) |
| Volume de `click_events` crescer muito | queries lentas | rollup diário + retenção 90 dias (doc 09 §1, doc 11 §8) |
| Cobrança adiada demais vs. Pro "ilimitado" | usuários Free explodem | limites de uso justo; `plan_valid_until` pronto p/ Stripe |

## Pós-lançamento (backlog ordenado)

1. **Stripe** (Checkout + webhook + `plan_valid_until`) — doc 10 §5.
2. **Prerender de OG tags** na Netlify para previews ricos (doc 08 §7).
3. **Domínio próprio por página** (`custom_domains` + DNS verification) — Pro.
4. Métricas por dispositivo/origem no relatório (campos já gravados).
5. Métricas de período: moês, export PNG do relatório.
6. Mover slug por página (URLs customizadas `/minha-pagina`).
7. Integrações de conteúdo: feed Instagram/YouTube, botão "Fale no WhatsApp".
8. i18n (estrutura `i18n/ptBR.ts` já preparada) — espanhol primeiro.
9. Painel admin (ver usuários/planos) — via Metabase/Supabase Studio antes de app próprio.

## Perguntas em aberto para o time (não bloqueiam o início)

1. Nome definitivo do domínio de produção (`mylink.com.br`?) — afeta `VITE_PUBLIC_SITE_URL` e callbacks do Google OAuth.
2. Preço do Pro (usamos R$ 19,90 como referência de UI — confirmar).
3. Quem assume as páginas `/termos` e `/privacidade` (redação jurídica).
4. Hora de ativar a lista de espera do Pro vs. esperar o Stripe.
