import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes,
} from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, X } from 'lucide-react';

/* ------------------------------------------------------------- Toast */

type Aviso = { id: number; texto: string; tipo: 'ok' | 'erro' | 'info' };
const ToastCtx = createContext<{ avisar: (texto: string, tipo?: Aviso['tipo']) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const seq = useRef(0);

  const avisar = useCallback((texto: string, tipo: Aviso['tipo'] = 'ok') => {
    const id = ++seq.current;
    setAvisos((a) => [...a, { id, texto, tipo }]);
    if (tipo !== 'erro') setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 2600);
  }, []);

  return (
    <ToastCtx.Provider value={{ avisar }}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-50 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div
            key={a.id}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-pop ${
              a.tipo === 'erro' ? 'bg-danger-500 text-white' : a.tipo === 'info' ? 'bg-ink-900 text-white' : 'bg-ink-900 text-white'
            }`}
          >
            {a.tipo === 'ok' && <CheckCircle2 size={18} aria-hidden />}
            {a.tipo === 'erro' && <AlertCircle size={18} aria-hidden />}
            {a.tipo === 'info' && <Info size={18} aria-hidden />}
            <span className="flex-1">{a.texto}</span>
            <button
              onClick={() => setAvisos((x) => x.filter((y) => y.id !== a.id))}
              className="tap -mr-1 grid place-items-center rounded-lg p-1 hover:bg-white/10"
              aria-label="Fechar aviso"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast precisa estar dentro de ToastProvider');
  return ctx.avisar;
}

/* ------------------------------------------------------------ Botão */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario' | 'fantasma' | 'perigo';
  tamanho?: 'sm' | 'md' | 'lg';
  carregando?: boolean;
};

export function Btn({ variante = 'primario', tamanho = 'md', carregando, className = '', children, disabled, ...rest }: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';
  const variantes = {
    primario: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
    secundario: 'border border-ink-300 bg-white text-ink-900 hover:bg-ink-900/5',
    fantasma: 'text-ink-700 hover:bg-ink-900/5',
    perigo: 'bg-danger-500 text-white hover:opacity-90',
  } as const;
  const tamanhos = { sm: 'min-h-[36px] px-3 text-sm', md: 'min-h-[44px] px-4 text-sm', lg: 'min-h-[52px] px-6 text-base' } as const;
  return (
    <button className={`${base} ${variantes[variante]} ${tamanhos[tamanho]} ${className}`} disabled={disabled || carregando} {...rest}>
      {carregando && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ------------------------------------------------- Campo / Área / Select */

export function Campo({ label, erro, dica, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; erro?: string; dica?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-900">{label}</label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={`min-h-[44px] w-full rounded-xl border bg-white px-3 text-[16px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 ${erro ? 'border-danger-500' : 'border-[#E4E4EC]'}`}
        {...rest}
      />
      {dica && <p className="text-xs text-ink-500">{dica}</p>}
      {erro && <p id={`${id}-erro`} className="text-xs font-medium text-danger-500">{erro}</p>}
    </div>
  );
}

export function Area({ label, erro, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; erro?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-900">{label}</label>
      <textarea
        id={id}
        aria-invalid={erro ? true : undefined}
        className={`min-h-[96px] w-full rounded-xl border bg-white px-3 py-2 text-[16px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 ${erro ? 'border-danger-500' : 'border-[#E4E4EC]'}`}
        {...rest}
      />
      {erro && <p className="text-xs font-medium text-danger-500">{erro}</p>}
    </div>
  );
}

/* -------------------------------------------------------------- Modal */

export function Modal({ aberto, aoFechar, titulo, children }: { aberto: boolean; aoFechar: () => void; titulo: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-ink-900/50 sm:place-items-center" onClick={aoFechar}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-pop focus:outline-none sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button onClick={aoFechar} className="tap grid place-items-center rounded-lg p-2 hover:bg-ink-900/5" aria-label="Fechar">
            <X size={20} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirmar({
  aberto, aoCancelar, aoConfirmar, titulo, texto, confirmar = 'Confirmar', perigo,
}: {
  aberto: boolean; aoCancelar: () => void; aoConfirmar: () => void;
  titulo: string; texto: string; confirmar?: string; perigo?: boolean;
}) {
  return (
    <Modal aberto={aberto} aoFechar={aoCancelar} titulo={titulo}>
      <p className="text-sm text-ink-700">{texto}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Btn variante="secundario" onClick={aoCancelar}>Cancelar</Btn>
        <Btn variante={perigo ? 'perigo' : 'primario'} onClick={aoConfirmar}>{confirmar}</Btn>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------- Trocar */

export function Trocar({ ligado, aoAlternar, rotulo }: { ligado: boolean; aoAlternar: (v: boolean) => void; rotulo: string }) {
  return (
    <button
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => aoAlternar(!ligado)}
      className={`tap relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${ligado ? 'bg-brand-500' : 'bg-ink-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${ligado ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

/* ---------------------------------------------------------- Diversos */

export function Vazio({ titulo, texto, acao }: { titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-ink-300 bg-white p-10 text-center">
      <Info size={28} className="text-brand-500" aria-hidden />
      <h3 className="text-base font-bold">{titulo}</h3>
      {texto && <p className="max-w-sm text-sm text-ink-500">{texto}</p>}
      {acao}
    </div>
  );
}

export function Osso({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-ink-900/10 ${className}`} aria-hidden />;
}

export function Etiqueta({ children, tom = 'neutro' }: { children: ReactNode; tom?: 'neutro' | 'ok' | 'alerta' | 'marca' }) {
  const tons = {
    neutro: 'bg-ink-900/5 text-ink-700',
    ok: 'bg-emerald-50 text-emerald-700',
    alerta: 'bg-amber-50 text-amber-700',
    marca: 'bg-brand-50 text-brand-700',
  } as const;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tons[tom]}`}>{children}</span>;
}

export function Avatar({ url, nome, tamanho = 40 }: { url?: string | null; nome: string; tamanho?: number }) {
  const iniciais = nome.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'M';
  if (url) {
    return <img src={url} alt="" width={tamanho} height={tamanho} className="rounded-full object-cover" style={{ width: tamanho, height: tamanho }} />;
  }
  return (
    <span
      aria-hidden
      className="grid place-items-center rounded-full bg-ink-900 font-semibold text-white"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.38 }}
    >
      {iniciais}
    </span>
  );
}
