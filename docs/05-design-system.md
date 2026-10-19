# 05 · Design System — Identidade Visual e Acessibilidade

## 1. Identidade do Mylink

| Item | Definição |
|---|---|
| Nome | **Mylink** (texto: `Mylink`; nunca "MyLink" ou "my-link") |
| Domínio de exemplo | `mylink.com.br` |
| Logo | **`logo.png`** na raiz do repositório, aplicado no cabeçalho, login, painel e rodapé da página pública. **Enquanto o arquivo não for fornecido:** placeholder `public/logo.svg` (wordmark laranja/preto/branco). |
| Paleta oficial | **preto, laranja e branco** (detalhe nos tokens abaixo) |
| Tagline | "Todos os seus links em um só lugar." |
| Tom de voz | Direto, acolhedor, sem jargão técnico. Voz ativa: "Adicione seu primeiro link", não "Links podem ser adicionados". |
| Ícones | lucide-react (genéricos) + `components/icons/brand.tsx` (marcas com `currentColor`) |
| Tipografia | UI: **Inter** · Logo e display: **Sora** · alternativas do preview: Inter, Plus Jakarta Sans, Sora, Nunito |

**Logo placeholder (`public/logo.svg`, a ser substituído por `logo.png` quando o asset for fornecido):** wordmark `Mylink` em preto (`#0B0B0F`) com o "elo" em laranja (`#F97316`) — mantém a paleta oficial mesmo sem o asset. Aplicar em todas as telas (landing, auth, painel, admin, rodapé da pública) com `alt="Mylink"` e altura mínima de 24 px.

**Landing: proposta de valor principal** "Sua página de links, pronta em 2 minutos." · CTAs: **"Criar minha página"** (primário) e **"Ver exemplo"** (secundário → página pública demo).

## 2. Tokens de cor (Tailwind + CSS variables)

**Marca (fixa no app):**

Paleta oficial **preto, laranja e branco** (paleta laranja derivada do Tailwind Orange):

| Token | Hex | Uso |
|---|---|---|
| `brand-500` (primary) | `#F97316` | botões primários, foco, links, destaque |
| `brand-600` | `#EA580C` | hover/active |
| `brand-700` | `#C2410C` | pressed |
| `brand-50` | `#FFF7ED` | fundos de destaque claros, badges |
| `ink-900` (preto) | `#0B0B0F` | títulos, texto, cabeçalhos escuros |
| `ink-500` | `#6B7280` | texto secundário |
| `surface` (branco) | `#FFFFFF` | cards do painel |
| `canvas` | `#FAFAFA` | fundo do painel |
| `ok-500` / `warn-500` / `danger-500` | `#10B981` / `#F59E0B` / `#EF4444` | sucesso / atenção / erro |

**Barras e cabeçalhos escuros:** usar `ink-900` com texto branco (ex.: cabeçalho da landing, topo da página pública nos temas escuros). Contraste laranja/branco: só usar `brand-500` com **texto branco** a partir de 16 px bold, ou `brand-600`/`brand-700` em textos pequenos.

**Dark mode do painel:** fora do escopo desta fase (UI clara fixa com preto/laranja/branco).

**Tokens da página pública** vêm do tema escolhido (doc 03 §8), com sobrescritas do usuário aplicadas por cima:

```css
/* como PageRenderer consome os tokens */
.pg {
  background: var(--pg-background);
  color: var(--pg-text);
}
.pg-card  { background: var(--pg-surface); border-radius: var(--pg-radius); }
.pg-btn   { background: var(--pg-accent); color: var(--pg-accent-text); border-radius: var(--pg-radius); }
```

## 3. Escala tipográfica e espaçamento

| Token | Valor | Uso |
|---|---|---|
| `display` | 40/44 px, Sora 700 | título da landing |
| `h1` | 30/36, 700 | títulos de seção do painel |
| `h2` | 22/28, 600 | títulos de card |
| `body` | 16/24, 400 | texto padrão |
| `small` | 14/20, 400 | legendas, labels |
| `caption` | 12/16, 500 | metadados, badges |

Espaçamento em escala 4: `4, 8, 12, 16, 24, 32, 48, 64`. Raio: `sm 8`, `md 12`, `lg 16`, `full 9999`. Sombras: `card: 0 1px 3px rgb(0 0 0 / .08)`, `pop: 0 12px 32px rgb(0 0 0 / .14)`.

**Números em pt-BR:** `1.234 cliques`, `12/10/2026` nas métricas, `há 5 min` em listas relativas (funções em `lib/format.ts`).

## 4. Componentes-base (`components/ui/`)

| Componente | Especificação |
|---|---|
| `Button` | alturas `sm 36` / `md 44` / `lg 52`; variantes `primary, secondary, ghost, danger`; **primário = `bg-brand-500 text-white`**; hover `brand-600`; loading mantém largura + `aria-busy` |
| `Input` / `Textarea` | label acima (`small`, `ink-900`), borda `1px #E4E4EC`, foco **ring 2 `brand-500` + borda**, erro abaixo em `danger-500` com `aria-invalid` + `aria-describedby` |
| `Select` | mesmo padrão de Input; nativo no mobile |
| `Modal` | foco preso (focus-trap), fecha com `Esc`, `role="dialog"` + `aria-modal`; bottom-sheet no mobile |
| `Toast` | feedback 2 s (sucesso) / persistente (erro, com ação); container `role="status"`/`aria-live="polite"` |
| `Skeleton` | pulsão suave para listas e métricas |
| `Tabs` | `role="tablist"`, navegação por setas, indicador animado |
| `Avatar` | fallback com inicial + cor derivada do handle (hash) |
| `EmptyState` | ícone + título + 1 frase + CTA (ex.: "Você ainda não tem links") |
| `Switch` / `Toggle` | para "Publicada", "Destaque", "Ocultar link" |
| `ConfirmDialog` | para ações destrutivas (ex.: apagar link/página) — foco inicial no **Cancelar** |

**Padrão de feedback:** toda mutation mostra toast; erros sempre em pt-BR com caminho de ação; botões de mutation com estado `loading`; listas com skeleton no primeiro load e `EmptyState` quando vazias.

## 5. Responsividade (regras globais)

- **Breakpoints:** `sm 640`, `md 768`, `lg 1024`, `xl 1280`. Base = mobile (`mobile-first`).
- Painel: sidebar fixa ≥ `lg`; abaixo disso, drawer com overlay + bottom navigation (Início, Páginas, Perfil) no rodapé.
- Área de toque mínima: **44×44 px** em tudo que é clicável (inclusive links da página pública, badges e ícones).
- Nada de hover como único modo de revelar informação.
- Área de conteúdo do painel centralizada, `max-w-6xl`, gutters de 16 px no mobile.

## 6. Acessibilidade (WCAG 2.1 AA)

- Contraste: texto normal ≥ 4.5:1, texto grande e ícones ≥ 3:1 (validar os 6 temas contra o padrão; doc 12 tem checklist).
- Foco **sempre visível**: `:focus-visible` com ring `brand-500`, nunca `outline: none` sem substituto.
- `Skip to content` no topo do painel e da página pública.
- Formulários: todo input com `<label for>`; erros anunciados (`aria-live`).
- Modal/drawer: foco preso e devolvido ao gatilho ao fechar.
- Drag-and-drop: **teclado obrigatório** (doc 07 §6) + `aria-live` anunciando nova posição.
- Página pública: um único `<h1>` (nome de exibição), links são `<a>` reais (funcionam sem JS para navegação).
- Teste automatizado: axe-core no smoke de cada tela (doc 12) + testes manuais com VoiceOver (macOS) e TalkBack (Android).
