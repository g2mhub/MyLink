import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

export function NaoEncontrada() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-5">
      <div className="max-w-md text-center">
        <SearchX size={44} className="mx-auto text-brand-500" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Não encontramos essa página</h1>
        <p className="mt-2 text-sm text-ink-500">
          O endereço pode estar errado ou a página foi despublicada. Que tal criar a sua?
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="tap flex items-center rounded-xl border border-ink-900/20 px-4 font-semibold hover:bg-ink-900/5">
            Início
          </Link>
          <Link to="/cadastro" className="tap flex items-center rounded-xl bg-brand-500 px-4 font-semibold text-white hover:bg-brand-600">
            Criar minha página
          </Link>
        </div>
      </div>
    </div>
  );
}
