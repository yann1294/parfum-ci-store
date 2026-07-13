insert into public.store_settings (
  id,
  store_name,
  legal_name,
  contact_email,
  contact_phone,
  whatsapp_number,
  instagram_url,
  facebook_url,
  tiktok_url,
  orange_money_number,
  mtn_momo_number,
  wave_number,
  moov_money_number,
  delivery_information,
  notification_email,
  default_low_stock_threshold,
  public_readable
) values (
  true,
  'Parfum CI',
  'Parfum CI',
  'contact@example.com',
  '+225 00 00 00 00 00',
  '+225 00 00 00 00 00',
  'https://instagram.com/parfumci',
  'https://facebook.com/parfumci',
  'https://tiktok.com/@parfumci',
  '+225 07 00 00 00 00',
  '+225 05 00 00 00 00',
  '+225 01 00 00 00 00',
  '+225 01 00 00 00 00',
  'Livraison à Abidjan et communes proches. Frais confirmés avant validation.',
  'notifications@example.com',
  3,
  true
) on conflict (id) do update set
  store_name = excluded.store_name,
  updated_at = timezone('utc', now());

insert into public.brands (name, slug, description, active, sort_order) values
  ('Maison Ivoire', 'maison-ivoire', 'Marque placeholder pour les tests visuels.', true, 10),
  ('Lagune Parfums', 'lagune-parfums', 'Marque placeholder inspirée d''Abidjan.', true, 20),
  ('Cacao Noir', 'cacao-noir', 'Marque placeholder aux notes ambrées.', true, 30)
on conflict (slug) do nothing;

insert into public.categories (name, slug, description, active, sort_order) values
  ('Parfums femme', 'parfums-femme', 'Sélection placeholder de parfums féminins.', true, 10),
  ('Parfums homme', 'parfums-homme', 'Sélection placeholder de parfums masculins.', true, 20),
  ('Parfums mixtes', 'parfums-mixtes', 'Sélection placeholder de parfums mixtes.', true, 30)
on conflict (slug) do nothing;
