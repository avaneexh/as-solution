begin;
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
commit;
