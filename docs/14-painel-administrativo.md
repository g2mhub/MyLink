# 14 · Painel Administrativo

Área restrita (`/painel/admin`) para o administrador gerenciar **usuários** e **planos**. Sem integração de pagamento: a ativação/troca/cancelamento de plano é **manual** (decisão registrada — doc 10 §3).

## 1. Quem é administrador

- `profiles.role = 'admin'` (coluna nova, doc 03 §1). Default `'user'`.
- Promoção inicial: manual no dashboard Supabase (`update profiles set role='admin' where handle='...'`).
- Proteção em 3 camadas:
  1. **Guard de rota** no front (`<RequireAdmin>`): sem `role === 'admin'` → redireciona para `/painel` com toast "Acesso restrito".
  2. **RLS**: policies `plans_admin` e `profiles_admin_update` usam `public.is_admin()`.
  3. **RPCs `admin_*`**: `security definer` + checagem dupla de `is_admin()` (nenhum caminho de escrita administrativa passa pelo cliente diretamente).

## 2. Telas

### 2.1 Admin → Usuários `/painel/admin/usuarios`

```
┌─────────────────────────────────────────────────────────────┐
│ Admin · Usuários                        [Buscar usuário]     │
├─────────────────────────────────────────────────────────────┤
│ Avatar  Nome (handle)     E-mail            Plano  Status ⋯  │
│ 🧑      Klauz (klauz)     klauz@x.com      Pro    ● ativo  ⋯│
│ 🧑      Ana (ana)         ana@x.com        Free   ● ativo  ⋯│
│ 🧑      Bruno (bruno)     bruno@x.com      Free   ⛔ bloqueado│
└─────────────────────────────────────────────────────────────┘
```

- **Fonte de dados:** RPC `admin_list_users()` (security definer) → profiles + e-mail (`auth.users`) + plano + status + nº de páginas + total de cliques. Busca filtra no cliente (volume pequeno).
- **Menu ⋯ por usuário:** Ver detalhes · Atribuir plano (modal com `plans` + confirmação) · Bloquear/Reativar (ConfirmDialog) · Abrir página pública.
- **Detalhes (drawer/modal):** avatar, handle, e-mail, plano, data de cadastro, nº de páginas, cliques totais, lista de páginas com links (RPC `admin_list_users` supre o essencial; páginas detalhadas via leitura admin — policy `profiles_admin_update` cobre update; para leitura ampla usar `select` com `is_admin()` em policy complementar ou RPC futura).

### 2.2 Admin → Planos `/painel/admin/planos`

```
┌────────────────────────────────────────────────────────┐
│ Admin · Planos                          [+ Novo plano]  │
├────────────────────────────────────────────────────────┤
│ Gratuito (free)                    [Editar]            │
│ R$ 0,00 · 1 página · 5 links · métricas 30 dias        │
│ Usuários: 22                                           │
│                                                        │
│ Pro (pro)                            [Editar]          │
│ R$ 15,00/mês · páginas e links ilimitados              │
│ métricas completas · domínio próprio                   │
│ Usuários: 4                                            │
└────────────────────────────────────────────────────────┘
```

- **CRUD direto na tabela `plans`** (policy `plans_admin`): nome, `max_pages`, `max_links_per_page`, `metrics_days`, `custom_domain`, `price_monthly_cents`.
- `code` é imutável após criação (referência de seed); `price_monthly_cents` exibido como R$ via `Intl.NumberFormat('pt-BR')`.
- Ao editar limites: **nunca** reduzir silenciosamente o que usuários já usam — aviso "Usuários existentes continuam com o que já criaram (doc 10 §4)".
- Novo plano entra disponível imediatamente no modal "Atribuir plano".
- Contagem de usuários por plano: derivada de `admin_list_users()` (agrupamento no cliente).

## 3. Contratos (services/admin.ts)

| Função | RPC/rota | Comportamento |
|---|---|---|
| `listarUsuarios()` | `admin_list_users` | retorna `UsuarioAdmin[]` (inclui e-mail) |
| `definirStatus(userId, 'ativo' \| 'bloqueado')` | `admin_set_user_status` | toast de confirmação |
| `atribuirPlano(userId, planId)` | `admin_assign_plan` | invalida `['admin','usuarios']` |
| `listarPlanos()` | select `plans` | público (RLS de leitura aberto) |
| `criarPlano(dados)` / `atualizarPlano(id, patch)` / `removerPlano(id)` | insert/update/delete `plans` | só admin (policy) |

## 4. Bloqueio de usuário — efeitos

| Superfície | Efeito do `status='bloqueado'` |
|---|---|
| Login | guard de sessão detecta `status !== 'ativo'` → logout + "Sua conta está bloqueada. Fale com o administrador." |
| Escritas (páginas/links) | RLS `with check` exige `status='ativo'` (doc 03 §6) — API devolve erro mesmo se o front tentar |
| Página pública | **continua no ar** (leitura pública não depende de status) — decisão: bloqueio é sobre a conta, não o conteúdo; para derrubar a página, despublicar (`published=false`) |
| Métricas | continuam sendo coletadas (público) |

## 5. Segurança

- E-mail só aparece **dentro** do admin (via RPC) — nunca em `profiles` nem na página pública.
- Nenhuma mutation administrativa via tabelas diretas no cliente: tudo por RPC/policies com `is_admin()`.
- `admin_list_users` é `security definer` com `search_path` fixo e retorna **vazio** (não erro) para não-admins; o guard de rota já impede o acesso à tela.
- Log operacional: fase futura (tabela `admin_audit`), fora do escopo atual.

## 6. Aceite do módulo

- [ ] Usuário comum em `/painel/admin/*` → redirecionado, sem dados expostos.
- [ ] Admin lista usuários com e-mail, atribui Pro e o usuário perde os limites imediatamente.
- [ ] Admin bloqueia usuário → ele não consegue logar; tentativa de escrita via API direta falha (RLS).
- [ ] Admin cria um novo plano com limites próprios e consegue atribuí-lo.
- [ ] Preços formatados em pt-BR (R$ 15,00) em todas as telas.
