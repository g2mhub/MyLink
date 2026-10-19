import { Link } from 'react-router-dom';
import { Check, Infinity as Infinito, MousePointerClick, Palette, Smartphone } from 'lucide-react';
import { formatarPreco } from '@/lib/format';

const recursos = [
  { Icone: Palette, titulo: 'Temas e cores', texto: 'Escolha um tema pronto, ajuste cores, fonte, layout e estilo dos botões.' },
  { Icone: MousePointerClick, titulo: 'Simples de editar', texto: 'Adicione e reordene links arrastando. A pré-visualização muda na hora.' },
  { Icone: Smartphone, titulo: 'Perfeita no celular', texto: 'Sua página é pensada para smartphones: botões grandes e textos legíveis.' },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-ink-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <img src="/logo-dark.svg" alt="Mylink" className="h-8" />
          <div className="flex items-center gap-2">
            <Link to="/entrar" className="tap flex items-center px-3 text-sm font-semibold text-white hover:text-brand-300">Entrar</Link>
            <Link to="/cadastro" className="tap flex items-center rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
              Criar minha página
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-ink-900 px-5 pb-20 pt-10 text-white">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Sua página de links,<br /><span className="text-brand-500">pronta em 2 minutos.</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-white/70">
              Todos os seus links — redes sociais, WhatsApp, portfólio, loja — em uma única URL que é só sua.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/cadastro" className="tap flex items-center rounded-xl bg-brand-500 px-6 py-3.5 font-semibold hover:bg-brand-600">
                Criar minha página
              </Link>
              <Link to="/entrar" className="tap flex items-center rounded-xl border border-white/30 px-6 py-3.5 font-semibold hover:bg-white/10">
                Já tenho conta
              </Link>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[300px] rounded-3xl bg-white p-6 shadow-pop">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-2xl font-bold text-brand-600">K</div>
            <p className="mt-3 text-center text-lg font-bold text-ink-900">Klauz</p>
            <p className="text-center text-sm text-ink-500">Designer e criadora de conteúdo</p>
            <div className="mt-4 flex flex-col gap-2.5">
              {['Instagram', 'WhatsApp', 'YouTube', 'Portfólio'].map((nome) => (
                <div key={nome} className="rounded-xl bg-brand-500 px-4 py-3 text-center text-sm font-semibold text-white">{nome}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-center text-3xl font-bold">Tudo o que você precisa</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {recursos.map(({ Icone, titulo, texto }) => (
            <div key={titulo} className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icone size={22} aria-hidden /></span>
              <h3 className="mt-4 text-lg font-bold">{titulo}</h3>
              <p className="mt-1 text-sm text-ink-500">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-canvas px-5 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold">Planos simples</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-ink-900/10 bg-white p-8 shadow-card">
              <h3 className="text-xl font-bold">Gratuito</h3>
              <p className="mt-2 text-3xl font-bold">{formatarPreco(0)}<span className="text-base font-medium text-ink-500">/mês</span></p>
              <ul className="mt-6 flex flex-col gap-3 text-sm">
                <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" />1 página com URL única</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" />Até 5 links por página</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" />Temas e personalização básica</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" />Métricas dos últimos 30 dias</li>
              </ul>
              <Link to="/cadastro" className="tap mt-8 flex items-center justify-center rounded-xl border border-ink-900/20 font-semibold hover:bg-ink-900/5">
                Começar grátis
              </Link>
            </div>
            <div className="rounded-2xl border-2 border-brand-500 bg-white p-8 shadow-card">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Pro</h3>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">mais popular</span>
              </div>
              <p className="mt-2 text-3xl font-bold">{formatarPreco(1500)}<span className="text-base font-medium text-ink-500">/mês</span></p>
              <ul className="mt-6 flex flex-col gap-3 text-sm">
                <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" /><Infinito size={16} className="text-brand-500" />Páginas e links ilimitados</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" />Personalização completa</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" />Métricas completas</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" />Domínio próprio (em breve)</li>
              </ul>
              <p className="mt-8 rounded-xl bg-brand-50 px-4 py-3 text-center text-sm font-medium text-brand-800">
                Ativação pelo administrador — fale conosco após criar sua conta.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-900/10 px-5 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-ink-500 md:flex-row">
          <img src="/logo.svg" alt="Mylink" className="h-7" />
          <nav className="flex gap-5" aria-label="Rodapé">
            <Link to="/termos" className="hover:text-ink-900">Termos</Link>
            <Link to="/privacidade" className="hover:text-ink-900">Privacidade</Link>
            <Link to="/entrar" className="hover:text-ink-900">Entrar</Link>
          </nav>
          <p>© {new Date().getFullYear()} Mylink</p>
        </div>
      </footer>
    </div>
  );
}
