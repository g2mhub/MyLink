# 11 · Segurança e Performance

## Parte A — Segurança

### 1. Modelo de ameaças → contramedidas

| Ameaça | Contramedida (já desenhada) |
|---|---|
| Acesso a dados de terceiros | **RLS em 100% das tabelas** (doc 03 §6); páginas não publicadas invisíveis a não-donos; `click_events` com `force row level security` sem policies |
| Escrita de métrica falsa | Só a Edge Function grava (service_role escondida); rate-limit 120/min por IP; filtro de bots |
| XSS via URL de link | Validação `lib/urls.ts`: só `http(s)://`, `mailto:`, `tel:`; bloqueio de `javascript:`, `data:` e hosts internos |
| Open redirect | O link só é navegado se existir `links.enabled=true` e a página estiver publicada (a Edge Function **só devolve `url` validado do banco**) |
| Senhas | Supabase Auth (bcrypt), fluxo PKCE, confirmação de e-mail obrigatória, expiração de token de reset em 1 h |
| Exposição de dados privados | `profiles` **não contém e-mail** (fica em `auth.users`); página pública expõe apenas handle, nome, bio, avatar, links publicados |
| Vazamento de chaves | Só `anon` key no bundle (é pública por design); `service_role` **apenas** como secret da Edge Function — nunca em `VITE_*`, logs ou assets |
| Clique-forjado / CSRF | Supabase Auth usa cookies/localStorage com JWT (sem cookie de sessão tradicional ⇒ superfície CSRF mínima); mutations via API com Bearer token |
| Hijack de handle | Unicidade + regex + lista de reservados no banco (trigger `guard_handle`) |
| Upload malicioso de avatar | RLS do Storage (pasta = `auth.uid()`) **+** configuração do bucket `allowed_mime_types: webp/png/jpeg` e `file_size_limit: 2 MB` (doc 03 §7); re-encode WebP 512×512 no cliente |
| Supabase Auth Hooks / anon key brute force | Filtros de e-mail/senha padronizados + lockout nativo do Supabase (configurar no dashboard: tentativas de login) |
| Injeção SQL | Nenhuma query crua concatenada: supabase-js parametriza por contrato; RPCs usam `parameters` tipados |

### 2. Headers de segurança (Netlify `_headers` / `netlify.toml`)

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/index.html
  Cache-Control: public, max-cache=0, must-revalidate
```

(Verificar compatibilidade `style-src 'unsafe-inline'` com o Tailwind — necessário por variáveis CSS inline do preview; documentar exceção.)

### 3. Confirmações sensíveis

- Troca de handle: `ConfirmDialog` explicando mudança de URL pública.
- Excluir conta: modal → digitou "EXCLUIR" → `auth.delete()` do usuário logado (cascata: `profiles → pages → links → click_events`; avatars: remoção da pasta `avatars/{uid}` via função/Edge Function).
- Excluir página/link: `ConfirmDialog` com foco no Cancelar.

### 4. LGPD-simplificada (pt-BR)

- Termos e Política de Privacidade em `/termos` e `/privacidade` (estáticos, link no cadastro).
- Página pública não expõe e-mail nem métricas de visitantes.
- Exclusão de conta = apagamento real em cascata (seção 3) — item de aceite.

## Parte B — Performance

### 5. Orçamentos (falha o build/CI se estourar)

| Métrica | Orçamento | Como medir |
|---|---|---|
| JS inicial (rota pública) | ≤ 120 KB gzip | `rollup-plugin-visualizador` + budget no Vite (chunkSizeWarningLimit calibrado) |
| JS inicial (rota painel) | ≤ 200 KB gzip | idem (rotas com `React.lazy`) |
| LCP página pública (4G, mobile Moto G) | < 2,5 s | Lighthouse CI no deploy preview |
| CLS | < 0,1 | Lighthouse CI |
| TTFB | < 600 ms | Netlify CDN (estático) |
| Total de requisições da pública | ≤ 4 | DevTools/CI |

### 6. Estratégia de carregamento

- **Code-split por rota:** landing/auth/painel/publica em chunks separados (`React.lazy` + `<Suspense>` com skeleton).
- **Supabase-js isolado:** só nas rotas que precisam (chunk próprio — evita puxá-lo na landing estática).
- `@dnd-kit`, `Recharts` importados **somente** no editor/métricas.
- Fonts: `font-display: swap`; self-host de Inter/Sora (2 pesos cada) — sem Google Fonts terceiro (CSP + privacidade).
- Avatar WebP ≤ 100 KB gerado no cliente (canvas → `toBlob('image/webp', 0.82)`, 512×512).

### 7. Cache

| Recurso | Política |
|---|---|
| `/assets/*` (hash) | `immutable` 1 ano |
| `index.html` | revalidado a cada visita (`must-revalidate`) |
| Supabase (dados) | TanStack Query `staleTime` (doc 04 §7) — sem HTTP cache |
| Imagens avatar | URL versionada por timestamp ⇒ cache seguro |
| Página pública | nenhum HTML prerenderizado na fase 1 (SPA) — mitigação: bundle pequeno (§5) |

### 8. Banco (escala 30 → 5.000 usuários)

- Índices já previstos: `pages(owner_id, position)`, `links(page_id, position)`, `click_events(page_id, occurred_at desc)`, `click_events(link_id, occurred_at desc)`.
- Volume futuro de eventos: rollup diário (`click_daily_agg`) quando > 2–3 M de linhas; retenção de brutos 90 dias.
- Monitoramento gratuito: dashboard de uso do Supabase (egress, storage) + **cron check** no Netlify/external: ping `/` e a função `track-click` a cada 15 min (ex.: cron-job.org) — plano Free não tem SLA.
- Export `pg_dump` semanal (Free não tem backup automático).

### 9. Código e DX

- ESLint (typescript-eslint + react-hooks) + Prettier; `tsc --noEmit` no CI.
- Padrões: componentes pequenos e semânticos; serviços são o único ponto de acesso ao Supabase; tipos gerados (`db:types`) após cada migração.
- Git: `main` protegida com PR + deploy preview; commits convencionales (recomendado, não obrigatório).
