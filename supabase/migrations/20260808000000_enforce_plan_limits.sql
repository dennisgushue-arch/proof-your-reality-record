create or replace function public.has_active_paid_access(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions
    where user_id = target_user_id
      and plan in ('pro', 'premium')
      and (
        (current_period_end is not null and current_period_end > now())
        or (current_period_end is null and status in ('active', 'trialing'))
      )
  );
$$;

revoke all on function public.has_active_paid_access(uuid) from public, anon, authenticated;

create or replace function public.enforce_case_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.has_active_paid_access(new.user_id) then
    return new;
  end if;

  if (select count(*) from public.cases where user_id = new.user_id) >= 1 then
    raise exception using
      errcode = 'P0001',
      message = 'The Free plan includes 1 case. Upgrade to Pro for unlimited cases.';
  end if;

  return new;
end;
$$;

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
      and created_at >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'
      and created_at < (date_trunc('month', now() at time zone 'UTC') + interval '1 month') at time zone 'UTC'
  ) >= 1 then
    raise exception using
      errcode = 'P0001',
      message = 'The Free plan includes 1 incident per month. Upgrade to Pro for unlimited incidents.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_case_plan_limit() from public, anon, authenticated;
revoke all on function public.enforce_incident_plan_limit() from public, anon, authenticated;

drop trigger if exists cases_enforce_plan_limit on public.cases;
create trigger cases_enforce_plan_limit
before insert on public.cases
for each row execute function public.enforce_case_plan_limit();

drop trigger if exists incidents_enforce_plan_limit on public.incidents;
create trigger incidents_enforce_plan_limit
before insert on public.incidents
for each row execute function public.enforce_incident_plan_limit();
