-- Keep staff approval explicit: profiles created from Auth users are inactive until
-- an owner/admin approves them through a server-side administrative flow.
alter table public.profiles
  alter column active set default false;

-- SECURITY DEFINER justification:
-- Supabase Auth writes to auth.users, while public.profiles is protected by RLS.
-- This trigger creates the non-privileged profile shell needed for staff approval.
-- It never trusts user metadata for role or active status.
create or replace function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
begin
  display_name := nullif(
    btrim(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        split_part(new.email, '@', 1),
        'Compte en attente'
      )
    ),
    ''
  );

  insert into public.profiles (id, full_name, role, active)
  values (
    new.id,
    coalesce(display_name, 'Compte en attente'),
    'CUSTOMER_SUPPORT'::public.app_role,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function app_private.handle_new_auth_user() from public;
revoke all on function app_private.handle_new_auth_user() from anon;
revoke all on function app_private.handle_new_auth_user() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_auth_user();

insert into public.profiles (id, full_name, role, active)
select
  users.id,
  coalesce(
    nullif(
      btrim(
        coalesce(
          users.raw_user_meta_data ->> 'full_name',
          users.raw_user_meta_data ->> 'name',
          split_part(users.email, '@', 1),
          'Compte en attente'
        )
      ),
      ''
    ),
    'Compte en attente'
  ) as full_name,
  'CUSTOMER_SUPPORT'::public.app_role as role,
  false as active
from auth.users
where not exists (
  select 1
  from public.profiles
  where profiles.id = users.id
);
