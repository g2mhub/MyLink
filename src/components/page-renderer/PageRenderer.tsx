import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import type { EstiloBotao, Layout, TemasTokens } from '@/types/domain';
import { iconeDe } from '@/components/icons';

export type LinkPublico = {
  id?: string;
  titulo: string;
  url: string;
  icone: string;
  destaque: boolean;
};

const FONTES: Record<string, string> = {
  inter: "'Inter', system-ui, sans-serif",
  sora: "'Sora', 'Inter', system-ui, sans-serif",
  jakarta: "'Inter', system-ui, sans-serif", // Plus Jakarta Sans: adicionar ao load de fonts quando disponível
  nunito: "'Inter', system-ui, sans-serif",
};

type Props = {
  tokens: TemasTokens;
  layout: Layout;
  botao: EstiloBotao;
  fonte: string;
  nome: string;
  bio?: string;
  avatarUrl?: string | null;
  links: LinkPublico[];
  rodape?: ReactNode;
  aoClicarLink?: (link: LinkPublico, e: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * Único renderizador da página pública — usado na pré-visualização do editor
 * e na rota pública (doc 08). Modo preview NÃO registra clique.
 */
export function PageRenderer({
  tokens, layout, botao, fonte, nome, bio, avatarUrl, links, rodape, aoClicarLink,
}: Props) {
  const estilo = {
    '--pg-bg': tokens.background ?? '#FFFFFF',
    '--pg-surface': tokens.surface ?? '#FFF7ED',
    '--pg-text': tokens.text ?? '#0B0B0F',
    '--pg-muted': tokens.textMuted ?? '#6B7280',
    '--pg-accent': tokens.accent ?? '#F97316',
    '--pg-accent-text': tokens.accentText ?? '#FFFFFF',
    '--pg-radius': `${tokens.radius ?? 14}px`,
    '--pg-shadow': tokens.buttonShadow ?? 'none',
    fontFamily: FONTES[fonte] ?? FONTES.inter,
  } as CSSProperties;

  const fundo = tokens.backgroundGradient
    ? (tokens.background ?? 'linear-gradient(160deg,#F97316,#C2410C)')
    : (tokens.background ?? '#FFFFFF');

  const estiloBotao = {
    solido: { background: 'var(--pg-accent)', color: 'var(--pg-accent-text)', border: '2px solid transparent' },
    contorno: { background: 'transparent', color: 'var(--pg-accent)', border: '2px solid var(--pg-accent)' },
    sombra: { background: 'var(--pg-accent)', color: 'var(--pg-accent-text)', border: '2px solid transparent', boxShadow: 'var(--pg-shadow)' },
  } satisfies Record<EstiloBotao, CSSProperties>;

  const lista = layout === 'lista';
  const grade = layout === 'grade';

  return (
    <main className="pg min-h-[100dvh] pb-[max(1.5rem,env(safe-area-inset-bottom))]" style={{ ...estilo, background: fundo, color: 'var(--pg-text)' }}>
      <div className="mx-auto flex w-full max-w-[560px] flex-col items-center px-5 pt-12 text-center">
        <div className="grid h-[120px] w-[120px] place-items-center overflow-hidden rounded-full" style={{ background: 'var(--pg-surface)' }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" width={120} height={120} className="h-full w-full object-cover" />
            : <span className="text-5xl font-bold" style={{ color: 'var(--pg-accent)' }}>{(nome || 'M')[0].toUpperCase()}</span>}
        </div>
        <h1 className="mt-4 text-2xl font-bold">{nome}</h1>
        {bio && <p className="mt-2 max-w-[46ch] text-base leading-relaxed" style={{ color: 'var(--pg-muted)' }}>{bio}</p>}

        <div className={`mt-8 flex w-full ${lista ? 'flex-col gap-3' : grade ? 'grid grid-cols-2 gap-3' : 'flex-col gap-4'}`}>
          {links.map((link) => {
            const Icone = iconeDe(link.icone);
            const estiloLink: CSSProperties = link.destaque
              ? { background: 'var(--pg-accent)', color: 'var(--pg-accent-text)', border: '2px solid transparent', boxShadow: 'var(--pg-shadow)' }
              : estiloBotao[botao];
            return (
              <a
                key={link.id ?? link.url}
                href={link.url}
                onClick={aoClicarLink ? (e) => aoClicarLink(link, e) : undefined}
                rel="noopener nofollow"
                className={`tap flex min-h-[56px] w-full items-center gap-3 px-5 py-3 font-semibold transition-transform hover:-translate-y-0.5 active:scale-[0.98] ${grade ? 'flex-col justify-center gap-1.5 text-sm' : 'text-left'}`}
                style={{ ...estiloLink, borderRadius: 'var(--pg-radius)', maxWidth: grade ? 'none' : 'none' }}
              >
                <Icone size={grade ? 26 : 24} aria-hidden />
                <span className={grade ? 'text-center leading-tight' : 'flex-1 truncate'}>{link.titulo}</span>
                {!grade && link.destaque && <span className="text-xs opacity-80">destaque</span>}
              </a>
            );
          })}
        </div>

        {rodape && (
          <footer className="mt-10 text-sm" style={{ color: 'var(--pg-muted)' }}>
            {rodape}
          </footer>
        )}
      </div>
    </main>
  );
}
