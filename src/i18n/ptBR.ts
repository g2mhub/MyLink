/** Textos compartilhados de UI (pt-BR). Strings de tela ficam próximas dos componentes. */
export const t = {
  app: 'Mylink',
  tagline: 'Todos os seus links em um só lugar.',
  ctas: {
    criarPagina: 'Criar minha página',
    entrar: 'Entrar',
    verExemplo: 'Ver exemplo',
    publicar: 'Publicar',
    copiarLink: 'Copiar link',
    verPagina: 'Ver página',
    abrirEditor: 'Abrir editor',
  },
  estados: {
    carregando: 'Carregando…',
    vazioSemLinks: 'Você ainda não tem links',
    semConexao: 'Sem conexão — suas alterações serão salvas quando a conexão voltar.',
    erroGenerico: 'Algo deu errado. Tente novamente.',
    semSupabase: 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local para usar o app.',
  },
  planos: {
    gratuito: 'Gratuito',
    pago: 'Pro',
    faleComAdmin: 'Fale com o administrador para fazer upgrade.',
  },
} as const;
