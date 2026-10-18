# 04 · Camada de Dados e API

Todo acesso a dados passa por `src/services/*`. Componentes e hooks **nunca** chamam `supabase` diretamente — isso concentra contratos, erros e cache em um lugar só.

## 1. Cliente Supabase

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,   // captura tokens de /auth/callback e /redefinir-senha
      flowType: 'pkce',
    },
  }
);
```

## 2. Contratos de domínio (tipos)

```ts
// src/types/domain.ts
export type Perfil = {
  id: string; handle: string; handleTemporario: boolean;
  nome: string; bio: string; avatarUrl: string | null;
  plano: Plano;
};

export type Plano = {
  codigo: 'free' | 'pro'; nome: string;
  maxPaginas: number;         // -1 = ilimitado
  maxLinksPorPagina: number;  // -1 = ilimitado
  janelaMetricasDias: number; // -1 = histórico todo
  dominioProprio: boolean;
};

export type Pagina = {
  id: string; titulo: string; slug: string | null;
  publicada: boolean; tema: string; layout: 'lista' | 'grade' | 'cards';
  botao: 'solido' | 'contorno' | 'sombra'; fonte: string;
  sobrescritas: Partial<TemasTokens>;   // cores customizadas
};

export type Link = {
  id: string; paginaId: string; titulo: string; url: string;
  icone: string; destaque: boolean; ativo: boolean; posicao: number;
};

export type Metricas = {
  de: string; ate: string; janelaDias: number;
  totais: { views: number; clicks: number };
  porDia: { dia: string; views: number; clicks: number }[];
  porLink: { linkId: string; titulo: string; icone: string; url: string; clicks: number }[];
};

export type PageDraft = {           // usado pelo editor/preview (doc 07)
  pagina: Omit<Pagina, 'id'>; links: Omit<Link, 'paginaId'>[];
};
```

## 3. Serviços (assinaturas)

| Arquivo | Funções principais | Observações |
|---|---|---|
| `auth.ts` | `cadastrar({email, senha, handle, nome})`, `entrar(email, senha)`, `entrarComGoogle()`, `sair()`, `enviarRecuperacao(email)`, `definirSenha(nova)`, `sessaoAtual()`, `observarSessao(cb)` | `cadastrar` envia `handle` e `display_name` no `options.data` (metadata do trigger, doc 03 §4.2). `entrarComGoogle` usa `redirectTo: ${origin}/auth/callback`. Erros traduzidos para pt-BR em `auth.erros.ts`. |
| `profiles.ts` | `buscarPorHandle(h)`, `buscarMeuPerfil()`, `atualizarPerfil(patch)`, `enviarAvatar(file)` | `enviarAvatar` redimensiona no cliente (canvas → WebP 512×512, ≤100 KB) e envia para `avatars/{uid}/avatar-{Date.now()}.webp`. |
| `pages.ts` | `listarMinhas()`, `criar({titulo})`, `atualizar(id, patch)`, `remover(id)`, `publicar(id, bool)`, `duplicar(id)`, `buscarPublica(handle, slug?)` | `criar` cria a página com título default "Minha página" e já com 1 link de boas-vindas opcional. Erros de limite (trigger) viram toast com CTA de upgrade. |
| `links.ts` | `criar(pageId, dados)`, `atualizar(id, patch)`, `remover(id)`, `alternarAtivo(id)`, `reordenar(pageId, idsOrdenados)` | `reordenar` usa a RPC `reorder_links` com **update otimista**: a UI move na hora e reverte em caso de erro. |
| `metrics.ts` | `buscarMetricas(pageId, de, ate)` | Chama a RPC `get_metrics`; retorna `Metricas`. |
| `tracking.ts` | `registrarPageview(pageId)`, `registrarClique(linkId)` | Fala com a Edge Function (seção 4). Nunca bloqueia a navegação. |

**Padrões da camada:**
- Erros do Postgres/RLS traduzidos para mensagens pt-BR amigáveis (`src/services/erros.ts`).
- Validação de URL de destino em `lib/urls.ts`: aceita `https?://`, `mailto:`, `tel:`; **bloqueia** `javascript:`, `data:` e hosts internos (proteção contra open redirect/XSS).
- Auto-detecção de ícone pela URL (`lib/urls.ts → iconeSugerido(url)`): `wa.me`→whatsapp, `instagram.com`→instagram, `youtube.com`→youtube, `tiktok.com`→tiktok, `linkedin.com`→linkedin, `github.com`→github, `mailto:`→email, `tel:`→telefone, `maps.google`→localizacao, senão `link`.

