# 07 · Editor de Páginas e Visualização em Tempo Real

O editor é a tela mais importante do produto: tudo que o usuário vê à direita muda **na hora**, antes de salvar.

## 1. Layout (desktop ≥ lg)

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Páginas   Minha página   ● Salvo há 10 s        [Copiar link]    │
│                                       [Preview]  [Publicar ↗]      │
├──────────────────────────────┬─────────────────────────────────────┤
│ [Links] [Aparência] [Página] │   PREVIEW (lupa: celular/desktop)   │
│                              │   ┌─────────────────────────────┐   │
│  ─ Links (5 de 5)   + Adicionar│  │      👤 Klauz              │   │
│                              │  │      Bio...                 │   │
│  ⠿ [📷 Instagram      ⋯ ]   │  │  [🔗 Instagram]             │   │
│  ⠿ [📷 WhatsApp       ⋯ ]   │  │  [🔗 WhatsApp]              │   │
│  ⠿ [▶ YouTube         ⋯ ]   │  │  [▶ YouTube]                │   │
│                              │  │  (espelho do PageRenderer)  │   │
│  Links ocultos (1): [Mostrar]│  └─────────────────────────────┘   │
└──────────────────────────────┴─────────────────────────────────────┘
   coluna 56%                               coluna 44% (sticky)
```

- **Preview em espelho:** renderiza o MESMO `PageRenderer` da página pública dentro de um contêiner com viewport simulada (375×812 padrão, alternável para 1280) — não um iframe isolado. Garante fidelidade sem srcdoc/broadcast.
- Abaixo de `lg`: preview vira aba/modal com botão flutuante "Ver preview".

## 2. Estado do editor (Zustand)

```ts
// stores/editorStore.ts
type EditorState = {
  pageId: string;
  draft: PageDraft;                 // snapshot local do servidor
  status: 'pronto' | 'sujo' | 'salvando' | 'erro';
  dirtyPaths: Set<string>;          // quais partes mudaram (links | aparencia | info)
  // ações
  carregar(pageId): Promise<void>;
  patchInfo(patch): void;
  patchAparencia(patch): void;
  patchLink(id, patch): void;
  addLink(dados): void;
  removeLink(id): void;
  moverLink(fromIndex, toIndex): void;
  toggleAtivo(id): void;
  salvarTudo(): Promise<void>;      // flush do debouncer
  publicar(flag): Promise<void>;
};
```

**Regras:**
- Toda ação **altera o `draft` primeiro** (preview reflete imediatamente) e **depois agenda** persistência.
- `status` exposto no header: `Salvando…` → `Salvo agora` → `Salvo há 12 s` → `Sem conexão (rascunho local)`.

## 3. Auto-save (estratégia)

| Tipo de alteração | Disparo | Persistência |
|---|---|---|
| Campos de texto (título do link, URL, título da página, bio) | debounce **700 ms** após parar de digitar | `update` otimista + invalidate |
| Aparência (cores, fonte, layout, botão, tema) | debounce **700 ms** | idem |
| Reordenar links (drag) | **imediato** (soltou o item) | RPC `reorder_links` (otimista) |
| Adicionar/remover link | imediato | `insert`/`delete` (remoção otimista + toast com "Desfazer" 6 s) |
| Publicar/despublicar | imediato (botão) | `update` + confirmação visual |

**Falha:** `status: 'erro'` → banner "Não foi possível salvar. **Tentar novamente**" + `Retry` automático (3 tentativas, backoff 1/4/10 s). Foco/guard de saída: se `status === 'sujo'` e o usuário tenta navegar, aviso do navegador (`beforeunload`).

**Offline:** draft persistido em `sessionStorage` (chave `mylink:draft:{pageId}`) ao perder conexão; ao voltar, banner "Conexão restaurada — salvando alterações" → `salvarTudo()`.

## 4. Aba "Links"

**Item de link (lista vertical):**

```
⠿  [🔗]  Instagram            [👁] [✎]   ⋯
     ↑      ↑         ícone       ocultar editar  menu
  arrastar  título+URL            toggle
