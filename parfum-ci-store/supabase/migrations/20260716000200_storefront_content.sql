create table if not exists public.store_content (
  page_key text primary key,
  content jsonb not null default '{}'::jsonb,
  public_readable boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_content_key_allowed check (
    page_key in ('home', 'about', 'contact', 'delivery', 'social')
  ),
  constraint store_content_object check (jsonb_typeof(content) = 'object')
);

create index if not exists store_content_public_readable_idx
  on public.store_content(public_readable)
  where public_readable is true;

drop trigger if exists store_content_set_updated_at on public.store_content;
create trigger store_content_set_updated_at before update on public.store_content
  for each row execute function public.set_updated_at();

alter table public.store_content enable row level security;

drop policy if exists "store_content_public_read" on public.store_content;
create policy "store_content_public_read" on public.store_content
  for select to anon, authenticated
  using (public_readable is true);

drop policy if exists "store_content_staff_admin_select" on public.store_content;
create policy "store_content_staff_admin_select" on public.store_content
  for select to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]));

drop policy if exists "store_content_staff_admin_insert" on public.store_content;
create policy "store_content_staff_admin_insert" on public.store_content
  for insert to authenticated
  with check (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]));

drop policy if exists "store_content_staff_admin_update" on public.store_content;
create policy "store_content_staff_admin_update" on public.store_content
  for update to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]))
  with check (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]));

insert into public.store_content(page_key, content, public_readable)
values
  (
    'home',
    jsonb_build_object(
      'heroTitle', 'Parfums raffinés, sélectionnés pour la Côte d''Ivoire.',
      'heroSubtitle', 'Découvrez une sélection premium de parfums authentiques, avec prix en F CFA et commande assistée.',
      'primaryCtaLabel', 'Découvrir le catalogue',
      'secondaryCtaLabel', 'Écrire sur WhatsApp',
      'trustPoints', jsonb_build_array(
        jsonb_build_object('title', 'Sélection premium', 'description', 'Une sélection éditée avec soin.'),
        jsonb_build_object('title', 'Prix en F CFA', 'description', 'Des montants lisibles en XOF.'),
        jsonb_build_object('title', 'Commande assistée', 'description', 'Disponibilité, livraison et paiement confirmés avant validation.')
      ),
      'orderingSteps', jsonb_build_array(
        jsonb_build_object('title', 'Choisir', 'description', 'Sélectionnez un parfum et une contenance.'),
        jsonb_build_object('title', 'Demander', 'description', 'Ajoutez au panier ou contactez la boutique.'),
        jsonb_build_object('title', 'Confirmer', 'description', 'La disponibilité, le paiement et la livraison sont confirmés manuellement.')
      ),
      'deliveryTeaser', 'Les conditions de livraison sont confirmées avant validation.',
      'socialCtaCopy', 'Suivez les nouveautés sur les réseaux configurés.'
    ),
    true
  ),
  (
    'about',
    jsonb_build_object(
      'pageTitle', 'À propos',
      'introText', 'Les informations publiques de la boutique sont affichées ici lorsqu''elles sont configurées.',
      'brandStory', '',
      'mission', '',
      'values', jsonb_build_array(),
      'seoTitle', 'À propos',
      'seoDescription', 'Informations publiques sur la boutique.'
    ),
    true
  ),
  (
    'contact',
    jsonb_build_object(
      'pageTitle', 'Contact',
      'introText', 'Contactez la boutique par les canaux configurés.',
      'telephone', '',
      'whatsappNumber', '',
      'email', '',
      'address', '',
      'openingHours', jsonb_build_array(),
      'mapUrl', '',
      'whatsappCtaLabel', 'Écrire sur WhatsApp',
      'emailCtaLabel', 'Envoyer un e-mail',
      'phoneCtaLabel', 'Appeler',
      'seoTitle', 'Contact',
      'seoDescription', 'Coordonnées de contact de la boutique.'
    ),
    true
  ),
  (
    'delivery',
    jsonb_build_object(
      'pageTitle', 'Livraison et paiement',
      'introText', 'Les modalités sont confirmées avant validation de commande.',
      'zones', jsonb_build_array(),
      'freeDeliveryConditions', '',
      'pickupInformation', '',
      'mobileMoneyDescription', 'Paiement Mobile Money manuel selon les instructions confirmées par la boutique.',
      'cashOnDeliveryConditions', 'Paiement à la livraison selon les conditions confirmées.',
      'orderConfirmationProcess', 'La disponibilité, les frais de livraison et les instructions de paiement sont confirmés avant validation.',
      'faq', jsonb_build_array(),
      'seoTitle', 'Livraison et paiement',
      'seoDescription', 'Informations de livraison et de paiement.'
    ),
    true
  ),
  (
    'social',
    jsonb_build_object(
      'instagramUrl', '',
      'facebookUrl', '',
      'tiktokUrl', '',
      'whatsappNumber', '',
      'socialCtaCopy', ''
    ),
    true
  )
on conflict (page_key) do nothing;
