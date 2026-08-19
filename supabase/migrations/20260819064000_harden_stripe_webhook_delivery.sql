-- Stripe webhook replay + ordering protection.

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  event_created bigint not null,
  processed_at timestamptz not null default now()
);

revoke all on public.stripe_webhook_events from public;
revoke all on public.stripe_webhook_events from anon;
revoke all on public.stripe_webhook_events from authenticated;
grant all on public.stripe_webhook_events to service_role;


-- Highest Stripe subscription event timestamp applied to this row.
-- Used to reject older out-of-order subscription events.
alter table public.subscriptions
  add column if not exists stripe_subscription_event_created bigint;


-- Atomically process prepaid Checkout fulfillment.
--
-- The event claim and entitlement extension happen in ONE DB transaction.
-- If anything fails, neither change commits.
create or replace function public.process_stripe_prepaid_event(
  p_event_id text,
  p_event_type text,
  p_event_created bigint,
  p_user_id uuid,
  p_customer_id text,
  p_plan text,
  p_access_days integer
)
returns table (
  processed boolean,
  access_until timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed text;
  v_existing_end timestamptz;
  v_existing_subscription_id text;
  v_base timestamptz;
  v_new_end timestamptz;
begin
  if p_event_id is null or btrim(p_event_id) = '' then
    raise exception 'Stripe event id is required';
  end if;

  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if p_access_days is null or p_access_days <= 0 then
    raise exception 'Access days must be positive';
  end if;

  if p_plan not in ('pro', 'premium') then
    raise exception 'Invalid paid plan';
  end if;

  insert into public.stripe_webhook_events (
    event_id,
    event_type,
    event_created
  )
  values (
    p_event_id,
    p_event_type,
    p_event_created
  )
  on conflict (event_id) do nothing
  returning event_id into v_claimed;

  -- Already processed: return current state without extending access again.
  if v_claimed is null then
    return query
      select false, s.current_period_end
      from public.subscriptions s
      where s.user_id = p_user_id;

    if not found then
      return query select false, null::timestamptz;
    end if;

    return;
  end if;

  select
    s.current_period_end,
    s.stripe_subscription_id
  into
    v_existing_end,
    v_existing_subscription_id
  from public.subscriptions s
  where s.user_id = p_user_id
  for update;

  if v_existing_end is not null and v_existing_end > now() then
    v_base := v_existing_end;
  else
    v_base := now();
  end if;

  v_new_end :=
    v_base + make_interval(days => p_access_days);

  insert into public.subscriptions (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    plan,
    status,
    current_period_end,
    cancel_at_period_end,
    provider
  )
  values (
    p_user_id,
    nullif(p_customer_id, ''),
    v_existing_subscription_id,
    p_plan,
    'active',
    v_new_end,
    false,
    'stripe'
  )
  on conflict (user_id)
  do update set
    stripe_customer_id = excluded.stripe_customer_id,
    plan = excluded.plan,
    status = 'active',
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = false,
    provider = 'stripe';

  return query
    select true, v_new_end;
end;
$$;

revoke all
on function public.process_stripe_prepaid_event(
  text,
  text,
  bigint,
  uuid,
  text,
  text,
  integer
)
from public, anon, authenticated;

grant execute
on function public.process_stripe_prepaid_event(
  text,
  text,
  bigint,
  uuid,
  text,
  text,
  integer
)
to service_role;
