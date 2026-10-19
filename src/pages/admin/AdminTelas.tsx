import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Search, ShieldCheck, Ban, CheckCircle2, Crown } from 'lucide-react';
import type { Plano, UsuarioAdmin } from '@/types/domain';
import {
  atribuirPlano, atualizarPlano, criarPlano, definirStatus, listarPlanos, listarUsuarios, removerPlano,
  type PlanoDados,
} from '@/services/admin';
import { formatarData, formatarNumero, formatarPreco } from '@/lib/format';
import { traduzirErro } from '@/services/erros';
import { Avatar, Btn, Campo, Confirmar, Etiqueta, Modal, Osso, useToast } from '@/components/ui';

/* ----------------------------------------------------------- Usuários */

export function AdminUsuarios() {
  const avisar = useToast();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null>(null);
  const [busca, setBusca] = useState('');
  const [planoParaAtribuir, setPlanoParaAtribuir] = useState<{ usuario: UsuarioAdmin; planos: Plano[]; escolhido: number } | null>(null);
  const [bloqueando, setBloqueando] = useState<UsuarioAdmin | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try { setUsuarios(await listarUsuarios()); } catch (e) { avisar(traduzirErro(e), 'erro'); }
  }, [avisar]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function confirmarPlano() {
    if (!planoParaAtribuir) return;
    try {
      await atribuirPlano(planoParaAtribuir.usuario.id, planoParaAtribuir.escolhido);
      avisar(`Plano atribuído a ${planoParaAtribuir.usuario.displayName}.`);
      setPlanoParaAtribuir(null);
      await carregar();
    } catch (e) { avisar(traduzirErro(e), 'erro'); }
  }

  async function alternarBloqueio() {
    if (!bloqueando) return;
    const novo = bloqueando.status === 'ativo' ? 'bloqueado' : 'ativo';
    try {
      await definirStatus(bloqueando.id, novo);
      avisar(novo === 'bloqueado' ? 'Usuário bloqueado.' : 'Usuário reativado.');
      setBloqueando(null);
      await carregar();
    } catch (e) { avisar(traduzirErro(e), 'erro'); }
  }

  async function abrirAtribuicao(u: UsuarioAdmin) {
    try {
      const planos = await listarPlanos();
      setPlanoParaAtribuir({ usuario: u, planos, escolhido: planos.find((p) => p.codigo === u.plano)?.id ?? planos[0].id });
    } catch (e) { avisar(traduzirErro(e), 'erro'); }
  }

  const filtrados = (usuarios ?? []).filter((u) => {
    const t = busca.trim().toLowerCase();
    if (!t) return true;
    return u.displayName.toLowerCase().includes(t) || u.handle.includes(t) || u.email.toLowerCase().includes(t);
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><ShieldCheck size={24} className="text-brand-500" aria-hidden /> Usuários</h1>
        <p className="text-sm text-ink-500">{usuarios ? `${usuarios.length} conta(s)` : '…'}</p>
      </div>

      <label className="relative block">
        <span className="sr-only">Buscar usuário</span>
        <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" aria-hidden />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, handle ou e-mail"
          className="min-h-[44px] w-full rounded-xl border border-[#E4E4EC] bg-white pl-10 pr-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </label>

      {!usuarios && <Osso className="h-64" />}

      {usuarios && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-card">
          <ul className="divide-y divide-ink-900/5">
            {filtrados.map((u) => (
              <li key={u.id}>
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <Avatar url={u.avatarUrl} nome={u.displayName} tamanho={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{u.displayName} <span className="font-normal text-ink-500">(@{u.handle})</span></p>
                    <p className="truncate text-xs text-ink-500">{u.email}</p>
                  </div>
                  <Etiqueta tom={u.plano === 'pro' ? 'marca' : 'neutro'}>{u.plano === 'pro' ? 'Pro' : 'Gratuito'}</Etiqueta>
                  {u.status === 'bloqueado'
                    ? <Etiqueta tom="alerta">⛔ bloqueado</Etiqueta>
                    : <Etiqueta tom="ok">● ativo</Etiqueta>}
                  <button onClick={() => setExpandido(expandido === u.id ? null : u.id)}
                    className="tap rounded-lg px-2 text-xs font-semibold text-brand-600" aria-expanded={expandido === u.id}>
                    {expandido === u.id ? 'Ocultar' : 'Detalhes'}
                  </button>
                  <button onClick={() => void abrirAtribuicao(u)}
                    className="tap flex items-center gap-1 rounded-lg border border-ink-900/15 px-2.5 text-xs font-semibold hover:bg-ink-900/5">
                    <Crown size={14} aria-hidden /> Plano
                  </button>
                  <button onClick={() => setBloqueando(u)}
                    className={`tap flex items-center gap-1 rounded-lg px-2.5 text-xs font-semibold ${
                      u.status === 'ativo' ? 'text-danger-500 hover:bg-danger-500/10' : 'text-emerald-600 hover:bg-emerald-500/10'
                    }`}>
                    {u.status === 'ativo' ? <><Ban size={14} aria-hidden /> Bloquear</> : <><CheckCircle2 size={14} aria-hidden /> Reativar</>}
                  </button>
                </div>
                {expandido === u.id && (
                  <dl className="grid gap-3 border-t border-ink-900/5 bg-canvas p-4 text-sm sm:grid-cols-4">
                    <div><dt className="text-xs text-ink-500">Cadastrado em</dt><dd className="font-semibold">{formatarData(u.criadoEm)}</dd></div>
                    <div><dt className="text-xs text-ink-500">Páginas</dt><dd className="font-semibold">{formatarNumero(u.paginas)}</dd></div>
                    <div><dt className="text-xs text-ink-500">Cliques totais</dt><dd className="font-semibold">{formatarNumero(u.cliques)}</dd></div>
                    <div><dt className="text-xs text-ink-500">Página pública</dt>
                      <dd><a className="font-semibold text-brand-600" href={`/perfil`} onClick={(e) => { e.preventDefault(); window.open(`/${u.handle}`, '_blank'); }}>/@{u.handle}</a></dd></div>
                  </dl>
                )}
              </li>
            ))}
            {filtrados.length === 0 && <li className="p-8 text-center text-sm text-ink-500">Nenhum usuário encontrado.</li>}
          </ul>
        </div>
      )}

      <Modal aberto={Boolean(planoParaAtribuir)} aoFechar={() => setPlanoParaAtribuir(null)} titulo="Atribuir plano">
        <p className="text-sm text-ink-700">
          Escolha o plano de <strong>{planoParaAtribuir?.usuario.displayName}</strong>. A alteração é imediata.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {planoParaAtribuir?.planos.map((p) => (
            <label key={p.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 ${planoParaAtribuir.escolhido === p.id ? 'border-brand-500 bg-brand-50' : 'border-ink-900/10'}`}>
              <input type="radio" name="plano" className="accent-orange-600" checked={planoParaAtribuir.escolhido === p.id}
                onChange={() => setPlanoParaAtribuir((a) => (a ? { ...a, escolhido: p.id } : a))} />
              <span className="flex-1">
                <span className="block font-bold">{p.nome}</span>
                <span className="block text-xs text-ink-500">
                  {formatarPreco(p.precoMensalCentavos)}/mês · {p.maxPaginas < 0 ? 'páginas ilimitadas' : `${p.maxPaginas} página(s)`} · {p.maxLinksPorPagina < 0 ? 'links ilimitados' : `${p.maxLinksPorPagina} link(s)`}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variante="secundario" onClick={() => setPlanoParaAtribuir(null)}>Cancelar</Btn>
          <Btn onClick={() => void confirmarPlano()}>Atribuir plano</Btn>
        </div>
      </Modal>

      <Confirmar
        aberto={Boolean(bloqueando)}
        titulo={bloqueando?.status === 'ativo' ? 'Bloquear usuário' : 'Reativar usuário'}
        texto={bloqueando?.status === 'ativo'
          ? `${bloqueando?.displayName} não podrá mais entrar na conta nem editar. A página pública continua no ar até ser despublicada.`
          : `${bloqueando?.displayName} voltará a ter acesso à conta.`}
        confirmar={bloqueando?.status === 'ativo' ? 'Bloquear' : 'Reativar'}
        perigo={bloqueando?.status === 'ativo'}
        aoCancelar={() => setBloqueando(null)}
        aoConfirmar={() => void alternarBloqueio()}
      />
    </div>
  );
}

/* -------------------------------------------------------------- Planos */

const planoVazio: PlanoDados = {
  code: 'novo', name: '', max_pages: 1, max_links_per_page: 5,
  metrics_days: 30, custom_domain: false, price_monthly_cents: 0,
};

export function AdminPlanos() {
  const avisar = useToast();
  const [planos, setPlanos] = useState<Plano[] | null>(null);
  const [editando, setEditando] = useState<(PlanoDados & { id?: number }) | null>(null);
  const [excluindo, setExcluindo] = useState<Plano | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try { setPlanos(await listarPlanos()); } catch (e) { avisar(traduzirErro(e), 'erro'); }
  }, [avisar]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setSalvando(true);
    try {
      const { id, ...dados } = editando;
      if (id) { await atualizarPlano(id, dados); avisar('Plano atualizado.'); }
      else { await criarPlano(dados); avisar('Plano criado.'); }
      setEditando(null);
      await carregar();
    } catch (err) {
      avisar(traduzirErro(err), 'erro');
    } finally { setSalvando(false); }
  }

  async function excluir() {
    if (!excluindo) return;
    try {
      await removerPlano(excluindo.id);
      avisar('Plano excluído.');
      setExcluindo(null);
      await carregar();
    } catch (e) { avisar(traduzirErro(e), 'erro'); }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Crown size={24} className="text-brand-500" aria-hidden /> Planos</h1>
          <p className="text-sm text-ink-500">Edite limites e preços. A atribuição a usuários é feita na aba Usuários.</p>
        </div>
        <Btn onClick={() => setEditando({ ...planoVazio })}>+ Novo plano</Btn>
      </div>

      {!planos && <Osso className="h-40" />}

      <div className="grid gap-4 md:grid-cols-2">
        {planos?.map((p) => (
          <article key={p.id} className="rounded-2xl bg-white p-6 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{p.nome} <span className="text-xs font-normal text-ink-500">({p.codigo})</span></h2>
              {p.codigo === 'pro' && <Etiqueta tom="marca">R$ 15,00/mês</Etiqueta>}
            </div>
            <p className="mt-1 text-2xl font-bold">{formatarPreco(p.precoMensalCentavos)}<span className="text-sm font-medium text-ink-500">/mês</span></p>
            <ul className="mt-4 space-y-1 text-sm text-ink-700">
              <li>Páginas: {p.maxPaginas < 0 ? 'ilimitadas' : p.maxPaginas}</li>
              <li>Links por página: {p.maxLinksPorPagina < 0 ? 'ilimitados' : p.maxLinksPorPagina}</li>
              <li>Métricas: {p.janelaMetricasDias < 0 ? 'histórico completo' : `últimos ${p.janelaMetricasDias} dias`}</li>
              <li>Domínio próprio: {p.dominioProprio ? 'sim' : 'não'}</li>
            </ul>
            <div className="mt-5 flex gap-2">
              <Btn variante="secundario" tamanho="sm"
                onClick={() => setEditando({
                  id: p.id, code: p.codigo, name: p.nome, max_pages: p.maxPaginas,
                  max_links_per_page: p.maxLinksPorPagina, metrics_days: p.janelaMetricasDias,
                  custom_domain: p.dominioProprio, price_monthly_cents: p.precoMensalCentavos,
                })}>
                Editar
              </Btn>
              {p.codigo !== 'free' && p.codigo !== 'pro' && (
                <Btn variante="fantasma" tamanho="sm" onClick={() => setExcluindo(p)}>Excluir</Btn>
              )}
            </div>
          </article>
        ))}
      </div>

      <Modal aberto={Boolean(editando)} aoFechar={() => setEditando(null)} titulo={editando?.id ? 'Editar plano' : 'Novo plano'}>
        {editando && (
          <form onSubmit={(e) => void salvar(e)} className="flex flex-col gap-4">
            {!editando.id && (
              <Campo label="Código (único)" required value={editando.code}
                onChange={(e) => setEditando((x) => (x ? { ...x, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') } : x))}
                dica="Identificador interno, ex.: pro-anual" />
            )}
            <Campo label="Nome" required value={editando.name}
              onChange={(e) => setEditando((x) => (x ? { ...x, name: e.target.value } : x))} />
            <Campo label="Preço mensal (R$)" type="number" step="0.01" min="0" value={editando.price_monthly_cents / 100}
              onChange={(e) => setEditando((x) => (x ? { ...x, price_monthly_cents: Math.round(Number(e.target.value) * 100) } : x))} />
            <Campo label="Máximo de páginas (-1 = ilimitado)" type="number" value={editando.max_pages}
              onChange={(e) => setEditando((x) => (x ? { ...x, max_pages: Number(e.target.value) } : x))} />
            <Campo label="Máximo de links por página (-1 = ilimitado)" type="number" value={editando.max_links_per_page}
              onChange={(e) => setEditando((x) => (x ? { ...x, max_links_per_page: Number(e.target.value) } : x))} />
            <Campo label="Janela de métricas em dias (-1 = tudo)" type="number" value={editando.metrics_days}
              onChange={(e) => setEditando((x) => (x ? { ...x, metrics_days: Number(e.target.value) } : x))} />
            <label className="flex items-center gap-3 text-sm font-medium">
              Domínio próprio
              <input type="checkbox" checked={editando.custom_domain} className="h-5 w-5 accent-orange-600"
                onChange={(e) => setEditando((x) => (x ? { ...x, custom_domain: e.target.checked } : x))} />
            </label>
            <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-800">
              Usuários existentes continuam com o que já criaram — limites novos valem para criações futuras.
            </p>
            <div className="flex justify-end gap-2">
              <Btn variante="secundario" type="button" onClick={() => setEditando(null)}>Cancelar</Btn>
              <Btn type="submit" carregando={salvando}>Salvar plano</Btn>
            </div>
          </form>
        )}
      </Modal>

      <Confirmar aberto={Boolean(excluindo)} titulo="Excluir plano" perigo confirmar="Excluir"
        texto={`Excluir o plano "${excluindo?.nome}"? Usuários vinculados não poderão ser resolvidos — atribua outro plano antes.`}
        aoCancelar={() => setExcluindo(null)}
        aoConfirmar={() => void excluir()} />
    </div>
  );
}
