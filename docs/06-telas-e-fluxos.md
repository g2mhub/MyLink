# 06 · Telas e Fluxos

Wireframes em texto (ASCII) — suficientes para construir; o visual exato segue [docs/05](docs/05-design-system.md).

## 1. Mapa de navegação

```
/ (Landing)
 ├── /cadastro ──(sucesso, e-mail confirmado)──► /painel ──(sem handle)──► /painel/onboarding
 ├── /entrar ──► /painel
 │     ├── "Esqueci minha senha" ──► /redefinir-senha ──► /painel
 │     └── "Entrar com Google" ──► /auth/callback ──► /painel
 │
 /painel (sidebar)
 ├── Visão geral                 /painel
 ├── Minhas páginas              /painel/paginas
 │     └── Editor                /painel/paginas/:id
 │           └── Métricas        /painel/paginas/:id/metricas
 ├── Perfil                      /painel/perfil
 └── Configurações (plano)       /painel/configuracoes

/:handle  e  /:handle/:slug  (pública, rota reservada ao final)
```

**Guards:** rota `painel/*` sem sessão → redireciona para `/entrar?de=/painel`. `/entrar` e `/cadastro` já logados → `/painel`. Sessão com `handle_temporary = true` → `/painel/onboarding` (exceto a própria rota).

---

## 2. Landing `/`

```
┌──────────────────────────────────────────────┐
│ [Logo] Mylink            Entrar  [Criar minha página] │
├──────────────────────────────────────────────┤
│                                              │
│   Sua página de links,                       │
│   pronta em 2 minutos.          ┌──────────┐ │
│                                 │ mock do  │ │
│   Crie, personalize e           │ celular  │ │
│   compartilhe todos os seus     │ com a    │ │
│   links em uma URL só.          │ página   │ │
│   [Criar minha página]          │ exemplo  │ │
│   Ver exemplo →                 └──────────┘ │
├──────────────────────────────────────────────┤
│ Como funciona (3 passos): Criar → Personalizar → Compartilhar │
│ Recursos: Temas · Arraste e solte · Métricas de cliques · Mobile │
│ Planos: Gratuito (1 página, 5 links) | Pro (tudo ilimitado)     │
│ FAQ (4 perguntas) · Rodapé: Sobre · Termos · Privacidade · Contato│
└──────────────────────────────────────────────┘
```

---

## 3. Cadastro `/cadastro`

```
┌────────────────────────────────┐
│ [Logo]                         │
│ Crie sua página de links       │
│                                │
│ Nome de usuário *              │  ← prefixo visual: mylink.com.br/
│ [klauz________]  ✓ disponível  │  ← debounce 400 ms → RPC is_handle_available
│ Nome de exibição *             │
│ [Klauz_________]              │
│ E-mail *                       │
│ [voce@email.com]              │
│ Senha *                        │  ← medidor: fraca/média/forte
│ [••••••••]  👁                │
│                                │
│ [ Criar minha página ]         │  ← loading; sucesso → /auth/callback?next=/painel
│ Já tem conta? Entrar           │
│ Ao continuar você aceita os    │
│ Termos e a Política de Privacidade. │
└────────────────────────────────┘
```

**Erros:** handle ocupado → "Este nome de usuário já está em uso." (sob o campo); e-mail já cadastrado → "Já existe uma conta com este e-mail. **Entrar**."; senha < 8 caracteres → validação em campo.

**Confirmação de e-mail:** tela intermediária "Confira seu e-mail" com reenvio; link do e-mail vai para `/auth/callback` e cai em `/painel`.

## 4. Login `/entrar` e recuperação

```
┌──────────────────────┐    ┌──────────────────────────┐
│ [Logo]               │    │ Esqueci minha senha       │
│ Entrar               │    │                          │
│ E-mail [__________]  │    │ Informe seu e-mail para   │
│ Senha [__________] 👁│    │ receber o link de troca.  │
│ [Entrar]             │    │ [email______________]    │
│ ── ou ──             │    │ [Enviar link]            │
│ [G Entrar com Google]│    │                          │
│ Esqueci minha senha  │    │ (sucesso) Link enviado!   │
│ Não tem conta?       │    │ Se o e-mail existir, você │
│ Criar minha página   │    │ receberá um link válido   │
└──────────────────────┘    │ por 1 hora.  ← mesma tela │
                            │ p/ e-mail inexistente     │
                            └──────────────────────────┘
```

- **`/redefinir-senha`**: nova senha + confirmar; sucesso → toast → `/painel`. Token inválido/expirado → "Link inválido ou expirado. Solicite outro." + botão reenviar.
- **`/auth/callback`**: troca `code` por sessão (PKCE) → redireciona a `?next=` ou `/painel`.

## 5. Painel — Visão geral `/painel`

```
┌──────────┬─────────────────────────────────────────────┐
│ [Logo]   │ Olá, Klauz 👋                    🔔  [Avatar]│
│          │                                             │
│ ▸ Início │ ┌─ Minha página ────────────────────────┐   │
│ ▸ Páginas│ │ klauz · Publicada · 128 visualizações  │   │
│ ▸ Perfil │ │ [Ver página] [Abrir editor] [Copiar]   │   │
│ ▸ Config │ └───────────────────────────────────────┘   │
│          │ ┌─ Métricas (7 dias) ─┐ ┌─ Atalhos ──────┐ │
│ Planos:  │ │ views 128  ▁▂▃▅▇▅▃  │ │ + Novo link     │ │
│ Gratuito │ │ cliques 42  ▁▁▂▃▅▇   │ │ Editar aparência│ │
│ 1/1 págs │ └─────────────────────┘ └────────────────┘ │
│          │ Últimos cliques: Instagram (12), WhatsApp (9)…│
└──────────┴─────────────────────────────────────────────┘
```

