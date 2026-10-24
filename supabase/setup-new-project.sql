-- Generated from versioned migrations and current CMS defaults.
-- Run ONCE in a new project. Transaction rolls back all changes on failure.
begin;
-- 001_initial.sql
-- Apply in a new Supabase project using the SQL editor or Supabase CLI.

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


-- 002_admin_transactions.sql

create or replace function public.update_lead_record(p_id uuid,p_status text,p_follow_up_at timestamptz,p_notes text) returns void language plpgsql security invoker set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Forbidden';end if;
 update public.leads set status=p_status,follow_up_at=p_follow_up_at where id=p_id;
 if not found then raise exception 'Lead not found';end if;
 insert into public.lead_notes(lead_id,notes) values(p_id,p_notes) on conflict(lead_id) do update set notes=excluded.notes;
end;$$;
create or replace function public.update_booking_record(p_id uuid,p_status text,p_scheduled_at timestamptz,p_notes text) returns void language plpgsql security invoker set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Forbidden';end if;
 if p_status in ('Confirmed','Rescheduled') and (p_scheduled_at is null or p_scheduled_at<now()) then raise exception 'Set a future appointment time';end if;
 update public.bookings set status=p_status,scheduled_at=p_scheduled_at where id=p_id;
 if not found then raise exception 'Booking not found';end if;
 insert into public.booking_notes(booking_id,notes) values(p_id,p_notes) on conflict(booking_id) do update set notes=excluded.notes;
end;$$;
revoke all on function public.update_lead_record(uuid,text,timestamptz,text),public.update_booking_record(uuid,text,timestamptz,text) from public,anon;
grant execute on function public.update_lead_record(uuid,text,timestamptz,text),public.update_booking_record(uuid,text,timestamptz,text) to authenticated;


-- 003_hardening.sql

-- Remove possible Supabase project-wide default grants before assigning least privilege.
revoke all on public.profiles,public.site_content,public.leads,public.lead_notes,public.bookings,public.booking_notes,public.audit_log,public.rate_limits,public.webhook_messages from anon,authenticated;
grant select on public.site_content to anon,authenticated;
grant insert,update on public.site_content to authenticated;
grant select on public.profiles to authenticated;
grant select,delete on public.leads to authenticated;
grant update(status,follow_up_at) on public.leads to authenticated;
grant select on public.bookings to authenticated;
grant update(status,scheduled_at) on public.bookings to authenticated;
grant select,insert,update,delete on public.lead_notes,public.booking_notes to authenticated;
grant select on public.audit_log to authenticated;
create or replace function public.claim_webhook_message(p_id text) returns boolean language plpgsql security definer set search_path=public as $$
declare claimed text;
begin
 insert into public.webhook_messages(id) values(p_id) on conflict(id) do update set status='processing',created_at=now() where webhook_messages.status='failed' or (webhook_messages.status='processing' and webhook_messages.created_at<now()-interval '2 minutes') returning id into claimed;
 return claimed is not null;
end;$$;
revoke all on function public.claim_webhook_message(text) from public,anon,authenticated;
grant execute on function public.claim_webhook_message(text) to service_role;
-- Private notes have their own audit entries without storing note content in logs.
create or replace function public.audit_note_change() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.audit_log(actor_id,entity,record_id,action) values(auth.uid(),tg_table_name,coalesce(to_jsonb(new)->>'lead_id',to_jsonb(new)->>'booking_id'),tg_op);return new;end;$$;
revoke all on function public.audit_note_change() from public,anon,authenticated;
create trigger lead_note_audit after insert or update on public.lead_notes for each row execute function public.audit_note_change();
create trigger booking_note_audit after insert or update on public.booking_notes for each row execute function public.audit_note_change();


-- 004_reporting.sql

