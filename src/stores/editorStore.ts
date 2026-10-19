import { create } from 'zustand';
import type { EstiloBotao, Layout, Link, Pagina, TemasTokens } from '@/types/domain';
import { atualizarPagina } from '@/services/pages';
import { atualizarLink, criarLink, reordenarLinks, removerLink } from '@/services/links';
import { traduzirErro } from '@/services/erros';

export type RascunhoLink = {
  id: string;
  titulo: string;
  url: string;
  icone: string;
  destaque: boolean;
  ativo: boolean;
};

export type RascunhoPagina = {
  titulo: string;
  slug: string | null;
  tema: string;
  layout: Layout;
  botao: EstiloBotao;
  fonte: string;
  sobrescritas: TemasTokens;
  publicada: boolean;
};

type Estado = {
  pageId: string | null;
  pagina: RascunhoPagina;
  links: RascunhoLink[];
  status: 'pronto' | 'sujo' | 'salvando' | 'erro';
  erro: string | null;
  carregar: (p: Pagina, links: Link[]) => void;
  limpar: () => void;
  patchPagina: (patch: Partial<RascunhoPagina>) => Promise<void>;
  addLink: (dados: { titulo: string; url: string; icone: string; destaque: boolean }) => Promise<void>;
  patchLink: (id: string, patch: Partial<RascunhoLink>) => Promise<void>;
  removerLink: (id: string) => Promise<void>;
  moverLink: (de: number, para: number) => Promise<void>;
  alternarAtivo: (id: string) => Promise<void>;
  publicar: (flag: boolean) => Promise<void>;
  sincronizarOrdenacao: () => Promise<void>;
};

const vazio: RascunhoPagina = {
  titulo: '', slug: null, tema: 'classico', layout: 'lista', botao: 'solido',
  fonte: 'inter', sobrescritas: {}, publicada: false,
};

// debounce de persistência (700 ms — doc 07 §3)
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const agendar = (chave: string, fn: () => void) => {
  const t = timers.get(chave);
  if (t) clearTimeout(t);
  timers.set(chave, setTimeout(() => { timers.delete(chave); fn(); }, 700));
};

export const useEditor = create<Estado>((set, get) => ({
  pageId: null,
  pagina: vazio,
  links: [],
  status: 'pronto',
  erro: null,

  carregar: (p, links) => {
    timers.clear();
    set({
      pageId: p.id,
      pagina: {
        titulo: p.titulo, slug: p.slug, tema: p.tema, layout: p.layout,
        botao: p.botao, fonte: p.fonte, sobrescritas: p.sobrescritas, publicada: p.publicada,
      },
      links: links.map((l) => ({
        id: l.id, titulo: l.titulo, url: l.url, icone: l.icone, destaque: l.destaque, ativo: l.ativo,
      })),
      status: 'pronto',
      erro: null,
    });
  },

  limpar: () => {
    timers.clear();
    set({ pageId: null, pagina: vazio, links: [], status: 'pronto', erro: null });
  },

  patchPagina: async (patch) => {
    const { pageId } = get();
    if (!pageId) return;
    set((e) => ({ pagina: { ...e.pagina, ...patch }, status: 'sujo' }));
    const snapshot = { ...get().pagina };
    agendar('pagina', () => {
      void (async () => {
        set({ status: 'salvando' });
        try {
          await atualizarPagina(pageId, {
            titulo: snapshot.titulo, slug: snapshot.slug, tema: snapshot.tema,
            layout: snapshot.layout, botao: snapshot.botao, fonte: snapshot.fonte,
            sobrescritas: snapshot.sobrescritas,
          });
          set({ status: 'pronto', erro: null });
        } catch (e) {
          set({ status: 'erro', erro: traduzirErro(e) });
        }
      })();
    });
  },

  addLink: async (dados) => {
    const { pageId } = get();
    if (!pageId) return;
    const tempId = `_tmp_${crypto.randomUUID()}`;
    set((e) => ({ status: 'sujo', links: [...e.links, { id: tempId, ativo: true, ...dados }] }));
    try {
      const criado = await criarLink(pageId, dados);
      set((e) => ({
        status: 'salvando',
        links: e.links.map((l) => (l.id === tempId
          ? { id: criado.id, titulo: criado.titulo, url: criado.url, icone: criado.icone, destaque: criado.destaque, ativo: criado.ativo }
          : l)),
      }));
      await get().sincronizarOrdenacao();
      set({ status: 'pronto', erro: null });
    } catch (e) {
      set((e2) => ({ links: e2.links.filter((l) => l.id !== tempId), status: 'erro', erro: traduzirErro(e) }));
      throw e;
    }
  },

  patchLink: async (id, patch) => {
    const { pageId } = get();
    if (!pageId) return;
    set((e) => ({ status: 'sujo', links: e.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
    const snapshot = get().links.find((l) => l.id === id);
    if (!snapshot) return;
    agendar(`link:${id}`, () => {
      void (async () => {
        set({ status: 'salvando' });
        try {
          await atualizarLink(id, {
            titulo: snapshot.titulo, url: snapshot.url, icone: snapshot.icone, destaque: snapshot.destaque,
          });
          set({ status: 'pronto', erro: null });
        } catch (e) {
          set({ status: 'erro', erro: traduzirErro(e) });
        }
      })();
    });
  },

  removerLink: async (id) => {
    const { pageId } = get();
    if (!pageId) return;
    const anterior = get().links;
    set((e) => ({ links: e.links.filter((l) => l.id !== id), status: 'sujo' }));
    try {
      await removerLink(id);
      await get().sincronizarOrdenacao();
      set({ status: 'pronto' });
    } catch (e) {
      set({ links: anterior, status: 'erro', erro: traduzirErro(e) });
    }
  },

  moverLink: async (de, para) => {
    const { pageId } = get();
    if (!pageId) return;
    const anterior = get().links;
    const links = [...anterior];
    const [movido] = links.splice(de, 1);
    links.splice(para, 0, movido);
    set({ links, status: 'sujo' });
    try {
      await get().sincronizarOrdenacao();
      set({ status: 'pronto' });
    } catch (e) {
      set({ links: anterior, status: 'erro', erro: traduzirErro(e) });
    }
  },

  alternarAtivo: async (id) => {
    const atual = get().links.find((l) => l.id === id);
    if (!atual) return;
    const ativo = !atual.ativo;
    set((e) => ({ links: e.links.map((l) => (l.id === id ? { ...l, ativo } : l)) }));
    try {
      await atualizarLink(id, { ativo });
    } catch (e) {
      set((e2) => ({ links: e2.links.map((l) => (l.id === id ? { ...l, ativo: !ativo } : l)) }));
      set({ status: 'erro', erro: traduzirErro(e) });
    }
  },

  publicar: async (flag) => {
    const { pageId } = get();
    if (!pageId) return;
    set((e) => ({ pagina: { ...e.pagina, publicada: flag }, status: 'salvando' }));
    try {
      await atualizarPagina(pageId, { publicada: flag });
      set({ status: 'pronto', erro: null });
    } catch (e) {
      set((e2) => ({ pagina: { ...e2.pagina, publicada: !flag }, status: 'erro', erro: traduzirErro(e) }));
      throw e;
    }
  },

  sincronizarOrdenacao: async () => {
    const { pageId, links } = get();
    if (!pageId) return;
    await reordenarLinks(pageId, links.map((l) => l.id));
  },
}));
