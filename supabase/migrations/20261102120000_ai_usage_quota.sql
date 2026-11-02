-- Quota quotidien de l'assistant IA (Claude) : un compteur par utilisateur et par jour.
-- Les fonctions sont réservées au rôle service (appelées par la fonction edge claude-assist).

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  requests integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;
revoke all on table public.ai_usage from public, anon, authenticated;
grant select on table public.ai_usage to authenticated;

create policy "Users can read their own AI usage"
  on public.ai_usage for select to authenticated
  using ((select auth.uid()) = user_id);

-- Réserve une demande si le quota du jour n'est pas atteint. Renvoie le nouveau compteur, ou NULL.
create or replace function public.ai_reserve_request(p_user uuid, p_day date, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.ai_usage (user_id, day, requests)
  values (p_user, p_day, 1)
  on conflict (user_id, day)
  do update set requests = public.ai_usage.requests + 1
  where public.ai_usage.requests < p_limit
  returning requests into n;
  return n;
end;
$$;

-- Annule une demande réservée quand l'appel à Claude échoue.
create or replace function public.ai_release_request(p_user uuid, p_day date)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_usage set requests = greatest(requests - 1, 0)
  where user_id = p_user and day = p_day;
$$;

-- Ajoute les jetons consommés (pour suivre le coût).
create or replace function public.ai_add_tokens(p_user uuid, p_day date, p_in integer, p_out integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_usage
  set input_tokens = input_tokens + greatest(p_in, 0),
      output_tokens = output_tokens + greatest(p_out, 0)
  where user_id = p_user and day = p_day;
$$;

revoke all on function public.ai_reserve_request(uuid, date, integer) from public, anon, authenticated;
revoke all on function public.ai_release_request(uuid, date) from public, anon, authenticated;
revoke all on function public.ai_add_tokens(uuid, date, integer, integer) from public, anon, authenticated;
grant execute on function public.ai_reserve_request(uuid, date, integer) to service_role;
grant execute on function public.ai_release_request(uuid, date) to service_role;
grant execute on function public.ai_add_tokens(uuid, date, integer, integer) to service_role;
