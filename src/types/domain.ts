export type TemasTokens = {
  background?: string;
  backgroundGradient?: boolean;
  surface?: string;
  text?: string;
  textMuted?: string;
  accent?: string;
  accentText?: string;
  radius?: number;
  buttonShadow?: string;
};

export type Plano = {
  id: number;
  codigo: string;
  nome: string;
  maxPaginas: number; // -1 = ilimitado
  maxLinksPorPagina: number;
  janelaMetricasDias: number; // -1 = histórico todo
  dominioProprio: boolean;
  precoMensalCentavos: number;
};

export type Perfil = {
  id: string;
  handle: string;
  handleTemporario: boolean;
  nome: string;
  bio: string;
  avatarUrl: string | null;
  papel: 'user' | 'admin';
  status: 'ativo' | 'bloqueado';
  plano: Plano;
};

export type Layout = 'lista' | 'grade' | 'cards';
export type EstiloBotao = 'solido' | 'contorno' | 'sombra';

export type Pagina = {
  id: string;
  titulo: string;
  slug: string | null;
  publicada: boolean;
  tema: string;
  layout: Layout;
  botao: EstiloBotao;
  fonte: string;
  sobrescritas: TemasTokens;
};

export type Tema = {
  slug: string;
  nome: string;
  isDark: boolean;
  tokens: TemasTokens;
};

export type Link = {
  id: string;
  paginaId: string;
  titulo: string;
  url: string;
  icone: string;
  destaque: boolean;
  ativo: boolean;
  posicao: number;
};

export type Metricas = {
  de: string;
  ate: string;
  janelaDias: number | null;
  totais: { views: number; clicks: number };
  porDia: { dia: string; views: number; clicks: number }[];
  porLink: { linkId: string | null; titulo: string; icone: string; url: string; clicks: number }[];
};

export type UsuarioAdmin = {
  id: string;
  handle: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  plano: string;
  status: 'ativo' | 'bloqueado';
  criadoEm: string;
  paginas: number;
  cliques: number;
};
