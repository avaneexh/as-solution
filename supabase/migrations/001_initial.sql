-- Apply in a new Supabase project using the SQL editor or Supabase CLI.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default '', email text not null,
 role text not null default 'client' check(role in ('client','admin')),
 created_at timestamptz not null default now()
);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,email,name) values(new.id,new.email,left(coalesce(new.raw_user_meta_data->>'name',''),100));return new;end;$$;
create trigger new_auth_user after insert on auth.users for each row execute function public.handle_new_user();
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin');$$;
create table public.site_content(id text primary key check(id='main'),body jsonb not null,version integer not null default 1,updated_at timestamptz not null default now());
create table public.leads(
 id uuid primary key default gen_random_uuid(), request_id uuid unique not null,
 user_id uuid references auth.users(id) on delete set null,
 name text not null,email text not null,phone text not null,business text not null default '',service text not null,message text not null,
 status text not null default 'New' check(status in ('New','Contacted','Follow-up','Converted','Closed','Not Interested')),
 source text not null default 'website',attribution jsonb not null default '{}',
 follow_up_at timestamptz,consented_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.lead_notes(lead_id uuid primary key references public.leads(id) on delete cascade,notes text not null default '');
create table public.bookings(
 id uuid primary key default gen_random_uuid(),lead_id uuid not null unique references public.leads(id) on delete cascade,
 user_id uuid references auth.users(id) on delete set null,preferred_at timestamptz not null,scheduled_at timestamptz,
 status text not null default 'Requested' check(status in ('Requested','Confirmed','Rescheduled','Completed','Cancelled')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint confirmed_has_time check(status not in ('Confirmed','Rescheduled') or scheduled_at is not null)
);
create table public.booking_notes(booking_id uuid primary key references public.bookings(id) on delete cascade,notes text not null default '');
create table public.audit_log(id bigint generated always as identity primary key,actor_id uuid,entity text not null,record_id text not null,action text not null,changes jsonb not null default '{}',created_at timestamptz not null default now());
create table public.rate_limits(key text primary key,window_started timestamptz not null default now(),attempts int not null default 1);
create table public.webhook_messages(id text primary key,status text not null default 'processing',created_at timestamptz not null default now());
create index leads_user_idx on public.leads(user_id);
create index leads_status_created_idx on public.leads(status,created_at desc);
create index leads_followup_idx on public.leads(follow_up_at) where follow_up_at is not null;
create index bookings_user_idx on public.bookings(user_id);
create index bookings_preferred_idx on public.bookings(preferred_at);
create index audit_created_idx on public.audit_log(created_at desc);
alter table public.profiles enable row level security;
alter table public.site_content enable row level security;
alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_notes enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;
alter table public.webhook_messages enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
-- No browser role updates; promote admins through the SQL editor only.
create policy content_read on public.site_content for select to anon,authenticated using(true);
create policy content_write on public.site_content for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy leads_read on public.leads for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy leads_admin_update on public.leads for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy leads_admin_delete on public.leads for delete to authenticated using(public.is_admin());
create policy notes_admin on public.lead_notes for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy bookings_read on public.bookings for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy bookings_update on public.bookings for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy booking_notes_admin on public.booking_notes for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy audit_admin_read on public.audit_log for select to authenticated using(public.is_admin());
grant select on public.site_content to anon,authenticated;
grant insert,update on public.site_content to authenticated;
grant select on public.profiles to authenticated;
grant select,delete on public.leads to authenticated;
grant update(status,follow_up_at) on public.leads to authenticated;
grant select on public.bookings to authenticated;
grant update(status,scheduled_at) on public.bookings to authenticated;
grant select,insert,update,delete on public.lead_notes,public.booking_notes to authenticated;
grant select on public.audit_log to authenticated;
grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;
create or replace function public.audit_change() returns trigger language plpgsql security definer set search_path=public as $$
declare v_id text; v_changes jsonb;
begin
 if tg_op='DELETE' then v_id=old.id::text;v_changes='{}';else v_id=new.id::text;v_changes=jsonb_build_object('status',to_jsonb(new)->'status','version',to_jsonb(new)->'version');end if;
 insert into public.audit_log(actor_id,entity,record_id,action,changes) values(auth.uid(),tg_table_name,v_id,tg_op,v_changes);
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
create or replace function public.stamp_updated() returns trigger language plpgsql set search_path=public as $$begin new.updated_at=now();return new;end;$$;
create trigger leads_stamp before update on public.leads for each row execute function public.stamp_updated();
create trigger booking_stamp before update on public.bookings for each row execute function public.stamp_updated();
create trigger leads_audit after insert or update or delete on public.leads for each row execute function public.audit_change();
create trigger booking_audit after insert or update or delete on public.bookings for each row execute function public.audit_change();
create trigger content_audit after insert or update on public.site_content for each row execute function public.audit_change();
create or replace function public.consume_rate_limit(p_key text) returns boolean language plpgsql security definer set search_path=public as $$
declare v_attempts int;
begin
 insert into public.rate_limits(key) values(p_key) on conflict(key) do update set attempts=case when rate_limits.window_started<now()-interval '15 minutes' then 1 else rate_limits.attempts+1 end,window_started=case when rate_limits.window_started<now()-interval '15 minutes' then now() else rate_limits.window_started end returning attempts into v_attempts;
 return v_attempts<=5;
end;$$;
create or replace function public.submit_enquiry(p_request_id uuid,p_user_id uuid,p_name text,p_email text,p_phone text,p_business text,p_service text,p_message text,p_type text,p_preferred_at timestamptz,p_attribution jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if p_type not in ('enquiry','booking') then raise exception 'Invalid type';end if;
 insert into public.leads(request_id,user_id,name,email,phone,business,service,message,source,attribution) values(p_request_id,p_user_id,p_name,p_email,p_phone,p_business,p_service,p_message,coalesce(nullif(p_attribution->>'utm_source',''),'website'),p_attribution) on conflict(request_id) do nothing returning id into v_id;
 if v_id is null then select id into v_id from public.leads where request_id=p_request_id;return v_id;end if;
 if p_type='booking' then
 if p_preferred_at<now()+interval '1 hour' or p_preferred_at>now()+interval '180 days' or p_preferred_at is null then raise exception 'Invalid appointment';end if;
 insert into public.bookings(lead_id,user_id,preferred_at) values(v_id,p_user_id,p_preferred_at);
 end if;
 return v_id;
end;$$;
-- Optimistic concurrency prevents two editors silently overwriting each other.
create or replace function public.publish_content(p_body jsonb,p_version int) returns int language plpgsql security invoker set search_path=public as $$
declare v_version int;
begin
 if not public.is_admin() then raise exception 'Forbidden';end if;
 if p_version=0 then insert into public.site_content(id,body) values('main',p_body) on conflict do nothing returning version into v_version;
 else update public.site_content set body=p_body,version=version+1,updated_at=now() where id='main' and version=p_version returning version into v_version;end if;
 if v_version is null then raise exception 'Content changed in another session. Reload before saving.';end if;
 return v_version;
end;$$;
revoke all on function public.consume_rate_limit(text) from public,anon,authenticated;
revoke all on function public.submit_enquiry(uuid,uuid,text,text,text,text,text,text,text,timestamptz,jsonb) from public,anon,authenticated;
revoke all on function public.publish_content(jsonb,int) from public,anon;
grant execute on function public.consume_rate_limit(text) to service_role;
grant execute on function public.submit_enquiry(uuid,uuid,text,text,text,text,text,text,text,timestamptz,jsonb) to service_role;
grant execute on function public.publish_content(jsonb,int) to authenticated;
revoke all on function public.handle_new_user(),public.audit_change() from public,anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('site-media','site-media',true,10485760,array['image/jpeg','image/png','image/webp','image/avif','video/mp4']) on conflict(id) do nothing;
create policy media_public_read on storage.objects for select to anon,authenticated using(bucket_id='site-media');
create policy media_admin_insert on storage.objects for insert to authenticated with check(bucket_id='site-media' and public.is_admin());
create policy media_admin_update on storage.objects for update to authenticated using(bucket_id='site-media' and public.is_admin()) with check(bucket_id='site-media' and public.is_admin());
create policy media_admin_delete on storage.objects for delete to authenticated using(bucket_id='site-media' and public.is_admin());
commit;