**Primer:** primeira visita mostra coach marks (3 passos: "Adicione seu link", "Escolha um tema", "Publique e compartilhe"), com `localStorage` para não repetir.

## 6. Minhas páginas `/painel/paginas`

```
┌──────────────────────────────────────────────────────┐
│ Minhas páginas                        [+ Nova página]│
│ (Free: botão desabilitado quando 1/1 com tooltip     │
│  "Seu plano permite 1 página. Conheça o Pro →")      │
├──────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐ ┌──────────────────────┐│
│ │ thumb   Minha página     │ │ thumb  Portfólio     ││
│ │ /klauz  ● Publicada      │ │ /klauz/portfolio ● Rascunho││
│ │ 128 views · 42 cliques   │ │ 0 views              ││
│ │ [Abrir] [ Métricas ] ⋯  │ │ [Abrir] [Métricas] ⋯ ││
│ └──────────────────────────┘ └──────────────────────┘│
└──────────────────────────────────────────────────────┘
menu ⋯: Editar · Duplicar · Ver página · Copiar link · Publicar/Despublicar · Excluir (ConfirmDialog)
```

## 7. Editor `/painel/paginas/:id` — ver doc 07 (preview em painel dividido)

Resumo: coluna esquerda com **abas** (Links · Aparência · Página) + auto-save; coluna direita = **preview ao vivo** (iframe/espelho do `PageRenderer`).

## 8. Métricas `/painel/paginas/:id/metricas`

```
┌──────────────────────────────────────────────────────┐
│ ← Minhas páginas / Minha página — Métricas            │
│ [7 dias] [30 dias] [90 dias]   (Free: 90 dias        │
│  desabilitado com cadeado 🔒 "disponível no Pro")     │
├──────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐ │
│ │ 128         │ │ 42          │ │ 33%              │ │
│ │ Visualizações│ │ Cliques     │ │ Taxa de cliques  │ │
│ └─────────────┘ └─────────────┘ └──────────────────┘ │
│ ┌── Gráfico: barras views + linha cliques/dia ──────┐ │
│ └───────────────────────────────────────────────────┘ │
│ Cliques por link                                      │
│ ▸ Instagram      18  ████████████████  43%   [Abrir]  │
│ ▸ WhatsApp       12  ██████████        29%   [Abrir]  │
│ ▸ YouTube         7  ██████            17%   [Abrir]  │
│ ▸ Portfólio       5  ████              12%   [Abrir]  │
│ [Baixar CSV]  (janela do plano: últimos 30 dias)      │
└──────────────────────────────────────────────────────┘
```

## 9. Perfil `/painel/perfil`

```
┌─ Meu perfil ────────────────────────────┐
│        (Avatar 96px)  [Trocar foto]     │  ← crop/redimensiona para 512×512 WebP
│ Nome de exibição [Klauz___________]     │
│ Nome de usuário  [mylink.com.br/klauz]  │  ← mudança exige ConfirmDialog:
│                                         │  "Sua URL pública mudará de ... para ....
│                                         │   Links antigos deixarão de funcionar."
│ Biografia (bio textarea 300, contador)  │
│ [Salvar alterações]                     │
└─────────────────────────────────────────┘
```

## 10. Configurações `/painel/configuracoes` (plano e conta)

```
┌─ Configurações ─────────────────────────┐
│ Plano atual                             │
│ ┌─ Gratuito ──────────────────────────┐ │
│ │ Páginas 1/1 · Links 5/página       │ │
│ │ Métricas últimos 30 dias           │ │
│ │ [Conhecer o Pro]  (sem cobrança     │ │
│ │ nesta fase — abre modal explicando  │ │
│ │ limites e "em breve")               │ │
│ └─────────────────────────────────────┘ │
│ Limites (barra de uso)                  │
│ Conta: e-mail (só leitura) · [Sair]     │
│ Excluir conta (ConfirmDialog → texto    │
│ "EXCLUIR" → apaga tudo, doc 11 §5)      │
└─────────────────────────────────────────┘
```

## 11. Onboarding `/painel/onboarding` (login Google)

```
Escolha seu endereço
mylink.com.br/ [meunome____]  ✓ disponível
[Salvar e ir para o painel]
```

## 12. Página pública `/:handle` — ver doc 08 (layout completo)

Resumo: avatar, nome, bio, lista de links com ícones, tema escolhido, rodapé com marca Mylink; 404 com busca de sugestões em `/handle-inexistente`.

---

## 13. Estados globais a cobrir (todas as telas)

| Estado | Comportamento |
|---|---|
| Carregando | skeleton (nunca tela vazia piscando) |
| Vazio | `EmptyState` com CTA contextual |
| Erro de rede | toast + botão "Tentar novamente" |
| Offline | banner "Sem conexão — alterações serão salvas quando voltar" (draft local) |
| Sucesso | toast 2 s (pt-BR) |
| Permissão negada (RLS) | volta para a rota anterior + toast "Você não tem acesso a este conteúdo." |
