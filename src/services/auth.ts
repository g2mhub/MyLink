import { supabase, siteUrl } from '@/lib/supabase';

const callbackUrl = () => `${siteUrl}/auth/callback`;

export async function cadastrar(dados: { email: string; senha: string; handle: string; nome: string }) {
  const { data, error } = await supabase.auth.signUp({
    email: dados.email,
    password: dados.senha,
    options: {
      data: { handle: dados.handle, display_name: dados.nome },
      emailRedirectTo: callbackUrl(),
    },
  });
  if (error) throw error;
  return data;
}

export async function entrar(email: string, senha: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return data;
}

export async function entrarComGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callbackUrl() },
  });
  if (error) throw error;
}

export async function sair() {
  await supabase.auth.signOut();
}

export async function enviarRecuperacao(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/redefinir-senha`,
  });
  if (error) throw error;
}

export async function definirSenha(senha: string) {
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) throw error;
}

export async function trocarCodigoPorSessao(codigo: string) {
  const { error } = await supabase.auth.exchangeCodeForSession(codigo);
  if (error) throw error;
}

export function observarSessao(cb: (usuarioId: string | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
    cb(sessao?.user.id ?? null);
  });
  return () => data.subscription.unsubscribe();
}
