import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function Estatica({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-ink-900/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2"><img src="/logo.svg" alt="Mylink" className="h-8" /></Link>
          <Link to="/" className="tap flex items-center gap-1 text-sm font-semibold text-ink-700">
            <ArrowLeft size={16} aria-hidden /> Início
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-3xl font-bold">{titulo}</h1>
        <div className="prose mt-6 flex flex-col gap-4 text-sm leading-relaxed text-ink-700">{children}</div>
      </main>
    </div>
  );
}

export function Termos() {
  return (
    <Estatica titulo="Termos de uso">
      <p>Última atualização: outubro de 2026.</p>
      <p><strong>1. O serviço.</strong> O Mylink permite criar uma página pública de links pessoais ou profissionais. A conta é pessoal e intransferível.</p>
      <p><strong>2. Conteúdo.</strong> Você é responsável pelos links, textos e imagens que publica. Conteúdo ilegal, ofensivo ou que viole direitos de terceiros pode ser removido e a conta pode ser bloqueada.</p>
      <p><strong>3. Planos.</strong> O plano Gratuito possui limites de páginas e links. O plano Pro é ativado manualmente pela administração da plataforma.</p>
      <p><strong>4. Disponibilidade.</strong> Trabalhamos para manter o serviço no ar, sem garantia de disponibilidade contínua.</p>
      <p><strong>5. Encerramento.</strong> Você pode solicitar a exclusão da sua conta a qualquer momento; os dados são apagados em definitivo.</p>
      <p><strong>6. Contato.</strong> Dúvidas: fale com a administração pela plataforma.</p>
    </Estatica>
  );
}

export function Privacidade() {
  return (
    <Estatica titulo="Política de privacidade">
      <p>Última atualização: outubro de 2026.</p>
      <p><strong>1. Dados coletados.</strong> Cadastro (e-mail, nome, nome de usuário), conteúdo da sua página (nome, biografia, foto) e métricas agregadas de cliques das suas páginas.</p>
      <p><strong>2. Dados de visitantes.</strong> A página pública registra apenas eventos anônimos de visualização e clique (sem e-mail, sem endereço IP armazenado), usados para exibir métricas ao dono da página.</p>
      <p><strong>3. Senhas.</strong> Armazenadas de forma criptografada e nunca acessíveis pela equipe.</p>
      <p><strong>4. Uso.</strong> Seus dados servem exclusivamente para operar o Mylink — não vendemos nem cedemos dados a terceiros.</p>
      <p><strong>5. Seus direitos.</strong> Você pode corrigir seus dados no painel ou solicitar a exclusão total da conta.</p>
    </Estatica>
  );
}
