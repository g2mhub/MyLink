import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { buscarPorHandle } from '@/services/profiles';
import { buscarPublica } from '@/services/pages';
import { listarLinks } from '@/services/links';
import { listarTemas, tokensFinais } from '@/services/temas';
import { registrarClique, registrarPageview } from '@/services/tracking';
import { HANDLE_REGEX, HANDLES_RESERVADOS } from '@/lib/urls';
import type { Link as LinkDom, Pagina, Perfil, Tema } from '@/types/domain';
import { PageRenderer, type LinkPublico } from '@/components/page-renderer/PageRenderer';
import { NaoEncontrada } from '@/pages/publica/NaoEncontrada';

export function PaginaPublica() {
  const { handle, slug } = useParams<{ handle: string; slug?: string }>();
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'nao-encontrada'>('carregando');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [pagina, setPagina] = useState<Pagina | null>(null);
  const [links, setLinks] = useState<LinkDom[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const pageviewEnviado = useRef<string | null>(null);

  const handleValidoRota = useMemo(
    () => Boolean(handle && HANDLE_REGEX.test(handle) && !HANDLES_RESERVADOS.includes(handle)),
    [handle],
  );

  useEffect(() => {
    if (!handleValidoRota) { setEstado('nao-encontrada'); return; }
    let cancelado = false;
    void (async () => {
      try {
        const [perfilRes, temasRes] = await Promise.all([buscarPorHandle(handle!), listarTemas()]);
        if (cancelado) return;
        if (!perfilRes) { setEstado('nao-encontrada'); return; }
        const paginaRes = await buscarPublica(handle!, slug);
        if (cancelado) return;
        if (!paginaRes) { setPerfil(perfilRes); setEstado('nao-encontrada'); return; }
        const linksRes = await listarLinks(paginaRes.id, true);
        if (cancelado) return;
        setPerfil(perfilRes);
        setPagina(paginaRes);
        setLinks(linksRes);
        setTemas(temasRes);
        setEstado('ok');
      } catch {
        if (!cancelado) setEstado('nao-encontrada');
      }
    })();
    return () => { cancelado = true; };
  }, [handle, slug, handleValidoRota]);

  useEffect(() => {
    if (estado !== 'ok' || !pagina) return;
    document.title = `${perfil?.nome ?? 'Mylink'} — Mylink`;
    if (pageviewEnviado.current !== pagina.id) {
      pageviewEnviado.current = pagina.id;
      registrarPageview(pagina.id);
    }
  }, [estado, pagina, perfil]);

  const tokens = useMemo(
    () => tokensFinais(temas.find((t) => t.slug === pagina?.tema), pagina?.sobrescritas ?? {}),
    [temas, pagina],
  );

  if (estado === 'carregando') {
    return (
      <div className="grid min-h-screen place-items-center bg-white">
        <div className="animate-pulse rounded-full bg-ink-900/10" style={{ width: 120, height: 120 }} aria-hidden />
        <p className="mt-4 text-sm text-ink-500" aria-live="polite">Carregando…</p>
      </div>
    );
  }

  if (estado !== 'ok' || !pagina || !perfil) {
    // handle inexistente ou página despublicada: 404 sem vazar informação (doc 08)
    return <NaoEncontrada />;
  }

  const linksPublicos: LinkPublico[] = links.map((l) => ({
    id: l.id, titulo: l.titulo, url: l.url, icone: l.icone, destaque: l.destaque,
  }));

  return (
    <PageRenderer
      tokens={tokens}
      layout={pagina.layout}
      botao={pagina.botao}
      fonte={pagina.fonte}
      nome={perfil.nome}
      bio={perfil.bio}
      avatarUrl={perfil.avatarUrl}
      links={linksPublicos}
      aoClicarLink={(link, e) => {
        e.preventDefault();
        const destino = link.url;
        const id = link.id;
        void (async () => {
          const url = id ? await registrarClique(id) : null;
          window.location.assign(url ?? destino);
        })();
      }}
      rodape={<Link to="/" className="tap inline-flex items-center font-medium hover:underline">Feito com Mylink</Link>}
    />
  );
}
