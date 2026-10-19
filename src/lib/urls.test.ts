import { describe, expect, it } from 'vitest';
import { handleValido, iconeSugerido, normalizarUrl } from '@/lib/urls';

describe('normalizarUrl', () => {
  it('aceita https e adiciona https quando ausente', () => {
    expect(normalizarUrl('https://instagram.com/klauz')).toBe('https://instagram.com/klauz');
    expect(normalizarUrl('site.com.br')).toBe('https://site.com.br/');
  });

  it('aceita mailto e tel', () => {
    expect(normalizarUrl('mailto:oi@x.com')).toBe('mailto:oi@x.com');
    expect(normalizarUrl('tel:+5511999999999')).toBe('tel:+5511999999999');
  });

  it('bloqueia esquemas perigosos', () => {
    expect(normalizarUrl('javascript:alert(1)')).toBeNull();
    expect(normalizarUrl('data:text/html,<script>')).toBeNull();
  });

  it('rejeita domínios inválidos', () => {
    expect(normalizarUrl('http://localhost')).toBeNull();
    expect(normalizarUrl('sem-espaço com')).toBeNull();
    expect(normalizarUrl('')).toBeNull();
  });
});

describe('handleValido', () => {
  it('aceita handles válidos', () => {
    expect(handleValido('klauz')).toBe(true);
    expect(handleValido('klauz-dev-01')).toBe(true);
  });

  it('rejeita reservados e inválidos', () => {
    expect(handleValido('admin')).toBe(false);
    expect(handleValido('painel')).toBe(false);
    expect(handleValido('Ab-Cd')).toBe(false);
    expect(handleValido('-inicio')).toBe(false);
  });
});

describe('iconeSugerido', () => {
  it('detecta marcas pelas URLs', () => {
    expect(iconeSugerido('https://wa.me/5511999999999')).toBe('whatsapp');
    expect(iconeSugerido('https://instagram.com/klauz')).toBe('instagram');
    expect(iconeSugerido('https://youtube.com/@klauz')).toBe('youtube');
    expect(iconeSugerido('mailto:oi@x.com')).toBe('email');
  });

  it('cai no genérico quando desconhecida', () => {
    expect(iconeSugerido('https://loja.com.br')).toBe('link');
  });
});
