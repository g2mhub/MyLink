import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import * as auth from '@/services/auth';
import { atualizarPerfil } from '@/services/profiles';
import { traduzirErro } from '@/services/erros';
import { handleValido } from '@/lib/urls';
import { Btn, Campo, useToast } from '@/components/ui';

/* -------------------------------------------------- layout compartilhado */

function AuthLayout({ titulo, subtitulo, children, rodape }: {
  titulo: string; subtitulo?: string; children: React.ReactNode; rodape?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-900 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-pop">
        <img src="/logo.svg" alt="Mylink" className="mb-6 h-9" />
        {/* logo claro no cartão branco; fundo escuro usa logo-dark.svg no cabeçalho */}
        <h1 className="text-2xl font-bold">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-ink-500">{subtitulo}</p>}
        <div className="mt-6">{children}</div>
        {rodape && <div className="mt-6 text-sm text-ink-500">{rodape}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Login */

export function Login() {
  const navegar = useNavigate();
  const avisar = useToast();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ocultar, setOcultar] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const destino = params.get('de') || '/painel';

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      await auth.entrar(email, senha);
      navegar(destino, { replace: true });
    } catch (erro) {
      avisar(traduzirErro(erro), 'erro');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthLayout
      titulo="Entrar"
      rodape={
        <p>
          Não tem conta?{' '}
          <Link to="/cadastro" className="font-semibold text-brand-600">Criar minha página</Link>
        </p>
      }
    >
      <form onSubmit={aoEnviar} className="flex flex-col gap-4">
        <Campo label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <Campo
            label="Senha" type={ocultar ? 'password' : 'text'} autoComplete="current-password" required
            value={senha} onChange={(e) => setSenha(e.target.value)}
            dica={
              <button type="button" onClick={() => setOcultar((v) => !v)} className="font-medium text-brand-600">
                {ocultar ? 'Mostrar senha' : 'Ocultar senha'}
              </button>
            }
          />
          <div className="mt-1 text-right">
            <Link to="/recuperar-senha" className="text-xs font-medium text-brand-600">Esqueci minha senha</Link>
          </div>
        </div>
        <Btn type="submit" carregando={carregando}>Entrar</Btn>
      </form>
      <div className="my-4 flex items-center gap-3 text-xs text-ink-500"><span className="h-px flex-1 bg-ink-900/10" />ou<span className="h-px flex-1 bg-ink-900/10" /></div>
      <Btn
        variante="secundario" className="w-full"
        onClick={() => { if (supabaseConfigurado) void auth.entrarComGoogle().catch((e) => avisar(traduzirErro(e), 'erro')); }}
      >
        Entrar com Google
      </Btn>
    </AuthLayout>
  );
}

/* ------------------------------------------------------------- Cadastro */

export function Cadastro() {
  const navegar = useNavigate();
  const avisar = useToast();
  const [form, setForm] = useState({ nome: '', handle: '', email: '', senha: '' });
  const [statusHandle, setStatusHandle] = useState<'ocioso' | 'verificando' | 'ok' | 'ocupado' | 'invalido'>('ocioso');
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const handle = form.handle.trim().toLowerCase();
    if (!handle) { setStatusHandle('ocioso'); return; }
    if (!handleValido(handle)) { setStatusHandle('invalido'); return; }
    setStatusHandle('verificando');
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.rpc('is_handle_available', { h: handle });
        setStatusHandle(data ? 'ok' : 'ocupado');
      } catch {
        setStatusHandle('ocioso');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.handle]);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (statusHandle !== 'ok') { avisar('Escolha um nome de usuário disponível.', 'erro'); return; }
    setCarregando(true);
    try {
      await auth.cadastrar({ ...form, handle: form.handle.trim().toLowerCase() });
      setEnviado(true);
    } catch (erro) {
      avisar(traduzirErro(erro), 'erro');
    } finally {
      setCarregando(false);
    }
  }

  if (enviado) {
    return (
      <AuthLayout titulo="Confira seu e-mail">
        <p className="text-sm text-ink-700">
          Enviamos um link de confirmação para <strong>{form.email}</strong>. Ao confirmar, você entra direto no painel.
        </p>
        <p className="mt-3 text-xs text-ink-500">Não recebeu? Verifique a caixa de spam ou refaça o cadastro em alguns minutos.</p>
        <Btn className="mt-6 w-full" onClick={() => navegar('/entrar')}>Ir para o login</Btn>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      titulo="Crie sua página de links"
      subtitulo="mylink.com.br/seuusuario — pronto em 2 minutos."
      rodape={<p>Já tem conta? <Link to="/entrar" className="font-semibold text-brand-600">Entrar</Link></p>}
    >
      <form onSubmit={aoEnviar} className="flex flex-col gap-4">
        <Campo
          label="Nome de usuário" required value={form.handle}
          onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value.toLowerCase() }))}
          dica={
            statusHandle === 'ok' ? <span className="font-medium text-emerald-600">✓ Disponível</span>
            : statusHandle === 'ocupado' ? <span className="font-medium text-danger-500">Este nome de usuário já está em uso.</span>
            : statusHandle === 'invalido' ? <span className="font-medium text-danger-500">Use letras minúsculas, números e hífen (3–30 caracteres).</span>
            : 'mylink.com.br/' + (form.handle || 'seuusuario')
          }
        />
        <Campo label="Nome de exibição" required value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
        <Campo label="E-mail" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        <Campo
          label="Senha" type="password" autoComplete="new-password" minLength={8} required
          value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
          dica="Mínimo de 8 caracteres."
        />
        <Btn type="submit" carregando={carregando}>Criar minha página</Btn>
        <p className="text-xs text-ink-500">
          Ao continuar você aceita os <Link to="/termos" className="underline">Termos</Link> e a{' '}
          <Link to="/privacidade" className="underline">Política de Privacidade</Link>.
        </p>
      </form>
    </AuthLayout>
  );
}