## 4. Edge Function `track-click` (único server-side)

`supabase/functions/track-click/index.ts` — Deno, invocada por `POST {VITE_SUPABASE_URL}/functions/v1/track-click` com a anon key.

```ts
// corpo da requisição
type Requisicao = {
  acao: 'view' | 'click';
  paginaId?: string;   // obrigatório em 'view'
  linkId?: string;     // obrigatório em 'click'
};

// resposta
type Resposta = { ok: true; url?: string }   // em 'click', retorna o url do link para navegar
              | { ok: false; erro: string };
```

**Lógica (nesta ordem):**
1. Valida corpo (UUIDs, `acao` conhecida) → 400 se inválido.
2. Filtro de bots por `User-Agent` (regex: `bot|crawl|spider|slurp|preview|lighthouse|headless`) → responde `ok` sem gravar.
3. Rate limit por IP (token bucket em memória: 120 ações/min; melhor esforço — isolamentos são efêmeros).
4. `link`? Busca o link com `service_role`: precisa existir, `enabled = true` e pertencer a página `published = true` → senão 404.
5. Insere em `click_events` (`kind`, `page_id`, `link_id`, `device` derivado do UA, `referer_host` do header `Referer`).
6. Responde `{ ok: true, url? }`.

**Cabeçalhos:** `x-functions-key` não é usado (rota anônima); CORS restrito ao `VITE_PUBLIC_SITE_URL` (`Access-Control-Allow-Origin` exato + `OPTIONS` preflight).

## 5. Fluxo de tracking no cliente (nunca bloqueia o clique)

```ts
// src/services/tracking.ts (trecho)
export async function registrarClique(linkId: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 800);           // orçamento de tempo
    const r = await fetch(`${URL}/functions/v1/track-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ acao: 'click', linkId }),
      signal: ctrl.signal,
      keepalive: true,                                        // sobrevive à navegação
    });
    clearTimeout(t);
    const data = await r.json();
    return data.ok ? data.url ?? null : null;
  } catch { return null; }                                    // falhou: navega mesmo assim
}
```

Na página pública: `onClick={async e => { const url = await registrarClique(link.id) ?? link.url; window.location.href = url; }}` — **métrica é best-effort; a experiência do clique tem prioridade**.

Pageview: disparado 1× por montagem da página pública (`useEffect`, guard de re-execução), também com timeout de 800 ms.

## 6. Realtime do Supabase — decisão: **não usar**

- A "visualização em tempo real" do produto é **local**: o editor renderiza o `draft` do Zustand instantaneamente (doc 07); não há salvamento para ver o efeito.
- Sessões multi-aba sincronizadas não valem o custo de complexidade para 20–30 usuários.
- Consequência: `realtime` fica desativado no projeto → zero custo de conexões.

## 7. Cache e estado servidor

- **TanStack Query** em tudo que é leitura: `['paginas']`, `['pagina', id]`, `['links', pageId]`, `['metricas', pageId, de, ate]`, `['perfil']`.
- Mutations com `optimisticUpdate` (links: criar/remover/reordenar; perfil e página: invalidate).
- `staleTime`: páginas/links 30 s; métricas 60 s; perfil 5 min.
- Falha de mutation → rollback + toast pt-BR com a causa.

## 8. Mapeamento de erros (trecho de `services/erros.ts`)

| Código/padrão do Postgres | Mensagem exibida |
|---|---|
| trigger `pages_limit_before_insert` | "Limite de páginas do seu plano atingido. Faça upgrade para criar mais." (toast + link para `/painel/configuracoes`) |
| trigger `links_limit_before_insert` | "Seu plano permite até N links por página. Faça upgrade para adicionar mais." |
| `23505` (unique) em `profiles.handle` | "Este nome de usuário já está em uso." |
| `check_handle` (reserved/regex) | mensagem própria do trigger, exibida no campo |
| `42501`/linhas 0 em RPC de reorder | "Não foi possível salvar a ordem. Tente novamente." (revert otimista) |
| `auth` invalid login | "E-mail ou senha incorretos." (sem revelar se o e-mail existe) |
