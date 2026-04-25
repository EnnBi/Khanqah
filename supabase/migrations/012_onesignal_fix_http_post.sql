-- ============================================================
-- 012_onesignal_fix_http_post.sql
-- pg_net's actual function is `net.http_post(url, body, params,
-- headers, timeout_milliseconds)` with body as jsonb. Migration
-- 011 used `extensions.http_post(...)` with body cast to text,
-- which doesn't resolve and aborts the INSERT.
-- ============================================================

create or replace function public.notify_live_session_start()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions, net
as $$
declare
  app_id  text;
  api_key text;
  title   text;
begin
  select value into app_id  from private.app_secrets where key = 'onesignal_app_id';
  select value into api_key from private.app_secrets where key = 'onesignal_rest_key';

  if app_id is null or app_id = '' or api_key is null or api_key = '' then
    return new;
  end if;

  if new.status = 'live' then
    title := coalesce(nullif(new.title_en, ''), 'A live session');
    perform net.http_post(
      url := 'https://onesignal.com/api/v1/notifications',
      body := jsonb_build_object(
        'app_id',            app_id,
        'included_segments', jsonb_build_array('All'),
        'headings',          jsonb_build_object('en', 'Live now'),
        'contents',          jsonb_build_object('en', title || ' has started broadcasting'),
        'data',              jsonb_build_object(
          'type',       'live_session',
          'session_id', new.id::text
        )
      ),
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Basic ' || api_key
      )
    );
  end if;

  return new;
end;
$$;
