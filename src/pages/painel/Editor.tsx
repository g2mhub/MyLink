import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link as RLink, useParams } from 'react-router-dom';
import {
  DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft, BarChart3, Copy, ExternalLink, Eye, EyeOff, GripVertical, Pencil,
  Plus, Star, Trash2,
} from 'lucide-react';
import type { EstiloBotao, Layout, Link as LinkDom, Tema } from '@/types/domain';
import { listarMinhas } from '@/services/pages';
import { listarLinks } from '@/services/links';
import { listarTemas, tokensFinais } from '@/services/temas';
import { normalizarUrl, iconeSugerido } from '@/lib/urls';
import { traduzirErro } from '@/services/erros';
import { useEditor, type RascunhoLink } from '@/stores/editorStore';
import { useSession } from '@/hooks/useSession';
import { siteUrl } from '@/lib/supabase';
import { Btn, Campo, Confirmar, Etiqueta, Modal, Osso, Trocar, useToast } from '@/components/ui';
import { LISTA_ICONES, iconeDe } from '@/components/icons';
import { PageRenderer } from '@/components/page-renderer/PageRenderer';

export function EditorTela() {
  const { id } = useParams<{ id: string }>();
  const avisar = useToast();
  const { perfil } = useSession();
  const [carregando, setCarregando] = useState(true);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [aba, setAba] = useState<'links' | 'aparencia' | 'pagina'>('links');
  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ titulo: '', url: '', icone: 'link', destaque: false });
  const [erroForm, setErroForm] = useState<string | undefined>();
  const [excluindo, setExcluindo] = useState<RascunhoLink | null>(null);

  const {
    pageId, pagina, links, status, erro,
    carregar, patchPagina, addLink, patchLink, removerLink, moverLink, alternarAtivo, publicar,
  } = useEditor();

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const carregarTudo = useCallback(async () => {
    if (!id) return;
    try {
      const [paginas, temasLista] = await Promise.all([listarMinhas(), listarTemas()]);
      const pagina = paginas.find((p) => p.id === id);
      if (!pagina) { avisar('Página não encontrada.', 'erro'); return; }
      const linksDom: LinkDom[] = await listarLinks(id);
      carregar(pagina, linksDom);
      setTemas(temasLista);
    } catch (e) {
      avisar(traduzirErro(e), 'erro');
    } finally {
      setCarregando(false);
    }
  }, [id, avisar, carregar]);

  useEffect(() => { void carregarTudo(); return () => useEditor.getState().limpar(); }, [carregarTudo]);

  if (carregando || !pageId || !perfil) {
    return <div className="grid gap-4"><Osso className="h-16" /><Osso className="h-96" /></div>;
  }

  const temaAtual = temas.find((t) => t.slug === pagina.tema);
  const tokens = tokensFinais(temaAtual, pagina.sobrescritas);
  const urlPublica = pagina.slug ? `${siteUrl}/${perfil.handle}/${pagina.slug}` : `${siteUrl}/${perfil.handle}`;

  function aoArrastar(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const de = links.findIndex((l) => l.id === active.id);
    const para = links.findIndex((l) => l.id === over.id);
    if (de < 0 || para < 0) return;
    void moverLink(de, para);
  }

  function abrirForm(link?: RascunhoLink) {
    setEditandoId(link?.id ?? null);
    setForm(link
      ? { titulo: link.titulo, url: link.url, icone: link.icone, destaque: link.destaque }
      : { titulo: '', url: '', icone: 'link', destaque: false });
    setErroForm(undefined);
    setFormAberto(true);
  }

  async function salvarLink(e: FormEvent) {
    e.preventDefault();
    const url = normalizarUrl(form.url);
    if (!url) { setErroForm('Use um endereço começando com http:// ou https://'); return; }
    try {
      if (editandoId) {
        await patchLink(editandoId, { ...form, url });
      } else {
        await addLink({ ...form, url });
      }
      setFormAberto(false);
    } catch (err) {
      avisar(traduzirErro(err), 'erro');
    }
  }

  const rotuloStatus = {
    pronto: '✓ Salvo', sujo: 'Alterações pendentes…', salvando: 'Salvando…', erro: '⚠ Erro ao salvar',
  } as const;

  return (
    <div className="flex flex-col gap-4">
      {/* cabeçalho */}
      <div className="flex flex-wrap items-center gap-3">
        <RLink to="/painel/paginas" className="tap grid place-items-center rounded-xl border border-ink-900/15 bg-white" aria-label="Voltar para minhas páginas">
          <ArrowLeft size={18} aria-hidden />
        </RLink>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{pagina.titulo || 'Minha página'}</h1>
          <p className={`text-xs ${status === 'erro' ? 'text-danger-500' : 'text-ink-500'}`}>{rotuloStatus[status]}</p>
        </div>
        <RLink to={`/painel/paginas/${pageId}/metricas`}
          className="tap flex items-center rounded-xl border border-ink-900/15 bg-white px-3 text-sm font-semibold hover:bg-ink-900/5">
          <BarChart3 size={16} className="mr-1.5" aria-hidden /> Métricas
        </RLink>
        <button onClick={() => void navigator.clipboard.writeText(urlPublica).then(() => avisar('Link copiado!'))}
          className="tap flex items-center rounded-xl border border-ink-900/15 bg-white px-3 text-sm font-semibold hover:bg-ink-900/5">
          <Copy size={16} className="mr-1.5" aria-hidden /> Copiar link
        </button>
        <Btn carregando={status === 'salvando'} onClick={() => void publicar(!pagina.publicada).catch((e) => avisar(traduzirErro(e), 'erro'))}>
          {pagina.publicada ? 'Despublicar' : 'Publicar'}
        </Btn>
      </div>

      {erro && <p className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-600">{erro}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* coluna de edição */}
        <div className="order-2 flex flex-col rounded-2xl bg-white p-5 shadow-card lg:order-1">
          <div role="tablist" aria-label="Seções do editor" className="mb-5 flex gap-1 rounded-xl bg-canvas p-1">
            {([['links', 'Links'], ['aparencia', 'Aparência'], ['pagina', 'Página']] as const).map(([valor, rotulo]) => (
              <button key={valor} role="tab" aria-selected={aba === valor} onClick={() => setAba(valor)}
                className={`tap flex-1 rounded-lg text-sm font-semibold transition-colors ${aba === valor ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500'}`}>
                {rotulo}
              </button>
            ))}
          </div>

          {/* ------------------------------------------------------- Links */}
          {aba === 'links' && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink-500">Links ({links.length}{perfil.plano.maxLinksPorPagina >= 0 ? ` de ${perfil.plano.maxLinksPorPagina}` : ''})</h2>
                <Btn tamanho="sm" onClick={() => abrirForm()} disabled={perfil.plano.maxLinksPorPagina >= 0 && links.length >= perfil.plano.maxLinksPorPagina}
                  title={perfil.plano.maxLinksPorPagina >= 0 && links.length >= perfil.plano.maxLinksPorPagina ? 'Seu plano permite até 5 links por página. Fale com o administrador.' : undefined}>
                  <Plus size={15} aria-hidden /> Adicionar link
                </Btn>
              </div>

              <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoArrastar}>
                <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                  <ul className="flex flex-col gap-2">
                    {links.map((link) => (
                      <ItemLink key={link.id} link={link}
                        aoEditar={() => abrirForm(link)}
                        aoExcluir={() => setExcluindo(link)}
                        aoAlternarAtivo={() => void alternarAtivo(link.id)} />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>

              {links.length === 0 && (
                <p className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-sm text-ink-500">
                  Você ainda não tem links. Clique em “Adicionar link” para começar.
                </p>
              )}
            </section>
          )}

          {/* ---------------------------------------------------- Aparência */}
          {aba === 'aparencia' && (
            <section className="flex flex-col gap-6">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-ink-500">Tema</h2>
                <div className="grid grid-cols-3 gap-2">
                  {temas.map((t) => (
                    <button key={t.slug} onClick={() => void patchPagina({ tema: t.slug, sobrescritas: {} })}
                      className={`rounded-xl border-2 p-2 text-left transition-colors ${pagina.tema === t.slug ? 'border-brand-500' : 'border-ink-900/10'}`}
                      style={{ background: t.tokens.backgroundGradient ? t.tokens.background : t.tokens.background }}>
                      <span className="rounded-md px-2 py-1 text-xs font-bold"
                        style={{ background: t.tokens.accent, color: t.tokens.accentText }}>
                        {t.nome}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-ink-500">Layout</h2>
                <div className="grid grid-cols-3 gap-2">
                  {([['lista', 'Lista'], ['grade', 'Grade'], ['cards', 'Cards']] as [Layout, string][]).map(([valor, rotulo]) => (
                    <button key={valor} onClick={() => void patchPagina({ layout: valor })}
                      className={`rounded-xl border-2 p-3 text-sm font-semibold ${pagina.layout === valor ? 'border-brand-500 text-brand-700' : 'border-ink-900/10'}`}>
                      {rotulo}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-ink-500">Estilo dos botões</h2>
                <div className="grid grid-cols-3 gap-2">
                  {([['solido', 'Sólido'], ['contorno', 'Contorno'], ['sombra', 'Sombra']] as [EstiloBotao, string][]).map(([valor, rotulo]) => (
                    <button key={valor} onClick={() => void patchPagina({ botao: valor })}
                      className={`rounded-xl border-2 p-3 text-sm font-semibold ${pagina.botao === valor ? 'border-brand-500 text-brand-700' : 'border-ink-900/10'}`}>
                      {rotulo}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-ink-500">Fonte</h2>
                <select value={pagina.fonte} onChange={(e) => void patchPagina({ fonte: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border border-[#E4E4EC] bg-white px-3 text-[16px]">
                  <option value="inter">Inter</option>
                  <option value="sora">Sora</option>
                  <option value="jakarta">Plus Jakarta Sans</option>
                  <option value="nunito">Nunito</option>
                </select>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-ink-500">Cores personalizadas</h2>
                  <button onClick={() => void patchPagina({ sobrescritas: {} })} className="text-xs font-semibold text-brand-600">
                    Restaurar cores do tema
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <CorCampo rotulo="Destaque" valor={tokens.accent ?? '#F97316'}
                    aoMudar={(v) => void patchPagina({ sobrescritas: { ...pagina.sobrescritas, accent: v } })} />
                  <CorCampo rotulo="Texto do destaque" valor={tokens.accentText ?? '#FFFFFF'}
                    aoMudar={(v) => void patchPagina({ sobrescritas: { ...pagina.sobrescritas, accentText: v } })} />
                  <CorCampo rotulo="Texto" valor={tokens.text ?? '#0B0B0F'}
                    aoMudar={(v) => void patchPagina({ sobrescritas: { ...pagina.sobrescritas, text: v } })} />
                  <CorCampo rotulo="Superfície" valor={tokens.surface ?? '#FFF7ED'}
                    aoMudar={(v) => void patchPagina({ sobrescritas: { ...pagina.sobrescritas, surface: v } })} />
                </div>
              </div>
            </section>
          )}

          {/* ------------------------------------------------------ Página */}
          {aba === 'pagina' && (
            <section className="flex flex-col gap-5">
              <Campo label="Título da página" value={pagina.titulo} maxLength={60}
                onChange={(e) => void patchPagina({ titulo: e.target.value })} />
              <Campo label="Endereço" value={pagina.slug ?? ''}
                onChange={(e) => void patchPagina({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') || null })}
                dica={pagina.slug ? `${siteUrl}/${perfil.handle}/${pagina.slug}` : `${siteUrl}/${perfil.handle} (página principal)`} />
              <div className="flex items-center justify-between rounded-xl bg-canvas p-4">
                <div>
                  <p className="text-sm font-semibold">{pagina.publicada ? 'Sua página está no ar 🎉' : 'Sua página é um rascunho'}</p>
                  <p className="text-xs text-ink-500">{pagina.publicada ? urlPublica : 'Ninguém além de você consegue ver.'}</p>
                </div>
                <Trocar ligado={pagina.publicada} rotulo="Publicar página"
                  aoAlternar={(v) => void publicar(v).then(() => avisar(v ? 'Página no ar!' : 'Página despublicada.')).catch((e) => avisar(traduzirErro(e), 'erro'))} />
              </div>
              {pagina.publicada && (
                <a href={urlPublica} target="_blank" rel="noreferrer"
                  className="tap flex items-center justify-center gap-2 rounded-xl border border-ink-900/15 font-semibold hover:bg-ink-900/5">
                  <ExternalLink size={16} aria-hidden /> Abrir página pública
                </a>
              )}
            </section>
          )}
        </div>

        {/* pré-visualização ao vivo (mesmo PageRenderer da pública) */}
        <aside className="order-1 lg:order-2">
          <div className="sticky top-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Pré-visualização</p>
            <div className="overflow-hidden rounded-2xl border-4 border-ink-900 shadow-pop">
              <PageRenderer
                tokens={tokens}
                layout={pagina.layout}
                botao={pagina.botao}
                fonte={pagina.fonte}
                nome={perfil.nome}
                bio={perfil.bio}
                avatarUrl={perfil.avatarUrl}
                links={links.filter((l) => l.ativo).map((l) => ({
                  id: l.id, titulo: l.titulo || 'Sem título', url: l.url, icone: l.icone, destaque: l.destaque,
                }))}
                rodape={<span>Feito com Mylink</span>}
              />
            </div>
          </div>
        </aside>
      </div>

      {/* modal de link */}
      <Modal aberto={formAberto} aoFechar={() => setFormAberto(false)} titulo={editandoId ? 'Editar link' : 'Novo link'}>
        <form onSubmit={salvarLink} className="flex flex-col gap-4">
          <Campo label="Título" required maxLength={80} value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
          <Campo label="URL" required value={form.url} erro={erroForm}
            placeholder="https://instagram.com/seuperfil"
            onChange={(e) => {
              const url = e.target.value;
              setForm((f) => ({ ...f, url, icone: f.icone === 'link' || f.icone === iconeSugerido(normalizarUrl(url) ?? '') ? iconeSugerido(normalizarUrl(url) ?? 'link') : f.icone }));
              setErroForm(undefined);
            }} />
          <div>
            <p className="mb-2 text-sm font-medium text-ink-900">Ícone</p>
            <div className="grid max-h-40 grid-cols-6 gap-1.5 overflow-y-auto">
              {LISTA_ICONES.map(({ slug, rotulo }) => {
                const Icone = iconeDe(slug);
                return (
                  <button key={slug} type="button" title={rotulo} aria-label={rotulo}
                    onClick={() => setForm((f) => ({ ...f, icone: slug }))}
                    className={`tap grid place-items-center rounded-lg border-2 ${form.icone === slug ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-transparent bg-canvas'}`}>
                    <Icone size={18} aria-hidden />
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            <Star size={16} className={form.destaque ? 'text-brand-500' : 'text-ink-300'} aria-hidden />
            Destacar este link
            <span className="ml-auto">
              <Trocar ligado={form.destaque} rotulo="Destacar" aoAlternar={(v) => setForm((f) => ({ ...f, destaque: v }))} />
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <Btn variante="secundario" type="button" onClick={() => setFormAberto(false)}>Cancelar</Btn>
            <Btn type="submit">{editandoId ? 'Salvar link' : 'Adicionar link'}</Btn>
          </div>
        </form>
      </Modal>

      <Confirmar aberto={Boolean(excluindo)} titulo="Excluir link" perigo confirmar="Excluir"
        texto={`Tem certeza que deseja excluir "${excluindo?.titulo}"?`}
        aoCancelar={() => setExcluindo(null)}
        aoConfirmar={() => { if (excluindo) void removerLink(excluindo.id); setExcluindo(null); }} />
    </div>
  );
}

/* --------------------------------------------------------- item ordenável */

function ItemLink({ link, aoEditar, aoExcluir, aoAlternarAtivo }: {
  link: RascunhoLink; aoEditar: () => void; aoExcluir: () => void; aoAlternarAtivo: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });
  const Icone = iconeDe(link.icone);
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl border bg-white p-2.5 ${isDragging ? 'z-10 border-brand-500 shadow-pop' : 'border-ink-900/10'}`}>
      <button {...attributes} {...listeners} aria-label={`Reordenar ${link.titulo}`}
        className="tap cursor-grab touch-none grid place-items-center rounded-lg text-ink-300 hover:text-ink-700">
        <GripVertical size={18} aria-hidden />
      </button>
      <Icone size={20} className="shrink-0 text-ink-700" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${link.ativo ? '' : 'text-ink-300 line-through'}`}>{link.titulo || 'Sem título'}</p>
        <p className="truncate text-xs text-ink-500">{link.url}</p>
      </div>
      {link.destaque && <Star size={15} className="text-brand-500" aria-hidden aria-label="Destaque" />}
      <button onClick={aoAlternarAtivo} className="tap grid place-items-center rounded-lg p-2 text-ink-500 hover:bg-ink-900/5"
        aria-label={link.ativo ? `Ocultar ${link.titulo}` : `Mostrar ${link.titulo}`}>
        {link.ativo ? <Eye size={17} aria-hidden /> : <EyeOff size={17} aria-hidden />}
      </button>
      <button onClick={aoEditar} className="tap grid place-items-center rounded-lg p-2 text-ink-500 hover:bg-ink-900/5"
        aria-label={`Editar ${link.titulo}`}>
        <Pencil size={17} aria-hidden />
      </button>
      <button onClick={aoExcluir} className="tap grid place-items-center rounded-lg p-2 text-danger-500 hover:bg-danger-500/10"
        aria-label={`Excluir ${link.titulo}`}>
        <Trash2 size={17} aria-hidden />
      </button>
    </li>
  );
}

function CorCampo({ rotulo, valor, aoMudar }: { rotulo: string; valor: string; aoMudar: (v: string) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-ink-900/10 p-3 text-sm font-medium">
      <input type="color" value={valor} onChange={(e) => aoMudar(e.target.value)} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={rotulo} />
      <span className="min-w-0 truncate">{rotulo}</span>
      <Etiqueta tom="neutro">{valor}</Etiqueta>
    </label>
  );
}
