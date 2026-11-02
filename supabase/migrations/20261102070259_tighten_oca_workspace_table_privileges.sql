-- O.C.A. workspace is user-private. Remove broad default table privileges,
-- including TRUNCATE (which is not protected by row-level security).
revoke all on table public.oca_workspaces from public, anon, authenticated;
grant select, insert, update on table public.oca_workspaces to authenticated;
