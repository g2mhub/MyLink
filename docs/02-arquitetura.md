# 02 · Arquitetura do Sistema

## 1. Visão geral

SPA React (Vite) hospedada no Netlify, falando diretamente com o Supabase (Auth, Postgres + RLS, Storage) pelo cliente `@supabase/supabase-js`. Único ponto server-side do produto é a **Edge Function `track-click`** (Supabase Edge Functions, Deno), que grava eventos de métrica com `service_role` e valida o destino do link.

```
                        ┌──────────────────────────────────────────────┐
  Navegador ───────────►│ Netlify (CDN global)                          │
  (SPA React)           │  • assets estáticos (/assets/*, cache longo) │
       ▲                │  • /index.html  → /* 200 (fallback SPA)      │
       │                └──────────────────────────────────────────────┘
       │ HTTPS (anon key + RLS)
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Supabase                                                             │
│  • Auth      (e-mail/senha, Google OAuth, sessão JWT)                │
│  • Postgres  (tabelas plans, profiles, themes, pages, links,         │
│               click_events, custom_domains + RLS + triggers)         │
│  • Storage   (bucket público 'avatars')                              │
│  • Edge Fn   ('track-click' — grava eventos com service_role)        │
└──────────────────────────────────────────────────────────────────────┘
       ▲
       │ POST /functions/v1/track-click  (pageview e clique)
       └── chamado pela página pública (mantém navegação não bloqueada)
```

**Princípios adotados**
1. **Sem backend próprio** — toda autorização vive no RLS; o front-end nunca é fonte de verdade de permissão.
2. **Uma árvore de componentes para preview e página pública** (`PageRenderer`) — garante fidelidade do preview (doc 07).
3. **Escrita de métrica só via Edge Function** — anônimos nunca escrevem direto no banco.
4. **Tudo em pt-BR** — textos centralizados em `src/i18n/ptBR.ts` para permitir i18n futura sem reescrita.

## 2. Stack (decisões concretas)

| Camada | Tecnologia | Versão alvo | Justificativa |
|---|---|---|---|
| Build/bundler | Vite | 5+ | Build estático rápido, HMR, padrão da casa com React |
| UI | React + TypeScript | React 18+, TS 5+ | Ecossistema, contratos de tipos |
| Roteamento | React Router | 6+ | SPA com lazy loading por rota |
| Estilo | Tailwind CSS | 3+ | Velocidade de UI + dark mode por classe |
| Estado do editor | Zustand | 4+ | Store leve para draft + preview reativo |
| Estado servidor | TanStack Query | 5+ | Cache, refetch, optimistic updates nos links |
| Drag-and-drop | @dnd-kit | latest | Acessível, touch-friendly, leve |
| Gráficos | Recharts | 2+ | Métricas simples (área/barras) |
| Ícones | lucide-react + mapa próprio `src/components/icons/brand.tsx` | — | Genéricos + marcas (WhatsApp, Instagram…) |
| Banco/Auth/Storage | Supabase (Postgres 15+, supabase-js v2) | — | Decisão do produto |
| Métrica server-side | Supabase Edge Functions (Deno) | — | Escrita segura de eventos |
| Deploy | Netlify | — | Decisão do produto; deploy preview por PR |
| Testes | Vitest + Testing Library + Playwright | — | Unit + E2E no Supabase local |
| Qualidade | ESLint + Prettier + `tsc --noEmit` | — | Rodam no build do Netlify |

## 3. Estrutura do repositório

```
mylink/
├── netlify.toml                  # build, redirects SPA, headers de segurança
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── .env.example                  # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_PUBLIC_SITE_URL
├── public/
│   ├── favicon.svg
│   └── og-default.png            # imagem padrão de compartilhamento
├── supabase/
│   ├── config.toml               # supabase local (CLI)
│   ├── migrations/
│   │   ├── 0001_plans_profiles.sql
│   │   ├── 0002_themes_pages_links.sql
│   │   ├── 0003_click_events.sql
│   │   ├── 0004_rls.sql
│   │   ├── 0005_storage.sql
│   │   └── 0006_functions_triggers.sql
│   ├── seed.sql                  # planos + temas prontos
│   └── functions/
│       └── track-click/index.ts  # Deno Edge Function
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── router.tsx                # rotas + lazy imports + guards
    ├── i18n/ptBR.ts              # todos os textos de UI
    ├── lib/
    │   ├── supabase.ts           # createClient singleton
    │   ├── urls.ts               # valida/normaliza URL de destino
    │   └── format.ts             # datas/números pt-BR
    ├── types/db.ts               # tipos gerados do schema (supabase gen types)
    ├── services/                 # única porta de entrada de dados (doc 04)
    │   ├── auth.ts  profiles.ts  pages.ts  links.ts  metrics.ts  storage.ts
    ├── hooks/
    │   ├── useSession.ts         # sessão + guard de rota
    │   ├── usePage.ts  useLinks.ts  useMetrics.ts
    │   └── usePlanLimits.ts
    ├── stores/
    │   └── editorStore.ts        # Zustand: draft da página + status de salvamento
    ├── components/
    │   ├── ui/                   # Button, Input, Modal, Toast, Skeleton, Tabs…
    │   ├── icons/brand.tsx       # mapa de ícones de marca
    │   ├── editor/               # LinkList, LinkForm, ThemePicker, AppearancePanel…
    │   └── page-renderer/        # PageRenderer + blocos (usado em preview e pública)
    ├── pages/
    │   ├── landing/Landing.tsx
    │   ├── auth/  (Login, Cadastro, RecuperarSenha, RedefinirSenha, AuthCallback)
    │   ├── painel/ (Dashboard, MinhasPaginas, Editor, Perfil, Metricas, Configuracoes, Onboarding)
    │   └── publica/ (PaginaPublica, PaginaNaoEncontrada)
    └── styles/globals.css
```

