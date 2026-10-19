// Validação e normalização de URLs de destino (doc 04 §3 e doc 11 §1)

export const HANDLE_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/;
export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export const HANDLES_RESERVADOS = [
  'app', 'api', 'admin', 'auth', 'painel', 'entrar', 'cadastro', 'sair', 'logout',
  'recuperar', 'redefinir', 'onboarding', 'assets', 'static', 'favicon', 'robots',
  'sobre', 'ajuda', 'termos', 'privacidade', 'contato', 'suporte', 'blog',
  'mylink', 'www', 'mailto', 'metricas', 'config', 'preview', '404', 'null', 'undefined',
];

export function handleValido(h: string): boolean {
  return HANDLE_REGEX.test(h) && !HANDLES_RESERVADOS.includes(h);
}

const SCHEMES_BLOQUEADOS = /^(javascript|data|vbscript|file):/i;

/** Valida e normaliza URL de destino; retorna null quando inválida/perigosa. */
export function normalizarUrl(entrada: string): string | null {
  const texto = entrada.trim();
  if (!texto) return null;
  if (/^(mailto:|tel:)/i.test(texto)) return texto;
  if (SCHEMES_BLOQUEADOS.test(texto)) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  if (!url.hostname.includes('.') || url.hostname.endsWith('.')) return null;
  return url.toString();
}

/** Detecta o ícone sugerido a partir da URL (auto-detecção, doc 04 §3). */
export function iconeSugerido(url: string): string {
  const alvo = url.toLowerCase();
  if (alvo.startsWith('mailto:')) return 'email';
  if (alvo.startsWith('tel:')) return 'telefone';
  if (alvo.includes('wa.me') || alvo.includes('whatsapp')) return 'whatsapp';
  if (alvo.includes('instagram.com')) return 'instagram';
  if (alvo.includes('youtube.com') || alvo.includes('youtu.be')) return 'youtube';
  if (alvo.includes('tiktok.com')) return 'tiktok';
  if (alvo.includes('linkedin.com')) return 'linkedin';
  if (alvo.includes('github.com')) return 'github';
  if (alvo.includes('twitter.com') || alvo.includes('x.com')) return 'x';
  if (alvo.includes('twitch.tv')) return 'twitch';
  if (alvo.includes('spotify.com')) return 'spotify';
  if (alvo.includes('facebook.com')) return 'facebook';
  if (alvo.includes('maps.google') || alvo.includes('goo.gl/maps')) return 'localizacao';
  if (alvo.includes('api.whatsapp.com')) return 'whatsapp';
  return 'link';
}
