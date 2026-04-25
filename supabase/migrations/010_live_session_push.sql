-- ============================================================
-- 010_live_session_push.sql
-- When a new live_sessions row is INSERTed, fire a push
-- notification to all subscribers via OneSignal REST API.
-- The OneSignal App ID and REST API Key are read from Postgres
-- settings (app.onesignal_app_id, app.onesignal_rest_key) so
-- they never leave the database.
-- ============================================================

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_live_session_start()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  app_id  text := current_setting('app.onesignal_app_id',  true);
  api_key text := current_setting('app.onesignal_rest_key', true);
  title   text;
begin
  -- Bail silently if either setting is missing, so dev environments
  -- without OneSignal configured don't fail the INSERT.
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

drop trigger if exists notify_live_session_start_trigger on public.live_sessions;
create trigger notify_live_session_start_trigger
  after insert on public.live_sessions
  for each row
  execute function public.notify_live_session_start();
