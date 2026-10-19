import {
  BookOpen, Briefcase, Calendar, Coffee, Facebook, FileText, Gamepad2, Github, Globe,
  Heart, Instagram, Link2, Linkedin, Mail, MapPin, MessageCircle, Music, Music2, Phone,
  Send, ShoppingBag, Twitch, Twitter, Video, Youtube,
  type LucideIcon,
} from 'lucide-react';

/** Catálogo de ícones do editor (doc 07 §4). Marcas usam ícones equivalentes do lucide. */
export const ICONES: Record<string, { rotulo: string; Icone: LucideIcon }> = {
  link: { rotulo: 'Link', Icone: Link2 },
  globo: { rotulo: 'Site', Icone: Globe },
  email: { rotulo: 'E-mail', Icone: Mail },
  telefone: { rotulo: 'Telefone', Icone: Phone },
  whatsapp: { rotulo: 'WhatsApp', Icone: MessageCircle },
  instagram: { rotulo: 'Instagram', Icone: Instagram },
  facebook: { rotulo: 'Facebook', Icone: Facebook },
  youtube: { rotulo: 'YouTube', Icone: Youtube },
  tiktok: { rotulo: 'TikTok', Icone: Music2 },
  linkedin: { rotulo: 'LinkedIn', Icone: Linkedin },
  github: { rotulo: 'GitHub', Icone: Github },
  x: { rotulo: 'X (Twitter)', Icone: Twitter },
  twitch: { rotulo: 'Twitch', Icone: Twitch },
  spotify: { rotulo: 'Spotify', Icone: Music },
  telegram: { rotulo: 'Telegram', Icone: Send },
  loja: { rotulo: 'Loja', Icone: ShoppingBag },
  portfolio: { rotulo: 'Portfólio', Icone: Briefcase },
  documento: { rotulo: 'Documento', Icone: FileText },
  musica: { rotulo: 'Música', Icone: Music },
  video: { rotulo: 'Vídeo', Icone: Video },
  calendario: { rotulo: 'Agenda', Icone: Calendar },
  localizacao: { rotulo: 'Localização', Icone: MapPin },
  cafe: { rotulo: 'Café', Icone: Coffee },
  jogo: { rotulo: 'Jogos', Icone: Gamepad2 },
  leitura: { rotulo: 'Leitura', Icone: BookOpen },
  coracao: { rotulo: 'Apoio', Icone: Heart },
};

export function iconeDe(slug: string): LucideIcon {
  return ICONES[slug]?.Icone ?? Link2;
}

export const LISTA_ICONES = Object.entries(ICONES).map(([slug, v]) => ({ slug, rotulo: v.rotulo }));
