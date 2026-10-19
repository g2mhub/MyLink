import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { SessionProvider, useSession } from '@/hooks/useSession';
import { ToastProvider } from '@/components/ui';
import { AppShell } from '@/components/AppShell';
import { Landing } from '@/pages/landing/Landing';
import { Privacidade, Termos } from '@/pages/Estaticas';
import { Callback, Cadastro, Login, Onboarding, RecuperarSenha, RedefinirSenha } from '@/pages/auth/AuthScreens';
import { Dashboard, MinhasPaginas } from '@/pages/painel/TelasPainel';
import { EditorTela } from '@/pages/painel/Editor';
import { MetricasTela } from '@/pages/painel/Metricas';
import { ConfiguracoesTela, PerfilTela } from '@/pages/painel/TelasConta';
import { AdminPlanos, AdminUsuarios } from '@/pages/admin/AdminTelas';
import { PaginaPublica } from '@/pages/publica/PaginaPublica';
import { NaoEncontrada } from '@/pages/publica/NaoEncontrada';

function Carregando() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <img src="/logo.svg" alt="Mylink" className="h-10 animate-pulse" />
      <p className="mt-4 text-sm text-ink-500" aria-live="polite">Carregando…</p>
    </div>
  );
}

function SemSupabase() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-card">
        <img src="/logo.svg" alt="Mylink" className="mx-auto mb-6 h-9" />
        <h1 className="text-lg font-bold">Configuração pendente</h1>
        <p className="mt-2 text-sm text-ink-500">
          Copie <code className="rounded bg-canvas px-1">.env.example</code> para{' '}
          <code className="rounded bg-canvas px-1">.env.local</code> e preencha{' '}
          <code className="rounded bg-canvas px-1">VITE_SUPABASE_URL</code> e{' '}
          <code className="rounded bg-canvas px-1">VITE_SUPABASE_ANON_KEY</code> com os dados do projeto Supabase.
        </p>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { usuario, perfil, carregando, configurado } = useSession();
  const local = useLocation();

  if (!configurado) return <SemSupabase />;
  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to={`/entrar?de=${encodeURIComponent(local.pathname)}`} replace />;
  if (perfil?.status === 'bloqueado') {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-card">
          <h1 className="text-lg font-bold">Conta bloqueada</h1>
          <p className="mt-2 text-sm text-ink-500">Sua conta está bloqueada. Fale com o administrador para reativá-la.</p>
        </div>
      </div>
    );
  }
  if (perfil?.handleTemporario && !local.pathname.endsWith('/onboarding')) {
    return <Navigate to="/painel/onboarding" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { perfil } = useSession();
  if (perfil?.papel !== 'admin') return <Navigate to="/painel" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <SessionProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/auth/callback" element={<Callback />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/privacidade" element={<Privacidade />} />

            <Route path="/painel" element={<RequireAuth><AppShell /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="onboarding" element={<Onboarding />} />
              <Route path="paginas" element={<MinhasPaginas />} />
              <Route path="paginas/:id" element={<EditorTela />} />
              <Route path="paginas/:id/metricas" element={<MetricasTela />} />
              <Route path="perfil" element={<PerfilTela />} />
              <Route path="configuracoes" element={<ConfiguracoesTela />} />
              <Route path="admin" element={<RequireAdmin><Outlet /></RequireAdmin>}>
                <Route index element={<Navigate to="/painel/admin/usuarios" replace />} />
                <Route path="usuarios" element={<AdminUsuarios />} />
                <Route path="planos" element={<AdminPlanos />} />
              </Route>
            </Route>

            <Route path="/:handle" element={<PaginaPublica />} />
            <Route path="/:handle/:slug" element={<PaginaPublica />} />
            <Route path="*" element={<NaoEncontrada />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </SessionProvider>
  );
}