## 4. Mapa de rotas (SPA)

| Rota | Tela | Acesso |
|---|---|---|
| `/` | Landing (marketing) | público |
| `/entrar` | Login | público (redireciona se logado) |
| `/cadastro` | Cadastro | público |
| `/redefinir-senha` | Definir nova senha (token do e-mail) | público |
| `/auth/callback` | Troca código do OAuth/e-mail por sessão | público |
| `/painel` | Visão geral | autenticado |
| `/painel/onboarding` | Escolher handle (usuarios Google) | autenticado sem handle definitivo |
| `/painel/paginas` | Lista de páginas | autenticado |
| `/painel/paginas/:pageId` | **Editor** (links + aparência + preview) | dono |
| `/painel/paginas/:pageId/metricas` | Métricas da página | dono |
| `/painel/perfil` | Perfil (handle, foto, bio) | autenticado |
| `/painel/configuracoes` | Plano, limites, logout | autenticado |
| `/:handle` | **Página pública** (página principal) | público |
| `/:handle/:slug` | **Página pública** (secundária) | público |
| `*` | 404 | público |

**Resolução de conflito rota-pública vs rota-do-app:** a rota `/:handle` é declarada **por último** no router e valida o segmento contra a lista de handles reservados (`app`, `api`, `painel`, `auth`, `entrar`, `cadastro`, `assets`, `sobre`, `ajuda`, `termos`, `privacidade`, `contato`, `www`… — lista versionada em `src/lib/urls.ts` e **espelhada** no CHECK do banco, doc 03). Se o segmento for reservado ou não existir como handle, renderiza `PaginaNaoEncontrada`.

## 5. Variáveis de ambiente

| Nome | Onde | Exposto ao browser? | Uso |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Netlify (build) + `.env.local` | sim | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Netlify (build) + `.env.local` | sim (é o design do Supabase; proteção vem do RLS) | chave pública |
| `VITE_PUBLIC_SITE_URL` | Netlify (build) | sim | URL canônica p/ links e Open Graph (ex.: `https://mylink.com.br`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **apenas** no Supabase (Edge Function secret) | **nunca** | gravação de eventos |

Regras: nenhum segredo além da service key (que fica só no Supabase); `.env*` no `.gitignore`; `.env.example` versionado.

## 6. CI/CD (GitHub → Netlify)

1. Repo no GitHub; Netlify conectado ao repo (build contínuo).
2. `netlify.toml` fixa o processo de build (não depender da UI do Netlify):
   ```toml
   [build]
     command = "npm ci && npm run lint && npm run typecheck && npm run test -- --run && npm run build"
     publish = "dist"
     node_version = "22"

   [build.environment]
     NODE_OPTIONS = "--max-old-space-size=4096"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```
   (Headers de segurança em [docs/11](docs/11-seguranca-e-performance.md).)
3. **Deploy previews por PR** + deploy de produção na `main`.
4. Variáveis de ambiente configuradas no painel do Netlify (Production e Preview).
5. **Migrações de banco não rodam no build** — aplicadas com Supabase CLI:
   ```bash
   supabase link --project-ref <ref>
   supabase db push          # aplica supabase/migrations/*
   supabase functions deploy track-click
   ```
   Checklist de release manual documentado no doc 13.

## 7. Dimensionamento inicial (20–30 usuários)

Números oficiais verificados em 2026 (Supabase pricing/limits, Netlify docs):

| Recurso | Cota Free (Supabase) | Nosso uso estimado (30 usuários) |
|---|---|---|
| Banco Postgres | 500 MB | < 50 MB (linhas pequenas; métrica é o único crescimento) |
| Storage | 1 GB (arquivo máx. 50 MB) | avatares redimensionados a ≤ 100 KB → ~3 MB |
| MAU Auth | 50.000 | 30 |
| Edge Functions | 500.000 invocações/mês | ~30 mil/mês (1 view + N cliques/página) |
| Realtime | 200 conexões | 0 (não usado — preview é local) |
| Egress | 5 GB não cacheado + 5 GB cacheado | folgado; páginas públicas puxam poucos KB |
| Netlify | Free por créditos (300/mês; deploy de produção = 15 créditos) | build curto ~1 crédito; previews moderados |

**Conclusão:** o Free do Supabase e o Free do Netlify sustentam com folga a fase inicial. Marcos de upgrade: banco > 250 MB, egress > 3 GB/mês, ou crescimento além de ~500 usuários ativos → migrar para Supabase Pro (backups diários incluídos — no Free **não há backup automático**, então exportar `pg_dump` semanal até lá).

## 8. Contratos de tipos

- `src/types/db.ts` é **gerado** do schema real: `supabase gen types typescript --linked > src/types/db.ts` após cada migração (script `npm run db:types`).
- A camada de serviços (doc 04) só expõe tipos de domínio (`Page`, `Link`, `Metrics`), nunca tipos crus do banco nos componentes.
