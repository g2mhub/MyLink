# 01 · Visão do Produto

## 1. Problema e proposta

Criadores de conteúdo, pequenos negócios e profissionais autônomos precisam de um "cartão de visitas digital": uma URL curta que centralize todos os seus links. O Mylink resolve isso em minutos, sem código, com edição visual e preview ao vivo.

**Proposta de valor:** "Crie sua página de links em 2 minutos. Personalize, publique e compartilhe uma URL só."

## 2. Personas

| Persona | Perfil | Objetivo principal | Dor |
|---|---|---|---|
| **Criadora (Ana)** | Cria conteúdo no Instagram e YouTube | Ter uma página com todos os perfis + WhatsApp | Bio do Instagram só aceita 1 link |
| **Pequeno negócio (Padaria da Vila)** | Loja física + WhatsApp Business | Divulgar cardápio, encomendas e avaliações | Não tem site; Facebook é difícil de manter |
| **Autônomo (Dev Bruno)** | Portfólio e freelas | Mostrar projetos, GitHub e contato profissional | Currículo em PDF está desatualizado |

## 3. User stories por módulo

### Autenticação
- **US-A1** Como visitante, quero me cadastrar com e-mail, senha, nome de usuário (handle) e nome de exibição, para receber uma página em `mylink.com.br/meuhandle`.
- **US-A2** Como visitante, quero entrar com Google, para não criar mais uma senha.
- **US-A3** Como usuário, quero entrar e sair da minha conta, para proteger meu painel.
- **US-A4** Como usuário, quero redefinir minha senha por e-mail, para recuperar o acesso sem suporte manual.
- **US-A5** Como usuário do Google sem handle escolhido, quero completar um onboarding de 1 tela para escolher meu handle.
- **US-A6** Como visitante, quero ver se um handle está disponível enquanto digito, para evitar erro no envio do formulário.

### Perfil
- **US-P1** Como usuário, quero editar nome de exibição, handle, foto de perfil e biografia (até 300 caracteres).
- **US-P2** Como usuário, quero trocar meu handle com aviso claro das consequências (a URL pública antiga deixa de funcionar).
- **US-P3** Como usuário, quero enviar uma foto do computador ou celular, com corte/redimensionamento automático, para ter uma página com boa aparência.

### Páginas e links
- **US-L1** Como usuário do plano gratuito, quero ter 1 página; do plano Pro, várias páginas.
- **US-L2** Como usuário, quero adicionar, editar e remover links com título, URL, ícone e destaque.
- **US-L3** Como usuário, quero reordenar links por arrastar e soltar, para colocar o mais importante primeiro.
- **US-L4** Como usuário, quero ocultar um link sem apagá-lo, para usar depois.
- **US-L5** Como usuário, quero uma URL pública única por página: página principal em `/meuhandle` e demais em `/meuhandle/slug`.
- **US-L6** Como usuário, quero publicar/despublicar uma página, para trabalhar nela fora do ar.
- **US-L7** Como usuário, quero ícones de WhatsApp, Instagram, YouTube, TikTok, LinkedIn, GitHub, e-mail, telefone, loja, portfólio e genérico — com detecção automática de ícone pela URL.

### Personalização
- **US-T1** Como usuário, quero escolher entre temas prontos (ex.: Aurora, Meia-noite, Minimalista…).
- **US-T2** Como usuário, quero ajustar cores de fundo, cor de destaque, fonte, layout (lista/grade/cards) e estilo dos botões (sólido/contorno/sombra).
- **US-T3** Como usuário, quero ver minhas mudanças refletidas **na hora** na pré-visualização, sem precisar salvar.

### Painel e métricas
- **US-D1** Como usuário, quero um painel com visão geral (minha página, cliques recentes, atalhos), para começar por onde é importante.
- **US-M1** Como usuário, quero ver o total de cliques e visualizações da página e de cada link, com filtro de período (7/30/90 dias).
- **US-M2** Como usuário do plano gratuito, quero ver métricas dos últimos 30 dias; do Pro, de todo o histórico.

### Conta e planos
- **US-C1** Como usuário, quero ver qual é meu plano e seus limites, dentro das configurações.
- **US-C2** Como usuário do gratuito, quero ver um aviso claro quando atingir o limite de páginas/links, com o caminho para o Pro.

## 4. Fluxos principais

1. **Cadastro → publicação:** Landing → `/cadastro` (e-mail, senha, handle, nome) → e-mail de confirmação → `/painel` → criar página (auto no primeiro acesso) → adicionar links → escolher tema → preview → **Publicar** → copiar URL → compartilhar.
2. **Login Google:** `/entrar` → Google → callback → se sem handle, `/painel/onboarding` → `/painel`.
3. **Recuperação de senha:** `/entrar` → "Esqueci minha senha" → e-mail → link → `/redefinir-senha` → nova senha → `/painel`.
4. **Visita pública:** `mylink.com.br/klauz` → página renderizada → clique em link → evento registrado → navegação ao destino.
5. **Métricas:** dono abre `/painel/paginas/:id/metricas` → vê totais, gráfico e tabela por link.

## 5. Escopo

### Incluído nesta fase
- Cadastro/login e-mail+senha, login Google, recuperação de senha (Supabase Auth).
- Perfil completo com upload de avatar (Supabase Storage).
- Múltiplas páginas por usuário com URL pública única (slug), publicar/despublicar.
- Links com ícone, destaque, ocultar e reordenar (drag-and-drop).
- Temas prontos + personalização de cores/fonte/layout/estilo de botão.
- Preview ao vivo no editor.
- Página pública responsiva (mobile-first, alvos ≥ 44×44 px).
- Métricas básicas: visualizações e cliques por página e por link, com períodos.
- Planos Free/Pro com limites aplicados no banco (sem cobrança).
- Deploy contínuo no Netlify; banco Supabase com RLS.

### Fora de escopo (fase futura)
- Cobrança/recorrência (Stripe Checkout + webhooks).
- Domínio próprio por página (custom domain) — modelado no banco (`custom_domains`), sem UI.
- Multi-idioma (interface fixa em pt-BR).
- Páginas com HTML/cabeçalhos personalizados, música de fundo, feeds de Instagram/YouTube embutidos.
- Painel administrativo interno (gestão de usuários/plano via dashboard Supabase).

## 6. Requisitos não funcionais (resumo — detalhe nos docs 11 e 12)

| Área | Meta |
|---|---|
| Desempenho | Página pública interativa < 2,5 s em 4G; JS inicial < 200 KB gzip (rotas do painel em code-split) |
| Disponibilidade | Depender do SLA do Supabase/Netlify (Free: sem SLA) — monitorar com uptime check gratuito |
| Acessibilidade | WCAG AA: contraste, foco visível, alvos ≥ 44×44 px, labels associados |
| Segurança | RLS em 100% das tabelas; nenhuma credencial no bundle; sem exposição de e-mail na página pública |
| Escala | Suporta o crescimento de 30 → ~5.000 usuários sem mudar arquitetura (ver doc 11) |
