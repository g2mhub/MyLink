import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { observarSessao, sair as sairAuth } from '@/services/auth';
import { buscarMeuPerfil } from '@/services/profiles';
import type { Perfil } from '@/types/domain';

type SessaoCtx = {
  usuario: User | null;
  perfil: Perfil | null;
  carregando: boolean;
  configurado: boolean;
  recarregarPerfil: () => Promise<void>;
  sair: () => Promise<void>;
};

const Ctx = createContext<SessaoCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarPerfil = useCallback(async () => {
    try {
      setPerfil(await buscarMeuPerfil());
    } catch {
      setPerfil(null);
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado) { setCarregando(false); return; }

    let ativo = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id ?? null;
      if (!ativo) return;
      setUsuario(data.session?.user ?? null);
      if (id) await carregarPerfil();
      if (ativo) setCarregando(false);
    })();

    const remover = observarSessao((id) => {
      setUsuario(id ? { id } as User : null);
      if (id) void carregarPerfil();
      else setPerfil(null);
      setCarregando(false);
    });
    return () => { ativo = false; remover(); };
  }, [carregarPerfil]);

  const recarregarPerfil = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) await carregarPerfil();
  }, [carregarPerfil]);

  const sair = useCallback(async () => {
    await sairAuth();
    setUsuario(null);
    setPerfil(null);
  }, []);

  const valor = useMemo<SessaoCtx>(
    () => ({ usuario, perfil, carregando, configurado: supabaseConfigurado, recarregarPerfil, sair }),
    [usuario, perfil, carregando, recarregarPerfil, sair],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSession(): SessaoCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession precisa estar dentro de SessionProvider');
  return ctx;
}