```

- **Menu ⋯:** Editar · Duplicar · Definir destaque (badge ⭐) · Ocultar · Excluir (ConfirmDialog).
- **Destaque:** item ganha borda `brand-500` + badge "Destaque"; no tema `lista`, destaque usa o botão sólido de cor de destaque mesmo quando o estilo padrão é `contorno`.
- **Limite:** ao atingir `max_links_per_page`, o botão "+ Adicionar" fica desabilitado com tooltip "Seu plano permite até N links por página. Conheça o Pro →" (`usePlanLimits`).

**Formulário (modal/bottom-sheet):**

```
┌─ Novo link ────────────────────┐
│ Título *  [Instagram________]  │
│ URL *     [https://instagram..]│
│           🔍 detectado: Instagram (ícone automático)
│ Ícone  [🔗 link ▾] (grid 5×n, busca por nome)
│ Destaque [toggle]              │
│ [Cancelar]        [Salvar link]│
└────────────────────────────────┘
```

- Validação de URL ao sair do campo (`lib/urls.ts`): mensagem "Use um endereço começando com http:// ou https://".
- Ícones disponíveis: genéricos (link, globo, e-mail, telefone, loja, portfólio, documento, música, vídeo, calendário, localização, cafe) + marcas (WhatsApp, Instagram, Facebook, YouTube, TikTok, X/Twitter, LinkedIn, GitHub, Twitch, Spotify, Mercado Livre, cartão de pagamento).

## 5. Aba "Aparência"

```
Tema [Aurora][Meia-noite][Minimalista][Praia][Neon][Café]   ← cards com amostra real
Layout   ( ) Lista   ( ) Grade   ( ) Cards      ← miniatura clicável
Botão    ( ) Sólido  ( ) Contorno ( ) Sombra
Fonte    [Inter ▾]  ← amostra "Aa Bb 123" na própria fonte
Cores personalizadas
  Fundo      [#6D28D9 ▪]  Destaque [#FFFFFF ▪]
  Texto      [#FFFFFF ▪]  Superfície [#00000022 ▪]
  [Restaurar cores do tema]
Cantos (raio)   [ ] Reto  (•) Médio  [ ] Redondo
```

- Escolher tema aplica os tokens do tema como base e **limpa as sobrescritas** (com toast "Tema Aurora aplicado. Suas cores personalizadas foram redefinidas." — apenas se havia sobrescritas).
- Cores: `<input type="color">` + campo hex; sincronizadas entre si (debounce do draft).
- Toda alteração visível no preview **antes** de salvar (o preview lê o `draft`, não o banco).

## 6. Reordenar (drag-and-drop) — @dnd-kit

**Pointer (mouse/touch):**
1. Alça `⠿` à esquerda com `touch-action: none` (touch nativo via `@dnd-kit/sortable`).
2. Item arrastado ganha sombra `pop` + escala 1.02; drop zones com borda tracejada `brand-500`.
3. `onDragEnd` → `moverLink(from, to)` (draft, preview reordena na hora) → `links.reordenar()` imediato.
4. **Optimistic:** em erro, revert para a ordem anterior + toast "Não foi possível salvar a ordem. Tente novamente."

**Teclado (obrigatório — acessibilidade):**
- Foco na alça → **Espaço** pega/solta; **↑/↓** move (anuncia "Movido para a posição 2 de 5" via `aria-live`); **Esc** cancela a operação.
- Implementar com `KeyboardSensor` do @dnd-kit (padrão: pickup em Espaço, move em setas).

**Semântica DOM:** `<ul>` com `<li>`, botão de alça com `aria-label="Reordenar Instagram"`.

## 7. Aba "Página" (info + publicação)

- Título da página (placeholder "Minha página").
- **Endereço:** `mylink.com.br/klauz` (página com `slug = null`, "página principal") ou `mylink.com.br/klauz/portfolio`; campo slug com validação e disponibilidade (só entre páginas do próprio usuário — unique parcial `owner_id + slug`).
- **Foto e bio:** selecionar foto (crop 1:1 → WebP 512) + bio 300 car. — mesma lógica do perfil; aqui agem na página (cada página pode ter avatar/bio próprios vinda do dono; se vazios, herdam do perfil).
- **Publicar:** switch + resumo "Sua página está **no ar** em mylink.com.br/klauz" com botões [Abrir] [Copiar link] · ou "Sua página é um **rascunho** — ninguém além de você consegue ver." + [Publicar].

## 8. Regras de sincronização preview ↔ banco

| Fonte de verdade | Dados |
|---|---|
| `draft` (Zustand) | tudo que aparece no preview: links (incl. ocultos? **não** — preview mostra só `enabled = true`), cores, layout, foto, bio |
| banco | persistência; `carregar()` popula o draft 1× ao abrir o editor |

- Preview **não** consulta o servidor em tempo real: é 100% local → instantâneo e offline-safe.
- Ao salvar falhar, o draft **não** é descartado (banner de erro + retry).
- Ao navegar para fora com `sujo`: aviso nativo de saída da página.

## 9. Performance do editor

- `React.memo` em `LinkRow`; lista usa key = `link.id`.
- Preview re-render **apenas** nas partes afetadas (draft fatiado: `pagina` / `links` selectors no Zustand).
- Lista longa: virtualizar só se > 50 links (Plano Pro) — `@tanstack/react-virtual` opcional, fase futura.
