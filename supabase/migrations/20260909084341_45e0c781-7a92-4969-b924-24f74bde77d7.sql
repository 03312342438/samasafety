create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'maintenance-reminders-daily';

select cron.schedule(
  'maintenance-reminders-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://project--efe410c9-f025-427b-9f54-0dd69a9ec518.lovable.app/api/public/hooks/maintenance-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);