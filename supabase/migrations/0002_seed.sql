-- =====================================================================
-- Mylink — seed de planos e temas (docs/03 §8 e doc 10)
-- =====================================================================

insert into public.plans (code, name, max_pages, max_links_per_page, metrics_days, custom_domain, price_monthly_cents)
values
  ('free', 'Gratuito', 1, 5, 30, false, 0),
  ('pro',  'Pro',     -1, -1, -1, true,  1500);   -- R$ 15,00/mês — ativação manual pelo admin

-- Temas da página pública (paleta oficial preto/laranja/branco + neutros)
insert into public.themes (slug, name, is_dark, tokens, position) values
  ('classico', 'Clássico', false,
   '{"background":"#FFFFFF","backgroundGradient":false,"surface":"#FFF7ED","text":"#0B0B0F","textMuted":"#6B7280","accent":"#F97316","accentText":"#FFFFFF","radius":14,"buttonShadow":"0 4px 14px rgb(249 115 22 / 0.25)"}', 0),
  ('noturno', 'Noturno', true,
   '{"background":"#0B0B0F","backgroundGradient":false,"surface":"#1C1C22","text":"#FFFFFF","textMuted":"#B4B4BE","accent":"#F97316","accentText":"#FFFFFF","radius":14,"buttonShadow":"0 8px 24px rgb(0 0 0 / 0.5)"}', 1),
  ('minimal', 'Minimal', false,
   '{"background":"#FFFFFF","backgroundGradient":false,"surface":"#FFFFFF","text":"#0B0B0F","textMuted":"#6B7280","accent":"#0B0B0F","accentText":"#FFFFFF","radius":8,"buttonShadow":"none"}', 2),
  ('laranja', 'Laranja', false,
   '{"background":"linear-gradient(160deg,#F97316,#C2410C)","backgroundGradient":true,"surface":"#FFFFFF26","text":"#FFFFFF","textMuted":"#FFFFFFD9","accent":"#FFFFFF","accentText":"#9A3412","radius":999,"buttonShadow":"0 8px 24px rgb(0 0 0 / 0.25)"}', 3),
  ('grafite', 'Grafite', true,
   '{"background":"#17171B","backgroundGradient":false,"surface":"#232329","text":"#F4F4F6","textMuted":"#9A9AA6","accent":"#F97316","accentText":"#FFFFFF","radius":10,"buttonShadow":"none"}', 4),
  ('creme', 'Creme', false,
   '{"background":"#FFF8F1","backgroundGradient":false,"surface":"#FFFFFF","text":"#3B2A1E","textMuted":"#8A7466","accent":"#EA580C","accentText":"#FFFFFF","radius":16,"buttonShadow":"0 6px 18px rgb(154 52 18 / 0.18)"}', 5);
