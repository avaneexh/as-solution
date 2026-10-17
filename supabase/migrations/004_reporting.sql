begin;
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
commit;
