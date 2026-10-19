/** Traduz erros do Supabase/Postgres para mensagens pt-BR amigáveis (doc 04 §8). */
export function traduzirErro(erro: unknown): string {
  const msg = erro instanceof Error ? erro.message : String(erro ?? '');

  if (/Limite de .*página/.test(msg)) return msg;
  if (/plano permite/.test(msg)) return msg;
  if (/Handle inválido|reservado|já está em uso/.test(msg)) return msg;
  if (/Acesso restrito/.test(msg)) return msg;
  if (/Página não encontrada/.test(msg)) return 'Página não encontrada ou sem permissão.';
  if (/Não foi possível salvar a ordem/.test(msg)) return msg;

  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.';
  if (/User already registered/i.test(msg)) return 'Já existe uma conta com este e-mail.';
  if (/Password should be/i.test(msg)) return 'A senha deve ter pelo menos 8 caracteres.';
  if (/rate limit/i.test(msg)) return 'Muitas tentativas. Aguarde um minuto e tente novamente.';
  if (/Failed to fetch|NetworkError|fetch failed/i.test(msg)) return 'Falha de conexão. Verifique sua internet e tente novamente.';
  if (/new row violates row-level security/i.test(msg)) return 'Você não tem permissão para esta ação.';

  return msg || 'Algo deu errado. Tente novamente.';
}
