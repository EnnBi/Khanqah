-- ============================================================
-- 011_onesignal_secrets_table.sql
-- Supabase doesn't allow ALTER DATABASE ... SET on the postgres
-- role, so the approach in 010 (current_setting('app.x')) won't
-- pick up the values. Replace it with a private table that only
-- the trigger function (security definer) can read.
-- ============================================================

create schema if not exists private;

create table if not exists private.app_secrets (
  key   text primary key,
  value text not null
);

-- Lock it down: no role except the trigger function (running as
-- security definer with the function owner's privileges) can read it.
revoke all on schema private from public, anon, authenticated, service_role;
revoke all on private.app_secrets from public, anon, authenticated, service_role;
alter table private.app_secrets enable row level security;
-- (No policy created — RLS deny-by-default.)

-- Replace the trigger function to read from the table instead of
-- session settings.
create or replace function public.notify_live_session_start()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  app_id  text;
  api_key text;
  title   text;
begin
  select value into app_id  from private.app_secrets where key = 'onesignal_app_id';
  select value into api_key from private.app_secrets where key = 'onesignal_rest_key';

  -- Bail silently if either secret is missing.
  if app_id is null or app_id = '' or api_key is null or api_key = '' then
    return new;
  end if;

  if new.status = 'live' then
    title := coalesce(nullif(new.title_en, ''), 'A live session');
    perform extensions.http_post(
      url     := 'https://onesignal.com/api/v1/notifications',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Basic ' || api_key
      ),
      body    := jsonb_build_object(
        'app_id',            app_id,
        'included_segments', jsonb_build_array('All'),
        'headings',          jsonb_build_object('en', 'Live now'),
        'contents',          jsonb_build_object('en', title || ' has started broadcasting'),
        'data',              jsonb_build_object(
          'type',       'live_session',
          'session_id', new.id::text
        )
      )::text
    );
  end if;

  return new;
end;
$$;

-- Trigger from 010 still references this function name, so no need
-- to recreate it. But re-asserting it here for clarity / idempotency.
drop trigger if exists notify_live_session_start_trigger on public.live_sessions;
create trigger notify_live_session_start_trigger
  after insert on public.live_sessions
  for each row
  execute function public.notify_live_session_start();
