begin;
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
commit;