-- All reporting keeps the caller's RLS context and explicitly requires admin.
create or replace function public.admin_summary() returns jsonb
language plpgsql stable security invoker set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Forbidden';end if;
 return jsonb_build_object(
   'totalLeads',(select count(*) from public.leads),
   'totalBookings',(select count(*) from public.bookings),
   'pipeline',(select coalesce(jsonb_object_agg(status,n),'{}'::jsonb) from (select status,count(*) n from public.leads group by status) x),
   'sources',(select coalesce(jsonb_agg(jsonb_build_array(source,n) order by n desc),'[]'::jsonb) from (select source,count(*) n from public.leads group by source) x),
   'followupCount',(select count(*) from public.leads where follow_up_at<=now() and status not in ('Closed','Converted','Not Interested')),
   'followups',(select coalesce(jsonb_agg(to_jsonb(x) order by follow_up_at,id),'[]'::jsonb) from (
     select l.*,case when n.lead_id is null then null else jsonb_build_object('notes',n.notes) end lead_notes
     from public.leads l left join public.lead_notes n on n.lead_id=l.id
     where l.follow_up_at<=now() and l.status not in ('Closed','Converted','Not Interested') order by l.follow_up_at,l.id limit 5
   ) x)
 );
end;$$;
create or replace function public.admin_records(p_kind text,p_search text default '',p_status text default 'All',p_page integer default 1,p_limit integer default 15,p_before timestamptz default now()) returns jsonb
language plpgsql stable security invoker set search_path=public as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Forbidden';end if;
 if p_kind not in ('leads','customers','bookings','activity') or p_page<1 or p_page>1000000 or p_limit<1 or p_limit>1000 or length(p_search)>200 then raise exception 'Invalid query';end if;
 if p_kind in ('leads','customers') then
   with matching as (
     select l.* from public.leads l
     where l.created_at<=p_before and (p_kind<>'customers' or l.status='Converted') and (p_status='All' or l.status=p_status)
       and (p_search='' or strpos(lower(concat_ws(' ',l.name,l.email,l.phone,l.business,l.service)),lower(p_search))>0)
   ), page_rows as (
     select l.*,case when n.lead_id is null then null else jsonb_build_object('notes',n.notes) end lead_notes
     from (select * from matching order by created_at desc,id desc limit p_limit offset (p_page-1)*p_limit) l
     left join public.lead_notes n on n.lead_id=l.id
   ) select jsonb_build_object('total',(select count(*) from matching),'rows',(select coalesce(jsonb_agg(to_jsonb(r) order by created_at desc,id desc),'[]'::jsonb) from page_rows r)) into result;
 elsif p_kind='bookings' then
   with matching as (
     select b.*,jsonb_build_object('name',l.name,'email',l.email,'phone',l.phone,'service',l.service) leads
     from public.bookings b join public.leads l on l.id=b.lead_id
     where b.created_at<=p_before and (p_status='All' or b.status=p_status)
       and (p_search='' or strpos(lower(concat_ws(' ',l.name,l.email,l.phone,l.business,l.service)),lower(p_search))>0)
   ), page_rows as (
     select b.*,case when n.booking_id is null then null else jsonb_build_object('notes',n.notes) end booking_notes
     from (select * from matching order by created_at desc,id desc limit p_limit offset (p_page-1)*p_limit) b
     left join public.booking_notes n on n.booking_id=b.id
   ) select jsonb_build_object('total',(select count(*) from matching),'rows',(select coalesce(jsonb_agg(to_jsonb(r) order by created_at desc,id desc),'[]'::jsonb) from page_rows r)) into result;
 else
   select jsonb_build_object('total',(select count(*) from public.audit_log),'rows',(select coalesce(jsonb_agg(to_jsonb(r) order by created_at desc,id desc),'[]'::jsonb) from (select * from public.audit_log order by created_at desc,id desc limit p_limit offset (p_page-1)*p_limit) r)) into result;
 end if;
 return result;
end;$$;
revoke all on function public.admin_summary(),public.admin_records(text,text,text,integer,integer,timestamptz) from public,anon;
grant execute on function public.admin_summary(),public.admin_records(text,text,text,integer,integer,timestamptz) to authenticated;


