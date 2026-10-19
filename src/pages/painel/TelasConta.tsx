import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { atualizarPerfil, enviarAvatar } from '@/services/profiles';
import { handleValido } from '@/lib/urls';
import { formatarPreco } from '@/lib/format';
import { traduzirErro } from '@/services/erros';
import { Avatar, Btn, Campo, Confirmar, Etiqueta, useToast } from '@/components/ui';

/* --------------------------------------------------------------- Perfil */

export function PerfilTela() {
  const { perfil, recarregarPerfil } = useSession();
  const avisar = useToast();
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ nome: '', handle: '', bio: '' });
  const [enviandoAvatar, setEnviandoAvatar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [confirmarHandle, setConfirmarHandle] = useState(false);

  useEffect(() => {
    if (perfil) setForm({ nome: perfil.nome, handle: perfil.handle, bio: perfil.bio });
  }, [perfil]);

  if (!perfil) return null;
  const handleMudou = form.handle.trim().toLowerCase() !== perfil.handle;

  async function aoEnviarAvatar(arquivo: File) {
    setEnviandoAvatar(true);
    try {
      const url = await enviarAvatar(arquivo);
      await atualizarPerfil({ avatarUrl: url });
      await recarregarPerfil();
      avisar('Foto atualizada!');
    } catch (e) {
      avisar(traduzirErro(e), 'erro');
    } finally {
      setEnviandoAvatar(false);
    }
  }

  async function salvar(handleConfirmado = false) {
    if (!handleValido(form.handle.trim().toLowerCase())) { avisar('Nome de usuário inválido.', 'erro'); return; }
    if (handleMudou && !handleConfirmado) { setConfirmarHandle(true); return; }
    setSalvando(true);
    try {
      await atualizarPerfil({ nome: form.nome, handle: form.handle.trim().toLowerCase(), bio: form.bio });
      await recarregarPerfil();
      avisar('Perfil salvo!');
    } catch (e) {
      avisar(traduzirErro(e), 'erro');
    } finally {
      setSalvando(false);
    }
  }

  function aoSalvar(e: FormEvent) { e.preventDefault(); void salvar(); }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Meu perfil</h1>
      <p className="text-sm text-ink-500">Estas informações aparecem no topo da sua página pública.</p>

      <form onSubmit={aoSalvar} className="mt-6 flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-card">
        <div className="flex items-center gap-5">
          <Avatar url={perfil.avatarUrl} nome={perfil.nome} tamanho={88} />
          <div>
            <input ref={arquivoRef} type="file" accept="image/webp,image/png,image/jpeg" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void aoEnviarAvatar(f); e.target.value = ''; }} />
            <Btn variante="secundario" carregando={enviandoAvatar} onClick={() => arquivoRef.current?.click()} type="button">
              <Camera size={16} aria-hidden /> Trocar foto
            </Btn>
            <p className="mt-1 text-xs text-ink-500">JPG, PNG ou WebP até 2 MB.</p>
          </div>
        </div>

        <Campo label="Nome de exibição" required value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
        <Campo
          label="Nome de usuário" required value={form.handle}
          onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value.toLowerCase() }))}
          dica={`mylink.com.br/${form.handle || 'seuusuario'}`}
        />
        <div>
          <label htmlFor="bio" className="text-sm font-medium text-ink-900">Biografia</label>
          <textarea id="bio" maxLength={300} value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            className="mt-1.5 min-h-[96px] w-full rounded-xl border border-[#E4E4EC] bg-white px-3 py-2 text-[16px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <p className="mt-1 text-xs text-ink-500">{form.bio.length}/300</p>
        </div>

        <div className="flex justify-end">
          <Btn type="submit" carregando={salvando}>Salvar alterações</Btn>
        </div>
      </form>

      <Confirmar
        aberto={confirmarHandle}
        titulo="Trocar nome de usuário?"
        texto={`Sua URL pública mudará de mylink.com.br/${perfil.handle} para mylink.com.br/${form.handle.trim().toLowerCase()}. Links antigos deixarão de funcionar.`}
        confirmar="Trocar mesmo assim"
        aoCancelar={() => setConfirmarHandle(false)}
        aoConfirmar={() => { setConfirmarHandle(false); void salvar(true); }}
      />
    </div>
  );
}

/* -------------------------------------------------------- Configurações */

export function ConfiguracoesTela() {
  const { perfil, sair } = useSession();
  const navegar = useNavigate();
  const [sairConfirmado, setSairConfirmado] = useState(false);

  if (!perfil) return null;
  const { plano } = perfil;
  const ilimitado = plano.maxPaginas < 0;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Plano atual</h2>
            <p className="text-sm text-ink-500">Seu plano define os limites da sua conta.</p>
          </div>
          <Etiqueta tom={perfil.plano.codigo === 'pro' ? 'marca' : 'neutro'}>{plano.nome}</Etiqueta>
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-canvas p-4">
            <dt className="text-ink-500">Mensalidade</dt>
            <dd className="text-lg font-bold">{formatarPreco(plano.precoMensalCentavos)}</dd>
          </div>
          <div className="rounded-xl bg-canvas p-4">
            <dt className="text-ink-500">Páginas</dt>
            <dd className="text-lg font-bold">{ilimitado ? 'Ilimitadas' : `Máx. ${plano.maxPaginas}`}</dd>
          </div>
          <div className="rounded-xl bg-canvas p-4">
            <dt className="text-ink-500">Links por página</dt>
            <dd className="text-lg font-bold">{plano.maxLinksPorPagina < 0 ? 'Ilimitados' : `Até ${plano.maxLinksPorPagina}`}</dd>
          </div>
          <div className="rounded-xl bg-canvas p-4">
            <dt className="text-ink-500">Métricas</dt>
            <dd className="text-lg font-bold">{plano.janelaMetricasDias < 0 ? 'Histórico completo' : `Últimos ${plano.janelaMetricasDias} dias`}</dd>
          </div>
        </dl>

        {plano.codigo !== 'pro' && (
          <p className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
            Quer páginas e links ilimitados? O plano Pro custa {formatarPreco(1500)}/mês —{' '}
            <a href="mailto:admin@mylink.com.br?subject=Quero%20o%20plano%20Pro" className="underline">fale com o administrador</a> para ativar.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-card">
        <h2 className="text-lg font-bold">Conta</h2>
        <p className="mt-1 text-sm text-ink-500">Seu endereço público: <strong>mylink.com.br/{perfil.handle}</strong></p>
        <Btn variante="secundario" className="mt-4" onClick={() => setSairConfirmado(true)}>
          <LogOut size={16} aria-hidden /> Sair da conta
        </Btn>
      </section>

      <Confirmar
        aberto={sairConfirmado}
        titulo="Sair da conta"
        texto="Você precisará entrar novamente para acessar o painel."
        confirmar="Sair"
        aoCancelar={() => setSairConfirmado(false)}
        aoConfirmar={() => { void sair().then(() => navegar('/entrar')); }}
      />
    </div>
  );
}
