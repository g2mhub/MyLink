import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ExternalLink, LayoutDashboard, LogOut, Settings, ShieldCheck, User, Users,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { Avatar } from '@/components/ui';

type ItemNav = { para: string; rotulo: string; Icone: typeof User; fim?: boolean };

const itens: ItemNav[] = [
  { para: '/painel', rotulo: 'Início', Icone: LayoutDashboard, fim: true },
  { para: '/painel/paginas', rotulo: 'Páginas', Icone: ExternalLink },
  { para: '/painel/perfil', rotulo: 'Perfil', Icone: User },
  { para: '/painel/configuracoes', rotulo: 'Configurações', Icone: Settings },
];

const itensAdmin: ItemNav[] = [{ para: '/painel/admin', rotulo: 'Admin', Icone: ShieldCheck, fim: true }];

export function AppShell() {
  const { perfil, sair } = useSession();
  const navegar = useNavigate();
  const admin = perfil?.papel === 'admin';
  const todos = [...itens, ...(admin ? itensAdmin : [])];
  const itensMobile = admin ? todos : itens.filter((i) => i.rotulo !== 'Configurações');

  return (
    <div className="min-h-screen lg:flex">
      {/* sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink-900/10 bg-white p-4 lg:flex">
        <NavLink to="/" className="mb-8 flex items-center gap-2 px-2">
          <img src="/logo.svg" alt="Mylink" className="h-8" />
        </NavLink>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Navegação do painel">
          {todos.map(({ para, rotulo, Icone, fim }) => (
            <NavLink
              key={para}
              to={para}
              end={fim === true}
              className={({ isActive }) =>
                `tap flex items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-brand-500 text-white' : 'text-ink-700 hover:bg-ink-900/5'
                }`}
            >
              <Icone size={18} aria-hidden />
              {rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-xl bg-canvas p-3">
          <Avatar url={perfil?.avatarUrl} nome={perfil?.nome ?? 'Usuário'} tamanho={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{perfil?.nome}</p>
            <p className="truncate text-xs text-ink-500">mylink.com.br/{perfil?.handle}</p>
          </div>
          <button
            onClick={() => { void sair().then(() => navegar('/entrar')); }}
            className="tap grid place-items-center rounded-lg p-2 text-ink-500 hover:bg-ink-900/5 hover:text-ink-900"
            aria-label="Sair da conta"
            title="Sair"
          >
            <LogOut size={18} aria-hidden />
          </button>
        </div>
      </aside>

      {/* topo mobile */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-900/10 bg-white px-4 py-3 lg:hidden">
          <NavLink to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Mylink" className="h-7" />
          </NavLink>
          <div className="flex items-center gap-1">
            {admin && (
              <NavLink to="/painel/admin" className="tap grid place-items-center rounded-lg p-2" aria-label="Administração">
                <Users size={20} aria-hidden />
              </NavLink>
            )}
            <button
              onClick={() => { void sair().then(() => navegar('/entrar')); }}
              className="tap grid place-items-center rounded-lg p-2 text-ink-500"
              aria-label="Sair da conta"
            >
              <LogOut size={20} aria-hidden />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>

        {/* bottom nav (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-ink-900/10 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Navegação principal">
          {itensMobile.map(({ para, rotulo, Icone }) => (
            <NavLink
              key={para}
              to={para}
              end={rotulo === 'Início' || rotulo === 'Admin'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                  isActive ? 'text-brand-600' : 'text-ink-500'
                }`}
            >
              <Icone size={20} aria-hidden />
              {rotulo}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
