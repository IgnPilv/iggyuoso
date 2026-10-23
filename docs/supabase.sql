-- iggyuoso account server: run once in the Supabase SQL Editor (see docs/accounts.md).
-- One table holds every saved record of every account, one row per store key. Row-level
-- security keeps each account to its own rows, so the public anon key is safe in the app.

create table if not exists public.progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value jsonb,
  schema int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists progress_user_updated on public.progress (user_id, updated_at);

alter table public.progress enable row level security;

drop policy if exists "Own progress" on public.progress;
create policy "Own progress" on public.progress
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.progress to authenticated;

-- The server sets the change time, so devices with wrong clocks still sync in order.
create or replace function public.progress_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists progress_touch on public.progress;
create trigger progress_touch before insert or update on public.progress
  for each row execute function public.progress_touch();