/* -------------------------------------------------------- Recuperação */

export function RecuperarSenha() {
  const avisar = useToast();
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      await auth.enviarRecuperacao(email);
      setEnviado(true);
    } catch (erro) {
      avisar(traduzirErro(erro), 'erro');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthLayout titulo="Esqueci minha senha" rodape={<Link to="/entrar" className="inline-flex items-center gap-1 font-semibold text-brand-600"><ArrowLeft size={14} />Voltar</Link>}>
      {enviado ? (
        <>
          <p className="text-sm text-ink-700">Link enviado! Se o e-mail existir, você receberá um link válido por 1 hora.</p>
          <p className="mt-2 text-xs text-ink-500">A mensagem pode demorar alguns minutos ou ir para o spam.</p>
        </>
      ) : (
        <form onSubmit={aoEnviar} className="flex flex-col gap-4">
          <p className="text-sm text-ink-700">Informe seu e-mail para receber o link de troca de senha.</p>
          <Campo label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Btn type="submit" carregando={carregando}>Enviar link</Btn>
        </form>
      )}
    </AuthLayout>
  );
}

export function RedefinirSenha() {
  const navegar = useNavigate();
  const avisar = useToast();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (senha !== confirmar) { avisar('As senhas não coincidem.', 'erro'); return; }
    setCarregando(true);
    try {
      await auth.definirSenha(senha);
      avisar('Senha alterada com sucesso!');
      navegar('/painel', { replace: true });
    } catch (erro) {
      avisar(traduzirErro(erro), 'erro');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthLayout titulo="Defina sua nova senha">
      <form onSubmit={aoEnviar} className="flex flex-col gap-4">
        <Campo label="Nova senha" type="password" autoComplete="new-password" minLength={8} required value={senha} onChange={(e) => setSenha(e.target.value)} />
        <Campo label="Confirmar senha" type="password" autoComplete="new-password" minLength={8} required value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
        <Btn type="submit" carregando={carregando}>Salvar nova senha</Btn>
      </form>
    </AuthLayout>
  );
}

/* ------------------------------------------------------------- Callback */

export function Callback() {
  const navegar = useNavigate();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const codigo = url.searchParams.get('code');
    (async () => {
      try {
        if (codigo) await auth.trocarCodigoPorSessao(codigo);
        // detectSessionInUrl já troca hash tokens; garante sessão antes de seguir
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error('Não foi possível concluir a autenticação.');
        navegar('/painel', { replace: true });
      } catch (e) {
        setErro(traduzirErro(e));
      }
    })();
  }, [navegar]);

  if (erro) {
    return (
      <AuthLayout titulo="Não foi possível entrar">
        <p className="text-sm text-ink-700">{erro}</p>
        <Btn className="mt-5 w-full" onClick={() => navegar('/entrar')}>Voltar para o login</Btn>
      </AuthLayout>
    );
  }
  return (
    <div className="grid min-h-screen place-items-center bg-ink-900">
      <img src="/logo-dark.svg" alt="Mylink" className="h-10 animate-pulse" />
      <p className="mt-4 text-sm text-white/70" aria-live="polite">Concluindo login…</p>
    </div>
  );
}

/* ------------------------------------------------------------ Onboarding */

export function Onboarding() {
  const navegar = useNavigate();
  const avisar = useToast();
  const [handle, setHandle] = useState('');
  const [status, setStatus] = useState<'ocioso' | 'verificando' | 'ok' | 'ocupado' | 'invalido'>('ocioso');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const h = handle.trim().toLowerCase();
    if (!h) { setStatus('ocioso'); return; }
    if (!handleValido(h)) { setStatus('invalido'); return; }
    setStatus('verificando');
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.rpc('is_handle_available', { h });
        setStatus(data ? 'ok' : 'ocupado');
      } catch { setStatus('ocioso'); }
    }, 400);
    return () => clearTimeout(t);
  }, [handle]);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (status !== 'ok') { avisar('Escolha um nome de usuário disponível.', 'erro'); return; }
    setCarregando(true);
    try {
      await atualizarPerfil({ handle: handle.trim().toLowerCase() });
      avisar('Endereço escolhido!');
      navegar('/painel', { replace: true });
    } catch (erro) {
      avisar(traduzirErro(erro), 'erro');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Escolha seu endereço</h1>
      <p className="mt-1 text-sm text-ink-500">É este o endereço que você vai compartilhar.</p>
      <form onSubmit={aoEnviar} className="mt-6 flex flex-col gap-4">
        <Campo
          label="Nome de usuário" required value={handle}
          onChange={(e) => setHandle(e.target.value.toLowerCase())}
          dica={
            status === 'ok' ? <span className="font-medium text-emerald-600">✓ Disponível</span>
            : status === 'ocupado' ? <span className="font-medium text-danger-500">Este nome de usuário já está em uso.</span>
            : status === 'invalido' ? <span className="font-medium text-danger-500">Use letras minúsculas, números e hífen (3–30 caracteres).</span>
            : 'mylink.com.br/' + (handle || 'seuusuario')
          }
        />
        <Btn type="submit" carregando={carregando}>Salvar e ir para o painel</Btn>
      </form>
    </div>
  );
}
