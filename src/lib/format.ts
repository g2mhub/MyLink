const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = new Intl.NumberFormat('pt-BR');
const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function formatarPreco(centavos: number): string {
  return moeda.format(centavos / 100);
}

export function formatarNumero(n: number): string {
  return numero.format(n);
}

export function formatarData(iso: string): string {
  return dataCurta.format(new Date(iso));
}

export function formatarRelativo(iso: string): string {
  const segundos = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (segundos < 60) return 'agora há pouco';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `há ${dias} dia${dias > 1 ? 's' : ''}`;
  return formatarData(iso);
}

export function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function diasAtrasIso(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

/** Gera arquivo CSV (BOM UTF-8, separador ';') — doc 09 §4. */
export function baixarCsv(nomeArquivo: string, linhas: (string | number)[][]): void {
  const corpo = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob([`\ufeff${corpo}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(a.href);
}
