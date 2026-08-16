create or replace function public.enforce_incident_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.has_active_paid_access(new.user_id) then
    return new;
  end if;

  if (
    select count(*)
    from public.incidents
    where user_id = new.user_id
  ) >= 10 then
    raise exception using
      errcode = 'P0001',
      message = 'The Free plan includes 10 incidents total. Upgrade to Pro for unlimited incidents.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_incident_plan_limit() from public, anon, authenticated;