-- 005_analytics_reports.sql

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

-- Repair profiles for users registered before schema installation.
insert into public.profiles(id,email,name) select id,email,left(coalesce(raw_user_meta_data->>'name',''),100) from auth.users where email is not null on conflict(id) do nothing;
insert into public.site_content(id,body) values ('main','{"brand":{"name":"ADS Solutions","tagline":"Where ads meet growth","logo":"/logo.jpeg","phone":"+91 9568151737","secondaryPhone":"+91 7505976499","proprietor":"Dushyant Kumar","whatsapp":"919568151737","email":"dushyantkumar9669@gmail.com","address":"","gstin":"09JQOPK8863A1Z8","udyam":"UDYAM-UP-18-0063498","instagram":"","facebook":""},"hero":{"eyebrow":"SOCIAL MEDIA • META ADS • CONTENT • LEAD GENERATION","title":"We turn attention","highlight":"into growth.","description":"Your next chapter starts with the right strategy. We help creators and businesses grow with content that connects and advertising that works.","image":"","alt":"ADS Solutions creative work","cta":"Book a free strategy call"},"about":{"title":"Your ambition. Our next big project.","description":"ADS Solutions is a digital growth partner for creators, local businesses and service brands. From the first content idea to the next campaign, we bring strategy, creativity and consistent execution together.","mission":"Clear communication. Transparent pricing. A real focus on your business. We believe sustainable growth starts with a partnership you can trust.","image":"","alt":"The ADS Solutions team"},"sections":{"servicesTitle":"Everything your brand needs to grow.","servicesIntro":"From the first impression to the next enquiry, we connect the dots.","portfolioTitle":"Good ideas. Thoughtful execution.","portfolioIntro":"A few possibilities, brought to life. Explore our sample brand and campaign concepts below.","packagesTitle":"Big ambitions. Clear pricing.","testimonialsTitle":"Built on good partnerships.","ctaTitle":"Ready for your next chapter?","ctaDescription":"Tell us where you want to go. Let’s build a plan to get you there."},"services":[{"id":"social","icon":"social","title":"Social media management","description":"A consistent presence on Instagram and Facebook, with content planning, publishing and community support.","image":"","alt":"Social media management","published":true},{"id":"ads","icon":"ads","title":"Meta ads management","description":"Reach the right people with audience research, campaign setup and ongoing optimisation.","image":"","alt":"Meta ads management","published":true},{"id":"video","icon":"video","title":"Content & reels","description":"Strong hooks, structured scripts and thoughtfully edited reels that bring your brand to life.","image":"","alt":"Content & reels","published":true},{"id":"leads","icon":"leads","title":"Lead generation","description":"Turn attention into business enquiries with focused campaigns and clear conversion journeys.","image":"","alt":"Lead generation","published":true},{"id":"brand","icon":"brand","title":"Brand promotion","description":"Get your business in front of the people who matter, with a recognisable brand presence.","image":"","alt":"Brand promotion","published":true},{"id":"web","icon":"web","title":"Web development","description":"Fast, responsive websites designed around your business and your customers.","image":"","alt":"Web development","published":true},{"id":"person","icon":"person","title":"Personal branding","description":"Build a distinctive voice and a credible online presence as a creator or professional.","image":"","alt":"Personal branding","published":true},{"id":"consult","icon":"consult","title":"Growth consultation","description":"A practical conversation about your goals, your audience and your next move.","image":"","alt":"Growth consultation","published":true}],"packages":[{"id":"basic","name":"Basic","subtitle":"Build your foundation","price":14999,"category":"social","popular":false,"published":true,"features":["Facebook & Instagram profile management","10–15 reels edited each month","Content ideas, scripts, captions & hashtags","Meta ads management up to ₹15,000 ad spend","Best-time posting & monthly reporting"]},{"id":"growth","name":"Growth","subtitle":"Make your next move","price":19999,"category":"social","popular":true,"published":true,"features":["Complete Facebook & Instagram management","18–20 reels edited each month","Advanced scripts & premium thumbnails","Meta ads management up to ₹20,000 ad spend","Daily stories & basic community support","Daily performance & lead monitoring"]},{"id":"enterprise","name":"Enterprise","subtitle":"Think bigger. Go further.","price":29999,"category":"social","popular":false,"published":true,"features":["25–30 high-quality reels each month","End-to-end content & growth strategy","Premium editing & creative hooks","Ad management above ₹20,000 spend","Daily community management","Bi-monthly performance reviews"]},{"id":"starter-ads","name":"Starter ads","subtitle":"For ad spend up to ₹5,000","price":2000,"category":"ads","popular":false,"published":true,"features":["Leads, sales or WhatsApp campaigns","Basic audience targeting","Performance monitoring"]},{"id":"growth-ads","name":"Growth ads","subtitle":"For ad spend ₹5,000–₹10,000","price":3000,"category":"ads","popular":false,"published":true,"features":["Audience research & copywriting","Campaign optimisation","Regular performance tracking"]},{"id":"scale-ads","name":"Scale ads","subtitle":"For ad spend ₹10,000–₹20,000","price":5000,"category":"ads","popular":false,"published":true,"features":["Advanced audience targeting","Conversion tracking","Daily campaign optimisation"]}],"portfolio":[{"id":"concept-forma","title":"Forma — a stronger everyday","description":"A fitness brand concept combining an editorial identity with a social-first launch direction.","category":"Brand & social","image":"/work/forma.svg","alt":"Forma fitness campaign concept in forest green","metric":"Sample concept · Not client work","video":"","published":true},{"id":"concept-nook","title":"Nook — the art of slowing down","description":"A boutique hospitality concept designed around quiet escapes and considered storytelling.","category":"Campaign creative","image":"/work/nook.svg","alt":"Nook boutique stay campaign concept in warm terracotta","metric":"Sample concept · Not client work","video":"","published":true},{"id":"concept-ritual","title":"Ritual — make it a daily thing","description":"An independent coffee brand concept with a warm visual language and community-led content direction.","category":"Brand & social","image":"/work/ritual.svg","alt":"Ritual coffee concept with golden yellow editorial artwork","metric":"Sample concept · Not client work","video":"","published":true},{"id":"concept-afterhours","title":"Afterhours — stories with a voice","description":"A creator series concept with a distinctive campaign identity and a short-form content direction.","category":"Creator campaigns","image":"/work/afterhours.svg","alt":"Afterhours creator series concept with lavender typography","metric":"Sample concept · Not client work","video":"","published":true}],"testimonials":[],"process":[{"title":"Understand","description":"Your business, audience and goals. That’s where we start."},{"title":"Strategise","description":"A clear content and advertising plan, built around you."},{"title":"Create & launch","description":"Bring the plan to life with thoughtful creative and campaigns."},{"title":"Track & improve","description":"Review what works, learn from the data and keep growing."}],"seo":{"title":"ADS Solutions | Where Ads Meet Growth","description":"Social media management, Meta advertising, content and digital growth for creators and businesses. Explore transparent packages and book a free strategy call."},"legal":{"updated":"2026-10-10","privacy":[{"title":"Information you share","body":"We collect the name, email, phone number, business details and message you submit with an enquiry or booking request. Signed-in requests are linked to your account. Please do not submit payment card details, passwords or sensitive personal information in enquiry messages."},{"title":"Why we use it","body":"We use your information to respond to enquiries, arrange calls, deliver agreed services, maintain account security and keep necessary business records. Consent to be contacted about a request does not subscribe you to unrelated marketing. We do not sell your personal information."},{"title":"Service providers","body":"Account and request records are stored using Supabase and accessed by authorised team members. Hosting, email delivery and security providers may process technical information needed to operate the website. These providers may process information outside your country. WhatsApp links open an external service governed by Meta’s terms and privacy policy."},{"title":"Analytics, advertising and session insights","body":"Optional tracking stays off until you choose it. Analytics consent enables configured Google Analytics and Microsoft Clarity integrations for page visits, campaign attribution, interaction events, heatmaps and session insights. Marketing consent additionally enables the configured Meta Pixel and advertising consent signals. Clarity is not loaded on login, admin or client portal pages; enquiry forms are marked for masking. Provider dashboards may offer additional collection settings that we manage separately."},{"title":"Cookies and local storage","body":"Authentication cookies support signed-in features. We store your cookie preference in local storage. With analytics consent, campaign attribution is held in session storage and enabled providers may set their own cookies. Choose Essential only to reject optional tracking, Analytics only to exclude advertising, or Allow all for both. Reopen Cookie preferences in the footer to change your choice. Withdrawing consent stops future optional tracking; it does not automatically erase data already received by providers."},{"title":"Retention, access and deletion","body":"We keep enquiry and service records for as long as reasonably needed to respond, deliver services and meet applicable recordkeeping obligations. Contact us using the email below to request access, correction or deletion, or ask about retention. We may need to verify your identity before acting. Some records may need to be retained for legal obligations or unresolved disputes."},{"title":"Policy updates","body":"We may revise this notice as our services or providers change. The updated date identifies the current version. Material changes to optional tracking may require a new consent choice."}],"terms":[{"title":"Scope and service agreement","body":"This website describes ADS Solutions services and accepts enquiries and booking requests. A website submission does not purchase a package or create a confirmed service engagement. Deliverables, timelines, fees, taxes and responsibilities are confirmed in a written proposal or service agreement before work begins."},{"title":"Pricing and advertising budgets","body":"Displayed package prices are monthly service fees unless stated otherwise. Meta advertising spend is separate and paid directly to Meta. The agreed scope determines the applicable fee; taxes, additional services and third-party charges are confirmed before acceptance. We do not collect card payments through this website."},{"title":"Client materials and approvals","body":"Clients provide raw footage, brand materials, accurate business claims and the permissions needed to use supplied content. Clients are responsible for timely access, feedback and approvals. Changes outside the agreed scope, delayed approvals or missing materials may affect timelines and require a revised quote."},{"title":"Bookings and performance","body":"A preferred appointment time is a request until our team confirms availability. Marketing results depend on factors such as budget, audience, competition and platform decisions. We do not guarantee rankings, sales, follower counts or lead volumes. Sample concept projects on this website are illustrations, not evidence of client outcomes."},{"title":"Payments, cancellations and refunds","body":"Payment schedules, renewal arrangements, notice periods and cancellation or refund conditions are agreed in writing before paid work starts. Contact us promptly to discuss cancellation or rescheduling. Any refund for work already started or third-party spending depends on the agreed scope, costs incurred and applicable rights; no universal refund or non-refundable policy is implied by this website."},{"title":"Ownership and permitted use","body":"Ownership, licensing, source files and permitted reuse of commissioned work are defined in your service agreement. You must have permission to use materials you supply. Do not copy website artwork or sample campaigns for commercial use without permission. Third-party assets remain subject to their own licences."},{"title":"Accounts and acceptable use","body":"Provide accurate account information and keep login credentials secure. Do not impersonate others, submit spam, upload malicious files or attempt unauthorised access. We may restrict access needed to investigate misuse or protect the service."},{"title":"Third-party services and issues","body":"Advertising platforms, WhatsApp and other external services operate under their own terms and may change availability or policies. Contact us first about a service issue so we can work towards a resolution. Nothing in these website terms removes rights that cannot be excluded under applicable law. Any additional dispute or liability terms must be set out in the service agreement."}]},"tracking":{"ga4":"","pixel":"","clarity":""}}'::jsonb) on conflict(id) do nothing;
commit;
