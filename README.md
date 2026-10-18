# Mylink — Especificação do Produto

**Gerador de páginas de agregador de links (estilo Linktree)** · Idioma da interface: **pt-BR** · Público inicial: **20–30 usuários**

| Item | Definição |
|---|---|
| Repositório | GitHub |
| Deploy | Netlify (CI/CD automático a partir do GitHub) |
| Banco + Auth + Storage | Supabase (PostgreSQL, Supabase Auth, Supabase Storage) |
| Front-end | Vite + React + TypeScript (SPA) |
| Planos | Free e Pro com limites aplicados; cobrança (Stripe) fora do escopo desta fase |
| Escopo desta entrega | Especificação executável (documentos `docs/`) — a implementação segue o roadmap em [docs/13-roadmap.md](docs/13-roadmap.md) |

## Resumo executivo

O Mylink permite que qualquer pessoa crie conta, personalize uma página pública com seus links (redes sociais, WhatsApp, portfólio, loja etc.) e compartilhe em uma URL única (`mylink.com.br/seuhandle`). O painel oferece edição em tempo real com pré-visualização ao vivo, temas prontos, layouts, drag-and-drop, foto de perfil, biografia e métricas básicas de cliques por link e por página.

Decisões registradas com a pessoa interessada (Klauz):

1. **SPA Vite + React** em vez de Next.js — build estático rápido no Netlify, integração direta com o cliente Supabase, complexidade mínima para o volume inicial. (Contra: páginas públicas são renderizadas no cliente; mitigado com code-splitting e payload enxuto — ver [docs/11](docs/11-seguranca-e-performance.md).)
2. **Planos com limites, sem cobrança** — tabela `plans` + aplicação de limites no banco; Stripe fica para uma fase futura.
3. **Entrega por fases** — ver roadmap; cada fase tem critérios de aceite próprios em [docs/12](docs/12-testes-e-aceite.md).

## Índice da especificação

| Doc | Conteúdo |
|---|---|
| [docs/01-visao-produto.md](docs/01-visao-produto.md) | Visão, personas, user stories, fluxos principais, escopo in/out |
| [docs/02-arquitetura.md](docs/02-arquitetura.md) | Arquitetura do sistema, estrutura do repositório, variáveis de ambiente, CI/CD Netlify |
| [docs/03-banco-de-dados.md](docs/03-banco-de-dados.md) | Schema PostgreSQL completo, RLS, Storage, seeds, RPCs |
| [docs/04-camada-de-dados.md](docs/04-camada-de-dados.md) | Camada de serviços no front-end, contratos TypeScript, Edge Function de tracking |
| [docs/05-design-system.md](docs/05-design-system.md) | Identidade visual, tokens, componentes-base, acessibilidade, responsividade |
| [docs/06-telas-e-fluxos.md](docs/06-telas-e-fluxos.md) | Wireframes de todas as telas (painel + pública) e fluxos de navegação |
| [docs/07-editor-e-preview.md](docs/07-editor-e-preview.md) | Editor de páginas, drag-and-drop, auto-save, preview em tempo real |
| [docs/08-pagina-publica.md](docs/08-pagina-publica.md) | Página pública, URL model, rastreamento de cliques no cliente, SEO social |
| [docs/09-metricas.md](docs/09-metricas.md) | Modelo de eventos, agregações, telas de métricas |
| [docs/10-planos-limites.md](docs/10-planos-limites.md) | Planos, limites, aplicação (triggers), UX de upgrade |
| [docs/11-seguranca-e-performance.md](docs/11-seguranca-e-performance.md) | Segurança (RLS, headers, ameaças) e performance (orçamentos, caching, imagens) |
| [docs/12-testes-e-aceite.md](docs/12-testes-e-aceite.md) | Estratégia de testes, matriz de cenários, critérios de aceite por módulo |
| [docs/13-roadmap.md](docs/13-roadmap.md) | Fases, marcos, riscos e pós-lançamento |

## Convenções deste documento

- **Handle**: identificador público do usuário (ex.: `klauz` → `mylink.com.br/klauz`), sempre em minúsculas.
- **Página principal**: página servida em `/{handle}`; páginas secundárias em `/{handle}/{slug-da-pagina}`.
- Termos de banco de dados aparecem em `code`; valores de enum em `'aspas_simples'`.
- Onde o texto disser "decisão", ela foi tomada e não precisa ser reaberta sem novo alinhamento.
