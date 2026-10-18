# 08 · Página Pública

A vitrine do produto: precisa ser **linda, rápida e feita para converter em cliques**, especialmente no celular.

## 1. Resolução da URL (rota SPA `/:handle` e `/:handle/:slug`)

```
GET /klauz            → página do dono com slug IS NULL (página principal)
GET /klauz/portfolio  → página do dono com slug = 'portfolio'
GET /app, /painel…    → rota do app (handle reservado — doc 02 §4)
GET /naoexiste        → PaginaNaoEncontrada (404 com sugestões)
```

**Pipeline de render:**
1. Valida formato do segmento (`^[a-z0-9-]{1,30}$`) → inválido = 404.
2. `profiles.buscarPorHandle(h)` → se vazio = 404.
3. `pages.buscarPublica(h, slug?)` → filtra `published = true` **no banco** (RLS já garante; a query também filtra para não contar rascunho).
4. `links` da página com `enabled = true`, ordenados por `position` (join na mesma query).
5. Módulo `publica` carregado **lazy** (`React.lazy`) → o bundle do painel não viaja.

**404 (`PaginaNaoEncontrada`):** "Não encontramos essa página." + caixa de busca → sugestões de handles parecidos (RPC futura ou `ilike` limitada a 3) + CTA "Crie a sua no Mylink →".

## 2. Layout (mobile-first)

```
┌───────────────────────────┐   Desktop ≥ md: fundo estendido,
│      (fundo do tema)      │   coluna centralizada max-w-[560px],
│                           │   mesmo layout (não vira grid multi-coluna)
│         ┌─────────┐       │
│         │ AVATAR  │ 120px │   ← fallback: inicial em círculo
│         └─────────┘       │      com cor derivada do handle
│        Klauz              │   ← <h1>, 24px/700
│   Designer e criadora…    │   ← bio, 16/24, max 3 linhas + "…"
│                           │
│  ┌─────────────────────┐  │   ← link normal
│  │  🔗  Instagram      │  │      altura mín. 56px, raio do tema
│  └─────────────────────┘  │      alvo de toque ≥ 44×44 (ícone 24)
│  ┌─────────────────────┐  │
│  │  🔗  WhatsApp       │  │   ← destaque: cor de destaque + peso 600
│  └─────────────────────┘  │      (+ ⭐ badge se configurado)
│  ┌─────────────────────┐  │
│  │  ▶  YouTube         │  │
│  └─────────────────────┘  │
│                           │
│   Feito com Mylink ⚡      │   ← rodapé, link para / (alvo 44px)
└───────────────────────────┘   altura mínima 100dvh, sem scroll horizontal
```

**Estrutura semântica:**

```html
<main class="pg" style="--pg-*">
  <header> <img avatar> <h1> <p bio> </header>
  <ul aria-label="Links de Klauz">
    <li><a class="pg-btn" href="..." rel="noopener">…</a></li>
  </ul>
  <footer><a href="/">Feito com Mylink</a></footer>
</main>
```

## 3. Regras responsivas (doc 05 §5)

- `viewport` padrão; base mobile; coluna central `max-w-[560px]`.
- Área de toque: cada link é um `<a>` com `min-height: 56px` e `padding` que garante ≥ 44×44 px mesmo sem ícone.
- Textos: bio e títulos ≥ 16 px no mobile (sem zoom necessário); `text-size-adjust: 100%`.
- Imagens: avatar com `width/height` fixos (evita CLS) e `loading="eager"` (está acima da dobra).
- Safe-area: `padding-bottom: env(safe-area-inset-bottom)` no rodapé.
- `prefers-reduced-motion`: desliga animações de hover dos botões.

## 4. Temas e layout

- Tokens do tema (doc 03 §8) injetados como CSS vars no `<main>`; sobrescritas do usuário aplicadas por cima (`background` aceita sólido OU gradiente).
- **Layouts:**
  - `lista` (padrão): coluna vertical, botões largos.
  - `grade`: 2 colunas (`grid-cols-2`), itens quadrados curtos (só ícone+título, `text-overflow`).
  - `cards`: cartões maiores com sombra do tema, título acima da URL, opcional descrição curta.
- Estilo de botão: `solido` (preenchido), `contorno` (borda 2px), `sombra` (preenchido + sombra forte).
- Hover/focus: leve `translateY(-2px)` + sombra (desktop); `:active` com `scale(0.98)` (mobile).

## 5. Ícones

- `components/icons/brand.tsx`: mapa `iconeSugerido(url)` (doc 04 §3) + catálogo completo do editor (doc 07 §4).
- Renderizados em `<span aria-hidden="true">` (o `<a>` já tem o texto do título) com `currentColor` → herdando contraste do tema.
- Fallback: ícone `link` genérico.

## 6. Rastreamento de cliques

**Pageview** — 1× por montagem:

```ts
useEffect(() => { registrarPageview(pagina.id); }, [pagina.id]);
```

**Clique** — segue a ordem do doc 04 §5:

```tsx
<a href={link.url}
   onClick={async (e) => {
     e.preventDefault();                       // métrica primeiro…
     const url = await registrarClique(link.id); // (timeout 800 ms, keepalive)
     window.location.assign(url ?? link.url);   // …mas navega sempre
   }}
   rel="noopener nofollow">
```

- Quem **não** tem JS habilitado: navega direto pelo `href` (sem métrica — aceito).
- Métrica é **best-effort**: falhou/atrasou → navega assim mesmo; nunca quebra o clique.
- `rel="noopener"` sempre; `nofollow` nos links externos (evita passar autoridade indevida).
- Botão "Compartilhar" no preview do editor usa `navigator.share()` no mobile, `clipboard.writeText` no desktop (não é responsabilidade da página pública).

## 7. SEO social (limitação da SPA declarada)

- `index.html`: title/description padrão do produto + `og:image` default `public/og-default.png`.
- **Tag dinâmica por página:** `PublicHead` (hook) atualiza `document.title`, `og:title`, `og:description`, `og:image`, `twitter:card` **no cliente** ao carregar a página pública. Isso renderiza **corretamente para o navegador do visitante**, mas **não para o crawler de pré-visualização** (Slack/WhatsApp/Telegram não executam JS).
- **Fase 2 (opcional, recomendada antes do lançamento amplo):** função Netlify `prerender` (edge) que busca `handle+slug` via service role e devolve HTML com OG tags prontas + fallback estático. Risco/complexidade documentados no doc 13.

Título dinâmico: `{Nome de exibição} — Mylink` · descrição: bio (cortada em 160 car.).

## 8. Orçamento de performance (ver doc 11)

| Métrica | Orçamento |
|---|---|
| JS da rota pública | ≤ 120 KB gzip (lazy do módulo + dnd-kit **não** entra) |
| LCP | < 2,5 s em 4G (LCP = avatar/bio — inline critical OK) |
| CLS | < 0,1 (dimensões fixas no avatar e botões) |
| Requisições | 1 fetch de dados (perfil+páginas+links em 1 roundtrip), 1 de pageview, 1 por clique |
| Cache | `/*` imutável 1 ano; `index.html` `no-cache`; Supabase sem cache (dados pequenos) |
