import { describe, expect, it } from 'vitest';
import { formatarNumero, formatarPreco } from '@/lib/format';

describe('formatarPreco', () => {
  it('formata em real pt-BR', () => {
    expect(formatarPreco(0)).toContain('R$');
    expect(formatarPreco(1500)).toMatch(/15,00/);
  });
});

describe('formatarNumero', () => {
  it('usa separador de milhar pt-BR', () => {
    expect(formatarNumero(1234)).toBe('1.234');
    expect(formatarNumero(42)).toBe('42');
  });
});
