# Mylink — Especificação e Desenvolvimento

**Gerador de páginas de agregador de links (estilo Linktree)** · Idioma da interface: **pt-BR** · Público inicial: **20–30 usuários**

| Item | Definição |
|---|---|
| Front-end | **React** (Vite + TypeScript + Tailwind) |
| Repositório | GitHub (repo local já inicializado neste diretório) |
| Deploy | Netlify (CI/CD automático a partir do GitHub) |
| Banco + Auth + Storage | Supabase (PostgreSQL, Supabase Auth, Supabase Storage) |
| Identidade visual | Logo `logo.png` + paleta **preto, laranja e branco** |
| Modelo de referência | pasta `Modelo/` do repositório (design da página pública) |
| Planos | **Gratuito** (1 página, 5 links) e **Pago R$ 15,00/mês** (ilimitado) — ativação/troca/cancelamento **manual pelo administrador**, sem gateway de pagamento |
| Papéis | usuário comum e **administrador**, com painel administrativo próprio |

> **⚠️ Assets pendentes:** os arquivos `logo.png` e a pasta `Modelo/` **ainda não estão no repositório**. Enquanto isso o app usa um logo SVG placeholder (`public/logo.svg`, laranja/preto/branco) e a página pública segue a especificação do [doc 08](docs/08-pagina-publica.md). Ao receber os assets: substituir o SVG e reconciliar o design público com o modelo.

## Resumo executivo

O Mylink permite que qualquer pessoa crie conta, personalize uma página pública com seus links e compartilhe em uma URL única (`mylink.com.br/seuhandle`). O painel do usuário oferece edição em tempo real com pré-visualização ao vivo, temas, layouts, drag-and-drop, foto de perfil, biografia e métricas de cliques. O **painel administrativo** gerencia usuários (listar, bloquear/ativar, detalhes) e planos (limites, preço e atribuição manual).

Decisões registradas:

1. **SPA Vite + React** — build estático no Netlify, integração direta com Supabase.
2. **Planos sem cobrança integrada** — tabela `plans` + limites aplicados no banco; ativação de plano é ação do administrador.
3. **Identidade preto/laranja/branco** em toda a interface (painel, auth, pública).
4. **Entrega por fases** — ver [docs/13-roadmap.md](docs/13-roadmap.md); critérios de aceite em [docs/12](docs/12-testes-e-aceite.md).

## Índice da especificação

| Doc | Conteúdo |
|---|---|
| [docs/01-visao-produto.md](docs/01-visao-produto.md) | Visão, personas, user stories, fluxos, escopo |
| [docs/02-arquitetura.md](docs/02-arquitetura.md) | Arquitetura, estrutura do repositório, env vars, CI/CD |
| [docs/03-banco-de-dados.md](docs/03-banco-de-dados.md) | Schema PostgreSQL, RLS (papéis usuário/admin), Storage, RPCs |
| [docs/04-camada-de-dados.md](docs/04-camada-de-dados.md) | Services do front-end, contratos, Edge Function de tracking |
| [docs/05-design-system.md](docs/05-design-system.md) | Identidade (preto/laranja/branco), tokens, componentes, a11y |
| [docs/06-telas-e-fluxos.md](docs/06-telas-e-fluxos.md) | Wireframes das telas (painel + pública + admin) |
| [docs/07-editor-e-preview.md](docs/07-editor-e-preview.md) | Editor, drag-and-drop, auto-save, preview em tempo real |
| [docs/08-pagina-publica.md](docs/08-pagina-publica.md) | Página pública, URLs, tracking, SEO social |
| [docs/09-metricas.md](docs/09-metricas.md) | Modelo de eventos, agregações, telas de métricas |
| [docs/10-planos-limites.md](docs/10-planos-limites.md) | Planos (Gratuito / Pago R$ 15), limites, ativação pelo admin |
| [docs/11-seguranca-e-performance.md](docs/11-seguranca-e-performance.md) | Segurança (RLS, headers) e performance (orçamentos, cache) |
| [docs/12-testes-e-aceite.md](docs/12-testes-e-aceite.md) | Testes, cenários E2E, critérios de aceite |
| [docs/13-roadmap.md](docs/13-roadmap.md) | Fases, marcos, riscos, pós-lançamento |
| [docs/14-painel-administrativo.md](docs/14-painel-administrativo.md) | Painel administrativo: usuários e planos |

## Rodando o projeto

```bash
npm install
cp .env.example .env.local       # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
supabase link --project-ref <ref>
supabase db push                 # aplica supabase/migrations
supabase functions deploy track-click
npm run dev                      # http://localhost:5173
npm run build                    # typecheck + build de produção
```

Primeiro administrador: no dashboard do Supabase, `update profiles set role = 'admin' where handle = '<seu-handle>';`
