# 12 · Testes e Critérios de Aceite

## 1. Pirâmide e ferramentas

| Camada | Ferramenta | Alcance |
|---|---|---|
| Unitário | **Vitest** | `lib/urls.ts` (validação/iconeSugerido), `services/erros.ts`, `format.ts`, reducers do `editorStore`, `usePlanLimits` |
| Componente | **Vitest + Testing Library** | Formulários de link, botão de plano, item de link (destaque/ocultar), gráfico (smoke), `PageRenderer` por tema/layout |
| E2E | **Playwright** (supabase local: `supabase start`) | Os 5 fluxos críticos abaixo |
| Banco | migrações reais no local + asserções SQL | RLS, triggers de limite, RPCs (scripts `tests/db/*.sql` com `psql`) |
| Acessibilidade | **axe-core** em cada smoke E2E + manual | contraste, foco, labels, alvos 44px |
| Lighthouse | Lighthouse CI no deploy preview | Perf ≥ 90, A11y ≥ 90 na pública |
| Regressão visual | Playwright screenshots (fase 1.5) | página pública nos 6 temas |

**Comandos:** `npm run test` (unit), `npm run test:e2e`, `npm run typecheck`, `npm run lint`, `npm run db:test` (asserções SQL de RLS/limites). Tudo roda no build do Netlify (doc 02 §6).

## 2. Ambiente de testes

- **Supabase local** (CLI: `supabase start`) para E2E/RLS — dados determinísticos via `seed.sql`.
- Usuários seed de teste: `free@exemplo.test` (Free), `pro@exemplo.test` (Pro, `plan_id=2`).
- Preview do Netlify por PR para validação humana.

## 3. Fluxos E2E críticos (cobrem o "passo a passo" do brief)

**F1 — Cadastro → publicação → compartilhamento**
1. `/cadastro` com handle novo → usuário criado → tela "Confira seu e-mail" → (E2E confirma o e-mail via `supabase.auth.admin`/link seed) → `/painel`.
2. Cria página (default do onboarding) → adiciona 3 links (URL + auto-ícone) → reordena por drag → escolhe tema `meia-noite` → cor de destaque customizada.
3. Confirma no **preview** (sem salvar, mata o mock de rede e vê a mudança refletida) → **Publicar** → [Copiar link].
4. Abre `/:handle` em aba nova: avatar, nome, bio, 3 links na ordem certa, tema certo.
5. Clica em 1 link → Edge Function grava evento → navega ao destino.
6. `/painel/paginas/:id/metricas`: views ≥ 1, cliques ≥ 1, por link = 1.

**F2 — Login e recuperação de senha**
`/entrar` com senha errada → "E-mail ou senha incorretos." → senha certa → `/painel` → sair → "Esqueci minha senha" → e-mail → `/redefinir-senha` → nova senha → login com a nova.

**F3 — Login Google** (mock do provider no local) → `/auth/callback` → onboarding de handle → `/painel` → perfil com avatar.

**F4 — Limites de plano** (usuário Free)
Nova página 2ª → botão desabilitado e, via `fetch` direto ao PostgREST, trigger derruba com a mensagem pt-BR; 6º link idem; usuário Pro (seed) passa nos dois.

**F5 — Responsividade (viewport e dispositivo real)**
Mobile 360×740 e desktop 1280×800: painel (drawer no mobile), editor (preview vira modal), pública (toques ≥ 44×44 — asserção de `getBoundingClientRect`, sem scroll horizontal, texto sem zoom). Smoke manual em Android Chrome + iPhone Safari antes de cada release.

## 4. Testes de segurança (checklist obrigatório por release)

- [ ] Com **anon key**: `GET /rest/v1/pages?published=eq.false` → 0 linhas; `click_events` → erro/0 linhas; `auth.users` → inacessível.
- [ ] Usuário A não lê/não edita página de B (read e update → vazio/erro).
- [ ] `link_id` de página de B enviado à `track-click` → 404, sem gravação.
- [ ] `javascript:alert(1)` como URL de link → rejeitado.
- [ ] Handle `app`/`admin` no cadastro e via API → erro do trigger.
- [ ] Upload de avatar `.svg`/`.html` → bloqueado (`allowed_mime_types` do bucket); arquivo > 2 MB → bloqueado (`file_size_limit`); pasta de outro usuário → bloqueado (RLS).
- [ ] Bundle não contém `SERVICE_ROLE` (grep no `dist/`).
- [ ] Headers presentes (`curl -I` no preview) + CSP sem domínios inesperados.
- [ ] Exclusão de conta remove perfil, páginas, links e eventos (verificação SQL).

## 5. Critérios de aceite por módulo (definição de pronto)

**Autenticação (US-A)**
- Cadastro valida handle em tempo real (≤ 400 ms de debounce) e bloqueia reservados/ocupados.
- E-mail de confirmação e de reset chegando (Supabase Auth em dev com mailpit; prod verificado 1×).
- Sessão persiste em reload; logout limpa cache do TanStack Query.

**Perfil (US-P)**
- Avatar: recorte 1:1 → WebP 512 ≤ 100 KB → exibido no preview e na pública (URL versionada).
- Troca de handle exige confirmação e atualiza a URL pública imediatamente.

**Páginas e links (US-L)**
- 1 página default criada no primeiro acesso; URL `/:handle` resolve; slug secundário resolve em `/:handle/:slug`.
- Drag-and-drop por mouse **e** teclado (Espaço + setas, com anúncio `aria-live`); ordem persiste após reload.
- Ocultar/remove da pública sem apagar; destaque renderiza estilo especial.
- Autoícone funciona para as 11 integrações mapeadas (doc 04 §3).

**Personalização (US-T)**
- Todos os 6 temas × 3 layouts × 3 estilos de botão renderizam sem erro (matriz no E2E de screenshot).
- Mudança de cor/tema aparece no preview em < 100 ms **sem** rede (testar com `page.route` bloqueando Supabase).
- Sobrescritas persistem; "Restaurar cores do tema" limpa.

**Preview (US-T3)**
- Editar título/URL/tema reflete no preview instantaneamente; status do header muda `Salvando… → Salvo`.

**Página pública (US-L5, doc 08)**
- Página não publicada → 404 (inclusive com anon key).
- Axe: 0 violations críticas; alvos ≥ 44×44; um único `h1`.
- Sem JS: links ainda navegam pelo `href`.

**Métricas (US-M)**
- 1 view por visita; clique conta 1 e navega; bots (UA `Googlebot`) não contam.
- Período Free corta em 30 dias com aviso visível; CSV abre com acentos corretos (BOM).
- Dois usuários não enxergam métricas um do outro (RPC `security definer`).

**Planos (US-C)**
- Limites aplicados em UI **e** API (F4); mensagens em pt-BR com CTA.

**Performance (doc 11)**
- Lighthouse na pública: Perf ≥ 90, A11y ≥ 90, Best Practices ≥ 90, SEO ≥ 90 (mínimos do CI).

**Idioma**
- Zero textos de UI em inglês (grep por strings conhecidas: `Save`, `Cancel`, `Loading`, `Error` em `src/`).

## 6. Matriz de navegadores (suporte)

| Navegador | Suporte |
|---|---|
| Chrome/Edge (últimos 2) | ✅ alvo principal |
| Safari iOS (últimos 2) | ✅ alvo principal (página pública) |
| Firefox | ✅ (última versão) |
| Samsung Internet | ⚠️ melhor esforço |
| IE / legacy | ❌ fora de escopo (browserslist padrão Vite) |

Playwright roda Chromium/Firefox/WebKit no CI; smoke manual no iOS real antes de releases.
