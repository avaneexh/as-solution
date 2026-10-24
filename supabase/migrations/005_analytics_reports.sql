begin;
-- Durable cache and atomic claim prevent dashboard refreshes exhausting quotas.
create table public.analytics_reports (
 provider text primary key check(provider in ('ga4','clarity')),
 report jsonb, fetched_at timestamptz, next_fetch_at timestamptz not null default now(),
 error text
);
alter table public.analytics_reports enable row level security;
revoke all on public.analytics_reports from public,anon,authenticated;
grant all on public.analytics_reports to service_role;
create function public.claim_analytics_fetch(p_provider text) returns boolean language plpgsql security definer set search_path=public as $$
declare claimed text;
begin
 insert into public.analytics_reports(provider,next_fetch_at) values(p_provider,now()+interval '6 hours')
 on conflict(provider) do update set next_fetch_at=now()+interval '6 hours'
 where analytics_reports.next_fetch_at<=now() returning provider into claimed;
 return claimed is not null;
end;$$;
revoke all on function public.claim_analytics_fetch(text) from public,anon,authenticated;
grant execute on function public.claim_analytics_fetch(text) to service_role;
commit;
