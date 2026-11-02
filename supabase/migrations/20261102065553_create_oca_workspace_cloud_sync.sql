-- O.C.A. workspace cloud sync: one private workspace JSON document per authenticated user.
-- Row-level security prevents a user from reading or changing another user's sales data.

create table if not exists public.oca_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"leads":[],"avatar":{},"offers":[],"notes":""}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint oca_workspaces_data_object check (jsonb_typeof(data) = 'object')
);

alter table public.oca_workspaces enable row level security;

grant select, insert, update on public.oca_workspaces to authenticated;

create policy "Users can read their own OCA workspace"
  on public.oca_workspaces for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own OCA workspace"
  on public.oca_workspaces for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own OCA workspace"
  on public.oca_workspaces for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
